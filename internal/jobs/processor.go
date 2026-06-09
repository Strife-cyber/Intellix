package jobs

import (
	"archive/zip"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"micro-cer/internal/ai"
	"micro-cer/internal/core"
	"micro-cer/internal/generator"
	"micro-cer/internal/latex"
	"os"
	"path/filepath"
)

type DefaultProcessor struct {
	Store *Store
}

func (p DefaultProcessor) Process(ctx context.Context, jobID string, cfg QueueConfig, registry TemplateResolver) error {
	store := p.Store
	if store == nil {
		return fmt.Errorf("job store not configured")
	}
	job, err := store.Get(jobID)
	if err != nil {
		return err
	}

	switch job.Kind {
	case KindPrositExtract:
		return processPrositExtract(ctx, store, jobID, job)
	case KindCERGenerate:
		return processCERGenerate(ctx, store, jobID, job, cfg, registry)
	default:
		return fmt.Errorf("unsupported job kind: %s", job.Kind)
	}
}

func processPrositExtract(ctx context.Context, store *Store, jobID string, job *Job) error {
	_ = ctx
	if job.PrositExtract == nil {
		return fmt.Errorf("missing prosit extract payload")
	}

	_ = store.Update(jobID, func(j *Job) { j.Progress = "extracting" })

	extractor := core.NewExtractor()
	prosit, err := extractor.Extract(job.PrositExtract.FilePath)
	_ = os.Remove(job.PrositExtract.FilePath)

	if err != nil {
		return fmt.Errorf("extraction failed: %w", err)
	}

	return store.Update(jobID, func(j *Job) {
		j.Result = &JobResult{Prosit: prosit}
	})
}

func processCERGenerate(ctx context.Context, store *Store, jobID string, job *Job, cfg QueueConfig, registry TemplateResolver) error {
	if job.CERGenerate == nil {
		return fmt.Errorf("missing cer generate payload")
	}
	p := job.CERGenerate

	tplDir, err := registry.Resolve(p.TemplateID)
	if err != nil {
		return err
	}
	if err := core.ValidateTemplateDir(tplDir); err != nil {
		return fmt.Errorf("template validation failed: %w", err)
	}

	steps := []struct {
		progress string
		fn       func() error
	}{
		{"generating_cer", func() error {
			prov, err := resolveAIProviderFromConfig(ctx, p.Provider)
			if err != nil {
				return err
			}
			assistant := ai.NewAssistantInstance(prov, 15)
			mgr := generator.NewManager(assistant, &p.Prosit)
			cer := mgr.GenerateCER(ctx, jobID,
				p.Objectifs, p.Version, p.Title, p.Description,
				p.Difficulties, p.Perspectives,
			)

			renderer, err := core.NewLatexRenderer(tplDir)
			if err != nil {
				return err
			}

			jobOut := filepath.Join(cfg.WorkDir, "users", job.UserKey, "jobs", jobID)
			if err := os.MkdirAll(jobOut, 0755); err != nil {
				return err
			}

			_ = store.Update(jobID, func(j *Job) { j.Progress = "rendering_latex" })

			docInfo := buildDocumentInfo(p, cer)
			if p.LogoBase64 != "" {
				if logoFile, err := decodeAndWriteLogo(jobOut, p.LogoBase64); err == nil {
					docInfo.LogoPath = logoFile
				}
			}
			outputDir, err := renderer.Render(cer, jobOut, p.Theme, docInfo)
			if err != nil {
				return err
			}
			// If we wrote a custom logo, copy it into the output directory so
			// LaTeX can find it during compilation.
			if docInfo.LogoPath != "" && docInfo.LogoPath != "logo_ucac_icam.jpg" {
				srcLogo := filepath.Join(jobOut, docInfo.LogoPath)
				dstLogo := filepath.Join(outputDir, docInfo.LogoPath)
				if r, err := os.Open(srcLogo); err == nil {
					if w, err2 := os.Create(dstLogo); err2 == nil {
						_, _ = io.Copy(w, r)
						_ = w.Close()
					}
					_ = r.Close()
				}
			}

			zipPath := filepath.Join(jobOut, "cer_output.zip")
			if err := zipDirectory(zipPath, outputDir); err != nil {
				return fmt.Errorf("zip output: %w", err)
			}

			_ = store.Update(jobID, func(j *Job) { j.Progress = "combining_latex" })
			combinedPath, err := latex.WriteCombinedFile(outputDir)
			if err != nil {
				return err
			}

			_ = store.Update(jobID, func(j *Job) { j.Progress = "compiling_pdf" })
			compile := latex.CompilePDF(outputDir)

			pdfReady := compile.Success
			err = store.Update(jobID, func(j *Job) {
				j.Result = &JobResult{
					OutputDir:         outputDir,
					ZipPath:           zipPath,
					CombinedLatexPath: combinedPath,
					PDFPath:           compile.PDFPath,
					PDFReady:          pdfReady,
					CompileLog:        compile.Log,
				}
			})
			if err != nil {
				return err
			}
			updated, err := store.Get(jobID)
			if err == nil {
				_ = WritePersistedMeta(jobOut, updated)
			}
			return nil
		}},
	}

	for _, step := range steps {
		_ = store.Update(jobID, func(j *Job) { j.Progress = step.progress })
		if err := step.fn(); err != nil {
			return err
		}
	}
	return nil
}

func zipDirectory(zipPath, dir string) error {
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer zipFile.Close()

	w := zip.NewWriter(zipFile)
	defer w.Close()

	return filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		f, err := w.Create(filepath.ToSlash(rel))
		if err != nil {
			return err
		}
		src, err := os.Open(path)
		if err != nil {
			return err
		}
		defer src.Close()
		_, err = io.Copy(f, src)
		return err
	})
}

// buildDocumentInfo constructs a DocumentInfo from the job payload, falling back
// to sensible defaults for any field not explicitly set.
func buildDocumentInfo(p *CERGeneratePayload, cer *core.Cer) core.DocumentInfo {
	docInfo := core.DefaultDocumentInfo()

	if p.Author != "" {
		docInfo.Author = p.Author
	}
	if p.Pilot != "" {
		docInfo.Pilot = p.Pilot
	}
	if p.Promotion != "" {
		docInfo.Promotion = p.Promotion
	}
	if p.BrandLabel != "" {
		docInfo.BrandLabel = p.BrandLabel
	}
	if p.CopyrightOwner != "" {
		docInfo.CopyrightOwner = p.CopyrightOwner
	}
	if p.DocStatus != "" {
		docInfo.Status = p.DocStatus
	}
	if p.DocTitle != "" {
		docInfo.Title = p.DocTitle
	}

	// Override subtitle/version from the CER (these are always explicit).
	docInfo.Subtitle = cer.Description
	docInfo.Version = cer.Version

	return docInfo
}

// decodeAndWriteLogo decodes a base64-encoded PNG and writes it to the given
// directory. It returns the filename ("custom_logo.png") on success, or an error.
func decodeAndWriteLogo(dir, b64 string) (string, error) {
	decoded, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return "", fmt.Errorf("decode logo: %w", err)
	}
	if len(decoded) == 0 {
		return "", fmt.Errorf("decoded logo is empty")
	}
	logoPath := filepath.Join(dir, "custom_logo.png")
	if err := os.WriteFile(logoPath, decoded, 0644); err != nil {
		return "", fmt.Errorf("write logo: %w", err)
	}
	return "custom_logo.png", nil
}

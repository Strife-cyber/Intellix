package jobs

import (
	"archive/zip"
	"context"
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

			outputDir, err := renderer.Render(cer, jobOut, p.Theme)
			if err != nil {
				return err
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

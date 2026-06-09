package core

import (
	"bytes"
	"fmt"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"
	"text/template"
	"time"
)

// DocumentInfo holds configurable document metadata that replaces hardcoded values
// in LaTeX templates. All fields have sensible defaults.
type DocumentInfo struct {
	Title            string
	Subtitle         string
	Version          float32
	Author           string
	Pilot            string
	Promotion        string
	BrandLabel       string
	LogoPath         string
	CopyrightOwner   string
	HeaderTitle      string
	Status           string
	DocID            string
}

// DefaultDocumentInfo returns the default document metadata.
func DefaultDocumentInfo() DocumentInfo {
	return DocumentInfo{
		Title:          "Cahier d'étude \\ et de recherche",
		Author:         "Djiatsa Dunamis Junior",
		Pilot:          "Mr. Bruce Jouguem Youmbi",
		Promotion:      "X 2028",
		BrandLabel:     "UCAC-ICAM",
		LogoPath:       "logo_ucac_icam.jpg",
		CopyrightOwner: "UCAC-ICAM",
		Status:         "Version finale",
	}
}

type LatexRenderer struct {
	TemplateDir string
	funcs       template.FuncMap
}

func safeString(s string) string {
	return s
}

func safeSlice(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

func downgradeSections(value string) string {
	if value == "" {
		return ""
	}
	// Must order from deepest to shallowest to avoid double-replacing
	value = strings.ReplaceAll(value, `\subsubsection{`, `\paragraph{`)
	value = strings.ReplaceAll(value, `\subsection{`, `\subsubsection{`)
	value = strings.ReplaceAll(value, `\section{`, `\subsection{`)
	return value
}

var latexEscaper = strings.NewReplacer(
	"&", `\&`, "%", `\%`, "$", `\$`, "#", `\#`,
	"_", `\_`, "{", `\{`, "}", `\}`,
	"~", `\textasciitilde{}`, "^", `\textasciicircum{}`, `\`, `\textbackslash{}`,
)

func LatexEscape(value string) string {
	if value == "" {
		return ""
	}
	return latexEscaper.Replace(value)
}

func NewLatexRenderer(templateDir string) (*LatexRenderer, error) {
	absPath, err := filepath.Abs(templateDir)
	if err != nil {
		return nil, err
	}

	return &LatexRenderer{
		TemplateDir: absPath,
		funcs: template.FuncMap{
			"latex_escape":       LatexEscape,
			"downgrade_sections": downgradeSections,
		},
	}, nil
}

func (lr *LatexRenderer) Render(cer *Cer, baseOutputDir string, theme string, docInfo DocumentInfo) (string, error) {
	now := time.Now()
	timestamp := now.Format("20060102_150405")
	currentYear := now.Format("2006")

	versionStr := strings.ReplaceAll(fmt.Sprintf("%v", cer.Version), ".", "_")
	folderName := fmt.Sprintf("CER_v%s_%s", versionStr, timestamp)

	absBaseOut, err := filepath.Abs(baseOutputDir)
	if err != nil {
		return "", err
	}

	outputDir := filepath.Join(absBaseOut, folderName)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create output dir: %w", err)
	}

	log.Printf("Generating LaTeX to new directory: %s (Theme: %s)\n", outputDir, theme)

	palette := GetPalette(theme)

	// Prepare Description Fallback
	subtitle := cer.Description
	if len(subtitle) > 50 {
		subtitle = subtitle[:50] + "..."
	}

	// Ensure all fields have safe values
	analyse := cer.Analyse
	if analyse == nil {
		analyse = &Analyse{}
	}
	references := cer.Reference
	if references == nil {
		references = &Reference{
			Principale: []string{},
			Secondaire: []string{},
			Ligne:      []string{},
		}
	}
	if references.Principale == nil {
		references.Principale = []string{}
	}
	if references.Secondaire == nil {
		references.Secondaire = []string{}
	}
	if references.Ligne == nil {
		references.Ligne = []string{}
	}

	// Build the context data map from DocumentInfo + Cer data
	contextMap := map[string]any{
		"title":          cer.Title,
		"version_number": cer.Version,
		"subtitle":       subtitle,
		"header_title":   cer.Title,
		"description":    cer.Description,
		"docAuthor":      docInfo.Author,
		"docTitle":       docInfo.Title,
		"docPilot":       docInfo.Pilot,
		"docPromotion":   docInfo.Promotion,
		"docBrandLabel":  docInfo.BrandLabel,
		"docLogoPath":    docInfo.LogoPath,
		"docCopyrightOwner": docInfo.CopyrightOwner,
		"docStatus":      docInfo.Status,
		"docID":          docInfo.DocID,
		"year":           currentYear,
		"analyse": map[string]any{
			"context":     safeString(analyse.Context),
			"problems":    safeSlice(analyse.Problems),
			"constraints": safeSlice(analyse.Constraints),
		},
		"plan":          safeSlice(cer.Plan),
		"realisation":   safeString(cer.Realisation),
		"validation":    safeString(cer.Validation),
		"conclusion":    safeString(cer.Conclusion),
		"bilan":         safeString(cer.Bilan),
		"references_md": safeString(cer.ReferencesMD),
		"references": map[string]any{
			"Principale": safeSlice(references.Principale),
			"Secondaire": safeSlice(references.Secondaire),
			"Ligne":      safeSlice(references.Ligne),
		},
	}

	// Merge palette into context
	for k, v := range palette.ToMap() {
		contextMap[k] = v
	}

	// Walk the template directory
	err = filepath.WalkDir(lr.TemplateDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(lr.TemplateDir, path)
		if err != nil {
			return err
		}

		targetPath := filepath.Join(outputDir, relPath)

		if d.IsDir() {
			return os.MkdirAll(targetPath, 0755)
		}

		// Only process .tex files as templates. Direct copy others.
		if strings.HasSuffix(d.Name(), ".tex") {
			// Parse the template on the fly with custom [[ ]] delimiters
			tmpl, parseErr := template.New(d.Name()).
				Delims("[[", "]]").
				Funcs(lr.funcs).
				ParseFiles(path)

			if parseErr != nil {
				log.Printf("Error parsing %s: %v. Copying raw file directly...\n", d.Name(), parseErr)
				return copyFile(path, targetPath)
			}

			// Render template
			var buf bytes.Buffer
			if execErr := tmpl.Execute(&buf, contextMap); execErr != nil {
				log.Printf("Error rendering %s: %v. Copying raw file directly...\n", d.Name(), execErr)
				return copyFile(path, targetPath)
			}

			// Write rendered output
			return os.WriteFile(targetPath, buf.Bytes(), 0644)
		}

		// Direct copy for non-tex files (images, assets inside template folder)
		return copyFile(path, targetPath)
	})

	if err != nil {
		return "", err
	}

	// Copy root assets folder for portability
	rootAssetsDir := filepath.Join(filepath.Dir(lr.TemplateDir), "assets")
	if info, err := os.Stat(rootAssetsDir); err == nil && info.IsDir() {
		targetAssetsDir := filepath.Join(outputDir, "assets")
		if err := copyDir(rootAssetsDir, targetAssetsDir); err != nil {
			log.Printf("Warning: failed to copy assets folder: %v\n", err)
		}
	}

	return outputDir, nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer func(in *os.File) {
		err := in.Close()
		if err != nil {
			log.Printf("Error closing file: %v\n", err)
		}
	}(in)

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer func(out *os.File) {
		err := out.Close()
		if err != nil {
			log.Printf("Error closing file: %v\n", err)
		}
	}(out)

	_, err = io.Copy(out, in)
	return err
}

func copyDir(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		targetPath := filepath.Join(dst, relPath)

		if d.IsDir() {
			return os.MkdirAll(targetPath, 0755)
		}
		return copyFile(path, targetPath)
	})
}

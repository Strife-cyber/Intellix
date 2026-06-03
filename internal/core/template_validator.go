package core

import (
	"bytes"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"text/template"
)

// RequiredTemplateFiles are the .tex files a custom template bundle must include.
var RequiredTemplateFiles = []string{
	"main.tex",
	"cover.tex",
	"analyse.tex",
	"plan.tex",
	"realisation.tex",
	"validation.tex",
	"conclusion.tex",
	"bilan.tex",
	"references.tex",
}

// RequiredMainInputs must appear in main.tex after successful rendering.
var RequiredMainInputs = []string{
	"analyse", "plan", "realisation", "validation", "conclusion", "bilan", "references",
}

// RequiredTemplateFields are top-level keys the [[ ]] templates must be able to bind.
var RequiredTemplateFields = []string{
	"title", "version_number", "description", "year",
	"themeDark", "themePrimary", "themeLight", "themeAccent", "textGray", "themeMuted",
	"analyse", "plan", "realisation", "validation", "conclusion", "bilan", "references",
}

type TemplateValidationResult struct {
	Valid    bool     `json:"valid"`
	Errors   []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
}

func ValidateTemplateDir(dir string) error {
	result := ValidateTemplateDirDetailed(dir)
	if !result.Valid {
		return fmt.Errorf("%s", strings.Join(result.Errors, "; "))
	}
	return nil
}

func ValidateTemplateDirDetailed(dir string) TemplateValidationResult {
	result := TemplateValidationResult{Valid: true}

	absDir, err := filepath.Abs(dir)
	if err != nil {
		return failedResult(result, fmt.Sprintf("invalid template path: %v", err))
	}
	info, err := os.Stat(absDir)
	if err != nil || !info.IsDir() {
		return failedResult(result, "template directory does not exist")
	}

	for _, name := range RequiredTemplateFiles {
		p := filepath.Join(absDir, name)
		if _, err := os.Stat(p); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("missing required file: %s", name))
		}
	}
	if len(result.Errors) > 0 {
		result.Valid = false
		return result
	}

	funcs := template.FuncMap{
		"latex_escape":       LatexEscape,
		"downgrade_sections": downgradeSections,
	}
	sample := SampleTemplateContext()

	var mainRendered string
	err = filepath.WalkDir(absDir, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".tex") {
			return nil
		}

		tmpl, parseErr := template.New(d.Name()).
			Delims("[[", "]]").
			Funcs(funcs).
			ParseFiles(path)
		if parseErr != nil {
			rel, _ := filepath.Rel(absDir, path)
			result.Errors = append(result.Errors, fmt.Sprintf("%s: parse error: %v", rel, parseErr))
			return nil
		}

		var buf bytes.Buffer
		if execErr := tmpl.Execute(&buf, sample); execErr != nil {
			rel, _ := filepath.Rel(absDir, path)
			result.Errors = append(result.Errors, fmt.Sprintf("%s: execute error: %v", rel, execErr))
			return nil
		}

		if d.Name() == "main.tex" {
			mainRendered = buf.String()
		}
		return nil
	})
	if err != nil {
		return failedResult(result, fmt.Sprintf("walk template dir: %v", err))
	}

	if len(result.Errors) > 0 {
		result.Valid = false
		return result
	}

	for _, section := range RequiredMainInputs {
		needle := `\input{` + section + `}`
		if !strings.Contains(mainRendered, needle) {
			result.Errors = append(result.Errors, fmt.Sprintf("main.tex must contain %s", needle))
		}
	}

	// Ensure templates use [[ ]] delimiters (reject bare {{ }} only files for required sections).
	for _, name := range []string{"realisation.tex", "validation.tex", "analyse.tex"} {
		raw, err := os.ReadFile(filepath.Join(absDir, name))
		if err != nil {
			continue
		}
		content := string(raw)
		if strings.Contains(content, "{{") && !strings.Contains(content, "[[") {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: use [[ ]] delimiters, not {{ }}", name))
		}
	}

	if len(result.Errors) > 0 {
		result.Valid = false
	}
	return result
}

func failedResult(r TemplateValidationResult, msg string) TemplateValidationResult {
	r.Valid = false
	r.Errors = append(r.Errors, msg)
	return r
}

// TemplatePlaceholderDocs describes the [[ ]] context for API consumers.
func TemplatePlaceholderDocs() map[string]any {
	return map[string]any{
		"delimiter": "[[ ]]",
		"required_files": RequiredTemplateFiles,
		"required_main_inputs": RequiredMainInputs,
		"required_fields": RequiredTemplateFields,
		"template_functions": []string{"latex_escape", "downgrade_sections"},
		"example_fields": map[string]string{
			"title":          "[[ .title ]]",
			"version_number": "[[ .version_number ]]",
			"realisation":    "[[ .realisation | downgrade_sections ]]",
			"plan_item":      "[[ range .plan ]]\n    \\item [[ . ]]\n[[ end ]]",
			"analyse_context":"[[ .analyse.context ]]",
			"theme_primary":  "[[ .themePrimary ]]",
		},
	}
}

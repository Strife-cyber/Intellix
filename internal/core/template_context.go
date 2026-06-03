package core

import "time"

// SampleTemplateContext returns a representative context map for dry-run template validation.
func SampleTemplateContext() map[string]any {
	now := time.Now()
	palette := GetPalette("coffee")
	contextMap := map[string]any{
		"title":          "CER Sample",
		"version_number": 1.0,
		"subtitle":       "Sample subtitle",
		"header_title":   "CER Sample",
		"description":    "Sample description for template validation.",
		"year":           now.Format("2006"),
		"analyse": map[string]any{
			"context":     "Sample context.",
			"problems":    []string{"Problem A", "Problem B"},
			"constraints": []string{"Constraint A"},
		},
		"plan":        []string{"Step 1", "Step 2"},
		"realisation": `\section{Sample}\nSample realisation content.`,
		"validation":  `\section{Sample}\nSample validation content.`,
		"conclusion":  "Sample conclusion.",
		"bilan":       "Sample bilan.",
		"references": map[string]any{
			"Principale": []string{"Ref 1"},
			"Secondaire": []string{"Ref 2"},
			"Ligne":      []string{"Ref 3"},
		},
	}
	for k, v := range palette.ToMap() {
		contextMap[k] = v
	}
	return contextMap
}

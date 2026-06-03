package latex

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var inputRe = regexp.MustCompile(`\\input\{([^}]+)\}`)

// CombineDirectory inlines all \\input{...} into one self-contained .tex file.
func CombineDirectory(dir string) (string, error) {
	mainPath := filepath.Join(dir, "main.tex")
	data, err := os.ReadFile(mainPath)
	if err != nil {
		return "", fmt.Errorf("read main.tex: %w", err)
	}
	return inlineInputs(dir, string(data)), nil
}

// WriteCombinedFile writes cer_combined.tex into dir.
func WriteCombinedFile(dir string) (string, error) {
	combined, err := CombineDirectory(dir)
	if err != nil {
		return "", err
	}
	out := filepath.Join(dir, "cer_combined.tex")
	if err := os.WriteFile(out, []byte(combined), 0644); err != nil {
		return "", err
	}
	return out, nil
}

func inlineInputs(dir, content string) string {
	for {
		loc := inputRe.FindStringSubmatchIndex(content)
		if loc == nil {
			break
		}
		name := content[loc[2]:loc[3]]
		subPath := filepath.Join(dir, name+".tex")
		sub, err := os.ReadFile(subPath)
		if err != nil {
			// Leave \\input as-is if missing (compile may still work with separate files).
			break
		}
		replacement := inlineInputs(dir, string(sub))
		content = content[:loc[0]] + replacement + content[loc[1]:]
	}
	return content
}

// StripInputCommands removes remaining \\input lines (fallback).
func StripInputCommands(content string) string {
	lines := strings.Split(content, "\n")
	var out []string
	for _, line := range lines {
		trim := strings.TrimSpace(line)
		if strings.HasPrefix(trim, `\input{`) {
			continue
		}
		out = append(out, line)
	}
	return strings.Join(out, "\n")
}

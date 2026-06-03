package core

import (
	"path/filepath"
	"testing"
)

func TestValidateDefaultTemplate(t *testing.T) {
	dir := filepath.Join("..", "template")
	result := ValidateTemplateDirDetailed(dir)
	if !result.Valid {
		t.Fatalf("default template should be valid: %v", result.Errors)
	}
}

func TestValidateTemplateRejectsMissingFiles(t *testing.T) {
	dir := t.TempDir()
	result := ValidateTemplateDirDetailed(dir)
	if result.Valid {
		t.Fatal("empty dir should not validate")
	}
}

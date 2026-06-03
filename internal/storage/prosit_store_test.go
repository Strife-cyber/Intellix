package storage

import "testing"

func TestEnsureFilenameExt(t *testing.T) {
	tests := []struct {
		name     string
		display  string
		original string
		want     string
	}{
		{"display without ext", "PROSIT ALLER 2", "file.docx", "PROSIT ALLER 2.docx"},
		{"display with ext", "Report.pdf", "upload.docx", "Report.pdf"},
		{"empty display", "", "upload.docx", "upload.docx"},
		{"display only", "My file", "data.odt", "My file.odt"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ensureFilenameExt(tt.display, tt.original); got != tt.want {
				t.Fatalf("ensureFilenameExt(%q, %q) = %q, want %q", tt.display, tt.original, got, tt.want)
			}
		})
	}
}

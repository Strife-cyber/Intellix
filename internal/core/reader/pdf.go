package reader

import (
	"os/exec"
	"strings"
)

func readPDF(filePath string) ([]string, error) {
	// Use pdftotext (from poppler-utils) for reliable PDF text extraction.
	// -layout preserves reading order and column layout
	// -nopgbrk avoids page break characters
	cmd := exec.Command("pdftotext", "-layout", "-nopgbrk", filePath, "-")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	// pdftotext on Windows typically outputs Latin-1 / Windows-1252.
	// Convert to UTF-8 so accented chars (\xe9 = é, \xe8 = è, etc.)
	// are properly handled by the extractor's normalize function.
	content := toUTF8(out)

	// Split into lines and filter empty / page-number lines
	var lines []string
	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		// Skip standalone page numbers (single or short digit sequences)
		// These become empty strings after stripNumbering and pollute sections.
		if isPageNumber(trimmed) {
			continue
		}

		// Replace hyphens with spaces in hyphenated section headers
		// so "Mots-clés" normalizes to "mots cles" for rule matching
		trimmed = strings.ReplaceAll(trimmed, "-", " ")

		// Collapse multiple whitespace
		trimmed = strings.Join(strings.Fields(trimmed), " ")
		lines = append(lines, trimmed)
	}

	if len(lines) == 0 {
		return nil, nil
	}

	return lines, nil
}

// isPageNumber reports whether line is a standalone page number (e.g. "1", "2", "3").
func isPageNumber(s string) bool {
	if len(s) == 0 || len(s) > 3 {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// toUTF8 converts a Latin-1 / Windows-1252 byte slice to UTF-8.
// Characters in the 0x80-0xFF range map directly to Unicode code points.
func toUTF8(data []byte) string {
	var buf strings.Builder
	buf.Grow(len(data))
	for _, b := range data {
		if b < 128 {
			buf.WriteByte(b)
		} else {
			buf.WriteRune(rune(b))
		}
	}
	return buf.String()
}

package reader

import (
	"os"
	"strings"

	"github.com/ledongthuc/pdf"
)

func readPDF(filePath string) ([]string, error) {
	f, r, err := pdf.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer func(f *os.File) {
		err := f.Close()
		if err != nil {
			return
		}
	}(f)

	var lines []string

	totalPage := r.NumPage()
	for i := 1; i <= totalPage; i++ {
		p := r.Page(i)
		if p.V.IsNull() {
			continue
		}

		var content string

		content, _ = p.GetPlainText(nil)
		for _, line := range splitLines(content) {
			if line != "" {
				lines = append(lines, line)
			}
		}
	}

	return lines, nil
}

func splitLines(text string) []string {
	return strings.Split(text, "\n")
}

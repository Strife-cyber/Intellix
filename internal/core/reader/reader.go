package reader

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func ReadFileAsLines(filePath string) ([]string, error) {
	ext := strings.ToLower(filepath.Ext(filePath))

	switch ext {
	case ".txt":
		return readAsLines(filePath)
	case ".docx":
		return readDocx(filePath)
	case ".pdf":
		return readPDF(filePath)
	case ".odt":
		return readODT(filePath)

	default:
		return nil, fmt.Errorf("unsupported file type: %s", ext)
	}
}

func readAsLines(filePath string) ([]string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer func(file *os.File) {
		err := file.Close()
		if err != nil {
			return
		}
	}(file)

	var lines []string
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}

	return lines, scanner.Err()
}

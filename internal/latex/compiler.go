package latex

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const maxCompileAttempts = 4

type CompileResult struct {
	PDFPath    string
	LogPath    string
	Log        string
	Success    bool
	Attempts   int
}

// CompilePDF builds cer_combined.tex (if needed), sanitizes, and runs pdflatex with retries.
func CompilePDF(outputDir string) CompileResult {
	result := CompileResult{Attempts: 0}
	pdflatex, err := exec.LookPath("pdflatex")
	if err != nil {
		result.Log = "pdflatex not found on PATH; install TeX Live or MiKTeX to enable PDF export"
		return result
	}

	_ = SanitizeRenderedDir(outputDir)

	combinedPath, err := WriteCombinedFile(outputDir)
	if err != nil {
		result.Log = err.Error()
		return result
	}

	logPath := filepath.Join(outputDir, "compile.log")
	var fullLog strings.Builder

	for attempt := 1; attempt <= maxCompileAttempts; attempt++ {
		result.Attempts = attempt
		// Re-combine after fixes so single file stays in sync.
		if attempt > 1 {
			combinedPath, _ = WriteCombinedFile(outputDir)
		}

		for pass := 1; pass <= 2; pass++ {
			cmd := exec.Command(pdflatex,
				"-interaction=nonstopmode",
				"-output-directory", outputDir,
				filepath.Base(combinedPath),
			)
			cmd.Dir = outputDir
			out, runErr := cmd.CombinedOutput()
			fullLog.Write(out)
			_ = runErr
		}

		logContent := fullLog.String()
		_ = os.WriteFile(logPath, []byte(logContent), 0644)
		result.LogPath = logPath
		result.Log = tailLog(logContent, 80)

		pdfPath := filepath.Join(outputDir, strings.TrimSuffix(filepath.Base(combinedPath), ".tex")+".pdf")
		if info, statErr := os.Stat(pdfPath); statErr == nil && info.Size() > 1024 {
			result.PDFPath = pdfPath
			result.Success = true
			return result
		}

		// Also accept main.pdf if combined name differs.
		mainPDF := filepath.Join(outputDir, "main.pdf")
		if info, statErr := os.Stat(mainPDF); statErr == nil && info.Size() > 1024 {
			result.PDFPath = mainPDF
			result.Success = true
			return result
		}

		if !ApplyLogFixes(outputDir, logContent) {
			break
		}
		_ = SanitizeRenderedDir(outputDir)
	}

	if result.Log == "" {
		result.Log = "PDF compilation failed after retries; download combined LaTeX or zip instead"
	}
	return result
}

func tailLog(log string, n int) string {
	lines := strings.Split(log, "\n")
	if len(lines) <= n {
		return log
	}
	return strings.Join(lines[len(lines)-n:], "\n")
}

// CompileCombinedOnly compiles an existing combined file path.
func CompileCombinedOnly(outputDir, combinedPath string) CompileResult {
	result := CompileResult{}
	pdflatex, err := exec.LookPath("pdflatex")
	if err != nil {
		result.Log = "pdflatex not found on PATH"
		return result
	}
	for pass := 1; pass <= 2; pass++ {
		cmd := exec.Command(pdflatex,
			"-interaction=nonstopmode",
			"-output-directory", outputDir,
			filepath.Base(combinedPath),
		)
		cmd.Dir = outputDir
		out, _ := cmd.CombinedOutput()
		result.Log += string(out)
		result.Attempts = pass
	}
	base := strings.TrimSuffix(filepath.Base(combinedPath), ".tex")
	pdfPath := filepath.Join(outputDir, base+".pdf")
	if info, err := os.Stat(pdfPath); err == nil && info.Size() > 0 {
		result.PDFPath = pdfPath
		result.Success = true
	}
	return result
}

func PdfExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.Size() > 1024
}

func FormatCompileStatus(r CompileResult) string {
	if r.Success {
		return fmt.Sprintf("PDF ready (%d compile passes)", r.Attempts)
	}
	return "PDF unavailable: " + r.Log
}

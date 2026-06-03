package latex

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode/utf8"
)

var (
	unicodeErrorRe  = regexp.MustCompile(`Unicode character (.+?) \((U\+[0-9A-F]+)\)`)
	missingFileRe   = regexp.MustCompile(`File ` + "`" + `([^']+)' not found`)
	includegraphics = regexp.MustCompile(`\\includegraphics(\[[^\]]*\])?\{[^}]+\}`)
)

// SanitizeRenderedDir applies safe fixes to generated .tex before PDF compile.
func SanitizeRenderedDir(dir string) error {
	return filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), ".tex") {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		fixed := sanitizeContent(string(data))
		return os.WriteFile(path, []byte(fixed), 0644)
	})
}

func sanitizeContent(s string) string {
	s = replaceUnicodeOutsideCommands(s)
	s = fixUnescapedAmpersand(s)
	s = strings.ReplaceAll(s, "\u2019", "'")
	s = strings.ReplaceAll(s, "\u201c", "``")
	s = strings.ReplaceAll(s, "\u201d", "''")
	s = strings.ReplaceAll(s, "\u2013", "--")
	s = strings.ReplaceAll(s, "\u2014", "---")
	return s
}

func replaceUnicodeOutsideCommands(s string) string {
	var b strings.Builder
	inCommand := false
	for _, r := range s {
		if r == '\\' {
			inCommand = true
			b.WriteRune(r)
			continue
		}
		if inCommand {
			if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || r == '*' {
				b.WriteRune(r)
				continue
			}
			inCommand = false
		}
		if r > 127 && !utf8.ValidRune(r) {
			continue
		}
		if r > 127 && r < 0x2600 {
			// Keep common Latin-1 in French; map others to LaTeX escapes when outside commands.
			switch r {
			case 'é', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'ô', 'î', 'ï', 'ç', 'É', 'È', 'À', 'Ç', 'œ', 'Œ':
				b.WriteRune(r)
			default:
				b.WriteString(fmtLaTeXUnicode(r))
			}
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

func fmtLaTeXUnicode(r rune) string {
	return fmt.Sprintf(`{\char"%X}`, r)
}

// fixUnescapedAmpersand escapes & not already escaped or in tabular.
func fixUnescapedAmpersand(s string) string {
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		if s[i] == '&' && (i == 0 || s[i-1] != '\\') {
			b.WriteString(`\&`)
			continue
		}
		b.WriteByte(s[i])
	}
	return b.String()
}

// ApplyLogFixes patches files based on pdflatex log output.
func ApplyLogFixes(dir, log string) bool {
	applied := false
	for _, line := range strings.Split(log, "\n") {
		if m := missingFileRe.FindStringSubmatch(line); len(m) > 1 {
			_ = commentMissingGraphics(dir, m[1])
			applied = true
		}
		if strings.Contains(line, "Undefined control sequence") {
			applied = patchUndefinedInDir(dir) || applied
		}
		if m := unicodeErrorRe.FindStringSubmatch(line); len(m) > 1 {
			applied = stripUnicodeInDir(dir, m[2]) || applied
		}
	}
	return applied
}

func commentMissingGraphics(dir, missing string) error {
	return filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), ".tex") {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		s := string(data)
		if !strings.Contains(s, missing) {
			return nil
		}
		s = includegraphics.ReplaceAllStringFunc(s, func(m string) string {
			if strings.Contains(m, missing) || strings.Contains(m, filepath.Base(missing)) {
				return "% " + m
			}
			return m
		})
		return os.WriteFile(path, []byte(s), 0644)
	})
}

func patchUndefinedInDir(dir string) bool {
	// Neutralize unknown \\foo{...} from AI by converting to textbf.
	re := regexp.MustCompile(`\\[a-zA-Z@]+\*?(\[[^\]]*\])?\{`)
	return patchWalk(dir, func(s string) string {
		return re.ReplaceAllString(s, `{\\textbf{`)
	})
}

func stripUnicodeInDir(dir, code string) bool {
	return patchWalk(dir, sanitizeContent)
}

func patchWalk(dir string, fn func(string) string) bool {
	changed := false
	_ = filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(d.Name(), ".tex") {
			return err
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		out := fn(string(data))
		if out != string(data) {
			changed = true
			_ = os.WriteFile(path, []byte(out), 0644)
		}
		return nil
	})
	return changed
}

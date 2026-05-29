package core

import (
	"micro-cer/internal/core/reader"
	"strings"
)

type Extractor struct {
	rules   []rule
	ignore  map[string]struct{}
	rank    map[string]int
	started bool
}

type rule struct {
	key     string
	section string
}

func NewExtractor() *Extractor {
	rules := []rule{
		{"mots cles", "keywords"},
		{"contexte", "context"},
		{"besoins", "needs"},
		{"contraintes", "constraints"},
		{"problematique", "problems"},
		{"generalisation", "generalisation"},
		{"généralisation", "generalisation"},
		{"pistes de solutions", "pistes"},
		{"pistes de solution", "pistes"},
		{"piste de solution", "pistes"},
		{"plan d action", "plan"},
		{"plan d'action", "plan"},
		{"plan daction", "plan"},
		{"plan d'action", "plan"},
		{"plan daction", "plan"},
	}

	rank := make(map[string]int)
	sections := []string{"keywords", "context", "needs", "constraints", "problems", "generalisation", "pistes", "plan"}
	for i, section := range sections {
		rank[section] = i + 1
	}

	return &Extractor{
		rules: rules,
		ignore: map[string]struct{}{
			"prendre connaissances de la situation et la clarifier": {},
			"analyse des besoins": {},
		},
		rank: rank,
	}
}

func (e *Extractor) Extract(filePath string) (*Prosit, error) {
	lines, err := reader.ReadFileAsLines(filePath)
	if err != nil {
		return nil, err
	}

	data := make(map[string][]string)
	for _, r := range e.rules {
		data[r.section] = nil
	}

	var section string

	for _, raw := range lines {
		line := strings.TrimSpace(raw)
		if line == "" {
			continue
		}

		line = stripNumbering(line)
		norm := normalize(line)

		if e.shouldIgnore(norm) {
			section = ""
			continue
		}

		if !e.started && strings.Contains(norm, "mots cles") {
			e.started = true
			section = "keywords"

			// In some DOCX exports, the header and the first keyword(s) are on
			// the same line, e.g. "Mots clés: foo, bar". Capture the remainder.
			if idx := strings.Index(norm, "mots cles"); idx >= 0 {
				remainder := strings.TrimSpace(norm[idx+len("mots cles"):])
				remainder = strings.TrimLeft(remainder, ":.-—– ")
				if remainder != "" {
					e.append(&data, section, remainder)
				}
			}
			continue
		}

		if next, matchedKey, ok := e.match(norm); ok {
			if e.forward(section, next) {
				section = next
			}

			// Same idea as above: if the paragraph contains both the header and
			// some content, don't discard everything after the header.
			remainder := strings.TrimSpace(strings.TrimPrefix(norm, matchedKey))
			remainder = strings.TrimLeft(remainder, ":.-—– ")
			if remainder != "" && section != "" && e.forward(section, next) {
				e.append(&data, section, remainder)
			}
			continue
		}

		// If we found a section but can't move forward,
		// it means the next section doesn't exist in document
		// so we should continue with current section
		if section != "" {
			e.append(&data, section, line)
		}
	}

	return &Prosit{
		Keywords:       data["keywords"],
		Context:        join(data["context"]),
		Needs:          data["needs"],
		Constraints:    data["constraints"],
		Problems:       data["problems"],
		Generalisation: join(data["generalisation"]),
		Pistes:         data["pistes"],
		Plan:           data["plan"],
	}, nil
}

func (e *Extractor) match(text string) (string, string, bool) {
	for _, r := range e.rules {
		// Some documents contain minor formatting differences on section headers
		// (extra spaces/non-breaking spaces, trailing punctuation). After normalization,
		// we still keep matching strict-ish but allow the key to be a prefix.
		if text == r.key || strings.HasPrefix(text, r.key) {
			return r.section, r.key, true
		}
	}
	return "", "", false
}

func (e *Extractor) forward(current, next string) bool {
	if current == "" {
		return true
	}
	// Allow backward movement for constraints section
	if next == "constraints" && current == "problems" {
		return true
	}
	// Allow skipping missing sections - if next section doesn't exist in document, continue
	currentRank, currentExists := e.rank[current]
	nextRank, nextExists := e.rank[next]

	// If current section exists but next doesn't, allow forward movement
	if currentExists && !nextExists {
		return true
	}

	// Normal ranking comparison if both exist
	return nextRank >= currentRank
}

func (e *Extractor) shouldIgnore(text string) bool {
	_, ok := e.ignore[text]
	return ok || strings.HasPrefix(text, "prosit aller")
}

func (e *Extractor) append(data *map[string][]string, section, value string) {
	(*data)[section] = append((*data)[section], value)
}

func join(v []string) string {
	return strings.Join(v, " ")
}

func normalize(text string) string {
	text = strings.ToLower(strings.TrimSpace(text))

	// Some Word exports use non-breaking spaces or weird whitespace. Normalize them
	// so header comparisons are reliable.
	text = strings.ReplaceAll(text, "\u00A0", " ") // NBSP
	text = strings.ReplaceAll(text, "\u2007", " ") // figure space
	text = strings.ReplaceAll(text, "\u202F", " ") // narrow NBSP

	// Collapse consecutive whitespace to a single space.
	text = strings.Join(strings.Fields(text), " ")

	replacements := map[string]string{
		"é": "e", "è": "e", "ê": "e", "ë": "e",
		"à": "a", "á": "a", "â": "a",
		"î": "i", "ï": "i", "ô": "o", "ö": "o",
		"ù": "u", "û": "u", "ü": "u",
		"ç": "c",
		"'": "", "\u2019": "",
		":": "", ".": "", ";": "",
	}

	for old, n := range replacements {
		text = strings.ReplaceAll(text, old, n)
	}
	return text
}

func stripNumbering(line string) string {
	line = strings.TrimSpace(line)

	// Remove numeric prefixes
	for len(line) > 0 && line[0] >= '0' && line[0] <= '9' {
		line = strings.TrimLeft(line, "0123456789. -")
		break
	}

	// Remove Roman numeral prefixes
	line = strings.TrimLeft(line, "IVX. -")
	return strings.TrimSpace(line)
}

package generator

import (
	"context"
	"fmt"
	"log"
	"strings"

	"micro-cer/internal/ai"
	"micro-cer/internal/core"
)

// --- Structs defining the expected JSON from AI for Study Topics ---

type StudyPoint struct {
	Concept    string   `json:"concept"`
	Definition string   `json:"definition"`
	Examples   []string `json:"examples"`
}

type StudyTopicData struct {
	Points []StudyPoint `json:"points"`
}

// --- The Realisation Class ---

type Realisation struct {
	assistant *ai.Assistant
}

func NewRealisation(assistant *ai.Assistant) *Realisation {
	return &Realisation{
		assistant: assistant,
	}
}

// GenerateKeywords fetches definitions and returns them as a map.
func (r *Realisation) GenerateKeywords(ctx context.Context, clientID string, keywords []string) (map[string]string, error) {
	if len(keywords) == 0 {
		return map[string]string{}, nil
	}

	keywordsStr := strings.Join(keywords, ", ")

	prompt := `You are a technical assistant helping a software engineering student.
Please provide a concise, technical definition for each of the following keywords:

Keywords: ` + keywordsStr + `

You MUST respond ONLY with a valid JSON object where the keys are the exact keywords 
and the values are their definitions. Do not include markdown formating like %%%json.

IMPORTANT - CONSIGNES DE FORMATAGE LATEX :
- Les définitions des mots-clés et leur contenu NE DOIVENT PAS être juste jetés en vrac ("dumped"). Ils DOIVENT être du LaTeX valide, pertinent et prêt à être affiché.
- Tout symbole mathématique, lettre grecque (theta, omega, etc.) ou notation de complexité (Big O, small o) DOIT être écrit en code LaTeX valide dans un environnement mathématique (par exemple $\theta$, $\Omega$, $\mathcal{O}(n)$).
- N'utilise AUCUN caractère Unicode brut pour ces symboles.
- Échappe adéquatement les caractères spéciaux courants en LaTeX (%, &, _, #, $) dans les définitions pour garantir la compilation.`

	log.Printf("Requesting definitions for %d keywords in one batch...\n", len(keywords))

	cacheKey := fmt.Sprintf("keywords_%s", keywordsStr)

	// Use map[string]string as the generic type to parse dynamic JSON keys!
	data, err := GenerateJSON[map[string]string](
		ctx, r.assistant, "realisation", cacheKey, prompt, clientID, false,
	)

	if err != nil {
		return nil, err
	}

	return *data, nil
}

// StudyTopic fetches detailed analysis for a specific action plan topic.
func (r *Realisation) StudyTopic(ctx context.Context, clientID, topic string) string {
	prompt := `Tu es un assistant académique. Rédige une étude sur le sujet suivant : ` + topic + `

Ta réponse DOIT être un objet JSON strict au format exact suivant:
{
    "points": [
        {
            "concept": "Nom du concept ou de la sous-partie",
            "definition": "Une explication détaillée et technique",
            "examples": ["Exemple concret 1", "Exemple concret 2"]
        }
    ]
}

Renvoie SEULEMENT ce JSON, sans formatage Markdown supplémentaire. Ajoute 2 ou 3 concepts maximum.

IMPORTANT - CONSIGNES DE FORMATAGE LATEX :
- Tout symbole mathématique, lettre grecque DOIT être écrit en code LaTeX valide dans un environnement mathématique (par exemple $\theta$, $\mathcal{O}(n)$).
- N'utilise AUCUN caractère Unicode brut pour ces symboles.
- Le contenu DOIT être directement compilable en LaTeX (échappe adéquatement les caractères spéciaux comme %, &, _, #, $).`

	log.Printf("Generating study for topic: %s...\n", topic)

	// True for useMemory so the AI remembers previous topics it studied
	data, err := GenerateJSON[StudyTopicData](
		ctx, r.assistant, "realisation", topic, prompt, clientID, true,
	)

	if err != nil {
		log.Printf("Error generating study topic: %v\n", err)
		return fmt.Sprintf("\\subsection{%s}\nErreur de parsing AI pour cette partie.\n", topic)
	}

	var latex strings.Builder
	for _, p := range data.Points {
		safeConcept := core.LatexEscape(p.Concept)
		safeDef := core.LatexEscape(p.Definition)

		latex.WriteString(fmt.Sprintf("\\subsection{%s}\n", safeConcept))
		latex.WriteString(fmt.Sprintf("\\textbf{Définition :} %s\n\n", safeDef))

		if len(p.Examples) > 0 {
			latex.WriteString("\\textbf{Exemples :}\n\\begin{itemize}\n")
			for _, ex := range p.Examples {
				safeEx := core.LatexEscape(ex)
				latex.WriteString(fmt.Sprintf("    \\item %s\n", safeEx))
			}
			latex.WriteString("\\end{itemize}\n\n")
		}
	}

	return strings.TrimSpace(latex.String())
}

// GenerateFullRealisation executes the full pipeline: keywords -> action plan topics
func (r *Realisation) GenerateFullRealisation(ctx context.Context, clientID string, keywords []string, actionPlan []string) string {
	var finalLatexBlocks []string

	// 1. Process and format Keywords
	if len(keywords) > 0 {
		finalLatexBlocks = append(finalLatexBlocks, "\\section{Définition des mots-clés}")

		definitions, err := r.GenerateKeywords(ctx, clientID, keywords)
		if err != nil {
			// Fallback if parsing fails, dump the error context
			finalLatexBlocks = append(finalLatexBlocks, "\\begin{verbatim}")
			finalLatexBlocks = append(finalLatexBlocks, fmt.Sprintf("Erreur AI: %v", err))
			finalLatexBlocks = append(finalLatexBlocks, "\\end{verbatim}")
		} else {
			finalLatexBlocks = append(finalLatexBlocks, "\\begin{itemize}")
			for kw, df := range definitions {
				safeKw := core.LatexEscape(kw)
				safeDf := core.LatexEscape(df)
				finalLatexBlocks = append(finalLatexBlocks, fmt.Sprintf("    \\item \\textbf{%s} : %s", safeKw, safeDf))
			}
			finalLatexBlocks = append(finalLatexBlocks, "\\end{itemize}")
		}
		finalLatexBlocks = append(finalLatexBlocks, "\n")
	}

	// 2. Process Action Plan Topics
	for i, topic := range actionPlan {
		topicLower := strings.ToLower(topic)
		skipTriggers := []string{"mot clé", "mots clés", "mot-clé", "mots-clés", "mot cle", "mots cles"}

		shouldSkip := false
		for _, trigger := range skipTriggers {
			if strings.Contains(topicLower, trigger) {
				shouldSkip = true
				break
			}
		}

		if shouldSkip {
			log.Printf("Skipping topic '%s' as keywords have already been processed.\n", topic)
			continue
		}

		log.Printf("Processing action plan topic %d/%d: %s...\n", i+1, len(actionPlan), topic)
		finalLatexBlocks = append(finalLatexBlocks, fmt.Sprintf("\\section{%s}", topic))

		topicContent := r.StudyTopic(ctx, clientID, topic)
		finalLatexBlocks = append(finalLatexBlocks, topicContent)
		finalLatexBlocks = append(finalLatexBlocks, "\n")
	}

	return strings.Join(finalLatexBlocks, "\n")
}

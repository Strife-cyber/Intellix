package generator

import (
	"context"
	"fmt"
	"log"
	"strings"

	"micro-cer/internal/ai"
	"micro-cer/internal/core"
)

// --- Structs defining the expected JSON from AI ---

type BilanItem struct {
	Title       string `json:"title"`
	Explanation string `json:"explanation"`
}

type BilanData struct {
	Strengths    []BilanItem `json:"strengths"`
	Difficulties []BilanItem `json:"difficulties"`
	Learnings    []BilanItem `json:"learnings"`
	Perspectives []BilanItem `json:"perspectives"`
}

// --- The Bilan Class ---

type Bilan struct {
	assistant *ai.Assistant // Assuming ai.Assistant is the correct type in your package
}

func NewBilan(assistant *ai.Assistant) *Bilan {
	return &Bilan{
		assistant: assistant,
	}
}

// generateLatexSubSection is a helper to keep the string building clean
func generateLatexSubSection(sb *strings.Builder, title string, items []BilanItem) {
	if len(items) == 0 {
		return
	}
	sb.WriteString(fmt.Sprintf("\\subsection{%s}\n\\begin{itemize}\n", title))
	for _, item := range items {
		// Escape any stray percent signs that might ruin LaTeX compilation
		safeTitle := core.LatexEscape(item.Title)
		safeExp := core.LatexEscape(item.Explanation)
		sb.WriteString(fmt.Sprintf("    \\item \\textbf{%s} : %s\n", safeTitle, safeExp))
	}
	sb.WriteString("\\end{itemize}\n\n")
}

func (b *Bilan) GenerateFullSection(ctx context.Context, clientID string, difficulties, perspectives []string) string {
	// 1. Handle dynamic injection of user-provided difficulties
	var diffText string
	if len(difficulties) > 0 {
		diffText = "Voici les difficultés spécifiques rencontrées par l'étudiant à adapter en points :\n"
		for _, d := range difficulties {
			diffText += fmt.Sprintf("- %s\n", d)
		}
	} else {
		diffText = "Déduis logiquement 3 difficultés probables et académiques rencontrées lors de l'étude de ce sujet technique."
	}

	// 2. Handle dynamic injection of user-provided perspectives
	var perspText string
	if len(perspectives) > 0 {
		perspText = "Voici les perspectives d'amélioration spécifiques à adapter en points :\n"
		for _, p := range perspectives {
			perspText += fmt.Sprintf("- %s\n", p)
		}
	} else {
		perspText = "Déduis logiquement 3 à 4 perspectives pertinentes pour la suite de ce travail."
	}

	// 3. Build Prompt
	prompt := `Tu es un assistant académique. Rédige le 'Bilan du travail' d'un rapport Prosit.

` + diffText + `
` + perspText + `

Ta réponse DOIT être un objet JSON strict au format exact suivant:
{
    "strengths": [
        {"title": "Point fort 1", "explanation": "Explication..."}
    ],
    "difficulties": [
        {"title": "Difficulté 1", "explanation": "Explication..."}
    ],
    "learnings": [
        {"title": "Apprentissage 1", "explanation": "Explication..."}
    ],
    "perspectives": [
        {"title": "Perspective 1", "explanation": "Explication..."}
    ]
}

Renvoie SEULEMENT ce JSON. Chaque tableau doit avoir environ 3 éléments.

IMPORTANT - CONSIGNES DE FORMATAGE LATEX :
- Tout symbole mathématique, lettre grecque (theta, omega, etc.) ou notation de complexité (Big O, small o) DOIT être écrit en code LaTeX valide dans un environnement mathématique (par exemple $\theta$, $\Omega$, $\mathcal{O}(n)$).
- N'utilise AUCUN caractère Unicode brut pour ces symboles.
- Le contenu (valeurs du JSON) DOIT être directement compilable en LaTeX (échappe adéquatement les caractères spéciaux comme %, &, _, #, $).`

	log.Println("Generating Chapter 6: Bilan du travail...")

	// 4. Cache Key Generation
	safeDiff := diffText
	if len(safeDiff) > 50 {
		safeDiff = safeDiff[:50]
	}
	safePersp := perspText
	if len(safePersp) > 50 {
		safePersp = safePersp[:50]
	}
	cacheKey := fmt.Sprintf("bilan_%s_%s", safeDiff, safePersp)

	// 5. Use the Base Engine for AI and Parsing
	// false = no conversational memory needed for strict JSON generation
	data, err := GenerateJSON[BilanData](
		ctx, b.assistant, "bilan", cacheKey, prompt, clientID, false,
	)

	if err != nil {
		log.Printf("Bilan Generation Error: %v\n", err)
		return "\\section{BILAN DU TRAVAIL}\nErreur de génération AI."
	}

	// 6. Build LaTeX String
	var latex strings.Builder
	latex.WriteString("\\section{BILAN DU TRAVAIL}\n\n")

	generateLatexSubSection(&latex, "Points forts", data.Strengths)
	generateLatexSubSection(&latex, "Difficultés rencontrées", data.Difficulties)
	generateLatexSubSection(&latex, "Apprentissages", data.Learnings)
	generateLatexSubSection(&latex, "Perspectives d'amélioration", data.Perspectives)

	return strings.TrimSpace(latex.String())
}

package generator

import (
	"context"
	"fmt"
	"log"
	"strings"

	"micro-cer/ai"
	"micro-cer/core"
)

type ValidationData struct {
	Status      string   `json:"status"`
	Explanation string   `json:"explanation"`
	Proofs      []string `json:"proofs"`
}

// --- The Validation Class ---

type Validation struct {
	assistant *ai.Assistant
}

func NewValidation(assistant *ai.Assistant) *Validation {
	return &Validation{
		assistant: assistant,
	}
}

// Validate processes a single hypothesis
func (v *Validation) Validate(ctx context.Context, clientID string, hypothesisNumber int, hypothesisText string) string {
	prompt := fmt.Sprintf(`Tu es un assistant académique. Évalue et valide l'hypothèse suivante en te basant sur le contexte du projet.

Hypothèse à valider :
%d. %s

Ta réponse DOIT être rédigée EXCLUSIVEMENT sous forme d'objet JSON valide, AUCUN texte supplémentaire.
Structure attendue :
{
    "status": "CONFIRMÉE ou INFIRMÉE ou NUANCÉE",
    "explanation": "Explication complète de la validation (3-4 phrases)",
    "proofs": [
        "Preuve concrète 1 extraite du travail",
        "Preuve concrète 2 extraite du travail"
    ]
}

IMPORTANT - CONSIGNES DE FORMATAGE LATEX :
- Tout symbole mathématique, lettre grecque (theta, omega, etc.) ou notation de complexité (Big O, small o) DOIT être écrit en code LaTeX valide dans un environnement mathématique (par exemple $\theta$, $\Omega$, $\mathcal{O}(n)$).
- N'utilise AUCUN caractère Unicode brut pour ces symboles.
- Le contenu (valeurs du JSON) DOIT être directement compilable en LaTeX (échappe adéquatement les caractères spéciaux courants comme %%, &, _, #, $).`, hypothesisNumber, hypothesisText)

	log.Printf("Validating hypothesis %d...\n", hypothesisNumber)

	// We use the exact hypothesis text as the cache key.
	// We set useMemory to TRUE because the validation NEEDS to remember the context
	// of the "Realisation" phase to extract concrete proofs.
	data, err := GenerateJSON[ValidationData](
		ctx, v.assistant, "validation", hypothesisText, prompt, clientID, true,
	)

	if err != nil {
		log.Printf("Validation Error for hypothesis %d: %v\n", hypothesisNumber, err)
		return fmt.Sprintf("\\subsection{Hypothèse %d : %s}\n\\textbf{Validation :} Non générée suite à une erreur de l'IA.\n", hypothesisNumber, hypothesisText)
	}

	// Format Output as LaTeX
	var latex strings.Builder
	latex.WriteString(fmt.Sprintf("\\subsection{Hypothèse %d : %s}\n", hypothesisNumber, hypothesisText))
	latex.WriteString(fmt.Sprintf("\\textbf{Validation :} %s\n\n", data.Status))

	// Escape stray percent signs to prevent LaTeX compilation issues
	safeExp := core.LatexEscape(data.Explanation)
	latex.WriteString(fmt.Sprintf("%s\n\n", safeExp))

	latex.WriteString("\\textbf{Preuves :}\n\\begin{itemize}\n")
	for _, proof := range data.Proofs {
		safeProof := core.LatexEscape(proof)
		latex.WriteString(fmt.Sprintf("    \\item %s\n", safeProof))
	}
	latex.WriteString("\\end{itemize}\n")

	return latex.String()
}

// ValidateAll helper method to validate a list of hypotheses one after another,
// combining them into a single LaTeX output block.
func (v *Validation) ValidateAll(ctx context.Context, clientID string, hypotheses []string) string {
	var combinedLatex strings.Builder

	for i, hypText := range hypotheses {
		validationLatex := v.Validate(ctx, clientID, i+1, hypText)
		combinedLatex.WriteString(validationLatex)
		combinedLatex.WriteString("\n\n")
	}

	return strings.TrimSpace(combinedLatex.String())
}

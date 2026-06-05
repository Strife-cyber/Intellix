package generator

import (
	"context"
	"fmt"
	"log"
	"strings"

	"micro-cer/internal/ai"
)

// --- The Validation Class ---

type Validation struct {
	assistant *ai.Assistant
}

func NewValidation(assistant *ai.Assistant) *Validation {
	return &Validation{
		assistant: assistant,
	}
}

// validatePrompt returns a detailed Markdown prompt for validating a hypothesis.
func (v *Validation) validatePrompt(hypothesisNumber int, hypothesisText string) string {
	return fmt.Sprintf(`Tu es un assistant académique spécialisé en ingénierie. Tu participes à la rédaction d'un rapport CER (Compte Rendu d'Étude et de Recherche).

## Consignes de formatage
- Rédige UNIQUEMENT en Markdown.
- Utilise `+"`##`"+` pour le titre (Hypothèse N).
- Utilise `+"`###`"+` pour les sous-sections.
- Utilise `+"`$...$`"+` pour les formules mathématiques si nécessaire.
- Utilise `+"`-`"+` pour les listes.
- Mets en `+"`**gras**`"+` les termes importants.
- N'utilise PAS de JSON.

## Contexte
Tu dois évaluer et valider une hypothèse de travail formulée dans le cadre d'un projet d'étudiant en école d'ingénieurs.

## Consignes rédactionnelles
1. **Statut de validation** : Commence par indiquer clairement si l'hypothèse est CONFIRMÉE, INFIRMÉE, ou NUANCÉE.
2. **Explication détaillée** : Justifie ton évaluation en 4 à 6 phrases, en te basant sur le contexte du projet (transmis dans ta mémoire).
3. **Preuves concrètes** : Fournis 2 à 3 preuves tangibles extraites du travail réalisé, qui soutiennent ta conclusion.
4. **Analyse critique** : Si l'hypothèse est nuancée, explique les conditions dans lesquelles elle est valide et celles où elle ne l'est pas.
5. **Recommandations** : Propose éventuellement des pistes d'amélioration ou des points de vigilance.

Hypothèse à valider :
%d. %s

Structure attendue :

## Hypothèse %d : %s

**Statut :** CONFIRMÉE / INFIRMÉE / NUANCÉE

### Justification détaillée
[4-6 phrases expliquant la validation]

### Preuves à l'appui
- Preuve 1 : [Description de la preuve]
- Preuve 2 : [Description de la preuve]
- Preuve 3 : [Description de la preuve, si applicable]

### Analyse et recommandations
[Analyse critique et suggestions d'amélioration]`, hypothesisNumber, hypothesisText, hypothesisNumber, hypothesisText)
}

// Validate processes a single hypothesis and returns Markdown.
func (v *Validation) Validate(ctx context.Context, clientID string, hypothesisNumber int, hypothesisText string) string {
	prompt := v.validatePrompt(hypothesisNumber, hypothesisText)

	log.Printf("Validating hypothesis %d...\n", hypothesisNumber)

	// useMemory = TRUE so the AI remembers the context of the "Realisation" phase
	data, err := GenerateMarkdown(
		ctx, v.assistant, "validation", hypothesisText, prompt, clientID, true,
	)

	if err != nil {
		log.Printf("Validation Error for hypothesis %d: %v\n", hypothesisNumber, err)
		return fmt.Sprintf("## Hypothèse %d : %s\n\n**Validation :** Non générée suite à une erreur de l'IA.\n", hypothesisNumber, hypothesisText)
	}

	return data
}

// ValidateAll validates a list of hypotheses one after another,
// combining them into a single Markdown block, then converting to LaTeX.
func (v *Validation) ValidateAll(ctx context.Context, clientID string, hypotheses []string) string {
	var mdParts []string

	for i, hypText := range hypotheses {
		validationMD := v.Validate(ctx, clientID, i+1, hypText)
		mdParts = append(mdParts, validationMD)
	}

	fullMD := strings.Join(mdParts, "\n\n")
	return MustMarkdownToLatex(fullMD)
}

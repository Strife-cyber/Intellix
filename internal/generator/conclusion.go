package generator

import (
	"context"
	"fmt"
	"strings"

	"micro-cer/internal/ai"
)

// --- The Conclusion Class ---

type Conclusion struct {
	assistant *ai.Assistant
}

func NewConclusion(assistant *ai.Assistant) *Conclusion {
	return &Conclusion{assistant: assistant}
}

// GenerateConclusion generates the conclusion section in Markdown.
func (c *Conclusion) GenerateConclusion(ctx context.Context, clientID string) string {
	prompt := `Tu es un assistant académique spécialisé en ingénierie. Tu rédiges la section **Conclusion** d'un rapport CER (Compte Rendu d'Étude et de Recherche) pour un étudiant en école d'ingénieurs.

## Consignes de formatage
- Rédige UNIQUEMENT en Markdown.
- Utilise ` + "`##`" + ` pour le titre.
- Utilise ` + "`###`" + ` pour les sous-sections.
- Utilise ` + "`$...$`" + ` pour les formules mathématiques.
- Utilise ` + "`-`" + ` pour les listes.
- N'utilise PAS de JSON.

## Consignes rédactionnelles
Rédige une conclusion complète et structurée comprenant :

1. **Résumé de l'étude** (2-3 phrases) : Synthétise la portée et les objectifs du travail réalisé.
2. **Principaux enseignements** (4-6 points) : Détaille les apprentissages clés sous forme de liste structurée. Pour chaque enseignement :
   - **Titre** de l'enseignement
   - **Explication** détaillée de ce qui a été appris et pourquoi c'est important
3. **Clôture** (2-3 phrases) : Ouvre sur les perspectives d'application pratique des concepts étudiés et leur importance dans le contexte professionnel.

Structure attendue :

## Conclusion

[Résumé de l'étude - 2 à 3 phrases]

### Principaux enseignements

- **Titre enseignement 1** : Explication détaillée...
- **Titre enseignement 2** : Explication détaillée...
- **Titre enseignement 3** : Explication détaillée...
- **Titre enseignement 4** : Explication détaillée...

### Perspectives

[Paragraphe de clôture sur les applications pratiques et l'importance des concepts étudiés]`

	data, err := GenerateMarkdown(
		ctx, c.assistant, "conclusion", "main_conclusion_md", prompt, clientID, true,
	)

	if err != nil {
		fmt.Printf("Error generating conclusion: %v\n", err)
		return "## Conclusion\n\n*Erreur de génération AI.*\n"
	}

	return data
}

// GenerateRetourObjectifs generates the objectives review section in Markdown.
func (c *Conclusion) GenerateRetourObjectifs(ctx context.Context, clientID string, objectifs []string) string {
	if len(objectifs) == 0 {
		return "## Retour sur les objectifs\n\n*Aucun objectif fourni.*\n"
	}

	var sb strings.Builder
	for i, obj := range objectifs {
		sb.WriteString(fmt.Sprintf("- Objectif %d : %s\n", i+1, obj))
	}
	objectifsStr := sb.String()

	prompt := `Tu es un assistant académique spécialisé en ingénierie. Tu rédiges la section **Retour sur les objectifs** d'un rapport CER.

## Consignes de formatage
- Rédige UNIQUEMENT en Markdown.
- Utilise ` + "`##`" + ` pour le titre.
- Utilise ` + "`$...$`" + ` pour les formules mathématiques.
- N'utilise PAS de JSON.

## Consignes rédactionnelles
Pour chaque objectif initial, évalue son niveau d'atteinte et fournis une preuve concrète.

Voici la liste des objectifs initiaux :
` + objectifsStr + `

Pour chaque objectif, structure ta réponse ainsi :

- **Objectif :** [Rappel de l'objectif]
  - **Statut :** Atteint / Partiellement atteint / Non atteint
  - **Preuve :** [Description de la preuve montrant comment l'objectif a été atteint, avec des détails concrets]

Termine par une phrase de conclusion générale sur l'atteinte globale des objectifs.

Structure attendue :

## Retour sur les objectifs

- **Objectif :** [Objectif 1]
  - **Statut :** Atteint / Partiellement atteint / Non atteint
  - **Preuve :** [Preuve concrète...]

- **Objectif :** [Objectif 2]
  - **Statut :** Atteint / Partiellement atteint / Non atteint
  - **Preuve :** [Preuve concrète...]

**Conclusion :** [Phrase finale sur l'atteinte globale des objectifs]`

	data, err := GenerateMarkdown(
		ctx, c.assistant, "conclusion", "objectifs_review_md", prompt, clientID, true,
	)

	if err != nil {
		fmt.Printf("Error generating retour objectifs: %v\n", err)
		return "## Retour sur les objectifs\n\n*Erreur de génération AI.*\n"
	}

	return data
}

// GenerateFullSection assembles Conclusion + RetourObjectifs and converts to LaTeX.
func (c *Conclusion) GenerateFullSection(ctx context.Context, clientID string, objectifs []string) string {
	fmt.Println("Starting Generation of Final Chapter...")

	conclusionMD := c.GenerateConclusion(ctx, clientID)
	retourMD := c.GenerateRetourObjectifs(ctx, clientID, objectifs)

	fullMD := fmt.Sprintf("# CONCLUSION ET RETOUR DES OBJECTIFS\n\n%s\n\n%s", conclusionMD, retourMD)
	return MustMarkdownToLatex(fullMD)
}

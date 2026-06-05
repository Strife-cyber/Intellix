package generator

import (
	"context"
	"fmt"
	"log"

	"micro-cer/internal/ai"
)

// --- The Bilan Class ---

type Bilan struct {
	assistant *ai.Assistant
}

func NewBilan(assistant *ai.Assistant) *Bilan {
	return &Bilan{
		assistant: assistant,
	}
}

// GenerateFullSection generates the full Bilan section in Markdown and converts to LaTeX.
func (b *Bilan) GenerateFullSection(ctx context.Context, clientID string, difficulties, perspectives []string) string {
	// Build dynamic sections for difficulties and perspectives
	var diffText string
	if len(difficulties) > 0 {
		diffText = "Voici les difficultés spécifiques rencontrées par l'étudiant à intégrer dans ton analyse :\n"
		for _, d := range difficulties {
			diffText += fmt.Sprintf("- %s\n", d)
		}
	} else {
		diffText = "Déduis logiquement 3 à 4 difficultés probables et académiques rencontrées lors de l'étude de ce sujet technique. Sois précis et contexte."
	}

	var perspText string
	if len(perspectives) > 0 {
		perspText = "Voici les perspectives d'amélioration spécifiques fournies par l'étudiant à intégrer dans ton analyse :\n"
		for _, p := range perspectives {
			perspText += fmt.Sprintf("- %s\n", p)
		}
	} else {
		perspText = "Déduis logiquement 3 à 4 perspectives pertinentes pour la suite de ce travail. Propose des pistes concrètes et réalisables."
	}

	prompt := fmt.Sprintf(`Tu es un assistant académique spécialisé en ingénierie. Tu rédiges la section **Bilan du travail** d'un rapport CER (Compte Rendu d'Étude et de Recherche).

## Consignes de formatage
- Rédige UNIQUEMENT en Markdown.
- Utilise `+"`##`"+` pour le titre principal.
- Utilise `+"`###`"+` pour les sous-sections.
- Utilise `+"`$...$`"+` pour les formules mathématiques.
- Utilise `+"`-`"+` pour les listes à puces.
- Mets en `+"`**gras**`"+` les titres de chaque point.
- N'utilise PAS de JSON.

## Consignes rédactionnelles
Rédige un bilan complet et structuré avec les sections suivantes :

### 1. Points forts
Détaille 3 à 4 points forts du travail réalisé. Pour chaque point :
- Explique pourquoi c'est un point fort
- Montre en quoi cela a contribué à la réussite du projet

### 2. Difficultés rencontrées
%s

Pour chaque difficulté :
- Décris la difficulté de manière précise
- Explique comment elle a été surmontée (ou pourquoi elle persiste)
- Tire un apprentissage de cette difficulté

### 3. Apprentissages
Identifie 3 à 4 apprentissages clés. Pour chaque apprentissage :
- **Titre** : nom de l'apprentissage
- **Explication** : ce qui a été appris et comment cela sera réutilisable

### 4. Perspectives d'amélioration
%s

Pour chaque perspective :
- **Titre** : nom de la perspective
- **Explication** : comment cette amélioration pourrait être mise en œuvre

## Structure attendue

## BILAN DU TRAVAIL

### Points forts
- **Titre point fort 1** : Explication détaillée...
- **Titre point fort 2** : Explication détaillée...

### Difficultés rencontrées
- **Titre difficulté 1** : Description et analyse...
- **Titre difficulté 2** : Description et analyse...

### Apprentissages
- **Titre apprentissage 1** : Explication...
- **Titre apprentissage 2** : Explication...

### Perspectives d'amélioration
- **Titre perspective 1** : Proposition concrète...
- **Titre perspective 2** : Proposition concrète...`, diffText, perspText)

	log.Println("Generating Chapter 6: Bilan du travail...")

	// Build cache key from inputs
	safeDiff := diffText
	if len(safeDiff) > 50 {
		safeDiff = safeDiff[:50]
	}
	safePersp := perspText
	if len(safePersp) > 50 {
		safePersp = safePersp[:50]
	}
	cacheKey := fmt.Sprintf("bilan_md_%s_%s", safeDiff, safePersp)

	data, err := GenerateMarkdown(
		ctx, b.assistant, "bilan", cacheKey, prompt, clientID, false,
	)

	if err != nil {
		log.Printf("Bilan Generation Error: %v\n", err)
		return "\\section{BILAN DU TRAVAIL}\nErreur de génération AI."
	}

	return MustMarkdownToLatex(data)
}

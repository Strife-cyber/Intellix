package generator

import (
	"context"
	"fmt"
	"log"
	"strings"

	"micro-cer/internal/ai"
)

// --- The Realisation Class ---

type Realisation struct {
	assistant *ai.Assistant
}

func NewRealisation(assistant *ai.Assistant) *Realisation {
	return &Realisation{
		assistant: assistant,
	}
}

// GenerateKeywords fetches definitions and returns them as a Markdown string.
func (r *Realisation) GenerateKeywords(ctx context.Context, clientID string, keywords []string) (string, error) {
	if len(keywords) == 0 {
		return "", nil
	}

	keywordsStr := strings.Join(keywords, ", ")

	prompt := `Tu es un assistant académique spécialisé en ingénierie et en sciences. Tu rédiges en français.

## Consignes de formatage
- Rédige UNIQUEMENT en Markdown.
- Utilise ` + "`##`" + ` pour les titres de section.
- Utilise ` + "`$...$`" + ` pour les formules mathématiques inline (par exemple $E = mc^2$, $\theta$, $\mathcal{O}(n)$).
- Utilise ` + "`$$...$$`" + ` pour les blocs mathématiques.
- Utilise ` + "`-`" + ` pour les listes à puces.
- Utilise ` + "`**texte**`" + ` pour mettre en gras les concepts importants.
- N'utilise PAS de JSON, pas de XML, pas de code block inutile.

## Consignes rédactionnelles
- Pour chaque mot-clé, fournis une définition détaillée et technique (3 à 5 phrases).
- Inclus des exemples concrets d'application dans le domaine du génie logiciel.
- Explique pourquoi ce concept est important et où il s'applique.
- Si le mot-clé implique des concepts mathématiques (complexité, algorithmes, etc.), utilise $...$ pour les noter.
- Sois pédagogique : explique comme si tu t'adressais à un étudiant de niveau bac+2/3.

Mots-clés à définir : ` + keywordsStr + `

Structure attendue pour chaque mot-clé :

## Mot-clé : [Nom du mot-clé]

**Définition :** [Définition technique détaillée, 3-5 phrases]

**Exemples concrets :**
- [Exemple 1 avec explication]
- [Exemple 2 avec explication]

**Applications en ingénierie :** [Comment ce concept est utilisé dans le domaine]`

	log.Printf("Requesting definitions for %d keywords in one batch...\n", len(keywords))

	cacheKey := fmt.Sprintf("keywords_md_%s", keywordsStr)

	data, err := GenerateMarkdown(
		ctx, r.assistant, "realisation", cacheKey, prompt, clientID, false,
	)

	if err != nil {
		return "", err
	}

	return data, nil
}

// StudyTopic fetches detailed analysis for a specific action plan topic.
func (r *Realisation) StudyTopic(ctx context.Context, clientID, topic string) string {
	prompt := `Tu es un assistant académique spécialisé en ingénierie. Tu rédiges en français une étude détaillée sur un sujet technique dans le cadre d'un rapport CER (Compte Rendu d'Étude et de Recherche).

## Consignes de formatage
- Rédige UNIQUEMENT en Markdown.
- Utilise ` + "`##`" + ` pour le titre principal du sujet.
- Utilise ` + "`###`" + ` pour les sous-sections (concepts, définitions, exemples).
- Utilise ` + "`$...$`" + ` pour les formules mathématiques inline.
- Utilise ` + "`$$...$$`" + ` pour les blocs mathématiques si nécessaire.
- Utilise ` + "`-`" + ` pour les listes à puces.
- N'utilise PAS de JSON.

## Consignes rédactionnelles
- Rédige une étude complète et détaillée (minimum 300-500 mots).
- Structure ton étude en plusieurs sous-parties claires.
- Explique les concepts fondamentaux liés au sujet.
- Donne des exemples concrets d'implémentation ou d'application.
- Si pertinent, inclus des comparaisons entre différentes approches ou technologies.
- Utilise des notations mathématiques lorsque c'est approprié (complexité, formules, etc.).
- Conclus par une synthèse des points clés à retenir.

Sujet à étudier : ` + topic

	log.Printf("Generating study for topic: %s...\n", topic)

	data, err := GenerateMarkdown(
		ctx, r.assistant, "realisation", topic, prompt, clientID, true,
	)

	if err != nil {
		log.Printf("Error generating study topic: %v\n", err)
		return fmt.Sprintf("## %s\n\n*Erreur de génération AI pour cette partie.*\n", topic)
	}

	return data
}

// GenerateFullRealisation executes the full pipeline: keywords -> action plan topics
func (r *Realisation) GenerateFullRealisation(ctx context.Context, clientID string, keywords []string, actionPlan []string) string {
	var mdParts []string

	// 1. Process keywords
	if len(keywords) > 0 {
		kwMD, err := r.GenerateKeywords(ctx, clientID, keywords)
		if err != nil {
			log.Printf("Keywords generation error: %v\n", err)
			mdParts = append(mdParts, "## Définition des mots-clés\n\n*Erreur de génération AI.*\n")
		} else {
			mdParts = append(mdParts, kwMD)
		}
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
		topicContent := r.StudyTopic(ctx, clientID, topic)
		mdParts = append(mdParts, topicContent)
	}

	fullMD := strings.Join(mdParts, "\n\n")
	return MustMarkdownToLatex(fullMD)
}

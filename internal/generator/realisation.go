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
- Utilise ` + "`|`" + ` pour les tableaux lorsque tu compares des concepts, technologies ou approches.
- Utilise des blocs de code avec ` + "`" + "`" + "`" + ` et le langage spécifié (par exemple ` + "`" + "`" + "`java" + "`" + "`" + "`" + `, ` + "`" + "`" + "`python" + "`" + "`" + "`" + `, ` + "`" + "`" + "`sql" + "`" + "`" + "`" + `) pour les extraits de code.
- Utilise ` + "`" + "`" + "`mermaid" + "`" + "`" + "`" + ` pour les diagrammes (flowcharts, architecture, diagrammes de séquence).
- N'utilise PAS de JSON, pas de XML.

## Consignes rédactionnelles
- Pour chaque mot-clé, fournis une définition EXTRÊMEMENT détaillée et technique de 150 à 200 mots minimum.
- Inclus des EXEMPLES CHIFFRÉS, des FORMULES RÉELLES (avec $...$), et des EXTRAITS DE CODE avec ` + "`" + "`" + "`" + ` pour illustrer les implémentations.
- Explique le CONTEXTE D'INGÉNIERIE : applications pratiques, compromis (trade-offs), et cas d'usage réels.
- Décris les RELATIONS entre les mots-clés : comment ils se connectent, se complètent ou s'opposent.
- Fournis des ANALOGIES pédagogiques pour faciliter la compréhension.
- Si le mot-clé implique des concepts mathématiques (complexité, algorithmes, etc.), utilise $...$ pour les noter.

Mots-clés à définir : ` + keywordsStr + `

Structure attendue pour chaque mot-clé :

## Mot-clé : [Nom du mot-clé]

**Définition :** [Définition technique détaillée, 150-200 mots minimum]

**Formules mathématiques :** [Formules pertinentes en $...$ ou $$...$$]

**Exemples d'implémentation :**
` + "`" + "`" + "`" + `[langage]
[Code d'exemple réel]
` + "`" + "`" + "`" + `

**Applications en ingénierie :** [Comment ce concept est utilisé dans le domaine, avec des cas concrets et chiffrés]

**Relations avec d'autres concepts :** [Comment ce mot-clé se connecte aux autres]

À la fin de ta réponse, ajoute un bloc <CONTEXT_UPDATE> contenant les informations clés à retenir pour la suite, en 1 à 3 phrases. Par exemple :

<CONTEXT_UPDATE>
L'étudiant a étudié le concept X qui se base sur Y. Les résultats montrent Z.
</CONTEXT_UPDATE>

## Exigences de longueur et de qualité
- Rédige un contenu EXTRÊMEMENT détaillé et approfondi.
- Pour chaque concept, fournis des ANALOGIES, des EXEMPLES CHIFFRÉS, et des CAS D'USAGE RÉELS.
- Inclus des EXTRAITS DE CODE ou des PSEUDO-CODES pour illustrer les implémentations.
- Quand c'est pertinent, ajoute des DIAGRAMMES avec ` + "`" + "`" + "`mermaid" + "`" + "`" + "`" + ` (flowcharts, séquences, architecture).
- Utilise des TABLEAUX pour comparer les approches, technologies ou concepts.
- ALIMENTE LE CONTEXTE : chaque réponse doit construire sur les précédentes pour former un ensemble cohérent.
- La qualité doit être celle d'un CHAPITRE DE LIVRE TECHNIQUE : rigoureux, précis, et riche en détails.
- N'hésite pas à faire 1500-2000 mots si le sujet le mérite.`

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
- Utilise ` + "`###`" + ` pour les sous-sections (concepts, définitions, exemples, comparaisons).
- Utilise ` + "`$...$`" + ` pour les formules mathématiques inline.
- Utilise ` + "`$$...$$`" + ` pour les blocs mathématiques si nécessaire.
- Utilise ` + "`-`" + ` pour les listes à puces.
- Utilise ` + "`|`" + ` pour les tableaux lorsque tu compares des concepts, technologies ou approches.
- Utilise ` + "`" + "`" + "`" + ` avec le langage spécifié pour les blocs de code (par exemple ` + "`" + "`" + "`java" + "`" + "`" + "`" + `, ` + "`" + "`" + "`python" + "`" + "`" + "`" + `, ` + "`" + "`" + "`sql" + "`" + "`" + "`" + `).
- Utilise ` + "`" + "`" + "`mermaid" + "`" + "`" + "`" + ` pour les diagrammes (flowcharts, architecture, diagrammes de séquence).
- N'utilise PAS de JSON.

## Consignes rédactionnelles
- Rédige une étude COMPLÈTE et EXTRÊMEMENT DÉTAILLÉE (minimum 800-1000 mots, idéalement plus).
- Structure ton étude en plusieurs sous-parties claires avec des titres ` + "`###`" + `.
- Inclus au MOINS 3 extraits de code ou pseudo-code dans des blocs ` + "`" + "`" + "`" + ` avec le langage spécifié pour illustrer les algorithmes ou implémentations.
- Inclus au MOINS 2 diagrammes avec ` + "`" + "`" + "`mermaid" + "`" + "`" + "`" + ` (flowcharts d'architecture, diagrammes de séquence, etc.).
- Explique les concepts fondamentaux liés au sujet avec des ANALOGIES et des EXEMPLES CHIFFRÉS.
- Fournis des COMPARAISONS entre différentes approches ou technologies, idéalement dans un tableau.
- Inclus des ÉTUDES DE CAS RÉELLES avec des métriques et des chiffres spécifiques.
- Donne des EXPLICATIONS PAS-À-PAS du fonctionnement des concepts.
- Fais référence à des TECHNOLOGIES SPÉCIFIQUES, FRAMEWORKS, OU ARTICLES DE RECHERCHE.
- Conclus par une synthèse des points clés à retenir.

Sujet à étudier : ` + topic + `

À la fin de ta réponse, ajoute un bloc <CONTEXT_UPDATE> contenant les informations clés à retenir pour la suite, en 1 à 3 phrases. Par exemple :

<CONTEXT_UPDATE>
L'étudiant a étudié le concept X qui se base sur Y. Les résultats montrent Z.
</CONTEXT_UPDATE>

## Exigences de longueur et de qualité
- Rédige un contenu EXTRÊMEMENT détaillé et approfondi.
- Pour chaque concept, fournis des ANALOGIES, des EXEMPLES CHIFFRÉS, et des CAS D'USAGE RÉELS.
- Inclus des EXTRAITS DE CODE ou des PSEUDO-CODES pour illustrer les implémentations.
- Quand c'est pertinent, ajoute des DIAGRAMMES avec ` + "`" + "`" + "`mermaid" + "`" + "`" + "`" + ` (flowcharts, séquences, architecture).
- Utilise des TABLEAUX pour comparer les approches, technologies ou concepts.
- ALIMENTE LE CONTEXTE : chaque réponse doit construire sur les précédentes pour former un ensemble cohérent.
- La qualité doit être celle d'un CHAPITRE DE LIVRE TECHNIQUE : rigoureux, précis, et riche en détails.
- N'hésite pas à faire 1500-2000 mots si le sujet le mérite.`

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

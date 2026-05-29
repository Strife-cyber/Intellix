package generator

import (
	"context"
	"fmt"
	"log"
	"micro-cer/internal/ai"
	"micro-cer/internal/core"
	"strings"
)

// --- Structs defining the expected JSON from AI ---

type ResourceItem struct {
	Title       string `json:"title"`
	Link        string `json:"link"` // Can be a URL or a search term/ISBN
	Description string `json:"description"`
}

type ResourceCategory struct {
	Name      string         `json:"name"`
	Resources []ResourceItem `json:"resources"`
}

type ReferencesData struct {
	Categories []ResourceCategory `json:"categories"`
}

// --- The References Class ---

type References struct {
	assistant *ai.Assistant
}

func NewReferences(assistant *ai.Assistant) *References {
	return &References{
		assistant: assistant,
	}
}

// GenerateSection uses the AI's memory to generate a structured list of references
func (r *References) GenerateSection(ctx context.Context, clientID string, mainTopic string) string {
	prompt := `Tu es un assistant académique. En te basant sur le contexte de ce projet (dans ta mémoire) et spécifiquement sur le sujet "` + mainTopic + `", rédige la section "Références et Pour Aller Plus Loin".

Fournis de vraies ressources pertinentes (Vidéos YouTube réputées, Livres de référence, Documentation officielle, Articles).

Ta réponse DOIT être un objet JSON strict au format exact suivant:
{
    "categories": [
        {
            "name": "Nom de la catégorie (ex: Vidéos YouTube, Livres, Documentation)",
            "resources": [
                {
                    "title": "Titre précis de la ressource",
                    "link": "URL exacte ou ISBN/Auteur",
                    "description": "Pourquoi cette ressource est utile pour approfondir le sujet (1-2 phrases)"
                }
            ]
        }
    ]
}

Renvoie SEULEMENT ce JSON. Génère 3 ou 4 catégories avec 2 à 3 ressources chacune.

IMPORTANT - CONSIGNES DE FORMATAGE LATEX :
- Ne mets AUCUN formatage LaTeX ou Markdown dans les champs "link".
- Dans les champs "title" et "description", échappe adéquatement les caractères spéciaux LaTeX (%, &, _, #, $).`

	log.Printf("Generating References for topic: %s...\n", mainTopic)

	// Create a safe cache key based on the topic
	safeTopic := mainTopic
	if len(safeTopic) > 50 {
		safeTopic = safeTopic[:50]
	}
	cacheKey := fmt.Sprintf("references_%s", safeTopic)

	// useMemory = true is CRITICAL here so the AI knows what to recommend based on the user's project
	data, err := GenerateJSON[ReferencesData](
		ctx, r.assistant, "references", cacheKey, prompt, clientID, true,
	)

	if err != nil {
		log.Printf("References Generation Error: %v\n", err)
		return "\\section{RÉFÉRENCES ET POUR ALLER PLUS LOIN}\nErreur de génération AI des références."
	}

	// Build LaTeX String
	var latex strings.Builder
	latex.WriteString("\\section{RÉFÉRENCES ET POUR ALLER PLUS LOIN}\n\n")

	for _, category := range data.Categories {
		// Section for each category (e.g., Vidéos YouTube)
		safeCategoryName := core.LatexEscape(category.Name)
		latex.WriteString(fmt.Sprintf("\\subsection*{%s}\n\\begin{itemize}\n", safeCategoryName))

		for _, res := range category.Resources {
			safeTitle := core.LatexEscape(res.Title)
			safeDesc := core.LatexEscape(res.Description)

			// We format the link differently if it looks like a URL vs a Book Author/ISBN
			linkFormatted := res.Link
			if strings.HasPrefix(res.Link, "http") || strings.HasPrefix(res.Link, "www") {
				// Assumes the LaTeX template uses \usepackage{hyperref} or \usepackage{url}
				linkFormatted = fmt.Sprintf("\\url{%s}", res.Link)
			} else {
				// Escape it if it's just plain text (like an author name)
				linkFormatted = strings.ReplaceAll(res.Link, "_", "\\_")
				linkFormatted = strings.ReplaceAll(linkFormatted, "&", "\\&")
			}

			// LaTeX format: \item \textbf{Title} (\url{Link}) : Description
			latex.WriteString(fmt.Sprintf("    \\item \\textbf{%s} (%s) : %s\n", safeTitle, linkFormatted, safeDesc))
		}

		latex.WriteString("\\end{itemize}\n\n")
	}

	return strings.TrimSpace(latex.String())
}

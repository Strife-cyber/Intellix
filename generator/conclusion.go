package generator

import (
	"context"
	"fmt"
	"strings"

	"micro-cer/ai"
	"micro-cer/core"
)

type KeyLearning struct {
	Title       string `json:"title"`
	Explanation string `json:"explanation"`
}

type ConclusionData struct {
	Summary      string        `json:"summary"`
	KeyLearnings []KeyLearning `json:"key_learnings"`
	Closing      string        `json:"closing"`
}

type ObjectiveStatus struct {
	ObjectiveText string `json:"objective_text"`
	Status        string `json:"status"`
	Proof         string `json:"proof"`
}

type RetourObjectifsData struct {
	ObjectivesStatus   []ObjectiveStatus `json:"objectives_status"`
	ConclusionSentence string            `json:"conclusion_sentence"`
}

// --- The Conclusion Class ---

type Conclusion struct {
	assistant *ai.Assistant
}

func NewConclusion(assistant *ai.Assistant) *Conclusion {
	return &Conclusion{assistant: assistant}
}

func (c *Conclusion) GenerateConclusion(ctx context.Context, clientID string) string {
	prompt := `Tu es un assistant académique. Rédige la 'Conclusion' d'un rapport Prosit.

Ta réponse DOIT être un objet JSON strict au format exact suivant:
{
    "summary": "Un paragraphe introductif résumant la portée de l'étude",
    "key_learnings": [
        {"title": "Enseignement clé 1", "explanation": "Brève explication"}
    ],
    "closing": "Un paragraphe de clôture sur l'application pratique des concepts étudiés"
}

Renvoie SEULEMENT ce JSON. Max 6 enseignements.

IMPORTANT - CONSIGNES DE FORMATAGE LATEX :
- Tout symbole mathématique ou lettre grecque DOIT être écrit en code LaTeX valide dans un environnement mathématique (par exemple $\theta$, $\mathcal{O}(n)$).
- N'utilise AUCUN caractère Unicode brut pour ces symboles.
- Le contenu DOIT être compilable en LaTeX (échappe %, &, _, #, $).`

	// Using the generic base engine
	data, err := GenerateJSON[ConclusionData](
		ctx, c.assistant, "conclusion", "main_summary", prompt, clientID, true,
	)

	if err != nil {
		fmt.Printf("Error generating conclusion: %v\n", err)
		return "\\subsection{Conclusion}\nErreur de génération AI.\n"
	}

	// Format LaTeX
	var sb strings.Builder
	sb.WriteString("\\subsection{Conclusion}\n")
	sb.WriteString(fmt.Sprintf("%s\n\n", data.Summary))
	sb.WriteString("Les principaux enseignements tirés de cette étude sont :\n\\begin{itemize}\n")

	for _, item := range data.KeyLearnings {
		safeTitle := core.LatexEscape(item.Title)
		safeExp := core.LatexEscape(item.Explanation)
		sb.WriteString(fmt.Sprintf("    \\item \\textbf{%s} : %s\n", safeTitle, safeExp))
	}

	sb.WriteString("\\end{itemize}\n\n")
	sb.WriteString(fmt.Sprintf("%s\n", data.Closing))

	return sb.String()
}

func (c *Conclusion) GenerateRetourObjectifs(ctx context.Context, clientID string, objectifs []string) string {
	if len(objectifs) == 0 {
		return "% Aucun objectif fourni."
	}

	var sb strings.Builder
	for i, obj := range objectifs {
		sb.WriteString(fmt.Sprintf("Objectif %d : %s\n", i+1, obj))
	}
	objectifsStr := sb.String()

	prompt := `Tu es un assistant académique. Rédige le 'Retour sur les objectifs'.

Voici la liste des objectifs initiaux :
` + objectifsStr + `

Ta réponse DOIT être un objet JSON strict au format exact suivant:
{
    "objectives_status": [
        {"objective_text": "Objectif 1...", "status": "Atteint", "proof": "Preuve spécifique tirée du travail"}
    ],
    "conclusion_sentence": "Une phrase finale (ex: Tous les objectifs ont été atteints)."
}

Renvoie SEULEMENT ce JSON.

IMPORTANT - CONSIGNES DE FORMATAGE LATEX :
- Respecte les mêmes règles de formatage LaTeX que précédemment (échappe les caractères spéciaux, utilise le mode mathématique).`

	data, err := GenerateJSON[RetourObjectifsData](
		ctx, c.assistant, "conclusion", "objectifs_review", prompt, clientID, true,
	)

	if err != nil {
		fmt.Printf("Error generating retour objectifs: %v\n", err)
		return "\\subsection{Retour sur les objectifs}\nErreur de génération AI.\n"
	}

	// Format LaTeX
	var latex strings.Builder
	latex.WriteString("\\subsection{Retour sur les objectifs}\n\n")
	for _, obj := range data.ObjectivesStatus {
		latex.WriteString(fmt.Sprintf("\\textbf{Objectif : %s}\n", obj.ObjectiveText))
		latex.WriteString("\\begin{itemize}\n")
		latex.WriteString(fmt.Sprintf("    \\item %s : %s\n", obj.Status, obj.Proof))
		latex.WriteString("\\end{itemize}\n\n")
	}
	latex.WriteString(fmt.Sprintf("%s\n", data.ConclusionSentence))

	return latex.String()
}

func (c *Conclusion) GenerateFullSection(ctx context.Context, clientID string, objectifs []string) string {
	fmt.Println("Starting Generation of Final Chapter...")

	conclusionLatex := c.GenerateConclusion(ctx, clientID)
	retourLatex := c.GenerateRetourObjectifs(ctx, clientID, objectifs)

	return fmt.Sprintf("\\section{CONCLUSION ET RETOUR DES OBJECTIFS}\n%s\n\n%s", conclusionLatex, retourLatex)
}

package generator

import (
	"context"
	"fmt"
	"log"

	"micro-cer/internal/ai"
)

// --- The References Class ---

type References struct {
	assistant *ai.Assistant
}

func NewReferences(assistant *ai.Assistant) *References {
	return &References{
		assistant: assistant,
	}
}

// GenerateSection uses the AI's memory to generate a structured list of references.
func (r *References) GenerateSection(ctx context.Context, clientID string, mainTopic string) string {
	prompt := `Tu es un assistant académique spécialisé en ingénierie. Tu rédiges la section **Références et Pour Aller Plus Loin** d'un rapport CER.

## Consignes de formatage
- Rédige UNIQUEMENT en Markdown.
- Utilise ` + "`##`" + ` pour le titre principal.
- Utilise ` + "`###`" + ` pour les catégories.
- Utilise ` + "`-`" + ` pour les listes.
- Pour les liens, utilise le format Markdown : ` + "`[Titre](url)`" + `
- N'utilise PAS de JSON.

## Consignes rédactionnelles
En te basant sur le contexte du projet (dans ta mémoire) et spécifiquement sur le sujet "` + mainTopic + `", fournis une liste structurée de ressources pour approfondir le sujet.

Génère 3 à 4 catégories avec 2 à 3 ressources chacune. Les ressources doivent être de vraies ressources existantes et pertinentes.

Catégories attendues :
1. **Documentation officielle** : Documentation technique, spécifications, normes
2. **Livres de référence** : Ouvrages académiques reconnus
3. **Ressources en ligne** : Articles, tutoriels, cours
4. **Vidéos et conférences** : Contenus vidéo pédagogiques (YouTube, conferences)

Pour chaque ressource, précise :
- **Titre** de la ressource
- **Lien** (URL ou référence bibliographique)
- **Description** (1-2 phrases expliquant pourquoi cette ressource est utile)

Structure attendue :

## RÉFÉRENCES ET POUR ALLER PLUS LOIN

### Documentation officielle
- **[Titre doc 1](url)** : Description de son utilité...
- **[Titre doc 2](url)** : Description...

### Livres de référence
- **Titre livre 1** (Auteur, Éditeur) : Description...
- **Titre livre 2** (Auteur, Éditeur) : Description...

### Ressources en ligne
- **[Titre ressource 1](url)** : Description...
- **[Titre ressource 2](url)** : Description...

### Vidéos et conférences
- **[Titre vidéo 1](url)** : Description...
- **[Titre vidéo 2](url)** : Description...

À la fin de ta réponse, ajoute un bloc <CONTEXT_UPDATE> contenant les informations clés à retenir pour la suite, en 1 à 3 phrases. Par exemple :

<CONTEXT_UPDATE>
L'étudiant a étudié le concept X qui se base sur Y. Les résultats montrent Z.
</CONTEXT_UPDATE>`

	log.Printf("Generating References for topic: %s...\n", mainTopic)

	safeTopic := mainTopic
	if len(safeTopic) > 50 {
		safeTopic = safeTopic[:50]
	}
	cacheKey := fmt.Sprintf("references_md_%s", safeTopic)

	// useMemory = true so the AI knows what to recommend based on the user's project
	data, err := GenerateMarkdown(
		ctx, r.assistant, "references", cacheKey, prompt, clientID, true,
	)

	if err != nil {
		log.Printf("References Generation Error: %v\n", err)
		return MarkdownToLatexOrFallback("## RÉFÉRENCES ET POUR ALLER PLUS LOIN\n\n*Erreur de génération AI des références.*\n")
	}

	return MustMarkdownToLatex(data)
}

// MarkdownToLatexOrFallback is a helper to convert simple markdown strings without panicking.
func MarkdownToLatexOrFallback(md string) string {
	result, err := MarkdownToLatex(md)
	if err != nil {
		return md
	}
	return result
}

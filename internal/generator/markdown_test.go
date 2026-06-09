package generator

import (
	"strings"
	"testing"
)

// verifyLaTeX checks that the LaTeX output contains expected patterns.
// It's used to validate the Markdown→LaTeX conversion is working correctly.
func verifyLaTeX(t *testing.T, name, md string, expect []string) {
	t.Helper()
	result, err := MarkdownToLatex(md)
	if err != nil {
		t.Fatalf("%s: MarkdownToLatex failed: %v", name, err)
	}
	if strings.TrimSpace(result) == "" {
		t.Fatalf("%s: result is empty", name)
	}
	for _, pattern := range expect {
		if !strings.Contains(result, pattern) {
			t.Errorf("%s: expected output to contain %q\n--- got:\n%s\n---", name, pattern, result)
		}
	}
}

func TestMarkdownToLatexHeaders(t *testing.T) {
	verifyLaTeX(t, "level-2 heading", "## Title", []string{`\subsection{Title}`})
	verifyLaTeX(t, "level-3 heading", "### Subtitle", []string{`\subsubsection{Subtitle}`})
}

func TestMarkdownToLatexBold(t *testing.T) {
	verifyLaTeX(t, "bold text", "Ceci est du **gras**", []string{`\textbf{gras}`})
}

func TestMarkdownToLatexItalic(t *testing.T) {
	verifyLaTeX(t, "italic text", "Ceci est de l'*italique*", []string{`\textit{italique}`})
}

func TestMarkdownToLatexInlineMath(t *testing.T) {
	verifyLaTeX(t, "inline math", "La formule $E = mc^2$", []string{`$E = mc^2$`})
	verifyLaTeX(t, "greek letters", "Angle $\\theta$ et $\\Omega$", []string{`$\theta$`, `$\Omega$`})
}

func TestMarkdownToLatexUnorderedList(t *testing.T) {
	md := `- Premier élément
- Deuxième élément
- Troisième élément`
	verifyLaTeX(t, "unordered list", md, []string{`\begin{itemize}`, `\end{itemize}`, `Premier élément`, `Deuxième élément`})
}

func TestMarkdownToLatexOrderedList(t *testing.T) {
	md := `1. Élément un
2. Élément deux`
	verifyLaTeX(t, "ordered list", md, []string{`\begin{enumerate}`, `\end{enumerate}`, `Élément un`, `Élément deux`})
}

func TestMarkdownToLatexLink(t *testing.T) {
	verifyLaTeX(t, "clickable link", "[Documentation Go](https://go.dev/doc/)",
		[]string{`\href{https://go.dev/doc/}{Documentation Go}`})
}

func TestMarkdownToLatexTable(t *testing.T) {
	md := `| Concept | Complexité |
|---------|-----------|
| Tri rapide | $O(n \log n)$ |
| Tri bulle | $O(n^2)$ |`
	verifyLaTeX(t, "simple table", md, []string{
		`\begin{tabular}`,
		`\end{tabular}`,
		`Concept & Complexité`,
		`Tri rapide`,
	})
}

func TestMarkdownToLatexCodeBlock(t *testing.T) {
	md := "```go\nfunc main() {}\n```"
	verifyLaTeX(t, "code block go", md, []string{
		`\begin{lstlisting}[language=go]`,
		`\end{lstlisting}`,
		`func main()`,
	})
}

func TestMarkdownToLatexCodeBlockUnlabeled(t *testing.T) {
	md := "```\nraw code\n```"
	verifyLaTeX(t, "code block unlabeled", md, []string{
		`\begin{lstlisting}`,
		`raw code`,
	})
}

func TestMarkdownToLatexMermaidPassthrough(t *testing.T) {
	md := "```mermaid\ngraph TD\n  A --> B\n```"
	result, err := MarkdownToLatex(md)
	if err != nil {
		t.Fatalf("MarkdownToLatex failed: %v", err)
	}
	if !strings.Contains(result, "mermaid") && !strings.Contains(result, "graph TD") {
		t.Errorf("mermaid block should be preserved but got:\n%s", result)
	}
}

func TestMarkdownToLatexEmpty(t *testing.T) {
	result, err := MarkdownToLatex("")
	if err != nil {
		t.Fatalf("MarkdownToLatex('') failed: %v", err)
	}
	if result != "" {
		t.Errorf("expected empty string, got: %q", result)
	}
}

func TestMarkdownToLatexWhitespaceOnly(t *testing.T) {
	result, err := MarkdownToLatex("   \n\n  \t  ")
	if err != nil {
		t.Fatalf("MarkdownToLatex(whitespace) failed: %v", err)
	}
	if result != "" {
		t.Errorf("expected empty string for whitespace, got: %q", result)
	}
}

func TestMarkdownToLatexPlainText(t *testing.T) {
	verifyLaTeX(t, "plain paragraph", "Un simple paragraphe de texte.", []string{`Un simple paragraphe de texte.`})
}

func TestMarkdownToLatexMixedContent(t *testing.T) {
	md := `## Analyse

Ceci est un **concept important** avec une formule $E = mc^2$.

- Point un
- Point deux
`
	verifyLaTeX(t, "mixed: heading+bold+math+list", md, []string{
		`\subsection{Analyse}`,
		`\textbf{concept important}`,
		`$E = mc^2$`,
		`\begin{itemize}`,
		`Point un`,
		`Point deux`,
	})
}

func TestMarkdownToLatexNoPreamble(t *testing.T) {
	result, err := MarkdownToLatex("## Test")
	if err != nil {
		t.Fatalf("MarkdownToLatex failed: %v", err)
	}
	if strings.Contains(result, `\documentclass`) {
		t.Errorf("output should NOT contain \\documentclass preamble, got:\n%s", result)
	}
	if strings.Contains(result, `\begin{document}`) {
		t.Errorf("output should NOT contain \\begin{document}, got:\n%s", result)
	}
	if strings.Contains(result, `\end{document}`) {
		t.Errorf("output should NOT contain \\end{document}, got:\n%s", result)
	}
}

func TestMustMarkdownToLatex(t *testing.T) {
	md := "## Titre\n\nContenu **important**."
	result := MustMarkdownToLatex(md)
	if !strings.Contains(result, `\subsection{Titre}`) {
		t.Errorf("expected \\subsection{Titre}, got:\n%s", result)
	}
	if !strings.Contains(result, `\textbf{important}`) {
		t.Errorf("expected \\textbf{important}, got:\n%s", result)
	}
}

func TestMustMarkdownToLatexEmpty(t *testing.T) {
	result := MustMarkdownToLatex("")
	if result != "" {
		t.Errorf("expected empty string, got: %q", result)
	}
}

func TestMarkdownToLatexWithBackslashInInlineMath(t *testing.T) {
	// LaTeX commands inside $$ math blocks should be preserved
	verifyLaTeX(t, "display math", "$$\n\\int_{0}^{\\infty} e^{-x^2} dx\n$$",
		[]string{`infty`})
}

func TestMarkdownToLatexTableWithAlignment(t *testing.T) {
	md := `| Left | Center | Right |
| :--- | :----: | ----: |
| a    | b      | c     |`
	result, err := MarkdownToLatex(md)
	if err != nil {
		t.Fatalf("MarkdownToLatex failed: %v", err)
	}
	if !strings.Contains(result, `\begin{tabular}`) {
		t.Errorf("expected tabular environment, got:\n%s", result)
	}
}

func TestMarkdownToLatexBlockquote(t *testing.T) {
	md := "> **Note :** Ceci est une citation importante."
	verifyLaTeX(t, "blockquote", md, []string{`Note`})
}

func TestMarkdownToLatexMultipleParagraphs(t *testing.T) {
	md := `Premier paragraphe avec du contenu.

Deuxième paragraphe séparé.`
	result, err := MarkdownToLatex(md)
	if err != nil {
		t.Fatalf("MarkdownToLatex failed: %v", err)
	}
	if !strings.Contains(result, "Premier paragraphe") {
		t.Errorf("missing first paragraph")
	}
	if !strings.Contains(result, "Deuxième paragraphe") {
		t.Errorf("missing second paragraph")
	}
}

func TestMarkdownToLatexCodeBlockWithFrenchChars(t *testing.T) {
	md := "```javascript\n// Ceci est un commentaire en français\nconst valeur = 42;\n```"
	verifyLaTeX(t, "code block french", md, []string{
		`\begin{lstlisting}`,
		`const valeur = 42`,
		`français`,
	})
}

func TestMarkdownToLatexNestedList(t *testing.T) {
	md := `- Item principal
  - Sous-item un
  - Sous-item deux
- Autre item`
	verifyLaTeX(t, "nested list", md, []string{
		`\begin{itemize}`,
		`Item principal`,
		`Autre item`,
	})
}

func TestMarkdownToLatexStrongAndMath(t *testing.T) {
	md := "La complexité **moyenne** est $O(n \\log n)$ dans le cas général."
	verifyLaTeX(t, "bold+math inline", md, []string{`\textbf{moyenne}`, `$O(n \log n)$`})
}

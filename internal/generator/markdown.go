package generator

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"micro-cer/internal/ai"

	gmlatex "github.com/soypat/goldmark-latex"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer"
	"github.com/yuin/goldmark/util"
)

// mdConverter converts Markdown to LaTeX using goldmark with a LaTeX renderer.
var mdConverter = createConverter()

func createConverter() goldmark.Markdown {
	rd := renderer.NewRenderer(
		renderer.WithNodeRenderers(
			util.Prioritized(
				gmlatex.NewRenderer(gmlatex.Config{
					EnableTableCaptions: true,
					Unsafe:             true,
					NoPreamble:         true,
				}),
				1000,
			),
		),
	)

	parserOpts := []parser.Option{
		parser.WithParagraphTransformers(
			util.Prioritized(extension.NewTableParagraphTransformer(), 200),
		),
		parser.WithASTTransformers(
			util.Prioritized(extension.NewTableASTTransformer(), 0),
			util.Prioritized(gmlatex.TableCaptionTransformer, -1),
		),
		parser.WithInlineParsers(
			util.Prioritized(gmlatex.InlineMathParser, 150),
			util.Prioritized(gmlatex.CitationParser, 150),
		),
	}

	return goldmark.New(
		goldmark.WithRenderer(rd),
		goldmark.WithParserOptions(parserOpts...),
	)
}

// MarkdownToLatex converts a Markdown string to a LaTeX fragment.
// The output is suitable for inclusion in a larger LaTeX document via \input{}.
// Post-processing is applied to fix common issues:
//   - Table wrapped in a floating table environment to avoid being glued to headings
//   - Horizontal rules (---, ___, ***) converted to \newpage instead of just a line
//   - Code blocks styled with a modern mdframed-like look
//   - Duplicate blank lines collapsed
func MarkdownToLatex(md string) (string, error) {
	if strings.TrimSpace(md) == "" {
		return "", nil
	}

	var buf bytes.Buffer
	err := mdConverter.Convert([]byte(md), &buf)
	if err != nil {
		return "", fmt.Errorf("markdown to latex conversion failed: %w", err)
	}
	raw := buf.String()

	// Apply post-processing fixes.
	raw = postProcess(raw)
	return raw, nil
}

// MustMarkdownToLatex converts Markdown to LaTeX, logging and returning the raw
// Markdown on error.
func MustMarkdownToLatex(md string) string {
	result, err := MarkdownToLatex(md)
	if err != nil {
		log.Printf("Markdown→LaTeX conversion failed: %v — falling back to raw markdown", err)
		return md
	}
	return result
}

// postProcess applies fixes to the raw LaTeX output from goldmark-latex.
func postProcess(latex string) string {
	latex = fixTableEnvironment(latex)
	latex = fixHorizonalRules(latex)
	latex = fixCodeBlockStyling(latex)
	latex = collapseBlankLines(latex)
	return latex
}

// fixTableEnvironment wraps bare tabular environments in a floating table
// with \centering to prevent the table from being glued to surrounding text.
// goldmark-latex outputs a raw \begin{tabular}...\end{tabular} without any
// wrapping, which causes the table title to appear on the same line.
// We manually find tabular environments and wrap only those not already
// inside \begin{table} (Go regexp doesn't support negative lookbehind).
func fixTableEnvironment(s string) string {
	var result strings.Builder
	for {
		start := strings.Index(s, "\\begin{tabular}")
		if start == -1 {
			break
		}
		// Check if this tabular is already inside \begin{table}
		prefixStart := strings.LastIndex(s[:start], "\\begin{")
		insideTable := prefixStart != -1 && strings.Contains(s[prefixStart:start], "\\begin{table}")

		// Find the matching \end{tabular}
		end := strings.Index(s[start:], "\\end{tabular}")
		if end == -1 {
			break
		}
		end += start + len("\\end{tabular}")

		// Write everything before the start
		result.WriteString(s[:start])

		if insideTable {
			// Already wrapped, pass through unchanged
			result.WriteString(s[start:end])
		} else {
			// Wrap in table environment
			result.WriteString("\n\\begin{table}[h!]\n\\centering\n")
			result.WriteString(s[start:end])
			result.WriteString("\n\\end{table}\n")
		}

		s = s[end:]
	}
	result.WriteString(s)
	return result.String()
}

// fixHorizonalRules converts markdown HR markers (---) that goldmark-latex
// renders as \noindent\makebox[\linewidth]{\rule{\textwidth}{0.4pt}} into
// \newpage commands. AI loves putting "---" between sections; in a PDF this
// should be a page break, not a line spanning the page.
func fixHorizonalRules(s string) string {
	// Match \noindent\makebox[\linewidth]{\rule{\textwidth}{...}} patterns
	re := regexp.MustCompile(`\\noindent\\makebox\[\\linewidth\]\{\\rule\{\\textwidth\}\{[^}]*\}\}`)
	return re.ReplaceAllString(s, "\n\\newpage\n")
}

// fixCodeBlockStyling improves the look of lstlisting blocks.
// We replace the basic \begin{lstlisting} with a wrapped version that uses
// a modern style: shaded background, rounded corners via mdframed (we add
// a tcolorbox-like wrapper since mdframed is heavier).
// Since we can't add new packages, we use xcolor's shadebox approach:
// we keep lstlisting but add proper spacing above/below.
func fixCodeBlockStyling(s string) string {
	// Replace \begin{lstlisting} with version that has better spacing.
	s = strings.ReplaceAll(s,
		"\\begin{lstlisting}",
		"\\begin{lstlisting}[aboveskip=1.2em,belowskip=1.2em]",
	)
	// For language-specific listings, add style parameters inline.
	re := regexp.MustCompile(`(\\begin\{lstlisting\}\[language=)([a-zA-Z#+]+)\]`)
	s = re.ReplaceAllString(s, "$1$2,aboveskip=1.2em,belowskip=1.2em,frame=shadowbox,rulesepcolor=\\color{gray!30}]")

	// Add a small vertical skip before and after code blocks to separate them
	// from surrounding paragraphs.
	s = strings.ReplaceAll(s,
		"\\end{lstlisting}",
		"\\end{lstlisting}\n\\vspace{0.5em}\n",
	)
	return s
}

// collapseBlankLines reduces 3+ consecutive blank lines to 2.
func collapseBlankLines(s string) string {
	re := regexp.MustCompile(`\n{3,}`)
	return re.ReplaceAllString(s, "\n\n")
}

// responseCache is a simple TTL cache for AI responses, shared across all generators.
var mdResponseCache = ai.NewResponseCache(5*time.Minute, 200)

// GenerateMarkdown is the generic engine for getting Markdown from the AI.
func GenerateMarkdown(
	ctx context.Context,
	assistant *ai.Assistant,
	category string,
	cacheKey string,
	prompt string,
	clientID string,
	useMemory bool,
) (string, error) {
	if ctx == nil {
		return "", fmt.Errorf("generate markdown (%s/%s): context is nil", category, cacheKey)
	}
	if assistant == nil {
		return "", fmt.Errorf("generate markdown (%s/%s): assistant is nil", category, cacheKey)
	}

	// 1. Check cache
	if cacheKey != "" {
		if cached, ok := mdResponseCache.Get(cacheKey); ok {
			log.Printf("[%s] Cache hit for key: %s", category, cacheKey)
			return cached, nil
		}
	}

	// 2. Ask AI
	resp, err := assistant.Ask(ctx, prompt, clientID, useMemory)
	if err != nil {
		return "", fmt.Errorf("AI generation failed: %w", err)
	}

	// 3. Cache the response
	if cacheKey != "" {
		mdResponseCache.Set(cacheKey, resp)
	}

	return resp, nil
}

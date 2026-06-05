package generator

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"micro-cer/internal/ai"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer"
	"github.com/yuin/goldmark/util"
	gmlatex "github.com/soypat/goldmark-latex"
)

// latexExtension implements goldmark.Extension to register the LaTeX renderer
// and the inline math/citation parsers with goldmark.
type latexExtension struct{}

func (e *latexExtension) Extend(m goldmark.Markdown) {
	m.Parser().AddOptions(
		parser.WithInlineParsers(
			util.Prioritized(gmlatex.InlineMathParser, 500),
			util.Prioritized(gmlatex.CitationParser, 200),
		),
	)
	m.Renderer().AddOptions(
		renderer.WithNodeRenderers(
			util.Prioritized(
				gmlatex.NewRenderer(gmlatex.Config{
					EnableTableCaptions: true,
				}),
				1000,
			),
		),
	)
}

// mdConverter is the shared goldmark instance configured with the LaTeX renderer.
// It converts CommonMark + GFM extensions to LaTeX body content (no preamble).
var mdConverter = goldmark.New(
	goldmark.WithExtensions(
		&latexExtension{},
	),
)

// MarkdownToLatex converts a Markdown string to a LaTeX fragment (body content only).
// The output is suitable for inclusion in a larger LaTeX document via \input{}.
func MarkdownToLatex(md string) (string, error) {
	if strings.TrimSpace(md) == "" {
		return "", nil
	}

	var buf bytes.Buffer
	err := mdConverter.Convert([]byte(md), &buf)
	if err != nil {
		return "", fmt.Errorf("markdown to latex conversion failed: %w", err)
	}
	return buf.String(), nil
}

// MustMarkdownToLatex converts Markdown to LaTeX, logging and returning the raw
// Markdown on error. This is used in generator methods where a graceful fallback
// is preferred over a hard failure.
func MustMarkdownToLatex(md string) string {
	result, err := MarkdownToLatex(md)
	if err != nil {
		log.Printf("Markdown→LaTeX conversion failed: %v — falling back to raw markdown", err)
		return md
	}
	return result
}

// responseCache is a simple TTL cache for AI responses, shared across all generators.
var mdResponseCache = ai.NewResponseCache(5*time.Minute, 200)

// GenerateMarkdown is the generic engine for getting Markdown from the AI.
// It replaces GenerateJSON[T] — no JSON parsing, no retry/repair logic.
// The AI is instructed to produce Markdown, which is vastly more reliable.
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

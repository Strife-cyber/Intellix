package generator

import (
	"bytes"
	"context"
	"fmt"
	"log"
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
// This is built the same way as the md2latex CLI — directly setting the renderer,
// not via extensions, to avoid the default HTML renderer taking priority.
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
// Markdown on error.
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

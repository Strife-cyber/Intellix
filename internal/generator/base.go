package generator

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"micro-cer/internal/ai"
	"strings"
	"time"
)

const (
	maxRawForRepairPrompt = 8000
	maxRawForErrors       = 800
	backoffBase           = 2 * time.Second
	backoffMax            = 30 * time.Second
)

func truncateForError(s string, max int) string {
	if max <= 0 || len(s) <= max {
		return s
	}
	return s[:max] + "...(truncated)"
}

// ExtractJSON robustly finds the outermost JSON object by tracking brace depth
// and respecting string boundaries. This handles nested objects, escaped quotes,
// and ignores text before/after the JSON.
// sanitizeAIJSON fixes common AI JSON formatting issues before parsing.
// AI models (especially smaller ones like llama3.1) commonly produce:
//   - Raw LaTeX commands: \textbf, \section — invalid in JSON strings
//   - \' (LaTeX-style escape) — not valid in JSON
//   - Unicode chars without proper \uXXXX encoding
func sanitizeAIJSON(s string) string {
	result := make([]byte, 0, len(s))
	escaped := false
	for i := 0; i < len(s); i++ {
		ch := s[i]
		if escaped {
			// Peek at the char after backslash; keep it only if it's a valid JSON escape
			switch ch {
			case '"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u':
				result = append(result, ch)
			default:
				// Invalid escape — remove the backslash, keep only the char
				result[len(result)-1] = ch
			}
			escaped = false
			continue
		}
		if ch == '\\' {
			result = append(result, ch)
			escaped = true
			continue
		}
		result = append(result, ch)
	}
	return string(result)
}

func ExtractJSON(raw string) (string, error) {
	start := strings.Index(raw, "{")
	if start == -1 {
		return "", fmt.Errorf("extract JSON: no '{' found")
	}

	depth := 0
	inString := false
	escaped := false
	for i := start; i < len(raw); i++ {
		ch := raw[i]
		if escaped {
			escaped = false
			continue
		}
		if ch == '\\' && inString {
			escaped = true
			continue
		}
		if ch == '"' {
			inString = !inString
			continue
		}
		if !inString {
			if ch == '{' {
				depth++
			} else if ch == '}' {
				depth--
				if depth == 0 {
					return raw[start : i+1], nil
				}
			}
		}
	}
	return "", fmt.Errorf("extract JSON: unclosed JSON object (depth=%d at end)", depth)
}

var (
	responseCache = ai.NewResponseCache(5*time.Minute, 200)
)

// GenerateJSON is the generic engine. [T any] allows it to return ANY struct type.
func GenerateJSON[T any](
	ctx context.Context,
	assistant *ai.Assistant,
	category string,
	cacheKey string,
	prompt string,
	clientID string,
	useMemory bool,
) (*T, error) {
	if ctx == nil {
		return nil, fmt.Errorf("generate JSON (%s/%s): context is nil", category, cacheKey)
	}
	if assistant == nil {
		return nil, fmt.Errorf("generate JSON (%s/%s): assistant is nil", category, cacheKey)
	}

	var rawResponse string

	// 1. Check cache
	if cacheKey != "" {
		if cached, ok := responseCache.Get(cacheKey); ok {
			log.Printf("[%s] Cache hit for key: %s", category, cacheKey)
			rawResponse = cached
		}
	}

	// 2. Ask AI (only if not from cache)
	if rawResponse == "" {
		resp, err := assistant.Ask(ctx, prompt, clientID, useMemory)
		if err != nil {
			return nil, fmt.Errorf("AI generation failed: %w", err)
		}
		rawResponse = resp
		if cacheKey != "" {
			responseCache.Set(cacheKey, rawResponse)
		}
	}

	// 3. Parse JSON (with AI repair retry and backoff)
	const maxRepairAttempts = 2
	totalAttempts := maxRepairAttempts + 1

	var lastErr error
	for attempt := 0; attempt < totalAttempts; attempt++ {
		jsonStr, err := ExtractJSON(rawResponse)
		if err != nil {
			log.Printf("[%s] ExtractJSON failed (attempt %d/%d): %v", category, attempt+1, totalAttempts, err)
			lastErr = err
		} else {
			var result T
			jsonStr = sanitizeAIJSON(jsonStr)
			if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
				log.Printf("[%s] json.Unmarshal failed (attempt %d/%d): %v", category, attempt+1, totalAttempts, err)
				lastErr = err
			} else {
				if attempt == 0 {
					log.Printf("[%s] Parsed JSON successfully without repair for key: %s", category, cacheKey)
				} else {
					log.Printf("[%s] Parsed JSON successfully after repair attempt for key: %s", category, cacheKey)
				}
				return &result, nil
			}
		}

		// Exhausted retries
		if attempt == maxRepairAttempts {
			rawSnippet := truncateForError(rawResponse, maxRawForErrors)
			if lastErr != nil {
				return nil, fmt.Errorf(
					"generate JSON (%s/%s): failed after %d attempt(s): %w; raw=%q",
					category, cacheKey, totalAttempts, lastErr, rawSnippet,
				)
			}
			return nil, fmt.Errorf(
				"generate JSON (%s/%s): failed after %d attempt(s): unknown error; raw=%q",
				category, cacheKey, totalAttempts, rawSnippet,
			)
		}

		// Backoff before repair retry
		backoff := backoffBase * (1 << attempt) // 2s, 4s
		if backoff > backoffMax {
			backoff = backoffMax
		}
		log.Printf("[%s] Backing off %v before repair attempt %d/%d for key: %s",
			category, backoff, attempt+2, totalAttempts, cacheKey)

		select {
		case <-time.After(backoff):
		case <-ctx.Done():
			return nil, fmt.Errorf("generate JSON (%s/%s): context cancelled during backoff: %w",
				category, cacheKey, ctx.Err())
		}

		// Ask the AI to repair
		log.Printf("[%s] Requesting AI JSON repair (attempt %d/%d) for key: %s",
			category, attempt+2, totalAttempts, cacheKey)

		rawForPrompt := truncateForError(rawResponse, maxRawForRepairPrompt)
		parseErr := lastErr
		if parseErr == nil {
			parseErr = fmt.Errorf("unknown parse error")
		}
		repairPrompt := fmt.Sprintf(
			"Ta réponse n'est pas un JSON valide.\n"+
				"Erreur de parsing:\n%v\n\n"+
				"Voici le JSON approximatif (peut contenir des échappements incorrects, notamment des backslashes LaTeX):\n"+
				"---\n%s\n---\n\n"+
				"Répare-le et renvoie UNIQUEMENT un objet JSON valide.\n"+
				"N'ajoute aucun commentaire, aucun markdown, aucun texte en dehors du JSON.\n"+
				"Conserve la même structure (n'enlève ni n'invente de champs), et corrige seulement la syntaxe/échappements.",
			parseErr,
			rawForPrompt,
		)

		repairResp, err := assistant.Ask(ctx, repairPrompt, clientID, false)
		if err != nil {
			return nil, fmt.Errorf("AI repair failed: %w (original parse error: %v)", err, lastErr)
		}
		rawResponse = repairResp
		// Don't cache repaired responses
	}

	return nil, fmt.Errorf("generate JSON (%s/%s): failed to parse JSON: %v", category, cacheKey, lastErr)
}

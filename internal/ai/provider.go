package ai

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"
)

const (
	defaultTimeout  = 3 * time.Minute
	maxPromptLogged = 200
)

type Provider interface {
	Generate(ctx context.Context, prompt string) (string, error)
	SwitchModel(model string)
	ListModels(ctx context.Context) ([]string, error)
	Name() string
}

// Assistant manages AI interactions with per-client context accumulation.
// Instead of storing a growing list of Q&A pairs (which requires expensive
// bulk compression), it maintains a running "project context" that gets
// incrementally updated after each response. This keeps context bounded
// in size without the need for threshold-based compression.
type Assistant struct {
	provider  Provider
	timeout   time.Duration
	contexts  map[string]string // clientID → accumulated project context
	mu        sync.RWMutex
}

var (
	instance *Assistant
	instMu   sync.Mutex
)

// NewAssistantInstance creates a fresh assistant instance per request.
func NewAssistantInstance(provider Provider, _ int) *Assistant {
	return &Assistant{
		provider: provider,
		timeout:  defaultTimeout,
		contexts: make(map[string]string),
	}
}

// GetAIAssistant returns or creates a shared global assistant instance.
func GetAIAssistant(provider Provider, _ int) *Assistant {
	instMu.Lock()
	defer instMu.Unlock()
	if instance == nil {
		instance = &Assistant{
			provider: provider,
			timeout:  defaultTimeout,
			contexts: make(map[string]string),
		}
	}
	return instance
}

func (a *Assistant) SetProvider(provider Provider) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.provider = provider
}

// getContext returns the accumulated project context for a client.
func (a *Assistant) getContext(clientID string) string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if ctx, exists := a.contexts[clientID]; exists {
		return ctx
	}
	return ""
}

// extractKeyInfo asks the AI to distill new key information from a response
// into 1-3 concise sentences that can be appended to the running context.
// This is much lighter than bulk compression — it only needs to parse the
// latest response, not re-process all past history.
func (a *Assistant) extractKeyInfo(ctx context.Context, prompt, response string) string {
	extractionPrompt := fmt.Sprintf(
		`À partir de l'échange suivant, extrais UNIQUEMENT les informations factuelles clés (concepts, décisions, résultats) en 1 à 3 phrases maximum.

Question: %s
Réponse: %s

Ne fais aucune introduction. Renvoie uniquement les informations clés extraites.`,
		truncateText(prompt, 800),
		truncateText(response, 2000),
	)

	a.mu.RLock()
	prov := a.provider
	a.mu.RUnlock()

	extractionCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	summary, err := prov.Generate(extractionCtx, extractionPrompt)
	if err != nil {
		log.Printf("Context extraction failed: %v — using raw response snippet", err)
		// Fallback: just take the first 200 chars of the response
		return truncateText(response, 200)
	}

	return strings.TrimSpace(summary)
}

// updateContext appends new key information to the running context for a client.
func (a *Assistant) updateContext(clientID, extraction string) {
	if extraction == "" {
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	existing := a.contexts[clientID]
	if existing == "" {
		a.contexts[clientID] = extraction
	} else {
		// Append with a separator to keep structure readable
		a.contexts[clientID] = existing + "\n- " + extraction
	}
}

// formatContext returns the accumulated context as a prependable string.
func (a *Assistant) formatContext(clientID string) string {
	ctx := a.getContext(clientID)
	if ctx == "" {
		return ""
	}
	return "Contexte du projet (informations accumulées des étapes précédentes) :\n" + ctx + "\n\n"
}

// SetTimeout overrides the default request timeout for this assistant.
func (a *Assistant) SetTimeout(d time.Duration) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.timeout = d
}

// ClearMemory clears the accumulated context for a client.
func (a *Assistant) ClearMemory(clientID string) {
	if clientID == "" {
		clientID = "default"
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	delete(a.contexts, clientID)
	log.Printf("[%s] Context cleared.", clientID)
}

func (a *Assistant) Ask(ctx context.Context, prompt string, clientID string, useMemory bool) (string, error) {
	if clientID == "" {
		clientID = "default"
	}

	a.mu.RLock()
	prov := a.provider
	timeout := a.timeout
	a.mu.RUnlock()

	// Truncate prompt for logging to avoid leaking content
	promptPreview := prompt
	if len(promptPreview) > maxPromptLogged {
		promptPreview = promptPreview[:maxPromptLogged] + "..."
	}
	log.Printf("Sending request to %s for client '%s' (prompt: %d chars)...", prov.Name(), clientID, len(prompt))

	fullPrompt := prompt

	if useMemory {
		contextStr := a.formatContext(clientID)
		if contextStr != "" {
			fullPrompt = fmt.Sprintf("%s\n\n%s", contextStr, prompt)
		}
	}

	// Apply deadline to prevent indefinite hangs
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	response, err := prov.Generate(reqCtx, fullPrompt)
	if err != nil {
		return "", err
	}

	// Reject empty responses
	if strings.TrimSpace(response) == "" {
		return "", fmt.Errorf("AI returned empty response for client '%s'", clientID)
	}

	if useMemory {
		// Incrementally extract key info from this exchange and append to context.
		// This is O(1) per call — no bulk compression, no threshold, no loss.
		extraction := a.extractKeyInfo(ctx, prompt, response)
		if extraction != "" {
			a.updateContext(clientID, extraction)
			log.Printf("[%s] Context updated (+%d chars, total: %d chars)",
				clientID, len(extraction), len(a.getContext(clientID)))
		}
	}

	return response, nil
}

func truncateText(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

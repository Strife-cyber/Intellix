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
	defaultTimeoutMinutes = 3
	maxPromptLogged      = 200
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
// incrementally updated after each response by parsing the structured
// <CONTEXT_UPDATE> block the AI includes. This keeps context bounded
// in size without the need for threshold-based compression.
type Assistant struct {
	provider  Provider
	timeout   int // minutes
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
		timeout:  defaultTimeoutMinutes,
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
			timeout:  defaultTimeoutMinutes,
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

// parseContextUpdate extracts the text between <CONTEXT_UPDATE> and </CONTEXT_UPDATE>
// from the AI's response. If no such block is found, falls back to the first 150
// characters of the response.
func parseContextUpdate(response string) string {
	startTag := "<CONTEXT_UPDATE>"
	endTag := "</CONTEXT_UPDATE>"

	startIdx := strings.Index(response, startTag)
	if startIdx == -1 {
		// No CONTEXT_UPDATE block — use fallback
		return truncateText(response, 150)
	}
	startIdx += len(startTag)

	endIdx := strings.Index(response[startIdx:], endTag)
	if endIdx == -1 {
		return truncateText(response, 150)
	}

	content := strings.TrimSpace(response[startIdx : startIdx+endIdx])
	if content == "" {
		return truncateText(response, 150)
	}
	return content
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
	a.timeout = int(d.Minutes())
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
	timeoutMinutes := a.timeout
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
	reqCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutMinutes)*time.Minute)
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
		// Parse the <CONTEXT_UPDATE> block from the response to incrementally
		// update the running context. No extra AI call needed.
		extraction := parseContextUpdate(response)
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

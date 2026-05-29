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

type MemoryItem struct {
	User     string
	Response string
}

type Assistant struct {
	provider  Provider
	threshold int
	timeout   time.Duration
	memories  map[string][]MemoryItem
	mu        sync.RWMutex
}

var (
	instance *Assistant
	instMu   sync.Mutex
)

// NewAssistantInstance creates a fresh assistant instance per request.
// This avoids shared in-memory state (memories) and keeps the service stateless.
func NewAssistantInstance(provider Provider, threshold int) *Assistant {
	return &Assistant{
		provider:  provider,
		threshold: threshold,
		timeout:   defaultTimeout,
		memories:  make(map[string][]MemoryItem),
	}
}

func GetAIAssistant(provider Provider, threshold int) *Assistant {
	instMu.Lock()
	defer instMu.Unlock()
	if instance == nil {
		instance = &Assistant{
			provider:  provider,
			threshold: threshold,
			timeout:   defaultTimeout,
			memories:  make(map[string][]MemoryItem),
		}
	}
	return instance
}

func (a *Assistant) SetProvider(provider Provider) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.provider = provider
}

func (a *Assistant) getMemory(clientID string) []MemoryItem {
	a.mu.RLock()
	defer a.mu.RUnlock()
	if mem, exists := a.memories[clientID]; exists {
		return mem
	}
	return []MemoryItem{}
}

func (a *Assistant) formatMemory(clientID string) string {
	memory := a.getMemory(clientID)
	if len(memory) == 0 {
		return ""
	}

	var sb strings.Builder
	sb.WriteString("Voici le contexte des tâches précédentes que tu as déjà accomplies pour ce projet. Utilise ces informations pour rester cohérent :\n")
	for _, task := range memory {
		sb.WriteString(fmt.Sprintf("User: %s\nResponse: %s\n\n", task.User, task.Response))
	}
	return sb.String()
}

func (a *Assistant) summarizeMemory(ctx context.Context, clientID string) {
	memory := a.getMemory(clientID)
	if len(memory) <= a.threshold {
		return
	}

	log.Printf("[%s] Memory reached %d items. Compressing context...", clientID, a.threshold)
	memoryText := a.formatMemory(clientID)

	prompt := fmt.Sprintf(`
Tu es un système de compression de contexte mémoire.
Voici l'historique des travaux d'un étudiant en ingénierie :

%s

Rédige un résumé EXTRÊMEMENT dense et factuel (max 5 phrases). 
Conserve uniquement les concepts clés, les définitions importantes et le contexte global.
Ne fais aucune introduction ni conclusion. Renvoie uniquement le texte compressé.
`, memoryText)

	// Lock purely to read the current provider safely
	a.mu.RLock()
	prov := a.provider
	a.mu.RUnlock()

	compressedContext, err := prov.Generate(ctx, prompt)
	if err != nil {
		log.Printf("[%s] Failed to compress memory: %v", clientID, err)
		return
	}

	// Safely overwrite the memory with the new compressed item
	a.mu.Lock()
	a.memories[clientID] = []MemoryItem{
		{
			User:     "Compress memory",
			Response: strings.TrimSpace(compressedContext),
		},
	}
	a.mu.Unlock()

	log.Printf("[%s] Memory compressed successfully.", clientID)
}

// SetTimeout overrides the default request timeout for this assistant.
func (a *Assistant) SetTimeout(d time.Duration) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.timeout = d
}

func (a *Assistant) ClearMemory(clientID string) {
	if clientID == "" {
		clientID = "default"
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.memories[clientID] = []MemoryItem{}
	log.Printf("[%s] Memory cleared.", clientID)
}

func (a *Assistant) appendMemory(clientID, prompt, response string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if _, exists := a.memories[clientID]; !exists {
		a.memories[clientID] = []MemoryItem{}
	}
	a.memories[clientID] = append(a.memories[clientID], MemoryItem{
		User:     prompt,
		Response: response,
	})
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
		a.summarizeMemory(ctx, clientID)
		contextStr := a.formatMemory(clientID)
		if contextStr != "" {
			fullPrompt = fmt.Sprintf("%s \n\n\n %s", contextStr, prompt)
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
		a.appendMemory(clientID, prompt, response)
	}

	return response, nil
}

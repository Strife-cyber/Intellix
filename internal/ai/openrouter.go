package ai

import (
	"context"
	"fmt"
	"os"
	"sync"

	"github.com/sashabaranov/go-openai"
)

type OpenRouterProvider struct {
	client *openai.Client
	model  string
	mu     sync.RWMutex
}

//goland:noinspection GoUnusedExportedFunction
func NewOpenRouterProvider(apiKey, model string) *OpenRouterProvider {
	if apiKey == "" {
		apiKey = os.Getenv("OPENROUTER_API_KEY")
	}

	config := openai.DefaultConfig(apiKey)
	config.BaseURL = "https://openrouter.ai/api/v1"

	return &OpenRouterProvider{
		client: openai.NewClientWithConfig(config),
		model:  model,
	}
}

func (p *OpenRouterProvider) Generate(ctx context.Context, prompt string) (string, error) {
	p.mu.RLock()
	currentModel := p.model
	p.mu.RUnlock()

	req := openai.ChatCompletionRequest{
		Model: currentModel,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleUser, Content: prompt},
		},
		Temperature: 0.1,
	}

	resp, err := p.client.CreateChatCompletion(ctx, req)
	if err != nil {
		return "", fmt.Errorf("OpenRouter Error: %w", err)
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("OpenRouter Error: no choices returned")
	}

	return resp.Choices[0].Message.Content, nil
}

func (p *OpenRouterProvider) SwitchModel(model string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.model = model
}

func (p *OpenRouterProvider) ListModels(ctx context.Context) ([]string, error) {
	models, err := p.client.ListModels(ctx)
	if err != nil {
		return nil, err
	}
	var list []string
	for _, m := range models.Models {
		list = append(list, m.ID)
	}
	return list, nil
}

func (p *OpenRouterProvider) Name() string { return "OpenRouter" }

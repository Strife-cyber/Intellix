package ai

import (
	"context"
	"fmt"
	"sync"

	"github.com/sashabaranov/go-openai"
)

type OpenAIProvider struct {
	client      *openai.Client
	model       string
	temperature float32
	mu          sync.RWMutex
}

func NewOpenAICompatibleProvider(baseURL, apiKey, model string, temperature float32) (*OpenAIProvider, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("openai api key is required")
	}

	config := openai.DefaultConfig(apiKey)
	config.BaseURL = baseURL

	return &OpenAIProvider{
		client:      openai.NewClientWithConfig(config),
		model:       model,
		temperature: temperature,
	}, nil
}

func (p *OpenAIProvider) Generate(ctx context.Context, prompt string) (string, error) {
	p.mu.RLock()
	currentModel := p.model
	p.mu.RUnlock()

	resp, err := p.client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model: currentModel,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleUser, Content: prompt},
		},
		Temperature: p.temperature,
	})
	if err != nil {
		return "", fmt.Errorf("OpenAI Error: %w", err)
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("OpenAI Error: no choices found")
	}

	return resp.Choices[0].Message.Content, nil
}

func (p *OpenAIProvider) SwitchModel(model string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.model = model
}

func (p *OpenAIProvider) ListModels(ctx context.Context) ([]string, error) {
	models, err := p.client.ListModels(ctx)
	if err != nil {
		return nil, err
	}

	list := make([]string, 0, len(models.Models))
	for _, m := range models.Models {
		list = append(list, m.ID)
	}

	return list, nil
}

func (p *OpenAIProvider) Name() string { return "OpenAI" }

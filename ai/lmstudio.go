package ai

import (
	"context"
	"fmt"
	"sync"

	"github.com/sashabaranov/go-openai"
)

type LMStudioProvider struct {
	client      *openai.Client
	model       string
	temperature float32
	mu          sync.RWMutex
}

func NewLMStudioProvider(baseURL, model string, temperature float32) *LMStudioProvider {
	config := openai.DefaultConfig("lm-studio")
	config.BaseURL = baseURL

	return &LMStudioProvider{
		client:      openai.NewClientWithConfig(config),
		model:       model,
		temperature: temperature,
	}
}

func (p *LMStudioProvider) Generate(ctx context.Context, prompt string) (string, error) {
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
		return "", fmt.Errorf("LM Studio Error: %w", err)
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("LM Studio Error: no choices found")
	}

	return resp.Choices[0].Message.Content, nil
}

func (p *LMStudioProvider) SwitchModel(model string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.model = model
}

func (p *LMStudioProvider) ListModels(ctx context.Context) ([]string, error) {
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

func (p *LMStudioProvider) Name() string { return "LM Studio" }

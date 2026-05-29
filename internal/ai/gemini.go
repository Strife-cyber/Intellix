package ai

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type GeminiProvider struct {
	client *genai.Client
	model  string
	mu     sync.RWMutex
}

//goland:noinspection GoUnusedExportedFunction
func NewGeminiProvider(ctx context.Context, apiKey, model string) (*GeminiProvider, error) {
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("NewGeminiProvider: Failed to create Gemini client %w", err)
	}

	return &GeminiProvider{
		client: client,
		model:  model,
	}, nil
}

func (p *GeminiProvider) Generate(ctx context.Context, prompt string) (string, error) {
	p.mu.RLock()
	modelName := p.model
	p.mu.RUnlock()

	model := p.client.GenerativeModel(modelName)

	promptUpper := strings.ToUpper(prompt)
	if strings.Contains(promptUpper, "JSON") || strings.Contains(promptUpper, "OBJET JSON") {
		model.ResponseMIMEType = "application/json"
		model.Temperature = new(float32(0.1))
	}

	resp, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("GeminiProvider: Failed to generate content %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("GeminiProvider: Empty response")
	}

	if textPart, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
		return string(textPart), nil
	}

	return "", fmt.Errorf("GeminiProvider: unrecognized response format")
}

func (p *GeminiProvider) SwitchModel(model string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.model = model
}

func (p *GeminiProvider) ListModels(ctx context.Context) ([]string, error) {
	iter := p.client.ListModels(ctx)
	var list []string
	for {
		m, err := iter.Next()
		if err != nil {
			break
		}
		list = append(list, m.Name)
	}
	return list, nil
}

func (p *GeminiProvider) Name() string { return "Gemini" }

package jobs

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"micro-cer/internal/ai"
)

func resolveAIProvider(ctx context.Context) (ai.Provider, error) {
	return resolveAIProviderFromConfig(ctx, nil)
}

func resolveAIProviderFromConfig(ctx context.Context, cfg *ProviderConfig) (ai.Provider, error) {
	if cfg != nil && strings.TrimSpace(cfg.Type) != "" {
		return providerFromConfig(ctx, cfg)
	}
	return providerFromEnv(ctx)
}

func providerFromConfig(ctx context.Context, cfg *ProviderConfig) (ai.Provider, error) {
	kind := strings.ToLower(strings.TrimSpace(cfg.Type))
	temp := float32(cfg.Temperature)
	if temp <= 0 {
		temp = 0.1
	}

	switch kind {
	case "ollama":
		baseURL := strings.TrimSpace(cfg.Endpoint)
		if baseURL == "" {
			baseURL = "http://localhost:11434"
		}
		model := strings.TrimSpace(cfg.Model)
		if model == "" {
			model = "llama3.1"
		}
		return ai.NewOllamaProvider(strings.TrimSuffix(baseURL, "/")+"/v1", model, temp), nil
	case "openrouter":
		key := strings.TrimSpace(cfg.APIKey)
		if key == "" {
			return nil, fmt.Errorf("openrouter api key is required")
		}
		model := strings.TrimSpace(cfg.Model)
		return ai.NewOpenRouterProvider(key, model), nil
	case "gemini":
		model := strings.TrimSpace(cfg.Model)
		return ai.NewGeminiProvider(ctx, strings.TrimSpace(cfg.APIKey), model)
	case "lmstudio":
		baseURL := strings.TrimSpace(cfg.Endpoint)
		if baseURL == "" {
			baseURL = "http://localhost:1234"
		}
		model := strings.TrimSpace(cfg.Model)
		return ai.NewLMStudioProvider(baseURL, model, temp), nil
	case "openai":
		key := strings.TrimSpace(cfg.APIKey)
		if key == "" {
			return nil, fmt.Errorf("openai api key is required")
		}
		model := strings.TrimSpace(cfg.Model)
		if model == "" {
			model = "gpt-4o-mini"
		}
		baseURL := strings.TrimSpace(cfg.Endpoint)
		if baseURL == "" {
			baseURL = "https://api.openai.com/v1"
		} else if !strings.HasSuffix(baseURL, "/v1") {
			baseURL = strings.TrimSuffix(baseURL, "/") + "/v1"
		}
		return ai.NewOpenAICompatibleProvider(baseURL, key, model, temp)
	default:
		return nil, fmt.Errorf("unsupported provider type: %s", kind)
	}
}

func providerFromEnv(ctx context.Context) (ai.Provider, error) {
	kind := strings.ToLower(strings.TrimSpace(os.Getenv("AI_PROVIDER")))
	if kind == "" {
		kind = "ollama"
	}

	switch kind {
	case "ollama":
		baseURL := os.Getenv("OLLAMA_BASE_URL")
		if baseURL == "" {
			baseURL = "http://localhost:11434"
		}
		if err := pingURL(ctx, baseURL+"/api/tags"); err != nil {
			return nil, fmt.Errorf("ollama not reachable at %s: %w", baseURL, err)
		}
		model := os.Getenv("OLLAMA_MODEL")
		if model == "" {
			model = "llama3.1"
		}
		return ai.NewOllamaProvider(baseURL+"/v1", model, 0.1), nil
	case "openrouter":
		key := os.Getenv("OPENROUTER_API_KEY")
		if key == "" {
			return nil, fmt.Errorf("OPENROUTER_API_KEY is required")
		}
		model := os.Getenv("OPENROUTER_MODEL")
		return ai.NewOpenRouterProvider(key, model), nil
	case "gemini":
		model := os.Getenv("GEMINI_MODEL")
		return ai.NewGeminiProvider(ctx, "", model)
	case "lmstudio":
		baseURL := os.Getenv("LMSTUDIO_BASE_URL")
		model := os.Getenv("LMSTUDIO_MODEL")
		return ai.NewLMStudioProvider(baseURL, model, 0.1), nil
	default:
		return nil, fmt.Errorf("unsupported AI_PROVIDER: %s", kind)
	}
}

func pingURL(ctx context.Context, url string) error {
	reqCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("status %d", resp.StatusCode)
	}
	return nil
}

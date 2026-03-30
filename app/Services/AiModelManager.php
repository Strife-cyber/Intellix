<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiModelManager
{
    /**
     * Auto-detect and get the best available AI endpoint.
     * 
     * @return string|null The working endpoint URL or null if none available
     */
    public static function getBestEndpoint(): ?string
    {
        // Try configured endpoint first
        $configuredEndpoint = config('services.ai.endpoint', env('AI_ENDPOINT'));
        if ($configuredEndpoint && self::testEndpoint($configuredEndpoint)) {
            Log::info("Using configured AI endpoint: {$configuredEndpoint}");
            return $configuredEndpoint;
        }

        // Try common LM Studio endpoints
        $lmStudioEndpoints = [
            'http://localhost:1234',  // Default LM Studio
            'http://localhost:8080',  // Alternative port
            'http://127.0.0.1:1234',  // Localhost alternative
            'http://127.0.0.1:8080',  // Localhost alternative port
            'http://0.0.0.0:1234',   // All interfaces
            'http://0.0.0.0:8080',   // All interfaces alternative
        ];

        foreach ($lmStudioEndpoints as $endpoint) {
            if (self::testEndpoint($endpoint)) {
                Log::info("Auto-detected LM Studio endpoint: {$endpoint}");
                return $endpoint;
            }
        }

        Log::warning("No working AI endpoint found. Tried: " . implode(', ', array_merge([$configuredEndpoint], $lmStudioEndpoints)));
        return null;
    }

    /**
     * Test if an AI endpoint is working and has models loaded.
     * 
     * @param string $endpoint The endpoint to test
     * @return bool True if the endpoint is working
     */
    private static function testEndpoint(string $endpoint): bool
    {
        try {
            // Test basic connectivity
            $response = Http::timeout(5)->get("{$endpoint}/v1/models");
            
            if ($response->failed()) {
                return false;
            }

            $models = $response->json('data', []);
            
            // Check if there are any models available
            if (empty($models)) {
                Log::info("Endpoint {$endpoint} is reachable but no models loaded");
                return false;
            }

            // Log available models for debugging
            $modelNames = array_column($models, 'id');
            Log::info("Endpoint {$endpoint} has models: " . implode(', ', $modelNames));

            return true;
        } catch (\Exception $e) {
            Log::debug("Failed to test endpoint {$endpoint}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get the best available model from an endpoint.
     * 
     * @param string $endpoint The endpoint to check
     * @return string|null The model ID or null if no models available
     */
    public static function getBestModel(string $endpoint): ?string
    {
        try {
            $response = Http::timeout(5)->get("{$endpoint}/v1/models");
            
            if ($response->failed()) {
                return null;
            }

            $models = $response->json('data', []);
            
            if (empty($models)) {
                return null;
            }

            // Prioritize models in order of preference
            $preferredModels = [
                'deepseek-r1:1.5b',     // DeepSeek reasoning model
                'deepseek-coder:6.7b',   // DeepSeek code model
                'deepseek-chat:1.3b',    // DeepSeek chat model
                'llama-3.2-3b-instruct', // Small Llama
                'qwen2.5-3b-instruct',   // Qwen model
                'gemma-2b-it',           // Google Gemma
                'phi-3-mini-4k-instruct', // Microsoft Phi
                'local-model',           // Generic fallback
            ];

            // Try to find a preferred model
            foreach ($preferredModels as $preferredModel) {
                foreach ($models as $model) {
                    if (str_contains(strtolower($model['id']), strtolower($preferredModel))) {
                        return $model['id'];
                    }
                }
            }

            // If no preferred model found, use the first available
            return $models[0]['id'] ?? null;
        } catch (\Exception $e) {
            Log::error("Failed to get models from endpoint {$endpoint}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Auto-load a model if none are loaded (for compatible endpoints).
     * 
     * @param string $endpoint The endpoint to load model on
     * @return bool True if model loading was attempted/successful
     */
    public static function autoLoadModel(string $endpoint): bool
    {
        try {
            // Check if this endpoint supports model loading (LM Studio specific)
            $response = Http::timeout(5)->get("{$endpoint}/v1/models");
            
            if ($response->failed()) {
                return false;
            }

            $models = $response->json('data', []);
            
            // If models are already loaded, no need to auto-load
            if (!empty($models)) {
                return true;
            }

            // Try to load a default model (this is LM Studio specific)
            // Note: LM Studio doesn't have a standard API for loading models via HTTP
            // This would typically be done through the LM Studio UI
            Log::info("No models loaded on {$endpoint}. Please load a model in LM Studio UI.");
            
            return false;
        } catch (\Exception $e) {
            Log::error("Failed to auto-load model on {$endpoint}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get comprehensive AI service status.
     * 
     * @return array Status information about all AI services
     */
    public static function getStatus(): array
    {
        $status = [
            'configured_endpoint' => config('services.ai.endpoint', env('AI_ENDPOINT')),
            'working_endpoint' => null,
            'available_models' => [],
            'recommended_model' => null,
            'lm_studio_detected' => false,
        ];

        $endpoint = self::getBestEndpoint();
        if ($endpoint) {
            $status['working_endpoint'] = $endpoint;
            $status['lm_studio_detected'] = str_contains($endpoint, 'localhost') || str_contains($endpoint, '127.0.0.1');
            
            $model = self::getBestModel($endpoint);
            if ($model) {
                $status['recommended_model'] = $model;
                
                // Get all available models
                try {
                    $response = Http::timeout(5)->get("{$endpoint}/v1/models");
                    if (!$response->failed()) {
                        $status['available_models'] = $response->json('data', []);
                    }
                } catch (\Exception $e) {
                    Log::error("Failed to get model list: " . $e->getMessage());
                }
            }
        }

        return $status;
    }
}

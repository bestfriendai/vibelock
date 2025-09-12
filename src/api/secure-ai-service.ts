/**
 * Secure AI Service - Client-side API for AI interactions
 * This service uses a backend proxy to keep API keys secure
 * Replaces direct API key usage in client bundle
 */

import { supabase } from "../config/supabase";
import { AppError, ErrorType } from "../utils/errorHandling";

interface AIRequest {
  provider: "openai" | "anthropic" | "grok";
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  response: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

class SecureAIService {
  private readonly baseUrl: string;

  constructor() {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("Supabase URL not configured");
    }
    this.baseUrl = `${supabaseUrl}/functions/v1`;
  }

  /**
   * Make a secure AI API call through the backend proxy
   */
  private async makeAIRequest(request: AIRequest): Promise<AIResponse> {
    try {
      // Get the current user's session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new AppError("Authentication required for AI services", ErrorType.AUTH, "AUTH_REQUIRED");
      }

      const response = await fetch(`${this.baseUrl}/ai-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new AppError(
          errorData.error || `AI API request failed: ${response.status}`,
          ErrorType.NETWORK,
          "AI_API_ERROR",
        );
      }

      const data: AIResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.warn("AI Service Error:", error);
      throw new AppError("Failed to communicate with AI service", ErrorType.NETWORK, "AI_SERVICE_ERROR");
    }
  }

  /**
   * Generate response using OpenAI
   */
  async generateOpenAIResponse(
    prompt: string,
    model: string = "gpt-4o-2024-11-20",
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const response = await this.makeAIRequest({
      provider: "openai",
      prompt,
      model,
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
    });

    return response.response;
  }

  /**
   * Generate response using Anthropic Claude
   */
  async generateAnthropicResponse(
    prompt: string,
    model: string = "claude-3-5-sonnet-20241022",
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const response = await this.makeAIRequest({
      provider: "anthropic",
      prompt,
      model,
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
    });

    return response.response;
  }

  /**
   * Generate response using Grok
   */
  async generateGrokResponse(
    prompt: string,
    model: string = "grok-beta",
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const response = await this.makeAIRequest({
      provider: "grok",
      prompt,
      model,
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
    });

    return response.response;
  }

  /**
   * Get AI response with automatic provider fallback
   */
  async generateAIResponse(
    prompt: string,
    preferredProvider: "openai" | "anthropic" | "grok" = "openai",
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<{ response: string; provider: string }> {
    const providers = [preferredProvider, "openai", "anthropic", "grok"].filter(
      (provider, index, arr) => arr.indexOf(provider) === index,
    );

    for (const provider of providers) {
      try {
        let response: string;

        switch (provider) {
          case "openai":
            response = await this.generateOpenAIResponse(prompt, undefined, options);
            break;
          case "anthropic":
            response = await this.generateAnthropicResponse(prompt, undefined, options);
            break;
          case "grok":
            response = await this.generateGrokResponse(prompt, undefined, options);
            break;
          default:
            continue;
        }

        return { response, provider };
      } catch (error) {
        console.warn(`AI provider ${provider} failed:`, error);
        // Continue to next provider
      }
    }

    throw new AppError("All AI providers failed to respond", ErrorType.NETWORK, "ALL_AI_PROVIDERS_FAILED");
  }
}

// Export singleton instance
export const secureAIService = new SecureAIService();

// Export individual functions for backward compatibility
export const generateOpenAIResponse = (
  prompt: string,
  model?: string,
  options?: { maxTokens?: number; temperature?: number },
) => secureAIService.generateOpenAIResponse(prompt, model, options);

export const generateAnthropicResponse = (
  prompt: string,
  model?: string,
  options?: { maxTokens?: number; temperature?: number },
) => secureAIService.generateAnthropicResponse(prompt, model, options);

export const generateGrokResponse = (
  prompt: string,
  model?: string,
  options?: { maxTokens?: number; temperature?: number },
) => secureAIService.generateGrokResponse(prompt, model, options);

export const generateAIResponse = (
  prompt: string,
  preferredProvider?: "openai" | "anthropic" | "grok",
  options?: { maxTokens?: number; temperature?: number },
) => secureAIService.generateAIResponse(prompt, preferredProvider, options);

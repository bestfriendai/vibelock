/*
IMPORTANT NOTICE: DO NOT REMOVE
./src/api/chat-service.ts
If the user wants to use AI to generate text, answer questions, or analyze images you can use the functions defined in this file to communicate with the OpenAI, Anthropic, and Grok APIs.
*/
import { AIMessage, AIRequestOptions, AIResponse } from "../types/ai";
import { generateAnthropicResponse, generateOpenAIResponse, generateGrokResponse } from "./secure-ai-service";

/**
 * Get a text response from Anthropic
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getAnthropicTextResponse = async (
  messages: AIMessage[],
  options?: AIRequestOptions,
): Promise<AIResponse> => {
  try {
    const defaultModel = "claude-3-5-sonnet-20241022";

    // Convert messages to a single prompt for the secure service
    const prompt = messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n");

    const response = await generateAnthropicResponse(prompt, options?.model || defaultModel, {
      maxTokens: options?.maxTokens || 2048,
      temperature: options?.temperature || 0.7,
    });

    return {
      content: response,
      usage: {
        promptTokens: 0, // Usage tracking handled by secure service
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  } catch (error) {
    throw new Error(`Failed to get Anthropic response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

/**
 * Get a simple chat response from Anthropic
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getAnthropicChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getAnthropicTextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from OpenAI
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getOpenAITextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  try {
    const defaultModel = "gpt-4o-2024-11-20"; // accepts images as well, use this for image analysis

    // Convert messages to a single prompt for the secure service
    const prompt = messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n");

    const response = await generateOpenAIResponse(prompt, options?.model || defaultModel, {
      maxTokens: options?.maxTokens || 2048,
      temperature: options?.temperature ?? 0.7,
    });

    return {
      content: response,
      usage: {
        promptTokens: 0, // Usage tracking handled by secure service
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  } catch (error) {
    throw new Error(`Failed to get OpenAI response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

/**
 * Get a simple chat response from OpenAI
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getOpenAIChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getOpenAITextResponse([{ role: "user", content: prompt }]);
};

/**
 * Get a text response from Grok
 * @param messages - The messages to send to the AI
 * @param options - The options for the request
 * @returns The response from the AI
 */
export const getGrokTextResponse = async (messages: AIMessage[], options?: AIRequestOptions): Promise<AIResponse> => {
  try {
    const defaultModel = "grok-3-beta";

    // Convert messages to a single prompt for the secure service
    const prompt = messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n");

    const response = await generateGrokResponse(prompt, options?.model || defaultModel, {
      maxTokens: options?.maxTokens || 2048,
      temperature: options?.temperature ?? 0.7,
    });

    return {
      content: response,
      usage: {
        promptTokens: 0, // Usage tracking handled by secure service
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  } catch (error) {
    throw new Error(`Failed to get Grok response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

/**
 * Get a simple chat response from Grok
 * @param prompt - The prompt to send to the AI
 * @returns The response from the AI
 */
export const getGrokChatResponse = async (prompt: string): Promise<AIResponse> => {
  return await getGrokTextResponse([{ role: "user", content: prompt }]);
};

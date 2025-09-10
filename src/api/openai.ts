/*
IMPORTANT NOTICE: SECURITY UPDATE
This service now uses a secure backend proxy to protect API keys.
API keys are no longer exposed in the client bundle.

Available models:
gpt-4o-2024-11-20
gpt-4o-mini
gpt-4-turbo
o1-preview
o1-mini
*/

import { generateOpenAIResponse } from "./secure-ai-service";

/**
 * @deprecated Use generateOpenAIResponse from secure-ai-service instead
 * This function is maintained for backward compatibility but now uses secure proxy
 */
export const getOpenAIClient = () => {
  console.warn("getOpenAIClient is deprecated. Use generateOpenAIResponse from secure-ai-service instead.");

  // Return a mock client that throws an error to prevent direct usage
  return {
    chat: {
      completions: {
        create: () => {
          throw new Error(
            "Direct OpenAI client usage is disabled for security. Use generateOpenAIResponse from secure-ai-service instead.",
          );
        },
      },
    },
  };
};

// Export secure functions for backward compatibility
export { generateOpenAIResponse };

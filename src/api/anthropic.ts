/*
IMPORTANT NOTICE: SECURITY UPDATE
This service now uses a secure backend proxy to protect API keys.
API keys are no longer exposed in the client bundle.

Available models:
claude-3-5-sonnet-20241022
claude-3-5-haiku-20241022
claude-3-opus-20240229
*/

import { generateAnthropicResponse } from "./secure-ai-service";

/**
 * @deprecated Use generateAnthropicResponse from secure-ai-service instead
 * This function is maintained for backward compatibility but now uses secure proxy
 */
export const getAnthropicClient = () => {
  console.warn("getAnthropicClient is deprecated. Use generateAnthropicResponse from secure-ai-service instead.");

  // Return a mock client that throws an error to prevent direct usage
  return {
    messages: {
      create: () => {
        throw new Error(
          "Direct Anthropic client usage is disabled for security. Use generateAnthropicResponse from secure-ai-service instead.",
        );
      },
    },
  };
};

// Export secure functions for backward compatibility
export { generateAnthropicResponse };

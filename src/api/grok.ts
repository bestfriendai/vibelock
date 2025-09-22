/*
IMPORTANT NOTICE: SECURITY UPDATE
This service now uses a secure backend proxy to protect API keys.
API keys are no longer exposed in the client bundle.

Available models:
grok-beta
grok-3-latest
grok-3-fast-latest
grok-3-mini-latest
*/

import { generateGrokResponse } from "./secure-ai-service";

/**
 * @deprecated Use generateGrokResponse from secure-ai-service instead
 * This function is maintained for backward compatibility but now uses secure proxy
 */
export const getGrokClient = () => {
  throw new Error(
    "Direct Grok client usage is disabled for security. Use generateGrokResponse from secure-ai-service instead.",
  );
};

// Export secure functions for backward compatibility
export { generateGrokResponse };

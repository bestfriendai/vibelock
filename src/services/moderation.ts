// Content moderation service using OpenAI API
import { getOpenAITextResponse } from "../api/chat-service";
import { AIMessage } from "../types/ai";

export interface ModerationResult {
  isAppropriate: boolean;
  flaggedCategories: string[];
  confidence: number;
  reason?: string;
}

// Toggle moderation on/off. Set to false to disable automated moderation checks.
export const moderationEnabled = false;

/**
 * Moderate review content using OpenAI
 * @param reviewText The review text to moderate
 * @returns Moderation result
 */
export async function moderateReviewContent(reviewText: string): Promise<ModerationResult> {
  if (!moderationEnabled) {
    return {
      isAppropriate: true,
      flaggedCategories: [],
      confidence: 1,
      reason: "Moderation disabled",
    };
  }

  try {
    const prompt = `
You are a content moderator for a dating review platform. Please analyze the following review text and determine if it's appropriate for publication.

Review text: "${reviewText}"

Consider these guidelines:
- Allow honest opinions about dating experiences
- Flag content that contains personal attacks, harassment, or hate speech
- Flag content with explicit sexual details
- Flag content that could identify specific individuals beyond first names
- Flag spam or obviously fake reviews
- Allow constructive criticism about communication, reliability, etc.

Respond with a JSON object containing:
{
  "isAppropriate": boolean,
  "flaggedCategories": ["category1", "category2"],
  "confidence": number (0-1),
  "reason": "brief explanation if flagged"
}

Categories can include: "harassment", "hate_speech", "sexual_content", "personal_info", "spam", "fake"
`;

    const messages: AIMessage[] = [
      { role: "system", content: "You are a content moderation assistant. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ];

    const aiResponse = await getOpenAITextResponse(messages, {
      model: "gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 200,
    });

    const response = aiResponse.content;

    try {
      const result = JSON.parse(response);
      return {
        isAppropriate: result.isAppropriate || false,
        flaggedCategories: result.flaggedCategories || [],
        confidence: result.confidence || 0,
        reason: result.reason,
      };
    } catch (parseError) {
      console.error("Failed to parse moderation response:", parseError);
      // Default to flagged if we can't parse the response
      return {
        isAppropriate: false,
        flaggedCategories: ["parsing_error"],
        confidence: 0,
        reason: "Failed to analyze content",
      };
    }
  } catch (error) {
    console.error("Moderation API error:", error);
    // Default to approved if moderation service is down
    return {
      isAppropriate: true,
      flaggedCategories: [],
      confidence: 0,
      reason: "Moderation service unavailable",
    };
  }
}

/**
 * Moderate a person's name to ensure it's appropriate
 * @param name The name to moderate
 * @returns Whether the name is appropriate
 */
export async function moderateName(name: string): Promise<boolean> {
  try {
    // Basic checks for inappropriate names
    const inappropriatePatterns = [
      /\b(fuck|shit|damn|bitch|asshole|cunt)\b/i,
      /\b(hitler|nazi|terrorist)\b/i,
      /\d{3,}/, // Numbers that might be phone numbers
      /@/, // Email addresses
      /\.(com|org|net)/i, // Websites
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(name)) {
        return false;
      }
    }

    // Check if it's a reasonable first name (basic validation)
    if (name.length < 2 || name.length > 20) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Name moderation error:", error);
    // Default to approved if moderation fails
    return true;
  }
}

/**
 * Get moderation status display text
 * @param status Review status
 * @returns Display text
 */
export function getModerationStatusText(status: "pending" | "approved" | "rejected"): string {
  switch (status) {
    case "pending":
      return "Under Review";
    case "approved":
      return "Published";
    case "rejected":
      return "Not Approved";
    default:
      return "Unknown";
  }
}

/**
 * Check if content needs human review
 * @param moderationResult Result from automated moderation
 * @returns Whether human review is needed
 */
export function needsHumanReview(moderationResult: ModerationResult): boolean {
  // Require human review for:
  // - Low confidence automated decisions
  // - Borderline content
  // - Specific sensitive categories

  if (moderationResult.confidence < 0.7) {
    return true;
  }

  const sensitiveCategories = ["harassment", "hate_speech", "personal_info"];
  const hasSensitiveContent = moderationResult.flaggedCategories.some((category) =>
    sensitiveCategories.includes(category),
  );

  return hasSensitiveContent;
}

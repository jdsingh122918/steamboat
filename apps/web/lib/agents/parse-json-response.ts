/**
 * Parse JSON Response Utility
 *
 * Extracts JSON from AI responses that may include markdown code blocks or extra text.
 */

/**
 * Parse a JSON response from an AI model.
 * Handles responses wrapped in markdown code blocks or containing extra text.
 */
export function parseJsonResponse<T>(response: string): T | null {
  try {
    const trimmed = response.trim();

    // Check for JSON in markdown code block
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim());
    }

    // Try to find JSON object in the response
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Try direct parse
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

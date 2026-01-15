/**
 * Receipt Processor Agent
 *
 * AI agent for extracting expense data from receipt images.
 * Uses Claude's vision capabilities to analyze receipts.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentRole,
  AgentStatus,
  AgentRoleType,
  AgentStatusType,
  AgentResult,
  ExtractedExpenseData,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getAgentConfig, AgentModel } from './config';
import { getSystemPrompt } from './prompts';
import { getGlobalCostTracker } from './cost-tracker';

export interface ProcessReceiptInput {
  imageUrl: string;
  tripId: string;
  userId: string;
  tripName?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parse the AI response to extract expense data
 */
export function parseReceiptResponse(response: string): ExtractedExpenseData | null {
  try {
    // Try to parse directly
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

/**
 * Validate extracted expense data
 */
export function validateExtractedData(data: ExtractedExpenseData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.vendor || typeof data.vendor !== 'string') {
    errors.push('vendor');
  }

  if (data.amount === undefined || typeof data.amount !== 'number' || data.amount < 0) {
    errors.push('amount');
  }

  if (!data.date || typeof data.date !== 'string') {
    errors.push('date');
  } else {
    // Check ISO date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      errors.push('date');
    }
  }

  if (!data.currency || typeof data.currency !== 'string') {
    errors.push('currency');
  }

  // Confidence check
  if (data.confidence !== undefined && data.confidence < 0.5) {
    warnings.push('confidence');
  }

  // Category validation (optional but must be valid if present)
  const validCategories = ['lodging', 'transport', 'dining', 'activities', 'drinks', 'other'];
  if (data.category && !validCategories.includes(data.category)) {
    warnings.push('category');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Receipt Processor Agent class
 */
export class ReceiptProcessor {
  private client: Anthropic;
  private status: AgentStatusType = AgentStatus.IDLE;
  private role: AgentRoleType = AgentRole.RECEIPT_PROCESSOR;

  constructor() {
    const config = getAgentConfig();
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatusType {
    return this.status;
  }

  /**
   * Get agent role
   */
  getRole(): AgentRoleType {
    return this.role;
  }

  /**
   * Process a receipt image and extract expense data
   */
  async processReceipt(
    input: ProcessReceiptInput
  ): Promise<AgentResult<ExtractedExpenseData>> {
    this.status = AgentStatus.PROCESSING;

    try {
      const systemPrompt = getSystemPrompt(this.role);

      const response = await this.client.messages.create({
        model: AgentModel.SONNET,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: input.imageUrl,
                },
              },
              {
                type: 'text',
                text: `Please analyze this receipt image and extract the expense data. ${
                  input.tripName ? `This is for the trip: ${input.tripName}.` : ''
                } Return the data as JSON with the following fields: vendor, date (YYYY-MM-DD), amount (number), currency, category (lodging/transport/dining/activities/drinks/other), items (array of {name, quantity, price} if visible), description (optional), and confidence (0-1).`,
              },
            ],
          },
        ],
      });

      // Track usage
      const costTracker = getGlobalCostTracker();
      costTracker.recordUsage({
        model: AgentModel.SONNET,
        role: this.role,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        tripId: input.tripId,
      });

      // Extract text from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        this.status = AgentStatus.ERROR;
        return createErrorResult('No text content in response');
      }

      // Parse the JSON response
      const extractedData = parseReceiptResponse(textContent.text);
      if (!extractedData) {
        this.status = AgentStatus.ERROR;
        return createErrorResult('Failed to parse response as JSON');
      }

      // Validate extracted data
      const validation = validateExtractedData(extractedData);
      if (!validation.isValid) {
        this.status = AgentStatus.ERROR;
        return createErrorResult(
          `Invalid data: missing or invalid fields: ${validation.errors.join(', ')}`
        );
      }

      this.status = AgentStatus.COMPLETED;
      return createSuccessResult(extractedData, {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        warnings: validation.warnings,
      });
    } catch (error) {
      this.status = AgentStatus.ERROR;
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(message);
    }
  }
}

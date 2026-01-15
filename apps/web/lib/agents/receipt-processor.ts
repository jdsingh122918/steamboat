/**
 * Receipt Processor Agent
 *
 * AI agent for extracting expense data from receipt images.
 * Uses Claude's vision capabilities to analyze receipts.
 */

import {
  AgentRole,
  AgentRoleType,
  AgentResult,
  ExtractedExpenseData,
  createSuccessResult,
  createErrorResult,
} from './types';
import { AgentModel } from './config';
import { BaseAgent } from './base-agent';
import { parseJsonResponse } from './parse-json-response';

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
  return parseJsonResponse<ExtractedExpenseData>(response);
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
export class ReceiptProcessor extends BaseAgent<ProcessReceiptInput, ExtractedExpenseData> {
  protected readonly role: AgentRoleType = AgentRole.RECEIPT_PROCESSOR;

  /**
   * Process a receipt image and extract expense data
   */
  async process(input: ProcessReceiptInput): Promise<AgentResult<ExtractedExpenseData>> {
    return this.processReceipt(input);
  }

  /**
   * Process a receipt image and extract expense data
   */
  async processReceipt(input: ProcessReceiptInput): Promise<AgentResult<ExtractedExpenseData>> {
    this.setProcessing();

    const result = await this.executeWithTracking({
      model: AgentModel.SONNET,
      maxTokens: 1024,
      tripId: input.tripId,
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

    if (!result.success) {
      this.setError();
      return createErrorResult(result.error);
    }

    // Parse the JSON response
    const extractedData = parseReceiptResponse(result.data.text);
    if (!extractedData) {
      this.setError();
      return createErrorResult('Failed to parse response as JSON');
    }

    // Validate extracted data
    const validation = validateExtractedData(extractedData);
    if (!validation.isValid) {
      this.setError();
      return createErrorResult(
        `Invalid data: missing or invalid fields: ${validation.errors.join(', ')}`
      );
    }

    this.setCompleted();
    return createSuccessResult(extractedData, {
      inputTokens: result.data.inputTokens,
      outputTokens: result.data.outputTokens,
      warnings: validation.warnings,
    });
  }
}

/**
 * Payment Assistant Agent
 *
 * AI agent for calculating expense splits and suggesting settlements.
 * Helps optimize payment flows between trip participants.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentRole,
  AgentStatus,
  AgentRoleType,
  AgentStatusType,
  AgentResult,
  PaymentSplit,
  SettlementSuggestion,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getAgentConfig, AgentModel } from './config';
import { getSystemPrompt } from './prompts';
import { getGlobalCostTracker } from './cost-tracker';

export interface CalculateSplitInput {
  amount: number;
  participants: string[];
  exemptions?: string[];
  description?: string;
  tripId: string;
  userId: string;
}

export interface SplitResult {
  splits: PaymentSplit[];
  reasoning: string;
}

export interface SuggestSettlementsInput {
  balances: Array<{ participantId: string; balance: number }>;
  preferredMethods?: Record<string, 'venmo' | 'zelle' | 'cash' | 'other'>;
  tripId: string;
  userId: string;
}

export interface SettlementsResult {
  settlements: SettlementSuggestion[];
  summary: string;
}

/**
 * Parse payment-related AI response
 */
export function parsePaymentResponse(
  response: string,
  type: 'splits' | 'settlements'
): SplitResult | SettlementsResult | null {
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
      const parsed = JSON.parse(jsonMatch[0]);
      // Validate structure based on type
      if (type === 'splits' && parsed.splits) {
        return parsed as SplitResult;
      }
      if (type === 'settlements' && parsed.settlements) {
        return parsed as SettlementsResult;
      }
      return parsed;
    }

    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Calculate optimal settlements to minimize transactions
 */
export function calculateOptimalSettlements(
  balances: Array<{ participantId: string; balance: number }>
): SettlementSuggestion[] {
  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors = balances
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < 0)
    .sort((a, b) => a.balance - b.balance);

  const settlements: SettlementSuggestion[] = [];

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

    if (amount > 0.01) {
      // Only create settlement if amount is meaningful
      settlements.push({
        fromUserId: debtor.participantId,
        toUserId: creditor.participantId,
        amount: Math.round(amount * 100) / 100,
        method: 'venmo',
        reason: 'Balance settlement',
      });
    }

    creditor.balance -= amount;
    debtor.balance += amount;

    if (creditor.balance < 0.01) i++;
    if (debtor.balance > -0.01) j++;
  }

  return settlements;
}

/**
 * Payment Assistant Agent class
 */
export class PaymentAssistant {
  private client: Anthropic;
  private status: AgentStatusType = AgentStatus.IDLE;
  private role: AgentRoleType = AgentRole.PAYMENT_ASSISTANT;

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
   * Calculate how to split an expense among participants
   */
  async calculateSplit(input: CalculateSplitInput): Promise<AgentResult<SplitResult>> {
    this.status = AgentStatus.PROCESSING;

    try {
      const systemPrompt = getSystemPrompt(this.role);

      const exemptionText = input.exemptions?.length
        ? `\n\nExemptions: ${input.exemptions.join(', ')} should not pay for this expense.`
        : '';

      const response = await this.client.messages.create({
        model: AgentModel.HAIKU, // Use Haiku for simpler calculations
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please calculate how to split this expense:

Amount: $${input.amount}
Description: ${input.description || 'General expense'}
Participants: ${input.participants.join(', ')}${exemptionText}

Return a JSON object with:
- splits: array of { participantId, amount, isPaid }
- reasoning: brief explanation

Ensure the total of all amounts equals the original expense amount.`,
          },
        ],
      });

      // Track usage
      const costTracker = getGlobalCostTracker();
      costTracker.recordUsage({
        model: AgentModel.HAIKU,
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

      // Parse the response
      const result = parsePaymentResponse(textContent.text, 'splits') as SplitResult;
      if (!result || !result.splits) {
        this.status = AgentStatus.ERROR;
        return createErrorResult('Failed to parse split response');
      }

      this.status = AgentStatus.COMPLETED;
      return createSuccessResult(result, {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });
    } catch (error) {
      this.status = AgentStatus.ERROR;
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(message);
    }
  }

  /**
   * Suggest optimal settlements based on current balances
   */
  async suggestSettlements(
    input: SuggestSettlementsInput
  ): Promise<AgentResult<SettlementsResult>> {
    this.status = AgentStatus.PROCESSING;

    try {
      const systemPrompt = getSystemPrompt(this.role);

      // First calculate optimal settlements algorithmically
      const optimalSettlements = calculateOptimalSettlements(
        input.balances.map((b) => ({ ...b }))
      );

      // Apply preferred payment methods if provided
      if (input.preferredMethods) {
        for (const settlement of optimalSettlements) {
          if (input.preferredMethods[settlement.fromUserId]) {
            settlement.method = input.preferredMethods[settlement.fromUserId];
          }
        }
      }

      // Use AI to provide context and better explanations
      const response = await this.client.messages.create({
        model: AgentModel.HAIKU,
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Given these suggested settlements, please provide a summary and improve the reasoning:

Balances:
${input.balances.map((b) => `- ${b.participantId}: $${b.balance.toFixed(2)}`).join('\n')}

Suggested Settlements:
${JSON.stringify(optimalSettlements, null, 2)}

Return a JSON object with:
- settlements: the settlements array (you may adjust methods if appropriate)
- summary: a brief, friendly summary of who owes whom`,
          },
        ],
      });

      // Track usage
      const costTracker = getGlobalCostTracker();
      costTracker.recordUsage({
        model: AgentModel.HAIKU,
        role: this.role,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        tripId: input.tripId,
      });

      // Extract text from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        // Fall back to algorithmic result if AI fails
        this.status = AgentStatus.COMPLETED;
        return createSuccessResult({
          settlements: optimalSettlements,
          summary: 'Settlements calculated to minimize transactions.',
        });
      }

      // Parse the response
      const result = parsePaymentResponse(
        textContent.text,
        'settlements'
      ) as SettlementsResult;
      if (!result || !result.settlements) {
        // Fall back to algorithmic result
        this.status = AgentStatus.COMPLETED;
        return createSuccessResult({
          settlements: optimalSettlements,
          summary: 'Settlements calculated to minimize transactions.',
        });
      }

      this.status = AgentStatus.COMPLETED;
      return createSuccessResult(result, {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });
    } catch (error) {
      this.status = AgentStatus.ERROR;
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(message);
    }
  }
}

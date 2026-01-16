/**
 * Payment Assistant Agent
 *
 * AI agent for calculating expense splits and suggesting settlements.
 * Helps optimize payment flows between trip participants.
 */

import {
  AgentRole,
  AgentRoleType,
  AgentResult,
  PaymentSplit,
  SettlementSuggestion,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getDefaultModelForRole } from './model-registry';
import { BaseAgent } from './base-agent';
import { parseJsonResponse } from './parse-json-response';

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
  const parsed = parseJsonResponse<SplitResult | SettlementsResult>(response);
  if (!parsed) return null;

  // Validate structure based on type
  if (type === 'splits' && 'splits' in parsed) {
    return parsed as SplitResult;
  }
  if (type === 'settlements' && 'settlements' in parsed) {
    return parsed as SettlementsResult;
  }

  return parsed;
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
export class PaymentAssistant extends BaseAgent<CalculateSplitInput, SplitResult> {
  protected readonly role: AgentRoleType = AgentRole.PAYMENT_ASSISTANT;

  /**
   * Process input using calculateSplit
   */
  async process(input: CalculateSplitInput): Promise<AgentResult<SplitResult>> {
    return this.calculateSplit(input);
  }

  /**
   * Calculate how to split an expense among participants
   */
  async calculateSplit(input: CalculateSplitInput): Promise<AgentResult<SplitResult>> {
    this.setProcessing();

    const exemptionText = input.exemptions?.length
      ? `\n\nExemptions: ${input.exemptions.join(', ')} should not pay for this expense.`
      : '';

    const defaultModel = getDefaultModelForRole(this.role);

    const result = await this.executeWithTracking({
      model: defaultModel,
      maxTokens: 512,
      tripId: input.tripId,
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

    if (!result.success) {
      this.setError();
      return createErrorResult(result.error);
    }

    // Parse the response
    const parsed = parsePaymentResponse(result.data.text, 'splits') as SplitResult;
    if (!parsed || !parsed.splits) {
      this.setError();
      return createErrorResult('Failed to parse split response');
    }

    this.setCompleted();
    return createSuccessResult(parsed, {
      inputTokens: result.data.inputTokens,
      outputTokens: result.data.outputTokens,
    });
  }

  /**
   * Suggest optimal settlements based on current balances
   */
  async suggestSettlements(
    input: SuggestSettlementsInput
  ): Promise<AgentResult<SettlementsResult>> {
    this.setProcessing();

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
    const defaultModel = getDefaultModelForRole(this.role);
    const result = await this.executeWithTracking({
      model: defaultModel,
      maxTokens: 512,
      tripId: input.tripId,
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

    if (!result.success) {
      // Fall back to algorithmic result if AI fails
      this.setCompleted();
      return createSuccessResult({
        settlements: optimalSettlements,
        summary: 'Settlements calculated to minimize transactions.',
      });
    }

    // Parse the response
    const parsed = parsePaymentResponse(result.data.text, 'settlements') as SettlementsResult;
    if (!parsed || !parsed.settlements) {
      // Fall back to algorithmic result
      this.setCompleted();
      return createSuccessResult({
        settlements: optimalSettlements,
        summary: 'Settlements calculated to minimize transactions.',
      });
    }

    this.setCompleted();
    return createSuccessResult(parsed, {
      inputTokens: result.data.inputTokens,
      outputTokens: result.data.outputTokens,
    });
  }
}

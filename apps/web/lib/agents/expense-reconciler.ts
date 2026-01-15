/**
 * Expense Reconciler Agent
 *
 * AI agent for reconciling expenses and identifying discrepancies.
 * Helps find duplicates, missing entries, and categorization issues.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentRole,
  AgentStatus,
  AgentRoleType,
  AgentStatusType,
  AgentResult,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getAgentConfig, AgentModel } from './config';
import { getSystemPrompt } from './prompts';
import { getGlobalCostTracker } from './cost-tracker';

export interface ExpenseRecord {
  id: string;
  amount: number;
  date: string;
  paidBy: string;
  category?: string;
  description?: string;
  receiptUrl?: string;
}

export interface ReconcileInput {
  expenses: ExpenseRecord[];
  tripId: string;
  userId: string;
}

export interface Discrepancy {
  type: 'duplicate' | 'missing_receipt' | 'categorization' | 'amount_mismatch';
  expenseIds: string[];
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface ReconciliationResult {
  discrepancies: Discrepancy[];
  recommendations: string[];
  summary: string;
}

export interface ExpenseAnalysis {
  total: number;
  totalByPayer: Record<string, number>;
  totalByCategory: Record<string, number>;
  expenseCount: number;
}

/**
 * Find potential duplicate expenses
 */
export function findDuplicates(expenses: ExpenseRecord[]): string[][] {
  const duplicates: string[][] = [];
  const seen = new Map<string, string[]>();

  for (const expense of expenses) {
    // Key based on amount, date, and payer
    const key = `${expense.amount}-${expense.date}-${expense.paidBy}`;

    if (seen.has(key)) {
      seen.get(key)!.push(expense.id);
    } else {
      seen.set(key, [expense.id]);
    }
  }

  for (const ids of seen.values()) {
    if (ids.length > 1) {
      duplicates.push(ids);
    }
  }

  return duplicates;
}

/**
 * Analyze expense data
 */
export function analyzeExpenses(expenses: ExpenseRecord[]): ExpenseAnalysis {
  const totalByPayer: Record<string, number> = {};
  const totalByCategory: Record<string, number> = {};
  let total = 0;

  for (const expense of expenses) {
    total += expense.amount;

    if (!totalByPayer[expense.paidBy]) {
      totalByPayer[expense.paidBy] = 0;
    }
    totalByPayer[expense.paidBy] += expense.amount;

    const category = expense.category || 'uncategorized';
    if (!totalByCategory[category]) {
      totalByCategory[category] = 0;
    }
    totalByCategory[category] += expense.amount;
  }

  return {
    total,
    totalByPayer,
    totalByCategory,
    expenseCount: expenses.length,
  };
}

/**
 * Expense Reconciler Agent class
 */
export class ExpenseReconciler {
  private client: Anthropic;
  private status: AgentStatusType = AgentStatus.IDLE;
  private role: AgentRoleType = AgentRole.EXPENSE_RECONCILER;

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
   * Reconcile expenses and identify issues
   */
  async reconcile(input: ReconcileInput): Promise<AgentResult<ReconciliationResult>> {
    this.status = AgentStatus.PROCESSING;

    try {
      const systemPrompt = getSystemPrompt(this.role);

      // Pre-analyze data
      const analysis = analyzeExpenses(input.expenses);
      const potentialDuplicates = findDuplicates(input.expenses);

      const response = await this.client.messages.create({
        model: AgentModel.HAIKU,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please analyze these expense records and identify any issues:

Expenses (${input.expenses.length} total, $${analysis.total.toFixed(2)}):
${JSON.stringify(input.expenses, null, 2)}

Pre-identified potential duplicates: ${JSON.stringify(potentialDuplicates)}

Return a JSON object with:
- discrepancies: array of { type, expenseIds, description, severity }
- recommendations: array of suggested actions
- summary: brief summary of findings`,
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
      const parsed = parseReconciliationResponse(textContent.text);
      if (!parsed) {
        this.status = AgentStatus.ERROR;
        return createErrorResult('Failed to parse reconciliation response');
      }

      this.status = AgentStatus.COMPLETED;
      return createSuccessResult(parsed, {
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

/**
 * Parse reconciliation response from AI
 */
function parseReconciliationResponse(response: string): ReconciliationResult | null {
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

    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

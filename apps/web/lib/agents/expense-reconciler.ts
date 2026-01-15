/**
 * Expense Reconciler Agent
 *
 * AI agent for reconciling expenses and identifying discrepancies.
 * Helps find duplicates, missing entries, and categorization issues.
 */

import {
  AgentRole,
  AgentRoleType,
  AgentResult,
  createSuccessResult,
  createErrorResult,
} from './types';
import { AgentModel } from './config';
import { BaseAgent } from './base-agent';
import { parseJsonResponse } from './parse-json-response';

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
export class ExpenseReconciler extends BaseAgent<ReconcileInput, ReconciliationResult> {
  protected readonly role: AgentRoleType = AgentRole.EXPENSE_RECONCILER;

  /**
   * Process input using reconcile
   */
  async process(input: ReconcileInput): Promise<AgentResult<ReconciliationResult>> {
    return this.reconcile(input);
  }

  /**
   * Reconcile expenses and identify issues
   */
  async reconcile(input: ReconcileInput): Promise<AgentResult<ReconciliationResult>> {
    this.setProcessing();

    // Pre-analyze data
    const analysis = analyzeExpenses(input.expenses);
    const potentialDuplicates = findDuplicates(input.expenses);

    const result = await this.executeWithTracking({
      model: AgentModel.HAIKU,
      maxTokens: 1024,
      tripId: input.tripId,
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

    if (!result.success) {
      this.setError();
      return createErrorResult(result.error);
    }

    // Parse the response
    const parsed = parseJsonResponse<ReconciliationResult>(result.data.text);
    if (!parsed) {
      this.setError();
      return createErrorResult('Failed to parse reconciliation response');
    }

    this.setCompleted();
    return createSuccessResult(parsed, {
      inputTokens: result.data.inputTokens,
      outputTokens: result.data.outputTokens,
    });
  }
}

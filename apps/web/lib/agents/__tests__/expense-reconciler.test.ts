import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

import Anthropic from '@anthropic-ai/sdk';
import { ExpenseReconciler, analyzeExpenses, findDuplicates } from '../expense-reconciler';
import { AgentRole, AgentStatus } from '../types';

describe('Expense Reconciler Agent', () => {
  let reconciler: ExpenseReconciler;
  let mockAnthropicClient: { messages: { create: ReturnType<typeof vi.fn> } };
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-api-key' };
    mockAnthropicClient = {
      messages: {
        create: vi.fn(),
      },
    };
    (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => mockAnthropicClient
    );
    reconciler = new ExpenseReconciler();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('reconcile', () => {
    it('should identify discrepancies successfully', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              discrepancies: [
                {
                  type: 'duplicate',
                  expenseIds: ['exp1', 'exp2'],
                  description: 'Same amount on same day',
                },
              ],
              recommendations: ['Review duplicate entries'],
              summary: 'Found 1 potential issue',
            }),
          },
        ],
        usage: { input_tokens: 1000, output_tokens: 200 },
      });

      const result = await reconciler.reconcile({
        expenses: [
          { id: 'exp1', amount: 50, date: '2024-03-15', paidBy: 'user1' },
          { id: 'exp2', amount: 50, date: '2024-03-15', paidBy: 'user1' },
        ],
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discrepancies).toHaveLength(1);
      }
    });

    it('should handle clean reconciliation', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              discrepancies: [],
              recommendations: [],
              summary: 'All expenses look good',
            }),
          },
        ],
        usage: { input_tokens: 800, output_tokens: 100 },
      });

      const result = await reconciler.reconcile({
        expenses: [{ id: 'exp1', amount: 50, date: '2024-03-15', paidBy: 'user1' }],
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.discrepancies).toHaveLength(0);
      }
    });
  });

  describe('findDuplicates', () => {
    it('should find expenses with same amount and date', () => {
      const expenses = [
        { id: 'exp1', amount: 50, date: '2024-03-15', paidBy: 'user1' },
        { id: 'exp2', amount: 50, date: '2024-03-15', paidBy: 'user1' },
        { id: 'exp3', amount: 75, date: '2024-03-15', paidBy: 'user2' },
      ];

      const duplicates = findDuplicates(expenses);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toContain('exp1');
      expect(duplicates[0]).toContain('exp2');
    });

    it('should return empty array when no duplicates', () => {
      const expenses = [
        { id: 'exp1', amount: 50, date: '2024-03-15', paidBy: 'user1' },
        { id: 'exp2', amount: 75, date: '2024-03-16', paidBy: 'user2' },
      ];

      const duplicates = findDuplicates(expenses);
      expect(duplicates).toHaveLength(0);
    });
  });

  describe('analyzeExpenses', () => {
    it('should calculate totals by payer', () => {
      const expenses = [
        { id: 'exp1', amount: 50, date: '2024-03-15', paidBy: 'user1' },
        { id: 'exp2', amount: 75, date: '2024-03-16', paidBy: 'user1' },
        { id: 'exp3', amount: 100, date: '2024-03-17', paidBy: 'user2' },
      ];

      const analysis = analyzeExpenses(expenses);
      expect(analysis.totalByPayer['user1']).toBe(125);
      expect(analysis.totalByPayer['user2']).toBe(100);
    });

    it('should calculate overall total', () => {
      const expenses = [
        { id: 'exp1', amount: 50, date: '2024-03-15', paidBy: 'user1' },
        { id: 'exp2', amount: 75, date: '2024-03-16', paidBy: 'user2' },
      ];

      const analysis = analyzeExpenses(expenses);
      expect(analysis.total).toBe(125);
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(reconciler.getStatus()).toBe(AgentStatus.IDLE);
    });
  });

  describe('getRole', () => {
    it('should return EXPENSE_RECONCILER role', () => {
      expect(reconciler.getRole()).toBe(AgentRole.EXPENSE_RECONCILER);
    });
  });
});

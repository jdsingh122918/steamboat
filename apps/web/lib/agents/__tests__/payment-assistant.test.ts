import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the OpenRouter client
vi.mock('../openrouter-client', () => ({
  getOpenRouterClient: vi.fn(),
  convertAnthropicMessages: vi.fn((messages) =>
    messages.map((m: { role: string; content: unknown }) => ({
      role: m.role,
      content: m.content,
    }))
  ),
}));

// Mock the agent config service
vi.mock('../agent-config-service', () => ({
  resolveAgentConfig: vi.fn().mockReturnValue({
    modelId: 'anthropic/claude-3.5-sonnet',
    maxTokens: 4096,
    temperature: 0.7,
    enableFallback: true,
    fallbackOrder: ['openai/gpt-4o'],
  }),
  getCachedTripAISettings: vi.fn().mockResolvedValue(null),
}));

// Mock DB operations
vi.mock('@/lib/db/operations/ai-settings', () => ({
  getAISettings: vi.fn().mockResolvedValue(null),
  getAISettingsByTripId: vi.fn().mockResolvedValue(null),
  toAgentConfigFormat: vi.fn().mockReturnValue(null),
}));

import { getOpenRouterClient } from '../openrouter-client';
import {
  PaymentAssistant,
  parsePaymentResponse,
  calculateOptimalSettlements,
  SplitResult,
  SettlementsResult,
} from '../payment-assistant';
import { AgentRole, AgentStatus, PaymentSplit, SettlementSuggestion } from '../types';

describe('Payment Assistant Agent', () => {
  let assistant: PaymentAssistant;
  let mockExecute: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-api-key' };

    mockExecute = vi.fn();
    (getOpenRouterClient as ReturnType<typeof vi.fn>).mockReturnValue({
      execute: mockExecute,
    });

    assistant = new PaymentAssistant();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('calculateSplit', () => {
    it('should calculate equal split successfully', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            splits: [
              { participantId: 'user1', amount: 33.33, isPaid: false },
              { participantId: 'user2', amount: 33.33, isPaid: false },
              { participantId: 'user3', amount: 33.34, isPaid: false },
            ],
            reasoning: 'Equal split among 3 participants',
          }),
          inputTokens: 500,
          outputTokens: 150,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      const result = await assistant.calculateSplit({
        amount: 100.0,
        participants: ['user1', 'user2', 'user3'],
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.splits).toHaveLength(3);
        const total = result.data.splits.reduce((sum, s) => sum + s.amount, 0);
        expect(total).toBeCloseTo(100, 2);
      }
    });

    it('should handle exemptions', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            splits: [
              { participantId: 'groom', amount: 0, isPaid: true },
              { participantId: 'user2', amount: 50, isPaid: false },
              { participantId: 'user3', amount: 50, isPaid: false },
            ],
            reasoning: 'Groom is exempt from this expense',
          }),
          inputTokens: 600,
          outputTokens: 180,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      const result = await assistant.calculateSplit({
        amount: 100.0,
        participants: ['groom', 'user2', 'user3'],
        exemptions: ['groom'],
        tripId: 'trip123',
        userId: 'user2',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const groomSplit = result.data.splits.find((s) => s.participantId === 'groom');
        expect(groomSplit?.amount).toBe(0);
      }
    });

    it('should handle API errors', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        error: 'Service unavailable',
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      const result = await assistant.calculateSplit({
        amount: 100.0,
        participants: ['user1', 'user2'],
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('suggestSettlements', () => {
    it('should suggest optimal settlements', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            settlements: [
              {
                fromUserId: 'user2',
                toUserId: 'user1',
                amount: 50.0,
                method: 'venmo',
                reason: 'Balance settlement for trip expenses',
              },
            ],
            summary: 'Single payment to settle all balances',
          }),
          inputTokens: 800,
          outputTokens: 200,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      const result = await assistant.suggestSettlements({
        balances: [
          { participantId: 'user1', balance: 50 },
          { participantId: 'user2', balance: -50 },
        ],
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.settlements).toHaveLength(1);
        expect(result.data.settlements[0].fromUserId).toBe('user2');
        expect(result.data.settlements[0].toUserId).toBe('user1');
      }
    });

    it('should minimize number of transactions', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            settlements: [
              {
                fromUserId: 'user3',
                toUserId: 'user1',
                amount: 75.0,
                method: 'venmo',
                reason: 'Consolidated settlement',
              },
            ],
            summary: 'Optimized to single payment',
          }),
          inputTokens: 900,
          outputTokens: 220,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      const result = await assistant.suggestSettlements({
        balances: [
          { participantId: 'user1', balance: 75 },
          { participantId: 'user2', balance: 0 },
          { participantId: 'user3', balance: -75 },
        ],
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // Should consolidate to minimal transactions
        expect(result.data.settlements.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('parsePaymentResponse', () => {
    it('should parse split response', () => {
      const response = JSON.stringify({
        splits: [
          { participantId: 'user1', amount: 50, isPaid: false },
          { participantId: 'user2', amount: 50, isPaid: false },
        ],
      });

      const result = parsePaymentResponse(response, 'splits') as SplitResult | null;
      expect(result).not.toBeNull();
      expect(result?.splits).toHaveLength(2);
    });

    it('should parse settlement response', () => {
      const response = JSON.stringify({
        settlements: [
          {
            fromUserId: 'user2',
            toUserId: 'user1',
            amount: 50,
            method: 'venmo',
            reason: 'Balance',
          },
        ],
      });

      const result = parsePaymentResponse(response, 'settlements') as SettlementsResult | null;
      expect(result).not.toBeNull();
      expect(result?.settlements).toHaveLength(1);
    });

    it('should return null for invalid JSON', () => {
      const result = parsePaymentResponse('invalid', 'splits');
      expect(result).toBeNull();
    });
  });

  describe('calculateOptimalSettlements', () => {
    it('should calculate simple settlement', () => {
      const balances = [
        { participantId: 'user1', balance: 100 },
        { participantId: 'user2', balance: -100 },
      ];

      const settlements = calculateOptimalSettlements(balances);
      expect(settlements).toHaveLength(1);
      expect(settlements[0].fromUserId).toBe('user2');
      expect(settlements[0].toUserId).toBe('user1');
      expect(settlements[0].amount).toBe(100);
    });

    it('should handle multiple debtors and creditors', () => {
      const balances = [
        { participantId: 'user1', balance: 100 },
        { participantId: 'user2', balance: -50 },
        { participantId: 'user3', balance: -50 },
      ];

      const settlements = calculateOptimalSettlements(balances);
      expect(settlements.length).toBeGreaterThanOrEqual(1);

      // Total settled should equal total owed
      const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalSettled).toBe(100);
    });

    it('should return empty array when balanced', () => {
      const balances = [
        { participantId: 'user1', balance: 0 },
        { participantId: 'user2', balance: 0 },
      ];

      const settlements = calculateOptimalSettlements(balances);
      expect(settlements).toHaveLength(0);
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(assistant.getStatus()).toBe(AgentStatus.IDLE);
    });
  });

  describe('getRole', () => {
    it('should return PAYMENT_ASSISTANT role', () => {
      expect(assistant.getRole()).toBe(AgentRole.PAYMENT_ASSISTANT);
    });
  });
});

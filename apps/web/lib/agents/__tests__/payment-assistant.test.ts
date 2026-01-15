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
    assistant = new PaymentAssistant();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('calculateSplit', () => {
    it('should calculate equal split successfully', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              splits: [
                { participantId: 'user1', amount: 33.33, isPaid: false },
                { participantId: 'user2', amount: 33.33, isPaid: false },
                { participantId: 'user3', amount: 33.34, isPaid: false },
              ],
              reasoning: 'Equal split among 3 participants',
            }),
          },
        ],
        usage: {
          input_tokens: 500,
          output_tokens: 150,
        },
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
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              splits: [
                { participantId: 'groom', amount: 0, isPaid: true },
                { participantId: 'user2', amount: 50, isPaid: false },
                { participantId: 'user3', amount: 50, isPaid: false },
              ],
              reasoning: 'Groom is exempt from this expense',
            }),
          },
        ],
        usage: {
          input_tokens: 600,
          output_tokens: 180,
        },
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
      mockAnthropicClient.messages.create.mockRejectedValue(
        new Error('Service unavailable')
      );

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
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
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
          },
        ],
        usage: {
          input_tokens: 800,
          output_tokens: 200,
        },
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
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
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
          },
        ],
        usage: {
          input_tokens: 900,
          output_tokens: 220,
        },
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

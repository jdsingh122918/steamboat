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
  ReceiptProcessor,
  parseReceiptResponse,
  validateExtractedData,
} from '../receipt-processor';
import { AgentRole, AgentStatus } from '../types';

describe('Receipt Processor Agent', () => {
  let processor: ReceiptProcessor;
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
    processor = new ReceiptProcessor();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('processReceipt', () => {
    it('should process a receipt image successfully', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              vendor: 'Restaurant ABC',
              date: '2024-03-15',
              amount: 125.50,
              currency: 'USD',
              category: 'dining',
              items: [
                { name: 'Steak', quantity: 2, price: 45.00 },
                { name: 'Wine', quantity: 1, price: 35.50 },
              ],
              confidence: 0.95,
            }),
          },
        ],
        usage: {
          input_tokens: 1500,
          output_tokens: 200,
        },
      });

      const result = await processor.processReceipt({
        imageUrl: 'https://example.com/receipt.jpg',
        tripId: 'trip123',
        userId: 'user456',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vendor).toBe('Restaurant ABC');
        expect(result.data.amount).toBe(125.50);
        expect(result.data.category).toBe('dining');
      }
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const result = await processor.processReceipt({
        imageUrl: 'https://example.com/receipt.jpg',
        tripId: 'trip123',
        userId: 'user456',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('rate limit');
      }
    });

    it('should handle invalid JSON response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
            text: 'This is not valid JSON',
          },
        ],
        usage: {
          input_tokens: 1000,
          output_tokens: 50,
        },
      });

      const result = await processor.processReceipt({
        imageUrl: 'https://example.com/receipt.jpg',
        tripId: 'trip123',
        userId: 'user456',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('parse');
      }
    });

    it('should track token usage', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              vendor: 'Store',
              date: '2024-03-15',
              amount: 50.00,
              currency: 'USD',
              confidence: 0.9,
            }),
          },
        ],
        usage: {
          input_tokens: 1200,
          output_tokens: 150,
        },
      });

      const result = await processor.processReceipt({
        imageUrl: 'https://example.com/receipt.jpg',
        tripId: 'trip123',
        userId: 'user456',
      });

      expect(result.success).toBe(true);
      if (result.success && result.metadata) {
        expect(result.metadata.inputTokens).toBe(1200);
        expect(result.metadata.outputTokens).toBe(150);
      }
    });

    it('should use correct agent role', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              vendor: 'Store',
              date: '2024-03-15',
              amount: 50.00,
              currency: 'USD',
              confidence: 0.9,
            }),
          },
        ],
        usage: {
          input_tokens: 1000,
          output_tokens: 100,
        },
      });

      await processor.processReceipt({
        imageUrl: 'https://example.com/receipt.jpg',
        tripId: 'trip123',
        userId: 'user456',
      });

      expect(mockAnthropicClient.messages.create).toHaveBeenCalled();
    });
  });

  describe('parseReceiptResponse', () => {
    it('should parse valid JSON response', () => {
      const jsonStr = JSON.stringify({
        vendor: 'Test Store',
        date: '2024-03-15',
        amount: 75.25,
        currency: 'USD',
        confidence: 0.85,
      });

      const result = parseReceiptResponse(jsonStr);
      expect(result).not.toBeNull();
      expect(result?.vendor).toBe('Test Store');
      expect(result?.amount).toBe(75.25);
    });

    it('should return null for invalid JSON', () => {
      const result = parseReceiptResponse('not valid json');
      expect(result).toBeNull();
    });

    it('should extract JSON from markdown code blocks', () => {
      const response = '```json\n{"vendor": "Store", "amount": 50, "date": "2024-01-01", "currency": "USD", "confidence": 0.9}\n```';
      const result = parseReceiptResponse(response);
      expect(result).not.toBeNull();
      expect(result?.vendor).toBe('Store');
    });

    it('should handle response with extra text', () => {
      const response = 'Here is the extracted data:\n{"vendor": "Shop", "amount": 100, "date": "2024-01-01", "currency": "USD", "confidence": 0.8}';
      const result = parseReceiptResponse(response);
      expect(result).not.toBeNull();
      expect(result?.vendor).toBe('Shop');
    });
  });

  describe('validateExtractedData', () => {
    it('should validate complete data', () => {
      const data = {
        vendor: 'Store',
        date: '2024-03-15',
        amount: 50.00,
        currency: 'USD',
        confidence: 0.9,
      };

      const result = validateExtractedData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing vendor', () => {
      const data = {
        date: '2024-03-15',
        amount: 50.00,
        currency: 'USD',
        confidence: 0.9,
      };

      const result = validateExtractedData(data as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('vendor');
    });

    it('should reject invalid amount', () => {
      const data = {
        vendor: 'Store',
        date: '2024-03-15',
        amount: -10,
        currency: 'USD',
        confidence: 0.9,
      };

      const result = validateExtractedData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('amount');
    });

    it('should reject invalid date format', () => {
      const data = {
        vendor: 'Store',
        date: 'March 15, 2024',
        amount: 50.00,
        currency: 'USD',
        confidence: 0.9,
      };

      const result = validateExtractedData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('date');
    });

    it('should accept valid category', () => {
      const data = {
        vendor: 'Store',
        date: '2024-03-15',
        amount: 50.00,
        currency: 'USD',
        category: 'dining',
        confidence: 0.9,
      };

      const result = validateExtractedData(data);
      expect(result.isValid).toBe(true);
    });

    it('should warn on low confidence', () => {
      const data = {
        vendor: 'Store',
        date: '2024-03-15',
        amount: 50.00,
        currency: 'USD',
        confidence: 0.3,
      };

      const result = validateExtractedData(data);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('confidence');
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(processor.getStatus()).toBe(AgentStatus.IDLE);
    });
  });

  describe('getRole', () => {
    it('should return RECEIPT_PROCESSOR role', () => {
      expect(processor.getRole()).toBe(AgentRole.RECEIPT_PROCESSOR);
    });
  });
});

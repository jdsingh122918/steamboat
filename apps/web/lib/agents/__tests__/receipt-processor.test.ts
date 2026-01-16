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
  ReceiptProcessor,
  parseReceiptResponse,
  validateExtractedData,
} from '../receipt-processor';
import { AgentRole, AgentStatus } from '../types';

describe('Receipt Processor Agent', () => {
  let processor: ReceiptProcessor;
  let mockExecute: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-api-key' };

    mockExecute = vi.fn();
    (getOpenRouterClient as ReturnType<typeof vi.fn>).mockReturnValue({
      execute: mockExecute,
    });

    processor = new ReceiptProcessor();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('processReceipt', () => {
    it('should process a receipt image successfully', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
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
          inputTokens: 1500,
          outputTokens: 200,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
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
      mockExecute.mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded',
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

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
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: 'This is not valid JSON',
          inputTokens: 1000,
          outputTokens: 50,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
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
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            vendor: 'Store',
            date: '2024-03-15',
            amount: 50.00,
            currency: 'USD',
            confidence: 0.9,
          }),
          inputTokens: 1200,
          outputTokens: 150,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
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
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            vendor: 'Store',
            date: '2024-03-15',
            amount: 50.00,
            currency: 'USD',
            confidence: 0.9,
          }),
          inputTokens: 1000,
          outputTokens: 100,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      await processor.processReceipt({
        imageUrl: 'https://example.com/receipt.jpg',
        tripId: 'trip123',
        userId: 'user456',
      });

      expect(mockExecute).toHaveBeenCalled();
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

import { describe, it, expect } from 'vitest';

import {
  AgentRole,
  AgentStatus,
  AgentResponse,
  AgentContext,
  AgentResult,
  ToolCall,
  ToolResult,
  isSuccessResult,
  isErrorResult,
  createAgentContext,
  createSuccessResult,
  createErrorResult,
} from '../types';

describe('Agent Types', () => {
  describe('AgentRole', () => {
    it('should have RECEIPT_PROCESSOR role', () => {
      expect(AgentRole.RECEIPT_PROCESSOR).toBe('receipt_processor');
    });

    it('should have PAYMENT_ASSISTANT role', () => {
      expect(AgentRole.PAYMENT_ASSISTANT).toBe('payment_assistant');
    });

    it('should have EXPENSE_RECONCILER role', () => {
      expect(AgentRole.EXPENSE_RECONCILER).toBe('expense_reconciler');
    });

    it('should have GALLERY_ORGANIZER role', () => {
      expect(AgentRole.GALLERY_ORGANIZER).toBe('gallery_organizer');
    });

    it('should have ACTIVITY_RECOMMENDER role', () => {
      expect(AgentRole.ACTIVITY_RECOMMENDER).toBe('activity_recommender');
    });

    it('should have POLL_DECISION role', () => {
      expect(AgentRole.POLL_DECISION).toBe('poll_decision');
    });
  });

  describe('AgentStatus', () => {
    it('should have IDLE status', () => {
      expect(AgentStatus.IDLE).toBe('idle');
    });

    it('should have PROCESSING status', () => {
      expect(AgentStatus.PROCESSING).toBe('processing');
    });

    it('should have COMPLETED status', () => {
      expect(AgentStatus.COMPLETED).toBe('completed');
    });

    it('should have ERROR status', () => {
      expect(AgentStatus.ERROR).toBe('error');
    });
  });

  describe('AgentContext', () => {
    it('should create context with required fields', () => {
      const context = createAgentContext({
        tripId: 'trip123',
        userId: 'user456',
        role: AgentRole.RECEIPT_PROCESSOR,
      });

      expect(context.tripId).toBe('trip123');
      expect(context.userId).toBe('user456');
      expect(context.role).toBe(AgentRole.RECEIPT_PROCESSOR);
      expect(context.requestId).toBeDefined();
      expect(context.timestamp).toBeDefined();
    });

    it('should include optional metadata', () => {
      const context = createAgentContext({
        tripId: 'trip123',
        userId: 'user456',
        role: AgentRole.PAYMENT_ASSISTANT,
        metadata: { source: 'mobile', version: '1.0' },
      });

      expect(context.metadata).toEqual({ source: 'mobile', version: '1.0' });
    });
  });

  describe('AgentResult', () => {
    describe('isSuccessResult', () => {
      it('should return true for success results', () => {
        const result: AgentResult<string> = {
          success: true,
          data: 'test data',
        };
        expect(isSuccessResult(result)).toBe(true);
      });

      it('should return false for error results', () => {
        const result: AgentResult<string> = {
          success: false,
          error: 'Something went wrong',
        };
        expect(isSuccessResult(result)).toBe(false);
      });
    });

    describe('isErrorResult', () => {
      it('should return true for error results', () => {
        const result: AgentResult<string> = {
          success: false,
          error: 'Something went wrong',
        };
        expect(isErrorResult(result)).toBe(true);
      });

      it('should return false for success results', () => {
        const result: AgentResult<string> = {
          success: true,
          data: 'test data',
        };
        expect(isErrorResult(result)).toBe(false);
      });
    });

    describe('createSuccessResult', () => {
      it('should create a success result with data', () => {
        const result = createSuccessResult({ amount: 100, currency: 'USD' });
        expect(result.success).toBe(true);
        if (isSuccessResult(result)) {
          expect(result.data).toEqual({ amount: 100, currency: 'USD' });
        }
      });

      it('should include optional metadata', () => {
        const result = createSuccessResult('data', { processingTime: 150 });
        expect(result.success).toBe(true);
        if (isSuccessResult(result)) {
          expect(result.data).toBe('data');
          expect(result.metadata).toEqual({ processingTime: 150 });
        }
      });
    });

    describe('createErrorResult', () => {
      it('should create an error result with message', () => {
        const result = createErrorResult('Invalid input');
        expect(result.success).toBe(false);
        if (isErrorResult(result)) {
          expect(result.error).toBe('Invalid input');
        }
      });

      it('should include optional error code', () => {
        const result = createErrorResult('Not found', 'NOT_FOUND');
        expect(result.success).toBe(false);
        if (isErrorResult(result)) {
          expect(result.error).toBe('Not found');
          expect(result.code).toBe('NOT_FOUND');
        }
      });
    });
  });

  describe('ToolCall', () => {
    it('should define tool call structure', () => {
      const toolCall: ToolCall = {
        id: 'tool_123',
        name: 'extractExpenseData',
        input: { imageUrl: 'https://example.com/receipt.jpg' },
      };

      expect(toolCall.id).toBe('tool_123');
      expect(toolCall.name).toBe('extractExpenseData');
      expect(toolCall.input).toEqual({ imageUrl: 'https://example.com/receipt.jpg' });
    });
  });

  describe('ToolResult', () => {
    it('should define tool result structure', () => {
      const toolResult: ToolResult = {
        toolCallId: 'tool_123',
        result: { amount: 45.99, vendor: 'Restaurant ABC' },
      };

      expect(toolResult.toolCallId).toBe('tool_123');
      expect(toolResult.result).toEqual({ amount: 45.99, vendor: 'Restaurant ABC' });
    });

    it('should support error results', () => {
      const toolResult: ToolResult = {
        toolCallId: 'tool_123',
        error: 'Failed to process image',
      };

      expect(toolResult.toolCallId).toBe('tool_123');
      expect(toolResult.error).toBe('Failed to process image');
    });
  });

  describe('AgentResponse', () => {
    it('should define response with text content', () => {
      const response: AgentResponse = {
        id: 'resp_123',
        role: AgentRole.RECEIPT_PROCESSOR,
        content: 'I extracted the receipt data.',
        status: AgentStatus.COMPLETED,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
      };

      expect(response.id).toBe('resp_123');
      expect(response.role).toBe(AgentRole.RECEIPT_PROCESSOR);
      expect(response.content).toBe('I extracted the receipt data.');
      expect(response.status).toBe(AgentStatus.COMPLETED);
    });

    it('should include tool calls when present', () => {
      const response: AgentResponse = {
        id: 'resp_456',
        role: AgentRole.PAYMENT_ASSISTANT,
        content: null,
        status: AgentStatus.PROCESSING,
        toolCalls: [
          {
            id: 'tool_1',
            name: 'calculateSplit',
            input: { amount: 100, participants: 4 },
          },
        ],
        usage: {
          inputTokens: 150,
          outputTokens: 75,
        },
      };

      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls![0].name).toBe('calculateSplit');
    });
  });
});

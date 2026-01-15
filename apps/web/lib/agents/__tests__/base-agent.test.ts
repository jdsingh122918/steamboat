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
import { BaseAgent, ExecuteOptions } from '../base-agent';
import { AgentRole, AgentStatus, AgentRoleType, AgentResult } from '../types';

// Create a concrete implementation for testing
class TestAgent extends BaseAgent<{ tripId: string; data: string }, { result: string }> {
  protected readonly role: AgentRoleType = AgentRole.RECEIPT_PROCESSOR;

  async process(input: { tripId: string; data: string }): Promise<AgentResult<{ result: string }>> {
    this.setProcessing();

    const result = await this.executeWithTracking({
      model: 'claude-3-haiku-20240307',
      maxTokens: 512,
      tripId: input.tripId,
      messages: [{ role: 'user', content: input.data }],
    });

    if (!result.success) {
      this.setError();
      return { success: false, error: result.error };
    }

    this.setCompleted();
    return { success: true, data: { result: result.data.text } };
  }

  // Expose protected method for testing
  async testExecuteWithTracking(options: ExecuteOptions) {
    return this.executeWithTracking(options);
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
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
    agent = new TestAgent();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with IDLE status', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });

    it('should throw error when API key is missing', () => {
      process.env = { ...originalEnv };
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => new TestAgent()).toThrow('ANTHROPIC_API_KEY is not set');
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });
  });

  describe('getRole', () => {
    it('should return agent role', () => {
      expect(agent.getRole()).toBe(AgentRole.RECEIPT_PROCESSOR);
    });
  });

  describe('executeWithTracking', () => {
    it('should execute API call and return text content', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [{ type: 'text', text: 'Test response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await agent.testExecuteWithTracking({
        model: 'claude-3-haiku-20240307',
        maxTokens: 512,
        tripId: 'trip123',
        messages: [{ role: 'user', content: 'Test message' }],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.text).toBe('Test response');
        expect(result.data.inputTokens).toBe(100);
        expect(result.data.outputTokens).toBe(50);
      }
    });

    it('should return error when API call fails', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'));

      const result = await agent.testExecuteWithTracking({
        model: 'claude-3-haiku-20240307',
        maxTokens: 512,
        tripId: 'trip123',
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('API Error');
      }
    });

    it('should return error when no text content in response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [{ type: 'tool_use', id: 'tool_1', name: 'test', input: {} }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await agent.testExecuteWithTracking({
        model: 'claude-3-haiku-20240307',
        maxTokens: 512,
        tripId: 'trip123',
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('No text content in response');
      }
    });
  });

  describe('status management', () => {
    it('should update status during processing', async () => {
      let statusDuringProcessing: string | null = null;

      mockAnthropicClient.messages.create.mockImplementation(async () => {
        statusDuringProcessing = agent.getStatus();
        return {
          id: 'msg_123',
          content: [{ type: 'text', text: '{"result": "test"}' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        };
      });

      await agent.process({ tripId: 'trip123', data: 'test' });

      expect(statusDuringProcessing).toBe(AgentStatus.PROCESSING);
    });

    it('should set COMPLETED status on success', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [{ type: 'text', text: '{"result": "test"}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      await agent.process({ tripId: 'trip123', data: 'test' });

      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should set ERROR status on failure', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'));

      await agent.process({ tripId: 'trip123', data: 'test' });

      expect(agent.getStatus()).toBe(AgentStatus.ERROR);
    });
  });

  describe('process', () => {
    it('should process input and return result', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [{ type: 'text', text: 'Processed data' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await agent.process({ tripId: 'trip123', data: 'input data' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.result).toBe('Processed data');
      }
    });
  });
});

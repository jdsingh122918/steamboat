import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the OpenRouter client
vi.mock('../openrouter-client', () => ({
  getOpenRouterClient: vi.fn(),
  convertAnthropicMessages: vi.fn((messages) =>
    messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }))
  ),
}));

// Mock the agent config service
vi.mock('../agent-config-service', () => ({
  resolveAgentConfig: vi.fn().mockReturnValue({
    modelId: 'anthropic/claude-3-haiku',
    maxTokens: 4096,
    temperature: 0.7,
    enableFallback: true,
    fallbackOrder: ['anthropic/claude-3.5-sonnet'],
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
import { BaseAgent, ExecuteOptions } from '../base-agent';
import { AgentRole, AgentStatus, AgentRoleType, AgentResult } from '../types';

// Create a concrete implementation for testing
class TestAgent extends BaseAgent<{ tripId: string; data: string }, { result: string }> {
  protected readonly role: AgentRoleType = AgentRole.RECEIPT_PROCESSOR;

  async process(input: { tripId: string; data: string }): Promise<AgentResult<{ result: string }>> {
    this.setProcessing();

    const result = await this.executeWithTracking({
      model: 'anthropic/claude-3-haiku',
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
  let mockExecute: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-api-key' };

    mockExecute = vi.fn();
    (getOpenRouterClient as ReturnType<typeof vi.fn>).mockReturnValue({
      execute: mockExecute,
    });

    agent = new TestAgent();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with IDLE status', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
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
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: 'Test response',
          inputTokens: 100,
          outputTokens: 50,
          model: 'anthropic/claude-3-haiku',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3-haiku',
        fallbackCount: 0,
      });

      const result = await agent.testExecuteWithTracking({
        model: 'anthropic/claude-3-haiku',
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
      mockExecute.mockResolvedValue({
        success: false,
        error: 'API Error',
        modelUsed: 'anthropic/claude-3-haiku',
        fallbackCount: 0,
      });

      const result = await agent.testExecuteWithTracking({
        model: 'anthropic/claude-3-haiku',
        maxTokens: 512,
        tripId: 'trip123',
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('API Error');
      }
    });

    it('should return error when execute throws', async () => {
      mockExecute.mockRejectedValue(new Error('Network Error'));

      const result = await agent.testExecuteWithTracking({
        model: 'anthropic/claude-3-haiku',
        maxTokens: 512,
        tripId: 'trip123',
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Network Error');
      }
    });
  });

  describe('status management', () => {
    it('should update status during processing', async () => {
      let statusDuringProcessing: string | null = null;

      mockExecute.mockImplementation(async () => {
        statusDuringProcessing = agent.getStatus();
        return {
          success: true,
          data: {
            text: '{"result": "test"}',
            inputTokens: 100,
            outputTokens: 50,
            model: 'anthropic/claude-3-haiku',
            fallbackCount: 0,
          },
          modelUsed: 'anthropic/claude-3-haiku',
          fallbackCount: 0,
        };
      });

      await agent.process({ tripId: 'trip123', data: 'test' });

      expect(statusDuringProcessing).toBe(AgentStatus.PROCESSING);
    });

    it('should set COMPLETED status on success', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: '{"result": "test"}',
          inputTokens: 100,
          outputTokens: 50,
          model: 'anthropic/claude-3-haiku',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3-haiku',
        fallbackCount: 0,
      });

      await agent.process({ tripId: 'trip123', data: 'test' });

      expect(agent.getStatus()).toBe(AgentStatus.COMPLETED);
    });

    it('should set ERROR status on failure', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        error: 'API Error',
        modelUsed: 'anthropic/claude-3-haiku',
        fallbackCount: 0,
      });

      await agent.process({ tripId: 'trip123', data: 'test' });

      expect(agent.getStatus()).toBe(AgentStatus.ERROR);
    });
  });

  describe('process', () => {
    it('should process input and return result', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: 'Processed data',
          inputTokens: 100,
          outputTokens: 50,
          model: 'anthropic/claude-3-haiku',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3-haiku',
        fallbackCount: 0,
      });

      const result = await agent.process({ tripId: 'trip123', data: 'input data' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.result).toBe('Processed data');
      }
    });
  });
});

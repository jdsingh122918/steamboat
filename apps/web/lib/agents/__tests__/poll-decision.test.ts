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
import { PollDecisionAgent, calculateVoteStats } from '../poll-decision';
import { AgentRole, AgentStatus } from '../types';

describe('Poll Decision Agent', () => {
  let agent: PollDecisionAgent;
  let mockExecute: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-api-key' };

    mockExecute = vi.fn();
    (getOpenRouterClient as ReturnType<typeof vi.fn>).mockReturnValue({
      execute: mockExecute,
    });

    agent = new PollDecisionAgent();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('analyze', () => {
    it('should analyze poll results', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            pollId: 'poll1',
            totalVotes: 9,
            leadingOption: 'Italian',
            voteCounts: { Italian: 4, Mexican: 3, Steakhouse: 2 },
            recommendation: 'Italian has the most votes',
            confidence: 0.8,
          }),
          inputTokens: 400,
          outputTokens: 150,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      const result = await agent.analyze({
        pollId: 'poll1',
        question: 'Where for dinner?',
        options: ['Italian', 'Mexican', 'Steakhouse'],
        votes: { Italian: 4, Mexican: 3, Steakhouse: 2 },
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.leadingOption).toBe('Italian');
        expect(result.data.totalVotes).toBe(9);
      }
    });
  });

  describe('calculateVoteStats', () => {
    it('should calculate vote statistics', () => {
      const votes = { A: 5, B: 3, C: 2 };
      const stats = calculateVoteStats(votes);

      expect(stats.total).toBe(10);
      expect(stats.leader).toBe('A');
      expect(stats.percentages['A']).toBe(50);
    });

    it('should handle empty votes', () => {
      const stats = calculateVoteStats({});
      expect(stats.total).toBe(0);
      expect(stats.leader).toBeNull();
    });

    it('should handle tied votes', () => {
      const votes = { A: 5, B: 5 };
      const stats = calculateVoteStats(votes);
      expect(stats.total).toBe(10);
      expect(['A', 'B']).toContain(stats.leader);
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(agent.getStatus()).toBe(AgentStatus.IDLE);
    });
  });

  describe('getRole', () => {
    it('should return POLL_DECISION role', () => {
      expect(agent.getRole()).toBe(AgentRole.POLL_DECISION);
    });
  });
});

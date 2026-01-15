import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

import Anthropic from '@anthropic-ai/sdk';
import { PollDecisionAgent, calculateVoteStats } from '../poll-decision';
import { AgentRole, AgentStatus } from '../types';

describe('Poll Decision Agent', () => {
  let agent: PollDecisionAgent;
  let mockClient: { messages: { create: ReturnType<typeof vi.fn> } };
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-api-key' };
    mockClient = { messages: { create: vi.fn() } };
    (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);
    agent = new PollDecisionAgent();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('analyze', () => {
    it('should analyze poll results', async () => {
      mockClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [{
          type: 'text',
          text: JSON.stringify({
            pollId: 'poll1',
            totalVotes: 9,
            leadingOption: 'Italian',
            voteCounts: { Italian: 4, Mexican: 3, Steakhouse: 2 },
            recommendation: 'Italian has the most votes',
            confidence: 0.8,
          }),
        }],
        usage: { input_tokens: 400, output_tokens: 150 },
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

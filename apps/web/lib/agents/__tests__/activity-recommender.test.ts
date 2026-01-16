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
import { ActivityRecommender } from '../activity-recommender';
import { AgentRole, AgentStatus } from '../types';

describe('Activity Recommender Agent', () => {
  let recommender: ActivityRecommender;
  let mockExecute: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-api-key' };

    mockExecute = vi.fn();
    (getOpenRouterClient as ReturnType<typeof vi.fn>).mockReturnValue({
      execute: mockExecute,
    });

    recommender = new ActivityRecommender();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('recommend', () => {
    it('should return activity recommendations', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            recommendations: [
              {
                name: 'Skiing at Steamboat',
                description: 'World-class skiing',
                estimatedCost: 150,
                duration: '4 hours',
                category: 'adventure',
              },
            ],
          }),
          inputTokens: 600,
          outputTokens: 300,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      const result = await recommender.recommend({
        location: 'Steamboat, Colorado',
        interests: ['skiing', 'dining'],
        groupSize: 8,
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recommendations).toHaveLength(1);
        expect(result.data.recommendations[0].name).toContain('Skiing');
      }
    });

    it('should handle API errors', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        error: 'API error',
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      const result = await recommender.recommend({
        location: 'Steamboat',
        groupSize: 5,
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(recommender.getStatus()).toBe(AgentStatus.IDLE);
    });
  });

  describe('getRole', () => {
    it('should return ACTIVITY_RECOMMENDER role', () => {
      expect(recommender.getRole()).toBe(AgentRole.ACTIVITY_RECOMMENDER);
    });
  });
});

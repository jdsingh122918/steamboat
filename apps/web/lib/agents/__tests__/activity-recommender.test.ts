import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

import Anthropic from '@anthropic-ai/sdk';
import { ActivityRecommender } from '../activity-recommender';
import { AgentRole, AgentStatus } from '../types';

describe('Activity Recommender Agent', () => {
  let recommender: ActivityRecommender;
  let mockClient: { messages: { create: ReturnType<typeof vi.fn> } };
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-api-key' };
    mockClient = { messages: { create: vi.fn() } };
    (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);
    recommender = new ActivityRecommender();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('recommend', () => {
    it('should return activity recommendations', async () => {
      mockClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [{
          type: 'text',
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
        }],
        usage: { input_tokens: 600, output_tokens: 300 },
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
      mockClient.messages.create.mockRejectedValue(new Error('API error'));

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

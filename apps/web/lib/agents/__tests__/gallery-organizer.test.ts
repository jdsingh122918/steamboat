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
import { GalleryOrganizer, groupMediaByDate } from '../gallery-organizer';
import { AgentRole, AgentStatus } from '../types';

describe('Gallery Organizer Agent', () => {
  let organizer: GalleryOrganizer;
  let mockExecute: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, OPENROUTER_API_KEY: 'test-api-key' };

    mockExecute = vi.fn();
    (getOpenRouterClient as ReturnType<typeof vi.fn>).mockReturnValue({
      execute: mockExecute,
    });

    organizer = new GalleryOrganizer();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('organize', () => {
    it('should suggest tags for media', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        data: {
          text: JSON.stringify({
            suggestions: [
              { mediaId: 'media1', suggestedTags: ['group', 'dinner'], suggestedAlbum: 'Day 1' },
            ],
            albums: ['Day 1', 'Activities'],
          }),
          inputTokens: 500,
          outputTokens: 150,
          model: 'anthropic/claude-3.5-sonnet',
          fallbackCount: 0,
        },
        modelUsed: 'anthropic/claude-3.5-sonnet',
        fallbackCount: 0,
      });

      const result = await organizer.organize({
        media: [{ id: 'media1', url: 'https://example.com/img.jpg', type: 'image' }],
        tripId: 'trip123',
        userId: 'user1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.suggestions).toHaveLength(1);
      }
    });
  });

  describe('groupMediaByDate', () => {
    it('should group media by date', () => {
      const media = [
        { id: 'm1', timestamp: '2024-03-15T10:00:00Z' },
        { id: 'm2', timestamp: '2024-03-15T14:00:00Z' },
        { id: 'm3', timestamp: '2024-03-16T09:00:00Z' },
      ];

      const groups = groupMediaByDate(media);
      expect(Object.keys(groups)).toHaveLength(2);
    });
  });

  describe('getStatus', () => {
    it('should return IDLE initially', () => {
      expect(organizer.getStatus()).toBe(AgentStatus.IDLE);
    });
  });

  describe('getRole', () => {
    it('should return GALLERY_ORGANIZER role', () => {
      expect(organizer.getRole()).toBe(AgentRole.GALLERY_ORGANIZER);
    });
  });
});

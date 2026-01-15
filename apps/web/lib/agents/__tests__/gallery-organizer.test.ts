import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

import Anthropic from '@anthropic-ai/sdk';
import { GalleryOrganizer, groupMediaByDate } from '../gallery-organizer';
import { AgentRole, AgentStatus } from '../types';

describe('Gallery Organizer Agent', () => {
  let organizer: GalleryOrganizer;
  let mockClient: { messages: { create: ReturnType<typeof vi.fn> } };
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-api-key' };
    mockClient = { messages: { create: vi.fn() } };
    (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => mockClient);
    organizer = new GalleryOrganizer();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('organize', () => {
    it('should suggest tags for media', async () => {
      mockClient.messages.create.mockResolvedValue({
        id: 'msg_123',
        content: [{
          type: 'text',
          text: JSON.stringify({
            suggestions: [
              { mediaId: 'media1', suggestedTags: ['group', 'dinner'], suggestedAlbum: 'Day 1' },
            ],
            albums: ['Day 1', 'Activities'],
          }),
        }],
        usage: { input_tokens: 500, output_tokens: 150 },
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

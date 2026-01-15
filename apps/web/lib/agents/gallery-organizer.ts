/**
 * Gallery Organizer Agent
 *
 * AI agent for organizing and tagging media files.
 */

import {
  AgentRole,
  AgentRoleType,
  AgentResult,
  MediaOrganization,
  createSuccessResult,
  createErrorResult,
} from './types';
import { AgentModel } from './config';
import { BaseAgent } from './base-agent';
import { parseJsonResponse } from './parse-json-response';

export interface MediaItem {
  id: string;
  url?: string;
  type: 'image' | 'video';
  timestamp?: string;
  existingTags?: string[];
}

export interface OrganizeInput {
  media: MediaItem[];
  tripId: string;
  userId: string;
  tripName?: string;
}

export interface OrganizationResult {
  suggestions: MediaOrganization[];
  albums: string[];
}

/**
 * Group media items by date
 */
export function groupMediaByDate(
  media: Array<{ id: string; timestamp?: string }>
): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  for (const item of media) {
    if (!item.timestamp) continue;
    const date = item.timestamp.split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item.id);
  }

  return groups;
}

/**
 * Gallery Organizer Agent class
 */
export class GalleryOrganizer extends BaseAgent<OrganizeInput, OrganizationResult> {
  protected readonly role: AgentRoleType = AgentRole.GALLERY_ORGANIZER;

  /**
   * Process input using organize
   */
  async process(input: OrganizeInput): Promise<AgentResult<OrganizationResult>> {
    return this.organize(input);
  }

  /**
   * Organize media and suggest tags/albums
   */
  async organize(input: OrganizeInput): Promise<AgentResult<OrganizationResult>> {
    this.setProcessing();

    const dateGroups = groupMediaByDate(input.media);

    const result = await this.executeWithTracking({
      model: AgentModel.HAIKU,
      maxTokens: 1024,
      tripId: input.tripId,
      messages: [
        {
          role: 'user',
          content: `Please suggest organization for these media files:

Media Items: ${JSON.stringify(input.media.slice(0, 20), null, 2)}
Date Groups: ${JSON.stringify(dateGroups)}
Trip: ${input.tripName || 'Trip'}

Return JSON with:
- suggestions: array of { mediaId, suggestedTags, suggestedAlbum }
- albums: suggested album names`,
        },
      ],
    });

    if (!result.success) {
      this.setError();
      return createErrorResult(result.error);
    }

    const parsed = parseJsonResponse<OrganizationResult>(result.data.text);
    if (!parsed) {
      this.setError();
      return createErrorResult('Failed to parse response');
    }

    this.setCompleted();
    return createSuccessResult(parsed);
  }
}

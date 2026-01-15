/**
 * Gallery Organizer Agent
 *
 * AI agent for organizing and tagging media files.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentRole,
  AgentStatus,
  AgentRoleType,
  AgentStatusType,
  AgentResult,
  MediaOrganization,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getAgentConfig, AgentModel } from './config';
import { getSystemPrompt } from './prompts';
import { getGlobalCostTracker } from './cost-tracker';

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
export class GalleryOrganizer {
  private client: Anthropic;
  private status: AgentStatusType = AgentStatus.IDLE;
  private role: AgentRoleType = AgentRole.GALLERY_ORGANIZER;

  constructor() {
    const config = getAgentConfig();
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  getStatus(): AgentStatusType {
    return this.status;
  }

  getRole(): AgentRoleType {
    return this.role;
  }

  async organize(input: OrganizeInput): Promise<AgentResult<OrganizationResult>> {
    this.status = AgentStatus.PROCESSING;

    try {
      const systemPrompt = getSystemPrompt(this.role);
      const dateGroups = groupMediaByDate(input.media);

      const response = await this.client.messages.create({
        model: AgentModel.HAIKU,
        max_tokens: 1024,
        system: systemPrompt,
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

      const costTracker = getGlobalCostTracker();
      costTracker.recordUsage({
        model: AgentModel.HAIKU,
        role: this.role,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        tripId: input.tripId,
      });

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        this.status = AgentStatus.ERROR;
        return createErrorResult('No text content in response');
      }

      const parsed = parseOrganizationResponse(textContent.text);
      if (!parsed) {
        this.status = AgentStatus.ERROR;
        return createErrorResult('Failed to parse response');
      }

      this.status = AgentStatus.COMPLETED;
      return createSuccessResult(parsed);
    } catch (error) {
      this.status = AgentStatus.ERROR;
      return createErrorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

function parseOrganizationResponse(response: string): OrganizationResult | null {
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response.trim());
  } catch {
    return null;
  }
}

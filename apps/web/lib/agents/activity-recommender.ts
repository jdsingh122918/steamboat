/**
 * Activity Recommender Agent
 *
 * AI agent for recommending activities based on location and group preferences.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentRole,
  AgentStatus,
  AgentRoleType,
  AgentStatusType,
  AgentResult,
  ActivityRecommendation,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getAgentConfig, AgentModel } from './config';
import { getSystemPrompt } from './prompts';
import { getGlobalCostTracker } from './cost-tracker';

export interface RecommendInput {
  location: string;
  interests?: string[];
  budget?: 'low' | 'moderate' | 'high';
  groupSize: number;
  tripId: string;
  userId: string;
}

export interface RecommendationResult {
  recommendations: ActivityRecommendation[];
}

/**
 * Activity Recommender Agent class
 */
export class ActivityRecommender {
  private client: Anthropic;
  private status: AgentStatusType = AgentStatus.IDLE;
  private role: AgentRoleType = AgentRole.ACTIVITY_RECOMMENDER;

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

  async recommend(input: RecommendInput): Promise<AgentResult<RecommendationResult>> {
    this.status = AgentStatus.PROCESSING;

    try {
      const systemPrompt = getSystemPrompt(this.role);

      const response = await this.client.messages.create({
        model: AgentModel.SONNET,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Recommend activities for a group trip:

Location: ${input.location}
Group Size: ${input.groupSize}
Interests: ${input.interests?.join(', ') || 'general'}
Budget: ${input.budget || 'moderate'}

Return JSON with:
- recommendations: array of { name, description, estimatedCost, duration, category, rating }`,
          },
        ],
      });

      const costTracker = getGlobalCostTracker();
      costTracker.recordUsage({
        model: AgentModel.SONNET,
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

      const parsed = parseRecommendationResponse(textContent.text);
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

function parseRecommendationResponse(response: string): RecommendationResult | null {
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response.trim());
  } catch {
    return null;
  }
}

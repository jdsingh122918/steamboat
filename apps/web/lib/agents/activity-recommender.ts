/**
 * Activity Recommender Agent
 *
 * AI agent for recommending activities based on location and group preferences.
 */

import {
  AgentRole,
  AgentRoleType,
  AgentResult,
  ActivityRecommendation,
  createSuccessResult,
  createErrorResult,
} from './types';
import { AgentModel } from './config';
import { BaseAgent } from './base-agent';
import { parseJsonResponse } from './parse-json-response';

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
export class ActivityRecommender extends BaseAgent<RecommendInput, RecommendationResult> {
  protected readonly role: AgentRoleType = AgentRole.ACTIVITY_RECOMMENDER;

  /**
   * Process input using recommend
   */
  async process(input: RecommendInput): Promise<AgentResult<RecommendationResult>> {
    return this.recommend(input);
  }

  /**
   * Get activity recommendations
   */
  async recommend(input: RecommendInput): Promise<AgentResult<RecommendationResult>> {
    this.setProcessing();

    const result = await this.executeWithTracking({
      model: AgentModel.SONNET,
      maxTokens: 1024,
      tripId: input.tripId,
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

    if (!result.success) {
      this.setError();
      return createErrorResult(result.error);
    }

    const parsed = parseJsonResponse<RecommendationResult>(result.data.text);
    if (!parsed) {
      this.setError();
      return createErrorResult('Failed to parse response');
    }

    this.setCompleted();
    return createSuccessResult(parsed);
  }
}

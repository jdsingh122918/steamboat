/**
 * Poll Decision Agent
 *
 * AI agent for analyzing polls and facilitating group decisions.
 */

import {
  AgentRole,
  AgentRoleType,
  AgentResult,
  PollAnalysis,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getDefaultModelForRole } from './model-registry';
import { BaseAgent } from './base-agent';
import { parseJsonResponse } from './parse-json-response';

export interface AnalyzePollInput {
  pollId: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  tripId: string;
  userId: string;
}

export interface VoteStats {
  total: number;
  leader: string | null;
  percentages: Record<string, number>;
}

/**
 * Calculate vote statistics
 */
export function calculateVoteStats(votes: Record<string, number>): VoteStats {
  const total = Object.values(votes).reduce((sum, v) => sum + v, 0);

  if (total === 0) {
    return { total: 0, leader: null, percentages: {} };
  }

  let leader: string | null = null;
  let maxVotes = 0;
  const percentages: Record<string, number> = {};

  for (const [option, count] of Object.entries(votes)) {
    percentages[option] = Math.round((count / total) * 100);
    if (count > maxVotes) {
      maxVotes = count;
      leader = option;
    }
  }

  return { total, leader, percentages };
}

/**
 * Poll Decision Agent class
 */
export class PollDecisionAgent extends BaseAgent<AnalyzePollInput, PollAnalysis> {
  protected readonly role: AgentRoleType = AgentRole.POLL_DECISION;

  /**
   * Process input using analyze
   */
  async process(input: AnalyzePollInput): Promise<AgentResult<PollAnalysis>> {
    return this.analyze(input);
  }

  /**
   * Analyze poll results
   */
  async analyze(input: AnalyzePollInput): Promise<AgentResult<PollAnalysis>> {
    this.setProcessing();

    const stats = calculateVoteStats(input.votes);
    const defaultModel = getDefaultModelForRole(this.role);

    const result = await this.executeWithTracking({
      model: defaultModel,
      maxTokens: 512,
      tripId: input.tripId,
      messages: [
        {
          role: 'user',
          content: `Analyze this poll and provide insights:

Question: ${input.question}
Options: ${input.options.join(', ')}
Votes: ${JSON.stringify(input.votes)}
Stats: Total=${stats.total}, Leader=${stats.leader}

Return JSON with:
- pollId: "${input.pollId}"
- totalVotes: number
- leadingOption: string
- voteCounts: object
- recommendation: string
- confidence: number (0-1)`,
        },
      ],
    });

    if (!result.success) {
      this.setError();
      return createErrorResult(result.error);
    }

    const parsed = parseJsonResponse<PollAnalysis>(result.data.text);
    if (!parsed) {
      this.setError();
      return createErrorResult('Failed to parse response');
    }

    this.setCompleted();
    return createSuccessResult(parsed);
  }
}

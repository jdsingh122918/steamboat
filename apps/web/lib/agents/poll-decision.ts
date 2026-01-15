/**
 * Poll Decision Agent
 *
 * AI agent for analyzing polls and facilitating group decisions.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentRole,
  AgentStatus,
  AgentRoleType,
  AgentStatusType,
  AgentResult,
  PollAnalysis,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getAgentConfig, AgentModel } from './config';
import { getSystemPrompt } from './prompts';
import { getGlobalCostTracker } from './cost-tracker';

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
export class PollDecisionAgent {
  private client: Anthropic;
  private status: AgentStatusType = AgentStatus.IDLE;
  private role: AgentRoleType = AgentRole.POLL_DECISION;

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

  async analyze(input: AnalyzePollInput): Promise<AgentResult<PollAnalysis>> {
    this.status = AgentStatus.PROCESSING;

    try {
      const systemPrompt = getSystemPrompt(this.role);
      const stats = calculateVoteStats(input.votes);

      const response = await this.client.messages.create({
        model: AgentModel.HAIKU,
        max_tokens: 512,
        system: systemPrompt,
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

      const parsed = parsePollResponse(textContent.text);
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

function parsePollResponse(response: string): PollAnalysis | null {
  try {
    const match = response.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return JSON.parse(response.trim());
  } catch {
    return null;
  }
}

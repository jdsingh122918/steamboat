/**
 * Base Agent
 *
 * Abstract base class for AI agents providing common functionality:
 * - Status management
 * - API client initialization
 * - Cost tracking integration
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AgentStatus,
  AgentRoleType,
  AgentStatusType,
  AgentResult,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getAgentConfig, AgentModelType } from './config';
import { getSystemPrompt } from './prompts';
import { getGlobalCostTracker } from './cost-tracker';

export interface ExecuteOptions {
  model: AgentModelType;
  maxTokens: number;
  messages: Anthropic.MessageParam[];
  tripId: string;
}

export interface ExecuteResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Abstract base class for AI agents
 */
export abstract class BaseAgent<TInput, TOutput> {
  protected client: Anthropic;
  protected status: AgentStatusType = AgentStatus.IDLE;
  protected abstract readonly role: AgentRoleType;

  constructor() {
    const config = getAgentConfig();
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatusType {
    return this.status;
  }

  /**
   * Get agent role
   */
  getRole(): AgentRoleType {
    return this.role;
  }

  /**
   * Execute an API call with cost tracking
   */
  protected async executeWithTracking(options: ExecuteOptions): Promise<AgentResult<ExecuteResult>> {
    const systemPrompt = getSystemPrompt(this.role);

    try {
      const response = await this.client.messages.create({
        model: options.model,
        max_tokens: options.maxTokens,
        system: systemPrompt,
        messages: options.messages,
      });

      // Track usage
      const costTracker = getGlobalCostTracker();
      costTracker.recordUsage({
        model: options.model,
        role: this.role,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        tripId: options.tripId,
      });

      // Extract text from response
      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        return createErrorResult('No text content in response');
      }

      return createSuccessResult({
        text: textContent.text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(message);
    }
  }

  /**
   * Set agent status to processing
   */
  protected setProcessing(): void {
    this.status = AgentStatus.PROCESSING;
  }

  /**
   * Set agent status to completed
   */
  protected setCompleted(): void {
    this.status = AgentStatus.COMPLETED;
  }

  /**
   * Set agent status to error
   */
  protected setError(): void {
    this.status = AgentStatus.ERROR;
  }

  /**
   * Abstract method to be implemented by concrete agents
   */
  abstract process(input: TInput): Promise<AgentResult<TOutput>>;
}

/**
 * Base Agent
 *
 * Abstract base class for AI agents providing common functionality:
 * - Status management
 * - OpenRouter API client integration
 * - Cost tracking integration
 * - Automatic fallback support
 */

import {
  AgentStatus,
  AgentRoleType,
  AgentStatusType,
  AgentResult,
  createSuccessResult,
  createErrorResult,
} from './types';
import { getSystemPrompt } from './prompts';
import { getGlobalCostTracker } from './cost-tracker';
import {
  getOpenRouterClient,
  convertAnthropicMessages,
  type ChatMessage,
} from './openrouter-client';
import {
  resolveAgentConfig,
  getCachedTripAISettings,
  type TripAISettings,
} from './agent-config-service';
import { getAISettingsByTripId, toAgentConfigFormat } from '@/lib/db/operations/ai-settings';

export interface ExecuteOptions {
  /** Model ID (OpenRouter format, e.g., 'anthropic/claude-3.5-sonnet') */
  model: string;
  /** Maximum output tokens */
  maxTokens: number;
  /** Messages in Anthropic format (will be converted) */
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string; source?: { type: string; url: string } }>;
  }>;
  /** Trip ID for cost tracking and config lookup */
  tripId: string;
  /** Override temperature (optional) */
  temperature?: number;
}

export interface ExecuteResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  modelUsed: string;
}

/**
 * Abstract base class for AI agents
 */
export abstract class BaseAgent<TInput, TOutput> {
  protected status: AgentStatusType = AgentStatus.IDLE;
  protected abstract readonly role: AgentRoleType;

  constructor() {
    // No longer need to initialize Anthropic client
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
   * Load trip AI settings (with caching)
   */
  protected async loadTripSettings(tripId: string): Promise<TripAISettings | null> {
    return getCachedTripAISettings(tripId, async () => {
      const settings = await getAISettingsByTripId(tripId);
      return toAgentConfigFormat(settings);
    });
  }

  /**
   * Execute an API call with cost tracking and fallback support
   */
  protected async executeWithTracking(options: ExecuteOptions): Promise<AgentResult<ExecuteResult>> {
    const systemPrompt = getSystemPrompt(this.role);

    try {
      // Load trip settings for config resolution
      const tripSettings = await this.loadTripSettings(options.tripId);
      const agentConfig = resolveAgentConfig(this.role, tripSettings);

      // Convert messages from Anthropic format to OpenRouter format
      const convertedMessages = convertAnthropicMessages(options.messages);

      // Prepend system message
      const messagesWithSystem: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...convertedMessages,
      ];

      // Get OpenRouter client and execute
      const client = getOpenRouterClient();
      const result = await client.execute({
        model: options.model || agentConfig.modelId,
        messages: messagesWithSystem,
        maxTokens: options.maxTokens || agentConfig.maxTokens,
        temperature: options.temperature ?? agentConfig.temperature,
        fallbackOptions: agentConfig.enableFallback
          ? {
              maxAttempts: 3,
              fallbackOrder: agentConfig.fallbackOrder,
            }
          : { maxAttempts: 1 },
      });

      if (!result.success) {
        return createErrorResult(result.error ?? 'Unknown error');
      }

      // Track usage with the actual model used (might be fallback)
      const costTracker = getGlobalCostTracker();
      costTracker.recordUsage({
        model: result.modelUsed,
        role: this.role,
        inputTokens: result.data!.inputTokens,
        outputTokens: result.data!.outputTokens,
        tripId: options.tripId,
      });

      return createSuccessResult({
        text: result.data!.text,
        inputTokens: result.data!.inputTokens,
        outputTokens: result.data!.outputTokens,
        modelUsed: result.modelUsed,
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

/**
 * Agent Configuration
 *
 * Provides configuration and client creation for Claude API agents.
 * Supports model selection, cost tracking, and retry logic.
 */

import Anthropic from '@anthropic-ai/sdk';

// Available Claude models
export const AgentModel = {
  HAIKU: 'claude-3-haiku-20240307',
  SONNET: 'claude-sonnet-4-20250514',
  OPUS: 'claude-opus-4-20250514',
} as const;

export type AgentModelType = (typeof AgentModel)[keyof typeof AgentModel];

// Model configuration with pricing (as of 2024)
interface ModelConfig {
  name: string;
  maxTokens: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  contextWindow: number;
}

const MODEL_CONFIGS: Record<AgentModelType, ModelConfig> = {
  [AgentModel.HAIKU]: {
    name: 'Claude 3 Haiku',
    maxTokens: 4096,
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.00125,
    contextWindow: 200000,
  },
  [AgentModel.SONNET]: {
    name: 'Claude Sonnet 4',
    maxTokens: 8192,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    contextWindow: 200000,
  },
  [AgentModel.OPUS]: {
    name: 'Claude Opus 4',
    maxTokens: 8192,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
    contextWindow: 200000,
  },
};

export interface AgentConfig {
  apiKey: string;
  defaultModel: AgentModelType;
  maxRetries: number;
  timeout: number;
}

/**
 * Get agent configuration from environment
 */
export function getAgentConfig(): AgentConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  return {
    apiKey,
    defaultModel: AgentModel.SONNET,
    maxRetries: 3,
    timeout: 60000, // 60 seconds
  };
}

/**
 * Create an Anthropic client instance
 */
export function createAgentClient(): Anthropic {
  const config = getAgentConfig();
  return new Anthropic({
    apiKey: config.apiKey,
  });
}

/**
 * Get configuration for a specific model
 */
export function getModelConfig(model: AgentModelType): ModelConfig {
  return MODEL_CONFIGS[model];
}

/**
 * Calculate cost for a given number of tokens
 */
export function calculateCost(
  model: AgentModelType,
  inputTokens: number,
  outputTokens: number
): number {
  const config = MODEL_CONFIGS[model];
  const inputCost = (inputTokens / 1000) * config.costPer1kInputTokens;
  const outputCost = (outputTokens / 1000) * config.costPer1kOutputTokens;
  return inputCost + outputCost;
}

/**
 * Get recommended model for a task type
 */
export function getRecommendedModel(taskType: 'simple' | 'balanced' | 'complex'): AgentModelType {
  switch (taskType) {
    case 'simple':
      return AgentModel.HAIKU; // Most cost-effective
    case 'balanced':
      return AgentModel.SONNET; // Best balance of cost/quality
    case 'complex':
      return AgentModel.OPUS; // Highest quality
    default:
      return AgentModel.SONNET;
  }
}

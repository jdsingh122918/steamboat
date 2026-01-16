/**
 * Agent Configuration
 *
 * Provides configuration for OpenRouter API agents.
 * Supports multi-provider model selection via model registry.
 *
 * Note: This file provides backward compatibility exports.
 * New code should use model-registry.ts directly.
 */

import {
  MODEL_REGISTRY,
  getModelDefinition,
  getDefaultModelForRole,
  calculateModelCostFromRegistry,
  type ModelDefinition,
} from './model-registry';
import { getOpenRouterClient, type OpenRouterClient } from './openrouter-client';

// Legacy model constants - mapped to OpenRouter model IDs
// Kept for backward compatibility during migration
export const AgentModel = {
  HAIKU: 'anthropic/claude-3-haiku',
  SONNET: 'anthropic/claude-3.5-sonnet',
  OPUS: 'anthropic/claude-3.5-sonnet', // Map to sonnet as opus isn't in OpenRouter
} as const;

export type AgentModelType = string;

// Model configuration with pricing
interface ModelConfig {
  name: string;
  maxTokens: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  contextWindow: number;
}

export interface AgentConfig {
  apiKey: string;
  defaultModel: string;
  maxRetries: number;
  timeout: number;
}

/**
 * Get agent configuration from environment
 */
export function getAgentConfig(): AgentConfig {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';

  if (!apiKey && !skipValidation) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  return {
    apiKey: apiKey || '',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    maxRetries: 3,
    timeout: 60000, // 60 seconds
  };
}

/**
 * Create an OpenRouter client instance
 * (Replaces createAgentClient which returned Anthropic client)
 */
export function createAgentClient(): OpenRouterClient {
  return getOpenRouterClient();
}

/**
 * Get configuration for a specific model
 */
export function getModelConfig(model: string): ModelConfig {
  const def = getModelDefinition(model);
  if (!def) {
    // Return defaults for unknown models
    return {
      name: model,
      maxTokens: 4096,
      costPer1kInputTokens: 0.001,
      costPer1kOutputTokens: 0.002,
      contextWindow: 100000,
    };
  }
  return {
    name: def.name,
    maxTokens: def.maxOutputTokens,
    costPer1kInputTokens: def.pricing.inputPer1k,
    costPer1kOutputTokens: def.pricing.outputPer1k,
    contextWindow: def.contextWindow,
  };
}

/**
 * Calculate cost for a given number of tokens
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  return calculateModelCostFromRegistry(model, inputTokens, outputTokens);
}

/**
 * Get recommended model for a task type
 */
export function getRecommendedModel(taskType: 'simple' | 'balanced' | 'complex'): string {
  switch (taskType) {
    case 'simple':
      return 'anthropic/claude-3-haiku';
    case 'balanced':
      return 'anthropic/claude-3.5-sonnet';
    case 'complex':
      return 'anthropic/claude-3.5-sonnet';
    default:
      return 'anthropic/claude-3.5-sonnet';
  }
}

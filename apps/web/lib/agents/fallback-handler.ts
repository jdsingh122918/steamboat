/**
 * Fallback Handler
 *
 * Manages model fallback logic for handling API failures.
 * Triggers fallback on: 429 (rate limit), 5xx (server errors), timeouts.
 */

import {
  MODEL_REGISTRY,
  getModelDefinition,
  getVisionCapableModels,
  type ModelDefinition,
} from './model-registry';

/**
 * Error types that trigger fallback
 */
export const FALLBACK_ERROR_CODES = {
  RATE_LIMITED: 429,
  SERVER_ERROR_START: 500,
  SERVER_ERROR_END: 599,
  TIMEOUT: 'TIMEOUT',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
} as const;

/**
 * Result of a fallback attempt
 */
export interface FallbackResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  modelUsed: string;
  fallbackCount: number;
}

/**
 * Error with status code from API
 */
export interface ApiError {
  status?: number;
  code?: string;
  message: string;
}

/**
 * Options for the fallback handler
 */
export interface FallbackOptions {
  /** Maximum number of fallback attempts */
  maxAttempts?: number;
  /** Whether the task requires vision capability */
  requiresVision?: boolean;
  /** Preferred fallback order (model IDs) */
  fallbackOrder?: string[];
}

/**
 * Default fallback order prioritizing cost-effectiveness
 */
const DEFAULT_FALLBACK_ORDER = [
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o',
  'google/gemini-pro-1.5',
  'mistralai/mistral-large',
  'meta-llama/llama-3.1-70b-instruct',
  'anthropic/claude-3-haiku',
];

/**
 * Vision-capable fallback order
 */
const VISION_FALLBACK_ORDER = [
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o',
  'google/gemini-pro-1.5',
  'anthropic/claude-3-haiku',
];

/**
 * Check if an error should trigger fallback
 */
export function shouldTriggerFallback(error: ApiError): boolean {
  // Check for rate limiting
  if (error.status === FALLBACK_ERROR_CODES.RATE_LIMITED) {
    return true;
  }

  // Check for server errors (5xx)
  if (
    error.status &&
    error.status >= FALLBACK_ERROR_CODES.SERVER_ERROR_START &&
    error.status <= FALLBACK_ERROR_CODES.SERVER_ERROR_END
  ) {
    return true;
  }

  // Check for timeout
  if (error.code === FALLBACK_ERROR_CODES.TIMEOUT) {
    return true;
  }

  // Check for connection errors
  if (error.code === FALLBACK_ERROR_CODES.CONNECTION_ERROR) {
    return true;
  }

  // Check for common error messages
  const message = error.message.toLowerCase();
  if (
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('overloaded') ||
    message.includes('capacity') ||
    message.includes('unavailable')
  ) {
    return true;
  }

  return false;
}

/**
 * Get the next fallback model
 */
export function getNextFallbackModel(
  currentModel: string,
  failedModels: string[],
  options: FallbackOptions = {}
): string | null {
  const { requiresVision = false, fallbackOrder } = options;

  // Use appropriate fallback order
  let order = fallbackOrder;
  if (!order) {
    order = requiresVision ? VISION_FALLBACK_ORDER : DEFAULT_FALLBACK_ORDER;
  }

  // Filter to models that haven't failed yet
  const availableModels = order.filter((modelId) => {
    // Skip if already failed
    if (failedModels.includes(modelId)) {
      return false;
    }

    // Skip current model
    if (modelId === currentModel) {
      return false;
    }

    // Check if model exists in registry
    const model = getModelDefinition(modelId);
    if (!model) {
      return false;
    }

    // If vision required, check capability
    if (requiresVision && !model.capabilities.vision) {
      return false;
    }

    return true;
  });

  return availableModels[0] ?? null;
}

/**
 * Execute a function with fallback support
 */
export async function executeWithFallback<T>(
  primaryModel: string,
  executor: (modelId: string) => Promise<T>,
  options: FallbackOptions = {}
): Promise<FallbackResult<T>> {
  const { maxAttempts = 3 } = options;
  const failedModels: string[] = [];
  let currentModel = primaryModel;
  let fallbackCount = 0;

  while (fallbackCount < maxAttempts) {
    try {
      const data = await executor(currentModel);
      return {
        success: true,
        data,
        modelUsed: currentModel,
        fallbackCount,
      };
    } catch (error) {
      const apiError: ApiError = {
        status: (error as { status?: number }).status,
        code: (error as { code?: string }).code,
        message: error instanceof Error ? error.message : 'Unknown error',
      };

      // Check if we should try fallback
      if (!shouldTriggerFallback(apiError)) {
        return {
          success: false,
          error: apiError.message,
          modelUsed: currentModel,
          fallbackCount,
        };
      }

      // Mark current model as failed
      failedModels.push(currentModel);

      // Get next fallback model
      const nextModel = getNextFallbackModel(currentModel, failedModels, options);
      if (!nextModel) {
        return {
          success: false,
          error: `All fallback models exhausted. Last error: ${apiError.message}`,
          modelUsed: currentModel,
          fallbackCount,
        };
      }

      currentModel = nextModel;
      fallbackCount++;
    }
  }

  return {
    success: false,
    error: `Max fallback attempts (${maxAttempts}) reached`,
    modelUsed: currentModel,
    fallbackCount,
  };
}

/**
 * Get fallback chain for a model
 * Returns the ordered list of models that will be tried
 */
export function getFallbackChain(
  primaryModel: string,
  options: FallbackOptions = {}
): string[] {
  const { requiresVision = false, fallbackOrder, maxAttempts = 3 } = options;

  const order = fallbackOrder ?? (requiresVision ? VISION_FALLBACK_ORDER : DEFAULT_FALLBACK_ORDER);

  // Start with primary model
  const chain = [primaryModel];
  const failedModels = [primaryModel];

  // Add fallback models up to maxAttempts
  while (chain.length < maxAttempts) {
    const next = getNextFallbackModel(primaryModel, failedModels, options);
    if (!next) break;
    chain.push(next);
    failedModels.push(next);
  }

  return chain;
}

/**
 * Estimate total cost for a fallback chain
 * Useful for budget planning
 */
export function estimateFallbackChainCost(
  chain: string[],
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  let totalCost = 0;

  for (const modelId of chain) {
    const model = getModelDefinition(modelId);
    if (model) {
      const inputCost = (estimatedInputTokens / 1000) * model.pricing.inputPer1k;
      const outputCost = (estimatedOutputTokens / 1000) * model.pricing.outputPer1k;
      totalCost += inputCost + outputCost;
    }
  }

  return totalCost;
}

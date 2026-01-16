/**
 * Model Registry
 *
 * Central registry of LLM models with capabilities and pricing.
 * Supports multiple providers via OpenRouter.
 */

/**
 * Model provider identifiers
 */
export const ModelProvider = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  GOOGLE: 'google',
  META: 'meta-llama',
  MISTRAL: 'mistralai',
} as const;

export type ModelProviderType = (typeof ModelProvider)[keyof typeof ModelProvider];

/**
 * Model capability flags
 */
export interface ModelCapabilities {
  /** Supports image/vision inputs */
  vision: boolean;
  /** Supports function/tool calling */
  functionCalling: boolean;
  /** Supports JSON mode output */
  jsonMode: boolean;
  /** Supports streaming responses */
  streaming: boolean;
}

/**
 * Model pricing per 1K tokens (USD)
 */
export interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
}

/**
 * Complete model definition
 */
export interface ModelDefinition {
  /** Full model ID as used by OpenRouter (e.g., 'anthropic/claude-3.5-sonnet') */
  id: string;
  /** Display name */
  name: string;
  /** Provider identifier */
  provider: ModelProviderType;
  /** Maximum context window size */
  contextWindow: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Model capabilities */
  capabilities: ModelCapabilities;
  /** Pricing per 1K tokens */
  pricing: ModelPricing;
  /** Task type recommendation */
  taskType: 'simple' | 'balanced' | 'complex';
}

/**
 * Registered models with full definitions
 */
export const MODEL_REGISTRY: Record<string, ModelDefinition> = {
  // Anthropic models
  'anthropic/claude-3.5-sonnet': {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: ModelProvider.ANTHROPIC,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    capabilities: {
      vision: true,
      functionCalling: true,
      jsonMode: true,
      streaming: true,
    },
    pricing: {
      inputPer1k: 0.003,
      outputPer1k: 0.015,
    },
    taskType: 'balanced',
  },
  'anthropic/claude-3-haiku': {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: ModelProvider.ANTHROPIC,
    contextWindow: 200000,
    maxOutputTokens: 4096,
    capabilities: {
      vision: true,
      functionCalling: true,
      jsonMode: true,
      streaming: true,
    },
    pricing: {
      inputPer1k: 0.00025,
      outputPer1k: 0.00125,
    },
    taskType: 'simple',
  },

  // OpenAI models
  'openai/gpt-4o': {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: ModelProvider.OPENAI,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: {
      vision: true,
      functionCalling: true,
      jsonMode: true,
      streaming: true,
    },
    pricing: {
      inputPer1k: 0.005,
      outputPer1k: 0.015,
    },
    taskType: 'balanced',
  },

  // Google models
  'google/gemini-pro-1.5': {
    id: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: ModelProvider.GOOGLE,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    capabilities: {
      vision: true,
      functionCalling: true,
      jsonMode: true,
      streaming: true,
    },
    pricing: {
      inputPer1k: 0.00125,
      outputPer1k: 0.005,
    },
    taskType: 'balanced',
  },

  // Meta models
  'meta-llama/llama-3.1-70b-instruct': {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: ModelProvider.META,
    contextWindow: 131072,
    maxOutputTokens: 4096,
    capabilities: {
      vision: false,
      functionCalling: true,
      jsonMode: true,
      streaming: true,
    },
    pricing: {
      inputPer1k: 0.00059,
      outputPer1k: 0.00079,
    },
    taskType: 'balanced',
  },

  // Mistral models
  'mistralai/mistral-large': {
    id: 'mistralai/mistral-large',
    name: 'Mistral Large',
    provider: ModelProvider.MISTRAL,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    capabilities: {
      vision: false,
      functionCalling: true,
      jsonMode: true,
      streaming: true,
    },
    pricing: {
      inputPer1k: 0.002,
      outputPer1k: 0.006,
    },
    taskType: 'balanced',
  },
};

/**
 * Get a model definition by ID
 */
export function getModelDefinition(modelId: string): ModelDefinition | null {
  return MODEL_REGISTRY[modelId] ?? null;
}

/**
 * Get all registered model IDs
 */
export function getRegisteredModelIds(): string[] {
  return Object.keys(MODEL_REGISTRY);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: ModelProviderType): ModelDefinition[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.provider === provider);
}

/**
 * Get models with specific capability
 */
export function getModelsWithCapability(
  capability: keyof ModelCapabilities
): ModelDefinition[] {
  return Object.values(MODEL_REGISTRY).filter((m) => m.capabilities[capability]);
}

/**
 * Get models suitable for vision tasks
 */
export function getVisionCapableModels(): ModelDefinition[] {
  return getModelsWithCapability('vision');
}

/**
 * Get the cheapest model for a task type
 */
export function getCheapestModel(taskType: 'simple' | 'balanced' | 'complex'): ModelDefinition {
  const models = Object.values(MODEL_REGISTRY).filter((m) => m.taskType === taskType);
  if (models.length === 0) {
    // Fall back to all models if none match the task type
    return Object.values(MODEL_REGISTRY).reduce((cheapest, model) => {
      const modelCost = model.pricing.inputPer1k + model.pricing.outputPer1k;
      const cheapestCost = cheapest.pricing.inputPer1k + cheapest.pricing.outputPer1k;
      return modelCost < cheapestCost ? model : cheapest;
    });
  }
  return models.reduce((cheapest, model) => {
    const modelCost = model.pricing.inputPer1k + model.pricing.outputPer1k;
    const cheapestCost = cheapest.pricing.inputPer1k + cheapest.pricing.outputPer1k;
    return modelCost < cheapestCost ? model : cheapest;
  });
}

/**
 * Calculate cost for a given model and token counts
 */
export function calculateModelCostFromRegistry(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModelDefinition(modelId);
  if (!model) {
    // Return 0 for unknown models
    return 0;
  }
  const inputCost = (inputTokens / 1000) * model.pricing.inputPer1k;
  const outputCost = (outputTokens / 1000) * model.pricing.outputPer1k;
  return inputCost + outputCost;
}

/**
 * Default models for each agent role
 */
export const DEFAULT_AGENT_MODELS: Record<string, string> = {
  receipt_processor: 'anthropic/claude-3.5-sonnet',
  payment_assistant: 'anthropic/claude-3-haiku',
  expense_reconciler: 'anthropic/claude-3-haiku',
  gallery_organizer: 'anthropic/claude-3-haiku',
  activity_recommender: 'anthropic/claude-3.5-sonnet',
  poll_decision: 'anthropic/claude-3-haiku',
};

/**
 * Get the default model for an agent role
 */
export function getDefaultModelForRole(role: string): string {
  return DEFAULT_AGENT_MODELS[role] ?? 'anthropic/claude-3.5-sonnet';
}

/**
 * Get all models suitable for a specific agent role
 * Returns models based on the role's requirements (e.g., vision for receipt_processor)
 */
export function getModelsForRole(role: string): ModelDefinition[] {
  // Receipt processor needs vision capability
  if (role === 'receipt_processor') {
    return getVisionCapableModels();
  }
  // All other roles can use any model
  return Object.values(MODEL_REGISTRY);
}

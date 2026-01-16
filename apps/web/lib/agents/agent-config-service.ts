/**
 * Agent Config Service
 *
 * Runtime configuration resolution for AI agents.
 * Resolves configuration from: DB (per-trip) → defaults
 */

import { getDefaultModelForRole, getModelDefinition, type ModelDefinition } from './model-registry';
import type { AgentRoleType } from './types';

/**
 * Agent-specific configuration
 */
export interface AgentRuntimeConfig {
  /** Model ID to use for this agent */
  modelId: string;
  /** Maximum tokens for output */
  maxTokens: number;
  /** Temperature for generation */
  temperature: number;
  /** Whether to enable fallback */
  enableFallback: boolean;
  /** Custom fallback order if specified */
  fallbackOrder?: string[];
}

/**
 * Per-trip AI settings stored in DB
 */
export interface TripAISettings {
  /** Global defaults for all agents */
  defaults?: {
    modelId?: string;
    maxTokens?: number;
    temperature?: number;
    enableFallback?: boolean;
  };
  /** Per-agent overrides */
  agents?: {
    [agentRole: string]: {
      modelId?: string;
      maxTokens?: number;
      temperature?: number;
      enableFallback?: boolean;
      fallbackOrder?: string[];
    };
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AgentRuntimeConfig = {
  modelId: 'anthropic/claude-3.5-sonnet',
  maxTokens: 4096,
  temperature: 0.7,
  enableFallback: true,
};

/**
 * Role-specific default max tokens
 */
const ROLE_DEFAULT_MAX_TOKENS: Record<string, number> = {
  receipt_processor: 1024,
  payment_assistant: 512,
  expense_reconciler: 1024,
  gallery_organizer: 1024,
  activity_recommender: 1024,
  poll_decision: 512,
};

/**
 * Resolve configuration for an agent
 * Priority: tripSettings.agents[role] → tripSettings.defaults → role defaults → global defaults
 */
export function resolveAgentConfig(
  role: AgentRoleType,
  tripSettings?: TripAISettings | null
): AgentRuntimeConfig {
  // Start with global defaults
  let config: AgentRuntimeConfig = {
    ...DEFAULT_CONFIG,
    modelId: getDefaultModelForRole(role),
    maxTokens: ROLE_DEFAULT_MAX_TOKENS[role] ?? DEFAULT_CONFIG.maxTokens,
  };

  // Apply trip-level defaults if available
  if (tripSettings?.defaults) {
    config = {
      ...config,
      modelId: tripSettings.defaults.modelId ?? config.modelId,
      maxTokens: tripSettings.defaults.maxTokens ?? config.maxTokens,
      temperature: tripSettings.defaults.temperature ?? config.temperature,
      enableFallback: tripSettings.defaults.enableFallback ?? config.enableFallback,
    };
  }

  // Apply agent-specific overrides if available
  const agentOverride = tripSettings?.agents?.[role];
  if (agentOverride) {
    config = {
      ...config,
      modelId: agentOverride.modelId ?? config.modelId,
      maxTokens: agentOverride.maxTokens ?? config.maxTokens,
      temperature: agentOverride.temperature ?? config.temperature,
      enableFallback: agentOverride.enableFallback ?? config.enableFallback,
      fallbackOrder: agentOverride.fallbackOrder ?? config.fallbackOrder,
    };
  }

  // Validate that the model exists, fall back to default if not
  const modelDef = getModelDefinition(config.modelId);
  if (!modelDef) {
    config.modelId = getDefaultModelForRole(role);
  }

  return config;
}

/**
 * Get model definition for a resolved config
 */
export function getModelForConfig(config: AgentRuntimeConfig): ModelDefinition | null {
  return getModelDefinition(config.modelId);
}

/**
 * Create default trip AI settings
 */
export function createDefaultTripAISettings(): TripAISettings {
  return {
    defaults: {
      enableFallback: true,
    },
    agents: {},
  };
}

/**
 * Merge partial settings with existing settings
 */
export function mergeTripAISettings(
  existing: TripAISettings | null,
  updates: Partial<TripAISettings>
): TripAISettings {
  const base = existing ?? createDefaultTripAISettings();

  return {
    defaults: {
      ...base.defaults,
      ...updates.defaults,
    },
    agents: {
      ...base.agents,
      ...updates.agents,
    },
  };
}

/**
 * Validate trip AI settings
 * Returns list of validation errors
 */
export function validateTripAISettings(settings: TripAISettings): string[] {
  const errors: string[] = [];

  // Validate default model if specified
  if (settings.defaults?.modelId) {
    const model = getModelDefinition(settings.defaults.modelId);
    if (!model) {
      errors.push(`Invalid default model: ${settings.defaults.modelId}`);
    }
  }

  // Validate agent-specific models
  if (settings.agents) {
    for (const [role, agentConfig] of Object.entries(settings.agents)) {
      if (agentConfig.modelId) {
        const model = getModelDefinition(agentConfig.modelId);
        if (!model) {
          errors.push(`Invalid model for ${role}: ${agentConfig.modelId}`);
        }
      }

      // Validate fallback order models
      if (agentConfig.fallbackOrder) {
        for (const fallbackModelId of agentConfig.fallbackOrder) {
          const model = getModelDefinition(fallbackModelId);
          if (!model) {
            errors.push(`Invalid fallback model for ${role}: ${fallbackModelId}`);
          }
        }
      }

      // Validate temperature range
      if (agentConfig.temperature !== undefined) {
        if (agentConfig.temperature < 0 || agentConfig.temperature > 2) {
          errors.push(`Invalid temperature for ${role}: must be between 0 and 2`);
        }
      }

      // Validate maxTokens
      if (agentConfig.maxTokens !== undefined) {
        if (agentConfig.maxTokens < 1 || agentConfig.maxTokens > 100000) {
          errors.push(`Invalid maxTokens for ${role}: must be between 1 and 100000`);
        }
      }
    }
  }

  return errors;
}

// Cache for trip settings to avoid repeated DB calls within a request
const settingsCache = new Map<string, { settings: TripAISettings | null; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Get cached trip settings or fetch from DB
 * Pass fetchFn to actually load from DB
 */
export async function getCachedTripAISettings(
  tripId: string,
  fetchFn: () => Promise<TripAISettings | null>
): Promise<TripAISettings | null> {
  const cached = settingsCache.get(tripId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.settings;
  }

  const settings = await fetchFn();
  settingsCache.set(tripId, { settings, timestamp: now });
  return settings;
}

/**
 * Invalidate cached settings for a trip
 */
export function invalidateTripAISettingsCache(tripId: string): void {
  settingsCache.delete(tripId);
}

/**
 * Clear all cached settings (for testing)
 */
export function clearAISettingsCache(): void {
  settingsCache.clear();
}

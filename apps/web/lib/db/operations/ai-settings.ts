/**
 * AI Settings database operations.
 *
 * CRUD operations for per-trip AI configuration.
 */

import { ObjectId, Filter } from 'mongodb';
import { getCollection } from '@/lib/db/client';
import type { AISettings, CreateAISettings, UpdateAISettings } from '@/lib/db/models/ai-settings';

const COLLECTION_NAME = 'ai_settings';

/**
 * Get AI settings for a trip.
 *
 * @param tripId - Trip ObjectId
 * @returns AI settings or null if not found
 */
export async function getAISettings(tripId: ObjectId): Promise<AISettings | null> {
  const collection = await getCollection<AISettings>(COLLECTION_NAME);
  return collection.findOne({ tripId, deletedAt: null } as Filter<AISettings>);
}

/**
 * Get AI settings for a trip by trip ID string.
 *
 * @param tripIdStr - Trip ID as string
 * @returns AI settings or null if not found
 */
export async function getAISettingsByTripId(tripIdStr: string): Promise<AISettings | null> {
  if (!ObjectId.isValid(tripIdStr)) {
    return null;
  }
  return getAISettings(new ObjectId(tripIdStr));
}

/**
 * Create AI settings for a trip.
 *
 * @param settings - Settings to create
 * @returns Created settings with _id and timestamps
 */
export async function createAISettings(
  settings: CreateAISettings
): Promise<AISettings> {
  const collection = await getCollection<AISettings>(COLLECTION_NAME);

  const now = new Date();
  const doc: AISettings = {
    _id: new ObjectId(),
    ...settings,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await collection.insertOne(doc as AISettings);
  return doc;
}

/**
 * Update AI settings for a trip.
 * Creates settings if they don't exist (upsert).
 *
 * @param tripId - Trip ObjectId
 * @param updates - Settings updates
 * @returns Updated settings
 */
export async function updateAISettings(
  tripId: ObjectId,
  updates: UpdateAISettings
): Promise<AISettings | null> {
  const collection = await getCollection<AISettings>(COLLECTION_NAME);

  // Check if settings exist
  const existing = await getAISettings(tripId);

  if (existing) {
    // Update existing settings
    // Merge agents rather than replace
    const mergedAgents = {
      ...(existing.agents ?? {}),
      ...(updates.agents ?? {}),
    };

    const result = await collection.updateOne(
      { _id: existing._id } as Filter<AISettings>,
      {
        $set: {
          defaults: updates.defaults ?? existing.defaults,
          agents: mergedAgents,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return null;
    }

    return getAISettings(tripId);
  } else {
    // Create new settings
    return createAISettings({
      tripId,
      defaults: updates.defaults,
      agents: updates.agents,
    });
  }
}

/**
 * Update a single agent's configuration.
 *
 * @param tripId - Trip ObjectId
 * @param agentRole - Agent role key
 * @param config - Agent configuration
 * @returns Updated settings
 */
export async function updateAgentConfig(
  tripId: ObjectId,
  agentRole: string,
  config: UpdateAISettings['agents'] extends Record<string, infer V> ? V : never
): Promise<AISettings | null> {
  return updateAISettings(tripId, {
    agents: { [agentRole]: config },
  });
}

/**
 * Delete AI settings for a trip (soft delete).
 *
 * @param tripId - Trip ObjectId
 * @returns True if deleted, false if not found
 */
export async function deleteAISettings(tripId: ObjectId): Promise<boolean> {
  const collection = await getCollection<AISettings>(COLLECTION_NAME);

  const result = await collection.updateOne(
    { tripId, deletedAt: null } as Filter<AISettings>,
    {
      $set: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}

/**
 * Get or create default AI settings for a trip.
 *
 * @param tripId - Trip ObjectId
 * @returns Existing or newly created settings
 */
export async function getOrCreateAISettings(tripId: ObjectId): Promise<AISettings> {
  const existing = await getAISettings(tripId);
  if (existing) {
    return existing;
  }

  return createAISettings({
    tripId,
    defaults: {
      enableFallback: true,
    },
    agents: {},
  });
}

/**
 * Reset AI settings to defaults for a trip.
 *
 * @param tripId - Trip ObjectId
 * @returns Reset settings
 */
export async function resetAISettings(tripId: ObjectId): Promise<AISettings | null> {
  const collection = await getCollection<AISettings>(COLLECTION_NAME);

  // Hard delete existing settings
  await collection.deleteOne({ tripId } as Filter<AISettings>);

  // Create fresh default settings
  return createAISettings({
    tripId,
    defaults: {
      enableFallback: true,
    },
    agents: {},
  });
}

/**
 * Convert AI settings to the format expected by agent-config-service.
 */
export function toAgentConfigFormat(settings: AISettings | null): {
  defaults?: {
    modelId?: string;
    maxTokens?: number;
    temperature?: number;
    enableFallback?: boolean;
  };
  agents?: {
    [agentRole: string]: {
      modelId?: string;
      maxTokens?: number;
      temperature?: number;
      enableFallback?: boolean;
      fallbackOrder?: string[];
    };
  };
} | null {
  if (!settings) {
    return null;
  }

  return {
    defaults: settings.defaults,
    agents: settings.agents,
  };
}

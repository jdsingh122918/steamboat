/**
 * AI Settings data model.
 *
 * Per-trip AI configuration for agent behavior and model selection.
 */

import { z } from 'zod';
import { BaseDocumentSchema, ObjectIdSchema } from './types';

/**
 * Agent config schema for per-agent overrides.
 */
export const AgentConfigSchema = z.object({
  /** Model ID to use (e.g., 'anthropic/claude-3.5-sonnet') */
  modelId: z.string().optional(),
  /** Maximum output tokens */
  maxTokens: z.number().int().min(1).max(100000).optional(),
  /** Temperature for generation (0-2) */
  temperature: z.number().min(0).max(2).optional(),
  /** Whether to enable fallback on errors */
  enableFallback: z.boolean().optional(),
  /** Custom fallback order (model IDs) */
  fallbackOrder: z.array(z.string()).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Default settings schema for global trip defaults.
 */
export const DefaultSettingsSchema = z.object({
  /** Default model ID for all agents */
  modelId: z.string().optional(),
  /** Default max tokens */
  maxTokens: z.number().int().min(1).max(100000).optional(),
  /** Default temperature */
  temperature: z.number().min(0).max(2).optional(),
  /** Default fallback setting */
  enableFallback: z.boolean().optional(),
});

export type DefaultSettings = z.infer<typeof DefaultSettingsSchema>;

/**
 * Agent roles for typed agent config mapping.
 */
export const AgentRoles = [
  'receipt_processor',
  'payment_assistant',
  'expense_reconciler',
  'gallery_organizer',
  'activity_recommender',
  'poll_decision',
] as const;

export type AgentRoleKey = (typeof AgentRoles)[number];

/**
 * AI Settings document schema.
 */
export const AISettingsSchema = BaseDocumentSchema.extend({
  /** Trip this settings belong to */
  tripId: ObjectIdSchema,

  /** Global defaults for all agents */
  defaults: DefaultSettingsSchema.optional(),

  /** Per-agent configuration overrides */
  agents: z.record(z.string(), AgentConfigSchema).optional(),
});

export type AISettings = z.infer<typeof AISettingsSchema>;

/**
 * Schema for creating new AI settings (without _id and timestamps).
 */
export const CreateAISettingsSchema = AISettingsSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateAISettings = z.infer<typeof CreateAISettingsSchema>;

/**
 * Schema for updating AI settings.
 */
export const UpdateAISettingsSchema = z.object({
  defaults: DefaultSettingsSchema.optional(),
  agents: z.record(z.string(), AgentConfigSchema).optional(),
});

export type UpdateAISettings = z.infer<typeof UpdateAISettingsSchema>;

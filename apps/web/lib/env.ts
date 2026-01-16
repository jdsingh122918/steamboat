/**
 * Type-safe environment variable access.
 *
 * This module validates and exports environment variables with TypeScript types.
 * Variables are validated at module load time in production.
 */

/**
 * Environment variable interface with all required and optional vars.
 */
export interface Env {
  // Database
  MONGODB_URI: string;

  // Session
  SESSION_SECRET: string;

  // AI Services (OpenRouter)
  OPENROUTER_API_KEY: string;

  // Vercel Blob Storage
  // Note: BLOB_READ_WRITE_TOKEN is automatically used by @vercel/blob
  // and doesn't need to be explicitly accessed in code
  BLOB_READ_WRITE_TOKEN: string;

  // Pusher
  PUSHER_APP_ID: string;
  PUSHER_KEY: string;
  PUSHER_SECRET: string;
  PUSHER_CLUSTER: string;
}

/**
 * List of required environment variables.
 * These must be set in production.
 */
const requiredVars = [
  'MONGODB_URI',
  'SESSION_SECRET',
  'OPENROUTER_API_KEY',
  'BLOB_READ_WRITE_TOKEN',
  'PUSHER_APP_ID',
  'PUSHER_SECRET',
] as const;

/**
 * Get an environment variable value.
 * Checks both the direct key and NEXT_PUBLIC_ prefixed version.
 *
 * @param key - The environment variable key
 * @param isRequired - Whether this variable is required
 * @returns The value or empty string
 * @throws Error if required and missing in production (unless SKIP_ENV_VALIDATION is set)
 */
function getEnvVar(key: string, isRequired: boolean): string {
  // Check both with and without NEXT_PUBLIC_ prefix
  const value = process.env[key] ?? process.env[`NEXT_PUBLIC_${key}`];

  // Skip validation if SKIP_ENV_VALIDATION is set or during Vercel build
  const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true' || process.env.VERCEL === '1';

  if (!value && isRequired && process.env.NODE_ENV === 'production' && !skipValidation) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Please add it to your .env file or environment.`
    );
  }

  return value ?? '';
}

/**
 * Build the environment object with all variables.
 */
function buildEnv(): Env {
  return {
    // Database
    MONGODB_URI: getEnvVar('MONGODB_URI', true),

    // Session
    SESSION_SECRET: getEnvVar('SESSION_SECRET', true),

    // AI Services (OpenRouter)
    OPENROUTER_API_KEY: getEnvVar('OPENROUTER_API_KEY', true),

    // Vercel Blob Storage
    BLOB_READ_WRITE_TOKEN: getEnvVar('BLOB_READ_WRITE_TOKEN', true),

    // Pusher
    PUSHER_APP_ID: getEnvVar('PUSHER_APP_ID', true),
    PUSHER_KEY: getEnvVar('PUSHER_KEY', false),
    PUSHER_SECRET: getEnvVar('PUSHER_SECRET', true),
    PUSHER_CLUSTER: getEnvVar('PUSHER_CLUSTER', false) || 'us2',
  };
}

/**
 * Validated environment variables.
 *
 * @example
 * import { env } from '@/lib/env';
 *
 * const client = new MongoClient(env.MONGODB_URI);
 */
export const env: Env = buildEnv();

/**
 * Validate all required environment variables.
 * Useful for health checks and startup validation.
 *
 * @returns Object with validation status and list of missing variables
 *
 * @example
 * const { valid, missing } = validateEnv();
 * if (!valid) {
 *   console.error('Missing env vars:', missing);
 * }
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const key of requiredVars) {
    const value = process.env[key] ?? process.env[`NEXT_PUBLIC_${key}`];
    if (!value) {
      missing.push(key);
    }
  }

  return { valid: missing.length === 0, missing };
}

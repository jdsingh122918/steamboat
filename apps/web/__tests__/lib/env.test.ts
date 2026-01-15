import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('server environment variables', () => {
    it('should export MONGODB_URI when set', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const { env } = await import('@/lib/env');

      expect(env.MONGODB_URI).toBe('mongodb://localhost:27017/test');
    });

    it('should export ANTHROPIC_API_KEY when set', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

      const { env } = await import('@/lib/env');

      expect(env.ANTHROPIC_API_KEY).toBe('sk-ant-test-key');
    });

    it('should throw error when MONGODB_URI is missing in production', async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.MONGODB_URI;

      await expect(import('@/lib/env')).rejects.toThrow(/MONGODB_URI/);
    });

    it('should return empty string for missing vars in development', async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      delete process.env.MONGODB_URI;

      const { env } = await import('@/lib/env');

      expect(env.MONGODB_URI).toBe('');
    });
  });

  describe('Cloudinary configuration', () => {
    it('should export all Cloudinary variables', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'my-cloud';
      process.env.CLOUDINARY_API_KEY = '123456789';
      process.env.CLOUDINARY_API_SECRET = 'secret123';

      const { env } = await import('@/lib/env');

      expect(env.CLOUDINARY_CLOUD_NAME).toBe('my-cloud');
      expect(env.CLOUDINARY_API_KEY).toBe('123456789');
      expect(env.CLOUDINARY_API_SECRET).toBe('secret123');
    });
  });

  describe('Pusher configuration', () => {
    it('should export all Pusher variables', async () => {
      process.env.PUSHER_APP_ID = 'app-123';
      process.env.NEXT_PUBLIC_PUSHER_KEY = 'key-456';
      process.env.PUSHER_SECRET = 'secret-789';
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER = 'us2';

      const { env } = await import('@/lib/env');

      expect(env.PUSHER_APP_ID).toBe('app-123');
      expect(env.PUSHER_KEY).toBe('key-456');
      expect(env.PUSHER_SECRET).toBe('secret-789');
      expect(env.PUSHER_CLUSTER).toBe('us2');
    });

    it('should default PUSHER_CLUSTER to us2 if not set', async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      const { env } = await import('@/lib/env');

      expect(env.PUSHER_CLUSTER).toBe('us2');
    });
  });

  describe('type safety', () => {
    it('should provide typed access to environment variables', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

      const { env } = await import('@/lib/env');

      // TypeScript should know this is a string
      const uri: string = env.MONGODB_URI;
      expect(typeof uri).toBe('string');
    });
  });

  describe('validateEnv utility', () => {
    it('should return valid: true when all required vars are set', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost';
      process.env.SESSION_SECRET = 'test-session-secret-at-least-32-chars';
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
      process.env.CLOUDINARY_API_KEY = 'key';
      process.env.CLOUDINARY_API_SECRET = 'secret';
      process.env.PUSHER_APP_ID = 'app';
      process.env.PUSHER_SECRET = 'secret';

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return missing vars when some are not set', async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      delete process.env.MONGODB_URI;
      delete process.env.ANTHROPIC_API_KEY;

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('MONGODB_URI');
      expect(result.missing).toContain('ANTHROPIC_API_KEY');
    });
  });
});

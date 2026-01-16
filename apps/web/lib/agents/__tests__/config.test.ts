import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the OpenRouter client
vi.mock('../openrouter-client', () => ({
  getOpenRouterClient: vi.fn().mockReturnValue({
    createCompletion: vi.fn(),
    execute: vi.fn(),
  }),
}));

import {
  getAgentConfig,
  createAgentClient,
  AgentModel,
  getModelConfig,
} from '../config';

describe('Agent Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAgentConfig', () => {
    it('should return valid config with API key', () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      const config = getAgentConfig();
      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-api-key');
    });

    it('should throw error if API key is missing', () => {
      delete process.env.OPENROUTER_API_KEY;
      expect(() => getAgentConfig()).toThrow('OPENROUTER_API_KEY is not set');
    });

    it('should have default model settings', () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      const config = getAgentConfig();
      expect(config.defaultModel).toBeDefined();
      expect(config.maxRetries).toBeGreaterThan(0);
    });
  });

  describe('createAgentClient', () => {
    it('should create a client instance', () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      const client = createAgentClient();
      expect(client).toBeDefined();
    });

    it('should have createCompletion method', () => {
      process.env.OPENROUTER_API_KEY = 'test-api-key';
      const client = createAgentClient();
      expect(client).toBeDefined();
      expect(client.createCompletion).toBeDefined();
    });
  });

  describe('AgentModel', () => {
    it('should have HAIKU model mapped to OpenRouter format', () => {
      expect(AgentModel.HAIKU).toBeDefined();
      expect(AgentModel.HAIKU).toBe('anthropic/claude-3-haiku');
    });

    it('should have SONNET model mapped to OpenRouter format', () => {
      expect(AgentModel.SONNET).toBeDefined();
      expect(AgentModel.SONNET).toBe('anthropic/claude-3.5-sonnet');
    });

    it('should have OPUS model mapped to OpenRouter format', () => {
      expect(AgentModel.OPUS).toBeDefined();
      // OPUS maps to sonnet in OpenRouter as opus isn't available
      expect(AgentModel.OPUS).toBe('anthropic/claude-3.5-sonnet');
    });
  });

  describe('getModelConfig', () => {
    it('should return config for HAIKU', () => {
      const config = getModelConfig(AgentModel.HAIKU);
      expect(config).toBeDefined();
      expect(config.maxTokens).toBeDefined();
      expect(config.costPer1kInputTokens).toBeDefined();
      expect(config.costPer1kOutputTokens).toBeDefined();
    });

    it('should have lower costs for HAIKU than SONNET', () => {
      const haikuConfig = getModelConfig(AgentModel.HAIKU);
      const sonnetConfig = getModelConfig(AgentModel.SONNET);
      expect(haikuConfig.costPer1kInputTokens).toBeLessThan(sonnetConfig.costPer1kInputTokens);
    });

    it('should have appropriate max tokens for each model', () => {
      const haikuConfig = getModelConfig(AgentModel.HAIKU);
      const sonnetConfig = getModelConfig(AgentModel.SONNET);
      expect(haikuConfig.maxTokens).toBeGreaterThan(0);
      expect(sonnetConfig.maxTokens).toBeGreaterThan(0);
    });

    it('should return defaults for unknown models', () => {
      const config = getModelConfig('unknown/model');
      expect(config).toBeDefined();
      expect(config.name).toBe('unknown/model');
      expect(config.maxTokens).toBe(4096);
    });
  });
});

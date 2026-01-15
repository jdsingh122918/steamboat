import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
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
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      const config = getAgentConfig();
      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-api-key');
    });

    it('should throw error if API key is missing', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => getAgentConfig()).toThrow('ANTHROPIC_API_KEY is not set');
    });

    it('should have default model settings', () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      const config = getAgentConfig();
      expect(config.defaultModel).toBeDefined();
      expect(config.maxRetries).toBeGreaterThan(0);
    });
  });

  describe('createAgentClient', () => {
    it('should create a client instance', () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      const client = createAgentClient();
      expect(client).toBeDefined();
    });

    it('should use API key from config', () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      const client = createAgentClient();
      expect(client).toBeDefined();
    });
  });

  describe('AgentModel', () => {
    it('should have HAIKU model for cost-effective tasks', () => {
      expect(AgentModel.HAIKU).toBeDefined();
      expect(AgentModel.HAIKU).toBe('claude-3-haiku-20240307');
    });

    it('should have SONNET model for balanced tasks', () => {
      expect(AgentModel.SONNET).toBeDefined();
      expect(AgentModel.SONNET).toBe('claude-sonnet-4-20250514');
    });

    it('should have OPUS model for complex tasks', () => {
      expect(AgentModel.OPUS).toBeDefined();
      expect(AgentModel.OPUS).toBe('claude-opus-4-20250514');
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

    it('should have lower costs for HAIKU than OPUS', () => {
      const haikuConfig = getModelConfig(AgentModel.HAIKU);
      const opusConfig = getModelConfig(AgentModel.OPUS);
      expect(haikuConfig.costPer1kInputTokens).toBeLessThan(opusConfig.costPer1kInputTokens);
    });

    it('should have appropriate max tokens for each model', () => {
      const haikuConfig = getModelConfig(AgentModel.HAIKU);
      const sonnetConfig = getModelConfig(AgentModel.SONNET);
      expect(haikuConfig.maxTokens).toBeGreaterThan(0);
      expect(sonnetConfig.maxTokens).toBeGreaterThan(0);
    });
  });
});

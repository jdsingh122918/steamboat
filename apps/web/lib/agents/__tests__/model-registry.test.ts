import { describe, it, expect } from 'vitest';

import {
  MODEL_REGISTRY,
  getModelDefinition,
  getRegisteredModelIds,
  getModelsByProvider,
  getModelsWithCapability,
  getVisionCapableModels,
  getCheapestModel,
  calculateModelCostFromRegistry,
  getDefaultModelForRole,
  getModelsForRole,
  ModelProvider,
} from '../model-registry';

describe('Model Registry', () => {
  describe('MODEL_REGISTRY', () => {
    it('should contain Anthropic models', () => {
      expect(MODEL_REGISTRY['anthropic/claude-3.5-sonnet']).toBeDefined();
      expect(MODEL_REGISTRY['anthropic/claude-3-haiku']).toBeDefined();
    });

    it('should contain OpenAI models', () => {
      expect(MODEL_REGISTRY['openai/gpt-4o']).toBeDefined();
    });

    it('should contain Google models', () => {
      expect(MODEL_REGISTRY['google/gemini-pro-1.5']).toBeDefined();
    });

    it('should contain Meta models', () => {
      expect(MODEL_REGISTRY['meta-llama/llama-3.1-70b-instruct']).toBeDefined();
    });

    it('should contain Mistral models', () => {
      expect(MODEL_REGISTRY['mistralai/mistral-large']).toBeDefined();
    });

    it('should have complete model definitions', () => {
      const model = MODEL_REGISTRY['anthropic/claude-3.5-sonnet'];
      expect(model.id).toBe('anthropic/claude-3.5-sonnet');
      expect(model.name).toBeDefined();
      expect(model.provider).toBe(ModelProvider.ANTHROPIC);
      expect(model.contextWindow).toBeGreaterThan(0);
      expect(model.maxOutputTokens).toBeGreaterThan(0);
      expect(model.capabilities).toBeDefined();
      expect(model.pricing).toBeDefined();
    });
  });

  describe('getModelDefinition', () => {
    it('should return model definition for valid ID', () => {
      const model = getModelDefinition('anthropic/claude-3.5-sonnet');
      expect(model).not.toBeNull();
      expect(model?.name).toBe('Claude 3.5 Sonnet');
    });

    it('should return null for invalid ID', () => {
      const model = getModelDefinition('invalid/model');
      expect(model).toBeNull();
    });
  });

  describe('getRegisteredModelIds', () => {
    it('should return all model IDs', () => {
      const ids = getRegisteredModelIds();
      expect(ids).toContain('anthropic/claude-3.5-sonnet');
      expect(ids).toContain('anthropic/claude-3-haiku');
      expect(ids).toContain('openai/gpt-4o');
    });
  });

  describe('getModelsByProvider', () => {
    it('should return Anthropic models', () => {
      const models = getModelsByProvider(ModelProvider.ANTHROPIC);
      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => expect(m.provider).toBe(ModelProvider.ANTHROPIC));
    });

    it('should return OpenAI models', () => {
      const models = getModelsByProvider(ModelProvider.OPENAI);
      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => expect(m.provider).toBe(ModelProvider.OPENAI));
    });
  });

  describe('getModelsWithCapability', () => {
    it('should return models with vision capability', () => {
      const models = getModelsWithCapability('vision');
      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => expect(m.capabilities.vision).toBe(true));
    });

    it('should return models with function calling', () => {
      const models = getModelsWithCapability('functionCalling');
      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => expect(m.capabilities.functionCalling).toBe(true));
    });
  });

  describe('getVisionCapableModels', () => {
    it('should return only vision-capable models', () => {
      const models = getVisionCapableModels();
      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => expect(m.capabilities.vision).toBe(true));
    });

    it('should include Anthropic and OpenAI vision models', () => {
      const models = getVisionCapableModels();
      const providers = models.map((m) => m.provider);
      expect(providers).toContain(ModelProvider.ANTHROPIC);
      expect(providers).toContain(ModelProvider.OPENAI);
    });
  });

  describe('getCheapestModel', () => {
    it('should return cheapest model for simple tasks', () => {
      const model = getCheapestModel('simple');
      expect(model).toBeDefined();
      expect(model.taskType).toBe('simple');
    });

    it('should return a model for balanced tasks', () => {
      const model = getCheapestModel('balanced');
      expect(model).toBeDefined();
    });
  });

  describe('calculateModelCostFromRegistry', () => {
    it('should calculate cost for known model', () => {
      // Haiku: $0.00025/1k input, $0.00125/1k output
      const cost = calculateModelCostFromRegistry('anthropic/claude-3-haiku', 1000, 1000);
      expect(cost).toBeCloseTo(0.0015, 5);
    });

    it('should calculate cost for Sonnet', () => {
      // Sonnet: $0.003/1k input, $0.015/1k output
      const cost = calculateModelCostFromRegistry('anthropic/claude-3.5-sonnet', 1000, 1000);
      expect(cost).toBeCloseTo(0.018, 5);
    });

    it('should return 0 for unknown model', () => {
      const cost = calculateModelCostFromRegistry('unknown/model', 1000, 1000);
      expect(cost).toBe(0);
    });

    it('should handle zero tokens', () => {
      const cost = calculateModelCostFromRegistry('anthropic/claude-3.5-sonnet', 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('getDefaultModelForRole', () => {
    it('should return default model for receipt_processor', () => {
      const model = getDefaultModelForRole('receipt_processor');
      expect(model).toBe('anthropic/claude-3.5-sonnet');
    });

    it('should return default model for payment_assistant', () => {
      const model = getDefaultModelForRole('payment_assistant');
      expect(model).toBe('anthropic/claude-3-haiku');
    });

    it('should return fallback for unknown role', () => {
      const model = getDefaultModelForRole('unknown_role');
      expect(model).toBe('anthropic/claude-3.5-sonnet');
    });
  });

  describe('getModelsForRole', () => {
    it('should return only vision-capable models for receipt_processor', () => {
      const models = getModelsForRole('receipt_processor');
      expect(models.length).toBeGreaterThan(0);
      models.forEach((m) => expect(m.capabilities.vision).toBe(true));
    });

    it('should return all models for other roles', () => {
      const models = getModelsForRole('payment_assistant');
      const allModelIds = getRegisteredModelIds();
      expect(models.length).toBe(allModelIds.length);
    });
  });
});

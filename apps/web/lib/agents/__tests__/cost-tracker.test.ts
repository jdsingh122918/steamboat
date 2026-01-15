import { describe, it, expect, beforeEach } from 'vitest';

import {
  CostTracker,
  CostEntry,
  CostSummary,
  formatCost,
  calculateModelCost,
} from '../cost-tracker';
import { AgentModel } from '../config';
import { AgentRole } from '../types';

describe('Cost Tracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  describe('recordUsage', () => {
    it('should record a single usage entry', () => {
      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.RECEIPT_PROCESSOR,
        inputTokens: 1000,
        outputTokens: 500,
        tripId: 'trip123',
      });

      const entries = tracker.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].inputTokens).toBe(1000);
      expect(entries[0].outputTokens).toBe(500);
    });

    it('should record multiple usage entries', () => {
      tracker.recordUsage({
        model: AgentModel.HAIKU,
        role: AgentRole.PAYMENT_ASSISTANT,
        inputTokens: 500,
        outputTokens: 200,
        tripId: 'trip123',
      });

      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.EXPENSE_RECONCILER,
        inputTokens: 2000,
        outputTokens: 1000,
        tripId: 'trip123',
      });

      expect(tracker.getEntries()).toHaveLength(2);
    });

    it('should include timestamp in entry', () => {
      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.GALLERY_ORGANIZER,
        inputTokens: 100,
        outputTokens: 50,
        tripId: 'trip123',
      });

      const entry = tracker.getEntries()[0];
      expect(entry.timestamp).toBeDefined();
      expect(new Date(entry.timestamp)).toBeInstanceOf(Date);
    });

    it('should calculate cost for entry', () => {
      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.RECEIPT_PROCESSOR,
        inputTokens: 1000,
        outputTokens: 1000,
        tripId: 'trip123',
      });

      const entry = tracker.getEntries()[0];
      expect(entry.cost).toBeGreaterThan(0);
    });
  });

  describe('getSummary', () => {
    it('should return zero summary when empty', () => {
      const summary = tracker.getSummary();
      expect(summary.totalCost).toBe(0);
      expect(summary.totalInputTokens).toBe(0);
      expect(summary.totalOutputTokens).toBe(0);
      expect(summary.requestCount).toBe(0);
    });

    it('should calculate total tokens correctly', () => {
      tracker.recordUsage({
        model: AgentModel.HAIKU,
        role: AgentRole.RECEIPT_PROCESSOR,
        inputTokens: 1000,
        outputTokens: 500,
        tripId: 'trip123',
      });

      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.PAYMENT_ASSISTANT,
        inputTokens: 2000,
        outputTokens: 1000,
        tripId: 'trip123',
      });

      const summary = tracker.getSummary();
      expect(summary.totalInputTokens).toBe(3000);
      expect(summary.totalOutputTokens).toBe(1500);
      expect(summary.requestCount).toBe(2);
    });

    it('should calculate total cost correctly', () => {
      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.RECEIPT_PROCESSOR,
        inputTokens: 1000,
        outputTokens: 1000,
        tripId: 'trip123',
      });

      const summary = tracker.getSummary();
      // Sonnet: $0.003/1k input + $0.015/1k output
      // 1000 input = $0.003, 1000 output = $0.015, total = $0.018
      expect(summary.totalCost).toBeCloseTo(0.018, 4);
    });

    it('should break down by model', () => {
      tracker.recordUsage({
        model: AgentModel.HAIKU,
        role: AgentRole.RECEIPT_PROCESSOR,
        inputTokens: 1000,
        outputTokens: 500,
        tripId: 'trip123',
      });

      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.PAYMENT_ASSISTANT,
        inputTokens: 2000,
        outputTokens: 1000,
        tripId: 'trip123',
      });

      const summary = tracker.getSummary();
      expect(summary.byModel[AgentModel.HAIKU]).toBeDefined();
      expect(summary.byModel[AgentModel.SONNET]).toBeDefined();
      expect(summary.byModel[AgentModel.HAIKU].requestCount).toBe(1);
      expect(summary.byModel[AgentModel.SONNET].requestCount).toBe(1);
    });

    it('should break down by role', () => {
      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.RECEIPT_PROCESSOR,
        inputTokens: 1000,
        outputTokens: 500,
        tripId: 'trip123',
      });

      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.GALLERY_ORGANIZER,
        inputTokens: 2000,
        outputTokens: 1000,
        tripId: 'trip456',
      });

      const summary = tracker.getSummary();
      expect(summary.byRole[AgentRole.RECEIPT_PROCESSOR]).toBeDefined();
      expect(summary.byRole[AgentRole.GALLERY_ORGANIZER]).toBeDefined();
    });
  });

  describe('getSummaryByTrip', () => {
    it('should filter by trip ID', () => {
      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.RECEIPT_PROCESSOR,
        inputTokens: 1000,
        outputTokens: 500,
        tripId: 'trip123',
      });

      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.PAYMENT_ASSISTANT,
        inputTokens: 2000,
        outputTokens: 1000,
        tripId: 'trip456',
      });

      const summary = tracker.getSummaryByTrip('trip123');
      expect(summary.requestCount).toBe(1);
      expect(summary.totalInputTokens).toBe(1000);
    });
  });

  describe('clearEntries', () => {
    it('should clear all entries', () => {
      tracker.recordUsage({
        model: AgentModel.SONNET,
        role: AgentRole.RECEIPT_PROCESSOR,
        inputTokens: 1000,
        outputTokens: 500,
        tripId: 'trip123',
      });

      tracker.clearEntries();
      expect(tracker.getEntries()).toHaveLength(0);
    });
  });

  describe('formatCost', () => {
    it('should format cost as USD currency', () => {
      expect(formatCost(0.015)).toBe('$0.02');
    });

    it('should format zero cost', () => {
      expect(formatCost(0)).toBe('$0.00');
    });

    it('should format larger costs', () => {
      expect(formatCost(1.5)).toBe('$1.50');
    });

    it('should handle small decimals', () => {
      expect(formatCost(0.001)).toBe('$0.00');
    });
  });

  describe('calculateModelCost', () => {
    it('should calculate HAIKU cost correctly', () => {
      // HAIKU: $0.00025/1k input, $0.00125/1k output
      const cost = calculateModelCost(AgentModel.HAIKU, 1000, 1000);
      expect(cost).toBeCloseTo(0.0015, 5);
    });

    it('should calculate SONNET cost correctly', () => {
      // SONNET: $0.003/1k input, $0.015/1k output
      const cost = calculateModelCost(AgentModel.SONNET, 1000, 1000);
      expect(cost).toBeCloseTo(0.018, 5);
    });

    it('should calculate OPUS cost correctly', () => {
      // OPUS: $0.015/1k input, $0.075/1k output
      const cost = calculateModelCost(AgentModel.OPUS, 1000, 1000);
      expect(cost).toBeCloseTo(0.09, 5);
    });

    it('should handle zero tokens', () => {
      const cost = calculateModelCost(AgentModel.SONNET, 0, 0);
      expect(cost).toBe(0);
    });
  });
});

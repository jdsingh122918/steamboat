/**
 * Cost Tracker
 *
 * Tracks AI agent usage and costs for metering and analytics.
 * Provides summaries by model, role, and trip.
 * Uses dynamic pricing lookup from model registry.
 */

import { calculateModelCostFromRegistry } from './model-registry';
import { AgentRoleType } from './types';

export interface CostEntry {
  id: string;
  /** Model ID in OpenRouter format (e.g., 'anthropic/claude-3.5-sonnet') */
  model: string;
  role: AgentRoleType;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  tripId: string;
  timestamp: string;
}

export interface UsageInput {
  /** Model ID in OpenRouter format */
  model: string;
  role: AgentRoleType;
  inputTokens: number;
  outputTokens: number;
  tripId: string;
}

export interface ModelSummary {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  requestCount: number;
}

export interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  byModel: Record<string, ModelSummary>;
  byRole: Record<string, ModelSummary>;
}

/**
 * Calculate cost for a given model and token counts
 * Uses dynamic pricing from model registry
 */
export function calculateModelCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  return calculateModelCostFromRegistry(model, inputTokens, outputTokens);
}

/**
 * Format cost as USD currency string
 */
export function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cost);
}

/**
 * Cost tracker for monitoring AI agent usage
 */
export class CostTracker {
  private entries: CostEntry[] = [];
  private idCounter = 0;

  /**
   * Record a usage entry
   */
  recordUsage(input: UsageInput): CostEntry {
    const cost = calculateModelCost(input.model, input.inputTokens, input.outputTokens);

    const entry: CostEntry = {
      id: `entry_${++this.idCounter}`,
      model: input.model,
      role: input.role,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cost,
      tripId: input.tripId,
      timestamp: new Date().toISOString(),
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Get all recorded entries
   */
  getEntries(): CostEntry[] {
    return [...this.entries];
  }

  /**
   * Get summary of all usage
   */
  getSummary(): CostSummary {
    return this.calculateSummary(this.entries);
  }

  /**
   * Get summary filtered by trip ID
   */
  getSummaryByTrip(tripId: string): CostSummary {
    const filtered = this.entries.filter((e) => e.tripId === tripId);
    return this.calculateSummary(filtered);
  }

  /**
   * Clear all entries
   */
  clearEntries(): void {
    this.entries = [];
  }

  /**
   * Calculate summary from a list of entries
   */
  private calculateSummary(entries: CostEntry[]): CostSummary {
    const summary: CostSummary = {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      requestCount: entries.length,
      byModel: {},
      byRole: {},
    };

    for (const entry of entries) {
      // Add to totals
      summary.totalCost += entry.cost;
      summary.totalInputTokens += entry.inputTokens;
      summary.totalOutputTokens += entry.outputTokens;

      // Add to model breakdown
      if (!summary.byModel[entry.model]) {
        summary.byModel[entry.model] = {
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          requestCount: 0,
        };
      }
      summary.byModel[entry.model].inputTokens += entry.inputTokens;
      summary.byModel[entry.model].outputTokens += entry.outputTokens;
      summary.byModel[entry.model].cost += entry.cost;
      summary.byModel[entry.model].requestCount++;

      // Add to role breakdown
      if (!summary.byRole[entry.role]) {
        summary.byRole[entry.role] = {
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          requestCount: 0,
        };
      }
      summary.byRole[entry.role].inputTokens += entry.inputTokens;
      summary.byRole[entry.role].outputTokens += entry.outputTokens;
      summary.byRole[entry.role].cost += entry.cost;
      summary.byRole[entry.role].requestCount++;
    }

    return summary;
  }
}

// Singleton instance for global tracking
let globalTracker: CostTracker | null = null;

/**
 * Get the global cost tracker instance
 */
export function getGlobalCostTracker(): CostTracker {
  if (!globalTracker) {
    globalTracker = new CostTracker();
  }
  return globalTracker;
}

/**
 * Reset the global cost tracker (for testing)
 */
export function resetGlobalCostTracker(): void {
  globalTracker = null;
}

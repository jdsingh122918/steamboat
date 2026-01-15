/**
 * Finance Core WASM Wrapper
 *
 * Provides TypeScript-safe access to the finance-core WASM module
 * for expense splitting and balance calculations.
 *
 * This module is loaded eagerly as it's critical for the Finances page.
 */

import type { Expense, ShareResult, BalanceSummary, LoadingState } from './types';

type FinanceCoreWasm = typeof import('finance-core');

let wasmModule: FinanceCoreWasm | null = null;
let loadPromise: Promise<void> | null = null;
let loadingState: LoadingState = 'idle';

/**
 * Get the current loading state.
 */
export function getLoadingState(): LoadingState {
  return loadingState;
}

/**
 * Check if the module is loaded and ready.
 */
export function isLoaded(): boolean {
  return loadingState === 'loaded' && wasmModule !== null;
}

/**
 * Load the finance core WASM module.
 */
export async function load(): Promise<void> {
  if (loadingState === 'loaded' && wasmModule !== null) {
    return;
  }

  if (loadPromise !== null) {
    return loadPromise;
  }

  if (typeof window === 'undefined') {
    throw new Error('Finance core can only be loaded in browser environment');
  }

  loadingState = 'loading';

  loadPromise = (async () => {
    try {
      const wasm = (await import('finance-core')) as FinanceCoreWasm;
      await wasm.default();
      wasmModule = wasm;
      loadingState = 'loaded';
    } catch (error) {
      loadingState = 'error';
      loadPromise = null;
      throw error instanceof Error ? error : new Error(String(error));
    }
  })();

  return loadPromise;
}

/**
 * Split an expense among participants.
 *
 * @param expense - The expense to split
 * @returns ShareResult with per-person amounts
 */
export async function splitExpense(expense: Expense): Promise<ShareResult> {
  await load();

  if (!wasmModule) {
    throw new Error('WASM module not available');
  }

  const result = wasmModule.split_expense(expense);
  return result as ShareResult;
}

/**
 * Calculate balances for all participants.
 *
 * @param expenses - Array of all expenses
 * @returns Array of balance summaries for each participant
 */
export async function calculateAllBalances(
  expenses: Expense[]
): Promise<BalanceSummary[]> {
  await load();

  if (!wasmModule) {
    throw new Error('WASM module not available');
  }

  const result = wasmModule.calculate_all_balances(expenses);
  return result as BalanceSummary[];
}

/**
 * Reset the module state (for testing purposes only).
 * @internal
 */
export function __resetForTesting(): void {
  wasmModule = null;
  loadPromise = null;
  loadingState = 'idle';
}

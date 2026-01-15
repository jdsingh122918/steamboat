/**
 * Expense Optimizer WASM Wrapper
 *
 * Provides TypeScript-safe access to the expense-optimizer WASM module
 * for debt simplification calculations.
 *
 * This module is loaded eagerly as it's critical for the Finances page.
 */

import type { Debt, SimplificationResult, LoadingState } from './types';

type ExpenseOptimizerWasm = typeof import('expense-optimizer');

let wasmModule: ExpenseOptimizerWasm | null = null;
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
 * Load the expense optimizer WASM module.
 */
export async function load(): Promise<void> {
  if (loadingState === 'loaded' && wasmModule !== null) {
    return;
  }

  if (loadPromise !== null) {
    return loadPromise;
  }

  if (typeof window === 'undefined') {
    throw new Error(
      'Expense optimizer can only be loaded in browser environment'
    );
  }

  loadingState = 'loading';

  loadPromise = (async () => {
    try {
      const wasm = (await import('expense-optimizer')) as ExpenseOptimizerWasm;
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
 * Optimize debt settlements using the WASM module.
 *
 * @param debts - Array of debt relationships
 * @returns Simplified payments with savings statistics
 */
export async function optimizeSettlements(
  debts: Debt[]
): Promise<SimplificationResult> {
  await load();

  if (!wasmModule) {
    throw new Error('WASM module not available');
  }

  const result = wasmModule.optimize_settlements(debts);
  return result as SimplificationResult;
}

/**
 * Validate that all debts have positive amounts.
 *
 * @param debts - Array of debt relationships
 * @returns true if all debts are valid
 */
export async function validateDebts(debts: Debt[]): Promise<boolean> {
  await load();

  if (!wasmModule) {
    // Fallback validation if WASM not available
    return debts.every((d) => d.amount_cents > 0);
  }

  return wasmModule.validate_debts(debts);
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

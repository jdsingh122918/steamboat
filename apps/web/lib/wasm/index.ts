/**
 * WASM Module Registry
 *
 * Central export point for all WASM module wrappers.
 * Provides initialization and status utilities.
 */

import {
  load as loadExpenseOptimizer,
  isLoaded as isExpenseOptimizerLoaded,
} from './expense-optimizer';
import {
  load as loadFinanceCore,
  isLoaded as isFinanceCoreLoaded,
} from './finance-core';
import {
  preload as preloadMediaProcessor,
  isLoaded as isMediaProcessorLoaded,
} from './media-processor';

export type WasmInitStatus = {
  expenseOptimizer: boolean;
  financeCore: boolean;
  mediaProcessor: boolean;
};

/**
 * Initialize critical WASM modules (expense-optimizer and finance-core).
 * Call this from the root layout or app initialization.
 */
export async function initializeCriticalWasm(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Load critical modules in parallel
  await Promise.all([
    loadExpenseOptimizer().catch((err) => {
      console.error('Failed to load expense-optimizer:', err);
    }),
    loadFinanceCore().catch((err) => {
      console.error('Failed to load finance-core:', err);
    }),
  ]);

  console.log('[WASM] Critical modules loaded');
}

/**
 * Get the current initialization status of all WASM modules.
 */
export function getWasmStatus(): WasmInitStatus {
  return {
    expenseOptimizer: isExpenseOptimizerLoaded(),
    financeCore: isFinanceCoreLoaded(),
    mediaProcessor: isMediaProcessorLoaded(),
  };
}

/**
 * Preload media processor (call on Gallery hover for better UX).
 */
export { preloadMediaProcessor };

// Re-export specific functions from expense-optimizer
export {
  optimizeSettlements,
  validateDebts,
  load as loadExpenseOptimizerModule,
  isLoaded as isExpenseOptimizerModuleLoaded,
  getLoadingState as getExpenseOptimizerLoadingState,
  __resetForTesting as __resetExpenseOptimizerForTesting,
} from './expense-optimizer';

// Re-export specific functions from finance-core
export {
  splitExpense,
  calculateAllBalances,
  load as loadFinanceCoreModule,
  isLoaded as isFinanceCoreModuleLoaded,
  getLoadingState as getFinanceCoreLoadingState,
  __resetForTesting as __resetFinanceCoreForTesting,
} from './finance-core';

// Re-export from media-processor and types
export * from './media-processor';
export * from './types';

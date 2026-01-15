// Mock for expense-optimizer WASM module
export default async function init(): Promise<void> {
  // No-op initialization
}

export function init_wasm(): void {
  // No-op
}

export function optimize_settlements(_debts: unknown): unknown {
  // Default mock - tests will override this
  return {
    original_count: 0,
    optimized_count: 0,
    payments: [],
    savings_percent: 0,
  };
}

export function validate_debts(_debts: unknown): boolean {
  return true;
}

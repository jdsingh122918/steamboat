// Mock for finance-core WASM module
export default async function init(): Promise<void> {
  // No-op initialization
}

export function init_wasm(): void {
  // No-op
}

export function split_expense(expense: unknown): unknown {
  return {
    per_person_cents: 0,
    shares: [],
    remainder_cents: 0,
  };
}

export function calculate_all_balances(expenses: unknown): unknown {
  return [];
}

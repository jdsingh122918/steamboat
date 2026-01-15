// Type declarations for wasm-pack generated modules

declare module 'expense-optimizer' {
  export function init(): void;
  export function optimize_settlements(debts: unknown): unknown;
  export function validate_debts(debts: unknown): boolean;
  export default function init_wasm(): Promise<void>;
}

declare module 'finance-core' {
  export function init(): void;
  export function split_expense(expense: unknown): unknown;
  export function calculate_all_balances(expenses: unknown): unknown;
  export default function init_wasm(): Promise<void>;
}

declare module 'media-processor' {
  export function init(): void;
  export function process_image_wasm(
    data: Uint8Array,
    max_dim: number,
    quality: number
  ): unknown;
  export function extract_exif_wasm(data: Uint8Array): unknown;
  export function generate_thumbnail_wasm(
    data: Uint8Array,
    size: number,
    crop: boolean
  ): unknown;
  export function compute_hashes_wasm(data: Uint8Array): unknown;
  export default function init_wasm(): Promise<void>;
}

/**
 * TypeScript interfaces matching Rust WASM module types.
 * These types correspond to the structures defined in:
 * - crates/expense-optimizer/src/types.rs
 * - crates/finance-core/src/types.rs
 * - crates/media-processor/src/*.rs
 */

// ============================================================================
// Expense Optimizer Types
// ============================================================================

/** Debt relationship: debtor owes creditor the amount */
export interface Debt {
  debtor: string;
  creditor: string;
  amount_cents: number;
  expense_ids: string[];
}

/** Payment instruction after debt simplification */
export interface Payment {
  from: string;
  to: string;
  amount_cents: number;
  reason: string;
}

/** Result of debt simplification algorithm */
export interface SimplificationResult {
  original_count: number;
  optimized_count: number;
  payments: Payment[];
  savings_percent: number;
}

// ============================================================================
// Finance Core Types
// ============================================================================

/** Expense with opt-in participants */
export interface Expense {
  id: string;
  payer_id: string;
  amount_cents: number;
  participants: string[];
  category: string;
  description: string;
}

/** Per-person share after expense splitting */
export interface PersonShare {
  attendee_id: string;
  share_cents: number;
  extra_cent: boolean;
}

/** Result of expense splitting */
export interface ShareResult {
  per_person_cents: number;
  shares: PersonShare[];
  remainder_cents: number;
}

/** Balance summary for an attendee across all expenses */
export interface BalanceSummary {
  attendee_id: string;
  total_paid_cents: number;
  total_owed_cents: number;
  net_balance_cents: number;
}

// ============================================================================
// Media Processor Types
// ============================================================================

/** Result of image processing (resize operation) */
export interface ProcessResult {
  /** Raw JPEG-encoded image data */
  data: Uint8Array;
}

/** EXIF metadata extracted from an image */
export interface ExifData {
  /** Date and time photo was taken (e.g., "2024-01-15 14:30:00") */
  date_taken?: string;
  /** Camera manufacturer (e.g., "Canon", "Apple") */
  camera_make?: string;
  /** Camera model (e.g., "iPhone 15 Pro") */
  camera_model?: string;
  /** GPS latitude in decimal degrees (+ = North, - = South) */
  gps_latitude?: number;
  /** GPS longitude in decimal degrees (+ = East, - = West) */
  gps_longitude?: number;
  /** EXIF orientation value (1-8) */
  orientation?: number;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

/** Result of generating a single thumbnail */
export interface ThumbnailResult {
  /** Raw JPEG-encoded thumbnail data */
  data: Uint8Array;
  /** Width of thumbnail in pixels */
  width: number;
  /** Height of thumbnail in pixels */
  height: number;
  /** Size of thumbnail data in bytes */
  size_bytes: number;
}

/** Result of computing content hashes */
export interface HashResult {
  /** SHA-256 hash as 64-character hex string */
  sha256: string;
  /** Perceptual hash as 16-character hex string */
  perceptual: string;
}

// ============================================================================
// WASM Module State Types
// ============================================================================

/** Loading state for a WASM module */
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/** Error types that can occur during WASM operations */
export type MediaProcessorError =
  | { type: 'not_loaded'; message: string }
  | { type: 'decode_error'; message: string }
  | { type: 'encode_error'; message: string }
  | { type: 'invalid_image'; message: string }
  | { type: 'wasm_error'; message: string };

// ============================================================================
// MCP Types
// ============================================================================

/** Payment platform for payment link generation */
export type PaymentPlatform = 'venmo' | 'paypal' | 'cashapp' | 'zelle';

/** Request for generating a payment link */
export interface PaymentLinkRequest {
  platform: PaymentPlatform;
  recipient: string;
  amount_cents: number;
  memo: string;
}

/** Result of payment link generation */
export interface PaymentLinkResult {
  platform: PaymentPlatform;
  /** Deep link URL (null for platforms like Zelle that don't support it) */
  link: string | null;
  /** Fallback text for manual payment */
  fallback_text: string;
}

/** MCP request structure */
export interface McpRequest {
  method: string;
  params: string;
}

/** MCP response structure */
export interface McpResponse {
  success: boolean;
  result: string | null;
  error: string | null;
}

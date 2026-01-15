import { NextRequest, NextResponse } from 'next/server';
import type { Debt, SimplificationResult } from '@/lib/wasm/types';

// Note: Edge runtime is configured in vercel.json
// For local testing, we use Node.js runtime

// Types for request/response
interface OptimizeRequest {
  debts: Debt[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    duration_ms: number;
  };
}

// WASM module reference - lazy loaded
let wasmModule: typeof import('expense-optimizer') | null = null;

/**
 * Load the expense-optimizer WASM module.
 */
async function loadWasm() {
  if (wasmModule) return wasmModule;

  try {
    const wasm = await import('expense-optimizer');
    await wasm.default();
    wasmModule = wasm;
    return wasm;
  } catch (error) {
    throw new Error(
      `Failed to load WASM: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate a single debt object.
 */
function isValidDebt(debt: unknown): debt is Debt {
  if (typeof debt !== 'object' || debt === null) return false;

  const d = debt as Record<string, unknown>;
  return (
    typeof d.debtor === 'string' &&
    typeof d.creditor === 'string' &&
    typeof d.amount_cents === 'number' &&
    Array.isArray(d.expense_ids)
  );
}

/**
 * POST /api/mcp/expense-optimizer
 *
 * Optimize debt settlements using the expense-optimizer WASM module.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<SimplificationResult>>> {
  const startTime = performance.now();

  try {
    // Parse request body
    const body = (await request.json()) as OptimizeRequest;

    // Validate debts array exists
    if (!body.debts || !Array.isArray(body.debts)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: debts array required',
        },
        { status: 400 }
      );
    }

    // Validate each debt structure
    for (const debt of body.debts) {
      if (!isValidDebt(debt)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid debt structure: each debt must have debtor, creditor, amount_cents, and expense_ids',
          },
          { status: 400 }
        );
      }

      // Validate positive amount
      if (debt.amount_cents <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid debt: amount_cents must be positive',
          },
          { status: 400 }
        );
      }
    }

    // Load and call WASM module
    const wasm = await loadWasm();
    const result = wasm.optimize_settlements(body.debts) as SimplificationResult;

    const duration = performance.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        duration_ms: Math.round(duration * 100) / 100,
      },
    });
  } catch (error) {
    const duration = performance.now() - startTime;

    console.error('expense-optimizer error:', error);

    return NextResponse.json(
      {
        success: false,
        error: `WASM execution failed: ${error instanceof Error ? error.message : String(error)}`,
        meta: {
          duration_ms: Math.round(duration * 100) / 100,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mcp/expense-optimizer
 *
 * Health check endpoint.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'expense-optimizer-mcp',
    status: 'healthy',
    methods: ['optimize_settlements'],
  });
}

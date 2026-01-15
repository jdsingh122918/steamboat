/**
 * Settlements API routes - /api/trips/[tripId]/balances/settlements
 *
 * GET: Get optimized settlement plan using WASM optimizer
 * POST: Execute all settlements (creates payment records, marks expenses as settled)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import { getExpensesByTrip, updateExpense } from '@/lib/db/operations/expenses';
import { getPaymentsByTrip, createPayment } from '@/lib/db/operations/payments';
import { getAttendeesByTrip } from '@/lib/db/operations/attendees';
import { optimize_settlements } from 'expense-optimizer';
import type { SimplificationResult } from '@/lib/wasm/types';

/**
 * API response interface
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Debt representation for the WASM optimizer
 */
interface Debt {
  debtor: string;
  creditor: string;
  amount_cents: number;
  expense_ids: string[];
}

/**
 * Settlement with attendee names for UX
 */
interface Settlement {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount_cents: number;
}

/**
 * GET response data
 */
interface SettlementPlan {
  settlements: Settlement[];
  original_count: number;
  optimized_count: number;
  savings_percent: number;
}

/**
 * POST response data
 */
interface ExecuteSettlementResult {
  paymentsCreated: number;
  expensesSettled: number;
}

/**
 * Validate that a string is a valid MongoDB ObjectId
 */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Route params type for Next.js 15
 */
type RouteParams = { params: Promise<{ tripId: string }> };

/**
 * Calculate individual debts from expenses and payments.
 * Returns a list of debts representing who owes whom and how much.
 */
async function calculateDebts(tripId: ObjectId): Promise<{
  debts: Debt[];
  pendingExpenseIds: ObjectId[];
}> {
  const debts: Debt[] = [];
  const pendingExpenseIds: ObjectId[] = [];

  // Get all expenses for the trip
  const { data: expenses } = await getExpensesByTrip(tripId, { limit: 10000 });

  // Get all payments for the trip
  const payments = await getPaymentsByTrip(tripId);

  // Track net balance for each pair (debtor -> creditor)
  const pairBalances = new Map<string, { amount_cents: number; expense_ids: string[] }>();

  // Process expenses
  for (const expense of expenses) {
    // Skip deleted or already settled expenses
    if (expense.deletedAt) continue;
    if (expense.status === 'settled') continue;

    pendingExpenseIds.push(expense._id);

    const payerId = expense.payerId.toString();
    const amountCents = expense.amount_cents;

    // Get opted-in participants
    const optedInParticipants = expense.participants.filter((p) => p.optedIn);

    if (optedInParticipants.length === 0) continue;

    // Calculate shares
    for (const participant of optedInParticipants) {
      const participantId = participant.attendeeId.toString();

      // Skip if payer is the only participant
      if (participantId === payerId && optedInParticipants.length === 1) continue;

      let shareCents: number;
      if (participant.share_cents !== undefined && participant.share_cents !== null) {
        shareCents = participant.share_cents;
      } else {
        shareCents = Math.floor(amountCents / optedInParticipants.length);
      }

      // Skip if participant is the payer (they don't owe themselves)
      if (participantId === payerId) continue;

      // Participant owes payer their share
      const pairKey = `${participantId}:${payerId}`;
      const existing = pairBalances.get(pairKey) || { amount_cents: 0, expense_ids: [] };
      existing.amount_cents += shareCents;
      existing.expense_ids.push(expense._id.toString());
      pairBalances.set(pairKey, existing);
    }
  }

  // Process existing payments (reduce debts)
  for (const payment of payments) {
    if (payment.deletedAt) continue;

    const fromId = payment.fromId.toString();
    const toId = payment.toId.toString();

    // Payment from A to B reduces A's debt to B
    const pairKey = `${fromId}:${toId}`;
    const existing = pairBalances.get(pairKey);
    if (existing) {
      existing.amount_cents -= payment.amount_cents;
      if (existing.amount_cents <= 0) {
        pairBalances.delete(pairKey);
        // If overpaid, create reverse debt
        if (existing.amount_cents < 0) {
          const reversePairKey = `${toId}:${fromId}`;
          const reverseExisting = pairBalances.get(reversePairKey) || {
            amount_cents: 0,
            expense_ids: [],
          };
          reverseExisting.amount_cents += Math.abs(existing.amount_cents);
          pairBalances.set(reversePairKey, reverseExisting);
        }
      } else {
        pairBalances.set(pairKey, existing);
      }
    }
  }

  // Convert pair balances to debts
  for (const [pairKey, data] of pairBalances) {
    if (data.amount_cents <= 0) continue;

    const [debtor, creditor] = pairKey.split(':');
    debts.push({
      debtor,
      creditor,
      amount_cents: data.amount_cents,
      expense_ids: data.expense_ids,
    });
  }

  return { debts, pendingExpenseIds };
}

/**
 * GET /api/trips/[tripId]/balances/settlements
 * Get optimized settlement plan
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<SettlementPlan>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Require trip access
    await requireTripAccess(tripId);

    const tripObjectId = new ObjectId(tripId);

    // Get attendees for name lookup
    const attendees = await getAttendeesByTrip(tripObjectId);
    const attendeeMap = new Map(
      attendees.map((a) => [a._id.toString(), a.name])
    );

    // Calculate debts
    const { debts } = await calculateDebts(tripObjectId);

    // If no debts, return empty settlements
    if (debts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            settlements: [],
            original_count: 0,
            optimized_count: 0,
            savings_percent: 0,
          },
        },
        { status: 200 }
      );
    }

    // Use WASM optimizer to minimize transactions
    let result: SimplificationResult;
    try {
      result = optimize_settlements(debts) as SimplificationResult;
    } catch (wasmError) {
      console.error('WASM optimizer error:', wasmError);
      return NextResponse.json(
        { success: false, error: 'WASM optimization failed' },
        { status: 500 }
      );
    }

    // Build settlements with names
    const settlements: Settlement[] = result.payments.map((payment) => ({
      from: payment.from,
      fromName: attendeeMap.get(payment.from) || 'Unknown',
      to: payment.to,
      toName: attendeeMap.get(payment.to) || 'Unknown',
      amount_cents: payment.amount_cents,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          settlements,
          original_count: result.original_count,
          optimized_count: result.optimized_count,
          savings_percent: result.savings_percent,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error) {
      if (
        error.message === 'NEXT_REDIRECT' ||
        error.message === 'Unauthorized'
      ) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }

    console.error('GET /api/trips/[tripId]/balances/settlements error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips/[tripId]/balances/settlements
 * Execute all settlements (requires admin)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ExecuteSettlementResult>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Require admin access
    await requireAdmin(tripId);

    const tripObjectId = new ObjectId(tripId);

    // Calculate debts and get pending expense IDs
    const { debts, pendingExpenseIds } = await calculateDebts(tripObjectId);

    // If no debts, nothing to settle
    if (debts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            paymentsCreated: 0,
            expensesSettled: 0,
          },
        },
        { status: 200 }
      );
    }

    // Use WASM optimizer to minimize transactions
    let result: SimplificationResult;
    try {
      result = optimize_settlements(debts) as SimplificationResult;
    } catch (wasmError) {
      console.error('WASM optimizer error:', wasmError);
      return NextResponse.json(
        { success: false, error: 'WASM optimization failed' },
        { status: 500 }
      );
    }

    // Create payment records for each optimized settlement
    let paymentsCreated = 0;
    for (const payment of result.payments) {
      await createPayment({
        tripId: tripObjectId,
        fromId: new ObjectId(payment.from),
        toId: new ObjectId(payment.to),
        amount_cents: payment.amount_cents,
        status: 'pending',
        method: 'other',
      });
      paymentsCreated++;
    }

    // Mark all pending expenses as settled
    let expensesSettled = 0;
    for (const expenseId of pendingExpenseIds) {
      await updateExpense(expenseId, { status: 'settled' });
      expensesSettled++;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentsCreated,
          expensesSettled,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error) {
      if (
        error.message === 'NEXT_REDIRECT' ||
        error.message === 'Unauthorized'
      ) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }

    console.error('POST /api/trips/[tripId]/balances/settlements error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

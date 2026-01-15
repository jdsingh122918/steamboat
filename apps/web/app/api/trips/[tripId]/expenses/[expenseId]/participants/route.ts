/**
 * Expense Participants API Routes
 *
 * POST /api/trips/[tripId]/expenses/[expenseId]/participants - Opt into an expense (self only)
 * DELETE /api/trips/[tripId]/expenses/[expenseId]/participants - Opt out of an expense (self only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import {
  getExpenseById,
  optIntoExpense,
  optOutOfExpense,
  updateExpense,
} from '@/lib/db/operations/expenses';
import { type Expense } from '@/lib/db/models';

/**
 * Standard API response interface.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate MongoDB ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

/**
 * Serialize an expense for JSON response.
 */
function serializeExpense(expense: Expense): Record<string, unknown> {
  return {
    ...expense,
    _id: expense._id.toString(),
    tripId: expense.tripId.toString(),
    payerId: expense.payerId.toString(),
    participants: expense.participants.map((p) => ({
      ...p,
      attendeeId: p.attendeeId.toString(),
    })),
    linkedActivityId: expense.linkedActivityId?.toString(),
  };
}

/**
 * Recalculate equal shares for opted-in participants.
 */
function recalculateShares(
  amount_cents: number,
  participants: Expense['participants']
): Expense['participants'] {
  const optedInParticipants = participants.filter((p) => p.optedIn);
  const count = optedInParticipants.length;

  if (count === 0) {
    // No one opted in, set all shares to 0
    return participants.map((p) => ({ ...p, share_cents: 0 }));
  }

  const baseShare = Math.floor(amount_cents / count);
  const remainder = amount_cents % count;

  let optedInIndex = 0;
  return participants.map((p) => {
    if (p.optedIn) {
      const share = baseShare + (optedInIndex < remainder ? 1 : 0);
      optedInIndex++;
      return { ...p, share_cents: share };
    }
    return { ...p, share_cents: 0 };
  });
}

/**
 * POST /api/trips/[tripId]/expenses/[expenseId]/participants
 *
 * Opt the current user into an expense.
 * Only the user themselves can opt in.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; expenseId: string }> }
): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  try {
    const { tripId, expenseId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Validate expenseId format
    if (!isValidObjectId(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expenseId format' },
        { status: 400 }
      );
    }

    // Verify trip access
    let attendee;
    try {
      const result = await requireTripAccess(tripId);
      attendee = result.attendee;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    // Get the expense
    const expense = await getExpenseById(new ObjectId(expenseId));

    if (!expense || expense.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check if expense is settled
    if (expense.status === 'settled') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify participants of a settled expense' },
        { status: 400 }
      );
    }

    // Check if user is already opted in
    const existingParticipant = expense.participants.find((p) => {
      const attendeeIdStr =
        p.attendeeId instanceof ObjectId
          ? p.attendeeId.toString()
          : String(p.attendeeId);
      return attendeeIdStr === attendee._id.toString();
    });

    if (existingParticipant && existingParticipant.optedIn) {
      return NextResponse.json(
        { success: false, error: 'You are already opted into this expense' },
        { status: 400 }
      );
    }

    // Opt into the expense
    let updatedExpense = await optIntoExpense(
      new ObjectId(expenseId),
      attendee._id as ObjectId
    );

    if (!updatedExpense) {
      return NextResponse.json(
        { success: false, error: 'Failed to opt into expense' },
        { status: 500 }
      );
    }

    // Recalculate shares
    const newParticipants = recalculateShares(
      updatedExpense.amount_cents,
      updatedExpense.participants
    );

    updatedExpense = await updateExpense(new ObjectId(expenseId), {
      participants: newParticipants,
    });

    if (!updatedExpense) {
      return NextResponse.json(
        { success: false, error: 'Failed to recalculate shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeExpense(updatedExpense),
    });
  } catch (error) {
    console.error('POST /api/trips/[tripId]/expenses/[expenseId]/participants error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to opt into expense' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[tripId]/expenses/[expenseId]/participants
 *
 * Opt the current user out of an expense.
 * Only the user themselves can opt out.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; expenseId: string }> }
): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  try {
    const { tripId, expenseId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Validate expenseId format
    if (!isValidObjectId(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expenseId format' },
        { status: 400 }
      );
    }

    // Verify trip access
    let attendee;
    try {
      const result = await requireTripAccess(tripId);
      attendee = result.attendee;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    // Get the expense
    const expense = await getExpenseById(new ObjectId(expenseId));

    if (!expense || expense.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check if expense is settled
    if (expense.status === 'settled') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify participants of a settled expense' },
        { status: 400 }
      );
    }

    // Check if user is a participant
    const existingParticipant = expense.participants.find((p) => {
      const attendeeIdStr =
        p.attendeeId instanceof ObjectId
          ? p.attendeeId.toString()
          : String(p.attendeeId);
      return attendeeIdStr === attendee._id.toString();
    });

    if (!existingParticipant) {
      return NextResponse.json(
        { success: false, error: 'You are not a participant of this expense' },
        { status: 400 }
      );
    }

    if (!existingParticipant.optedIn) {
      return NextResponse.json(
        { success: false, error: 'You are not opted into this expense' },
        { status: 400 }
      );
    }

    // Opt out of the expense
    let updatedExpense = await optOutOfExpense(
      new ObjectId(expenseId),
      attendee._id as ObjectId
    );

    if (!updatedExpense) {
      return NextResponse.json(
        { success: false, error: 'Failed to opt out of expense' },
        { status: 500 }
      );
    }

    // Recalculate shares
    const newParticipants = recalculateShares(
      updatedExpense.amount_cents,
      updatedExpense.participants
    );

    updatedExpense = await updateExpense(new ObjectId(expenseId), {
      participants: newParticipants,
    });

    if (!updatedExpense) {
      return NextResponse.json(
        { success: false, error: 'Failed to recalculate shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeExpense(updatedExpense),
    });
  } catch (error) {
    console.error('DELETE /api/trips/[tripId]/expenses/[expenseId]/participants error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to opt out of expense' },
      { status: 500 }
    );
  }
}

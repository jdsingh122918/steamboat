/**
 * Single Expense API Routes
 *
 * GET /api/trips/[tripId]/expenses/[expenseId] - Get a single expense
 * PUT /api/trips/[tripId]/expenses/[expenseId] - Update an expense
 * DELETE /api/trips/[tripId]/expenses/[expenseId] - Soft delete an expense
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import {
  getExpenseById,
  updateExpense,
  deleteExpense,
} from '@/lib/db/operations/expenses';
import { ExpenseCategories, type Expense } from '@/lib/db/models';
import { triggerTripEvent } from '@/lib/pusher-server';
import { PusherEventType } from '@/lib/pusher';

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
  const serialized: Record<string, unknown> = {
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

  // Serialize dispute if present
  if ((expense as any).dispute) {
    serialized.dispute = {
      ...(expense as any).dispute,
      filedBy: (expense as any).dispute.filedBy.toString(),
      resolvedBy: (expense as any).dispute.resolvedBy?.toString(),
    };
  }

  return serialized;
}

/**
 * Calculate equal shares for participants.
 */
function calculateEqualShares(
  amount_cents: number,
  participantIds: ObjectId[]
): Array<{ attendeeId: ObjectId; optedIn: boolean; share_cents: number }> {
  const count = participantIds.length;
  if (count === 0) return [];

  const baseShare = Math.floor(amount_cents / count);
  const remainder = amount_cents % count;

  return participantIds.map((id, index) => ({
    attendeeId: id,
    optedIn: true,
    share_cents: baseShare + (index < remainder ? 1 : 0),
  }));
}

/**
 * GET /api/trips/[tripId]/expenses/[expenseId]
 *
 * Get a single expense with participant details.
 */
export async function GET(
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
    try {
      await requireTripAccess(tripId);
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

    return NextResponse.json({
      success: true,
      data: serializeExpense(expense),
    });
  } catch (error) {
    console.error('GET /api/trips/[tripId]/expenses/[expenseId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trips/[tripId]/expenses/[expenseId]
 *
 * Update an expense.
 * Only the creator or admin can update.
 * Cannot update settled expenses.
 */
export async function PUT(
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
        { success: false, error: 'Cannot modify a settled expense' },
        { status: 400 }
      );
    }

    // Check if user is the payer (creator) or admin
    const isCreator = expense.payerId.toString() === attendee._id.toString();
    const isAdmin = attendee.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the creator or admin can update this expense' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Validate and add description
    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || body.description.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'description must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.description = body.description.trim();
    }

    // Validate and add amount_cents (and recalculate shares)
    if (body.amount_cents !== undefined) {
      if (
        typeof body.amount_cents !== 'number' ||
        !Number.isInteger(body.amount_cents) ||
        body.amount_cents < 0
      ) {
        return NextResponse.json(
          { success: false, error: 'amount_cents must be a non-negative integer' },
          { status: 400 }
        );
      }
      updateData.amount_cents = body.amount_cents;

      // Recalculate shares for opted-in participants
      const optedInParticipants = expense.participants.filter((p) => p.optedIn);
      if (optedInParticipants.length > 0) {
        const optedInIds = optedInParticipants.map((p) => p.attendeeId as ObjectId);
        updateData.participants = calculateEqualShares(body.amount_cents, optedInIds);
      }
    }

    // Validate and add category
    if (body.category !== undefined) {
      if (!ExpenseCategories.includes(body.category)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid category. Must be one of: ${ExpenseCategories.join(', ')}`,
          },
          { status: 400 }
        );
      }
      updateData.category = body.category;
    }

    // Update the expense
    const updatedExpense = await updateExpense(new ObjectId(expenseId), updateData);

    if (!updatedExpense) {
      return NextResponse.json(
        { success: false, error: 'Failed to update expense' },
        { status: 500 }
      );
    }

    // Trigger real-time event
    const serializedExpense = serializeExpense(updatedExpense);
    await triggerTripEvent(tripId, PusherEventType.EXPENSE_UPDATED, {
      expense: serializedExpense,
    });

    return NextResponse.json({
      success: true,
      data: serializedExpense,
    });
  } catch (error) {
    console.error('PUT /api/trips/[tripId]/expenses/[expenseId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[tripId]/expenses/[expenseId]
 *
 * Soft delete an expense.
 * Only the creator or admin can delete.
 * Cannot delete settled expenses.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; expenseId: string }> }
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
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
        { success: false, error: 'Cannot delete a settled expense' },
        { status: 400 }
      );
    }

    // Check if user is the payer (creator) or admin
    const isCreator = expense.payerId.toString() === attendee._id.toString();
    const isAdmin = attendee.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only the creator or admin can delete this expense' },
        { status: 403 }
      );
    }

    // Soft delete the expense
    const deleted = await deleteExpense(new ObjectId(expenseId));

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete expense' },
        { status: 500 }
      );
    }

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.EXPENSE_DELETED, {
      expenseId,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Expense deleted successfully' },
    });
  } catch (error) {
    console.error('DELETE /api/trips/[tripId]/expenses/[expenseId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}

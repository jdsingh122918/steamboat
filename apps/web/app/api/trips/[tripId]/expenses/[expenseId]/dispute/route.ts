/**
 * Expense Dispute API Routes
 *
 * POST /api/trips/[tripId]/expenses/[expenseId]/dispute - File a dispute on an expense
 * PUT /api/trips/[tripId]/expenses/[expenseId]/dispute - Resolve a dispute (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import { getExpenseById, updateExpense } from '@/lib/db/operations/expenses';
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
 * Dispute interface.
 */
interface Dispute {
  filedBy: ObjectId;
  reason: string;
  filedAt: Date;
  resolvedBy?: ObjectId;
  resolution?: string;
  resolvedAt?: Date;
}

/**
 * Expense with optional dispute.
 */
interface ExpenseWithDispute extends Expense {
  dispute?: Dispute;
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
function serializeExpense(expense: ExpenseWithDispute): Record<string, unknown> {
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
  if (expense.dispute) {
    serialized.dispute = {
      filedBy: expense.dispute.filedBy.toString(),
      reason: expense.dispute.reason,
      filedAt: expense.dispute.filedAt,
      resolvedBy: expense.dispute.resolvedBy?.toString(),
      resolution: expense.dispute.resolution,
      resolvedAt: expense.dispute.resolvedAt,
    };
  }

  return serialized;
}

/**
 * POST /api/trips/[tripId]/expenses/[expenseId]/dispute
 *
 * File a dispute on an expense.
 * Body:
 *   - reason (required): string - The reason for the dispute
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
    const expense = (await getExpenseById(
      new ObjectId(expenseId)
    )) as ExpenseWithDispute | null;

    if (!expense || expense.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reason } = body;

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'reason is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Check if expense already has a dispute
    if (expense.dispute) {
      return NextResponse.json(
        { success: false, error: 'This expense already has a dispute' },
        { status: 400 }
      );
    }

    // Create the dispute
    const dispute: Dispute = {
      filedBy: attendee._id as ObjectId,
      reason: reason.trim(),
      filedAt: new Date(),
    };

    const updatedExpense = (await updateExpense(new ObjectId(expenseId), {
      dispute,
    } as any)) as ExpenseWithDispute | null;

    if (!updatedExpense) {
      return NextResponse.json(
        { success: false, error: 'Failed to file dispute' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: serializeExpense(updatedExpense),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/trips/[tripId]/expenses/[expenseId]/dispute error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to file dispute' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trips/[tripId]/expenses/[expenseId]/dispute
 *
 * Resolve a dispute on an expense (admin only).
 * Body:
 *   - resolution (required): string - The resolution of the dispute
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

    // Require admin access
    let attendee;
    try {
      const result = await requireAdmin(tripId);
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
    const expense = (await getExpenseById(
      new ObjectId(expenseId)
    )) as ExpenseWithDispute | null;

    if (!expense || expense.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check if expense has a dispute
    if (!expense.dispute) {
      return NextResponse.json(
        { success: false, error: 'This expense has no dispute to resolve' },
        { status: 400 }
      );
    }

    // Check if dispute is already resolved
    if (expense.dispute.resolvedAt) {
      return NextResponse.json(
        { success: false, error: 'This dispute has already been resolved' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { resolution } = body;

    // Validate resolution
    if (!resolution || typeof resolution !== 'string' || resolution.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'resolution is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Update the dispute with resolution
    const updatedDispute: Dispute = {
      ...expense.dispute,
      resolvedBy: attendee._id as ObjectId,
      resolution: resolution.trim(),
      resolvedAt: new Date(),
    };

    const updatedExpense = (await updateExpense(new ObjectId(expenseId), {
      dispute: updatedDispute,
    } as any)) as ExpenseWithDispute | null;

    if (!updatedExpense) {
      return NextResponse.json(
        { success: false, error: 'Failed to resolve dispute' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeExpense(updatedExpense),
    });
  } catch (error) {
    console.error('PUT /api/trips/[tripId]/expenses/[expenseId]/dispute error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve dispute' },
      { status: 500 }
    );
  }
}

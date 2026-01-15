/**
 * Expenses API Routes
 *
 * GET /api/trips/[tripId]/expenses - List all expenses for a trip
 * POST /api/trips/[tripId]/expenses - Create a new expense
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import {
  listExpenses,
  createExpense,
} from '@/lib/db/operations/expenses';
import { ExpenseCategories, ExpenseStatuses, type Expense } from '@/lib/db/models';
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
 * Calculate equal shares for participants.
 */
function calculateEqualShares(
  amount_cents: number,
  participantIds: string[]
): Array<{ attendeeId: ObjectId; optedIn: boolean; share_cents: number }> {
  const count = participantIds.length;
  if (count === 0) return [];

  const baseShare = Math.floor(amount_cents / count);
  const remainder = amount_cents % count;

  return participantIds.map((id, index) => ({
    attendeeId: new ObjectId(id),
    optedIn: true,
    // Distribute remainder to first participants
    share_cents: baseShare + (index < remainder ? 1 : 0),
  }));
}

/**
 * GET /api/trips/[tripId]/expenses
 *
 * List all expenses for a trip with optional filtering.
 * Query params:
 *   - category: Filter by expense category
 *   - paidBy: Filter by payer attendee ID
 *   - status: Filter by status (pending, settled)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<Record<string, unknown>[]>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
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

    // Parse query params
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const paidBy = url.searchParams.get('paidBy');
    const status = url.searchParams.get('status');

    // Build filter
    const filter: Record<string, unknown> = {
      tripId: new ObjectId(tripId),
      deletedAt: null,
    };

    // Validate and add category filter
    if (category) {
      if (!ExpenseCategories.includes(category as typeof ExpenseCategories[number])) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid category. Must be one of: ${ExpenseCategories.join(', ')}`,
          },
          { status: 400 }
        );
      }
      filter.category = category;
    }

    // Validate and add paidBy filter
    if (paidBy) {
      if (!isValidObjectId(paidBy)) {
        return NextResponse.json(
          { success: false, error: 'Invalid paidBy format' },
          { status: 400 }
        );
      }
      filter.payerId = new ObjectId(paidBy);
    }

    // Validate and add status filter
    if (status) {
      if (!ExpenseStatuses.includes(status as typeof ExpenseStatuses[number])) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status. Must be one of: ${ExpenseStatuses.join(', ')}`,
          },
          { status: 400 }
        );
      }
      filter.status = status;
    }

    // Get expenses
    const result = await listExpenses(filter as any, { limit: 1000 });

    return NextResponse.json({
      success: true,
      data: result.data.map(serializeExpense),
    });
  } catch (error) {
    console.error('GET /api/trips/[tripId]/expenses error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips/[tripId]/expenses
 *
 * Create a new expense for a trip.
 * Body:
 *   - description (required): string
 *   - amount_cents (required): number (positive integer)
 *   - category (required): string (one of ExpenseCategories)
 *   - paidById (required): string (ObjectId)
 *   - participantIds (optional): string[] (for equal split)
 *   - participants (optional): Array<{ attendeeId, share_cents?, percentage? }> (for custom/percentage split)
 *   - splitType (optional): 'equal' | 'custom' | 'percentage' (default: 'equal')
 *   - date (optional): ISO date string
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Verify trip access (any member can create expenses)
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

    // Parse request body
    const body = await request.json();
    const {
      description,
      amount_cents,
      category,
      paidById,
      participantIds,
      participants: customParticipants,
      splitType = 'equal',
      date,
    } = body;

    // Validate required fields
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'description is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (amount_cents === undefined || amount_cents === null) {
      return NextResponse.json(
        { success: false, error: 'amount_cents is required' },
        { status: 400 }
      );
    }

    if (typeof amount_cents !== 'number' || !Number.isInteger(amount_cents) || amount_cents < 0) {
      return NextResponse.json(
        { success: false, error: 'amount_cents must be a non-negative integer' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'category is required' },
        { status: 400 }
      );
    }

    if (!ExpenseCategories.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid category. Must be one of: ${ExpenseCategories.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!paidById) {
      return NextResponse.json(
        { success: false, error: 'paidById is required' },
        { status: 400 }
      );
    }

    if (!isValidObjectId(paidById)) {
      return NextResponse.json(
        { success: false, error: 'paidById must be a valid ObjectId' },
        { status: 400 }
      );
    }

    // Validate date if provided
    let expenseDate: Date | undefined;
    if (date) {
      expenseDate = new Date(date);
      if (isNaN(expenseDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'date must be a valid ISO date string' },
          { status: 400 }
        );
      }
    }

    // Build participants array based on split type
    let participants: Array<{ attendeeId: ObjectId; optedIn: boolean; share_cents: number }> = [];

    if (splitType === 'equal') {
      if (participantIds && Array.isArray(participantIds)) {
        // Validate all participant IDs
        for (const id of participantIds) {
          if (!isValidObjectId(id)) {
            return NextResponse.json(
              { success: false, error: `Invalid participant ID: ${id}` },
              { status: 400 }
            );
          }
        }
        participants = calculateEqualShares(amount_cents, participantIds);
      }
    } else if (splitType === 'custom') {
      if (!customParticipants || !Array.isArray(customParticipants)) {
        return NextResponse.json(
          { success: false, error: 'participants array is required for custom split' },
          { status: 400 }
        );
      }

      // Validate each participant has share_cents
      let totalShares = 0;
      for (const p of customParticipants) {
        if (!p.attendeeId || !isValidObjectId(p.attendeeId)) {
          return NextResponse.json(
            { success: false, error: 'Each participant must have a valid attendeeId' },
            { status: 400 }
          );
        }
        if (typeof p.share_cents !== 'number' || p.share_cents < 0) {
          return NextResponse.json(
            { success: false, error: 'Each participant must have a non-negative share_cents' },
            { status: 400 }
          );
        }
        totalShares += p.share_cents;
      }

      // Validate shares sum to total
      if (totalShares !== amount_cents) {
        return NextResponse.json(
          {
            success: false,
            error: `Custom shares must sum to amount_cents (${amount_cents}). Current sum: ${totalShares}`,
          },
          { status: 400 }
        );
      }

      participants = customParticipants.map((p: { attendeeId: string; share_cents: number }) => ({
        attendeeId: new ObjectId(p.attendeeId),
        optedIn: true,
        share_cents: p.share_cents,
      }));
    } else if (splitType === 'percentage') {
      if (!customParticipants || !Array.isArray(customParticipants)) {
        return NextResponse.json(
          { success: false, error: 'participants array is required for percentage split' },
          { status: 400 }
        );
      }

      // Validate each participant has percentage
      let totalPercentage = 0;
      for (const p of customParticipants) {
        if (!p.attendeeId || !isValidObjectId(p.attendeeId)) {
          return NextResponse.json(
            { success: false, error: 'Each participant must have a valid attendeeId' },
            { status: 400 }
          );
        }
        if (typeof p.percentage !== 'number' || p.percentage < 0 || p.percentage > 100) {
          return NextResponse.json(
            { success: false, error: 'Each participant must have a percentage between 0 and 100' },
            { status: 400 }
          );
        }
        totalPercentage += p.percentage;
      }

      // Validate percentages sum to 100
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: `Percentages must sum to 100. Current sum: ${totalPercentage}`,
          },
          { status: 400 }
        );
      }

      // Calculate shares from percentages
      let assignedCents = 0;
      participants = customParticipants.map((p: { attendeeId: string; percentage: number }, index: number) => {
        const isLast = index === customParticipants.length - 1;
        const share = isLast
          ? amount_cents - assignedCents // Last participant gets remainder to avoid rounding errors
          : Math.round((p.percentage / 100) * amount_cents);
        assignedCents += share;
        return {
          attendeeId: new ObjectId(p.attendeeId),
          optedIn: true,
          share_cents: share,
        };
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "splitType must be one of: 'equal', 'custom', 'percentage'",
        },
        { status: 400 }
      );
    }

    // Create the expense
    const expenseData = {
      tripId: new ObjectId(tripId),
      payerId: new ObjectId(paidById),
      amount_cents,
      currency: 'USD',
      category,
      description: description.trim(),
      participants,
      status: 'pending' as const,
    };

    const expense = await createExpense(expenseData);

    // Trigger real-time event
    const serializedExpense = serializeExpense(expense);
    await triggerTripEvent(tripId, PusherEventType.EXPENSE_CREATED, {
      expense: serializedExpense,
    });

    return NextResponse.json(
      {
        success: true,
        data: serializedExpense,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/trips/[tripId]/expenses error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}

/**
 * Summary API routes - /api/trips/[tripId]/balances/summary
 *
 * GET: Get expense summary for the trip
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import {
  getExpensesByTrip,
  getTripTotalExpenses,
  getExpenseSummaryByCategory,
} from '@/lib/db/operations/expenses';
import { getAttendeesByTrip } from '@/lib/db/operations/attendees';

/**
 * API response interface
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Category summary data
 */
interface CategorySummary {
  total_cents: number;
  count: number;
}

/**
 * Payer summary data
 */
interface PayerSummary {
  total_cents: number;
  count: number;
}

/**
 * Date summary data
 */
interface DateSummary {
  total_cents: number;
  count: number;
}

/**
 * Full summary response
 */
interface ExpenseSummary {
  totalSpent_cents: number;
  byCategory: Record<string, CategorySummary>;
  byPayer: Record<string, PayerSummary>;
  byDate: Record<string, DateSummary>;
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
 * Format a date to YYYY-MM-DD string
 */
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * GET /api/trips/[tripId]/balances/summary
 * Get expense summary for the trip
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<ExpenseSummary>>> {
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

    // Get all attendees for name lookup
    const attendees = await getAttendeesByTrip(tripObjectId);
    const attendeeMap = new Map(
      attendees.map((a) => [a._id.toString(), a.name])
    );

    // Get total expenses using the existing operation
    const totalSpent_cents = await getTripTotalExpenses(tripObjectId);

    // Get category summary using the existing operation
    const categorySummary = await getExpenseSummaryByCategory(tripObjectId);
    const byCategory: Record<string, CategorySummary> = {};
    for (const item of categorySummary) {
      byCategory[item.category] = {
        total_cents: item.total_cents,
        count: item.count,
      };
    }

    // Get all expenses for payer and date grouping
    const { data: expenses } = await getExpensesByTrip(tripObjectId, { limit: 10000 });

    // Group by payer
    const byPayer: Record<string, PayerSummary> = {};
    for (const expense of expenses) {
      if (expense.deletedAt) continue;

      const payerId = expense.payerId.toString();
      const payerName = attendeeMap.get(payerId) || 'Unknown';

      if (!byPayer[payerName]) {
        byPayer[payerName] = { total_cents: 0, count: 0 };
      }
      byPayer[payerName].total_cents += expense.amount_cents;
      byPayer[payerName].count += 1;
    }

    // Group by date
    const byDate: Record<string, DateSummary> = {};
    for (const expense of expenses) {
      if (expense.deletedAt) continue;

      const dateKey = formatDateKey(expense.createdAt);

      if (!byDate[dateKey]) {
        byDate[dateKey] = { total_cents: 0, count: 0 };
      }
      byDate[dateKey].total_cents += expense.amount_cents;
      byDate[dateKey].count += 1;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          totalSpent_cents,
          byCategory,
          byPayer,
          byDate,
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

    console.error('GET /api/trips/[tripId]/balances/summary error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

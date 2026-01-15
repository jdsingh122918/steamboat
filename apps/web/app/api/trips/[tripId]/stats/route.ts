import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import { getExpensesByTrip, getExpenseSummaryByCategory } from '@/lib/db/operations/expenses';
import { getAttendeesByTrip } from '@/lib/db/operations/attendees';
import { getMediaStats } from '@/lib/db/operations/media';
import { getActivitiesByTrip } from '@/lib/db/operations/activities';
import { getPollsByTrip } from '@/lib/db/operations/polls';
import { getPaymentTotals } from '@/lib/db/operations/payments';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface TripStatsResponse {
  totalExpenses: number;
  expenseCount: number;
  totalAttendees: number;
  confirmedAttendees: number;
  totalPhotos: number;
  totalActivities: number;
  completedActivities: number;
  totalPolls: number;
  openPolls: number;
  closedPolls: number;
  expenseBreakdown: Array<{ category: string; total: number; count: number }>;
  settlementStatus: { pending: number; completed: number; total: number };
}

function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

type RouteParams = { params: Promise<{ tripId: string }> };
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<TripStatsResponse>>> {
  try {
    const { tripId } = await params;

    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    await requireTripAccess(tripId);

    const tripObjectId = new ObjectId(tripId);

    const [
      expensesResult,
      expenseBreakdown,
      attendees,
      mediaStats,
      activities,
      polls,
      paymentTotals,
    ] = await Promise.all([
      getExpensesByTrip(tripObjectId, { limit: 10000 }),
      getExpenseSummaryByCategory(tripObjectId),
      getAttendeesByTrip(tripObjectId),
      getMediaStats(tripObjectId),
      getActivitiesByTrip(tripObjectId),
      getPollsByTrip(tripObjectId),
      getPaymentTotals(tripObjectId),
    ]);

    const totalExpenses = expensesResult.data.reduce(
      (sum, expense) => sum + (expense.amount_cents || 0),
      0
    );

    const confirmedAttendees = attendees.filter(
      (a) => a.rsvpStatus === 'confirmed'
    ).length;

    const now = new Date();
    const completedActivities = activities.filter(
      (a) => a.startDate < now
    ).length;

    const openPolls = polls.filter((p) => p.status === 'open').length;
    const closedPolls = polls.filter((p) => p.status === 'closed').length;

    const formattedBreakdown = expenseBreakdown.map((item) => ({
      category: item.category,
      total: item.total_cents,
      count: item.count,
    }));

    const settlementStatus = {
      pending: paymentTotals.pending_cents,
      completed: paymentTotals.confirmed_cents,
      total: paymentTotals.pending_cents + paymentTotals.confirmed_cents,
    };

    const stats: TripStatsResponse = {
      totalExpenses,
      expenseCount: expensesResult.data.length,
      totalAttendees: attendees.length,
      confirmedAttendees,
      totalPhotos: mediaStats.count,
      totalActivities: activities.length,
      completedActivities,
      totalPolls: polls.length,
      openPolls,
      closedPolls,
      expenseBreakdown: formattedBreakdown,
      settlementStatus,
    };

    return NextResponse.json({ success: true, data: stats }, { status: 200 });
  } catch (error) {
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

    console.error('GET /api/trips/[tripId]/stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

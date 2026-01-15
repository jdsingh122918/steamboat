/**
 * Balances API routes - /api/trips/[tripId]/balances
 *
 * GET: Get current balances for all attendees
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import { getExpensesByTrip } from '@/lib/db/operations/expenses';
import { getPaymentsByTrip } from '@/lib/db/operations/payments';
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
 * Balance data for a single attendee
 */
interface AttendeeBalance {
  attendeeId: string;
  name: string;
  balance_cents: number;
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
 * Calculate balances for all attendees in a trip.
 *
 * Balance calculation logic:
 * - They paid: +amount_cents for expenses where payerId matches
 * - They owe: -share_cents for expenses where they are a participant (optedIn=true)
 * - They received: -amount_cents for payments where they are receiver (toId)
 * - They sent: +amount_cents for payments where they are sender (fromId)
 *
 * Positive balance = owed money (someone owes them)
 * Negative balance = owes money (they owe someone)
 */
async function calculateBalances(tripId: ObjectId): Promise<Map<string, number>> {
  const balances = new Map<string, number>();

  // Get all expenses for the trip
  const { data: expenses } = await getExpensesByTrip(tripId, { limit: 10000 });

  // Get all payments for the trip
  const payments = await getPaymentsByTrip(tripId);

  // Process expenses
  for (const expense of expenses) {
    // Skip deleted expenses
    if (expense.deletedAt) continue;

    const payerId = expense.payerId.toString();
    const amountCents = expense.amount_cents;

    // Payer gets credit for paying
    balances.set(payerId, (balances.get(payerId) || 0) + amountCents);

    // Get opted-in participants
    const optedInParticipants = expense.participants.filter((p) => p.optedIn);

    if (optedInParticipants.length === 0) {
      // No participants, payer owes themselves the full amount (net 0 for payer)
      balances.set(payerId, (balances.get(payerId) || 0) - amountCents);
      continue;
    }

    // Calculate shares
    for (const participant of optedInParticipants) {
      const participantId = participant.attendeeId.toString();
      let shareCents: number;

      if (participant.share_cents !== undefined && participant.share_cents !== null) {
        // Use custom share if specified
        shareCents = participant.share_cents;
      } else {
        // Equal split among opted-in participants
        shareCents = Math.floor(amountCents / optedInParticipants.length);
      }

      // Participant owes their share
      balances.set(participantId, (balances.get(participantId) || 0) - shareCents);
    }
  }

  // Process payments
  for (const payment of payments) {
    // Skip deleted payments
    if (payment.deletedAt) continue;

    const fromId = payment.fromId.toString();
    const toId = payment.toId.toString();
    const amountCents = payment.amount_cents;

    // Sender: +amount (they've paid off debt, balance goes up)
    balances.set(fromId, (balances.get(fromId) || 0) + amountCents);

    // Receiver: -amount (they've received payment, balance goes down)
    balances.set(toId, (balances.get(toId) || 0) - amountCents);
  }

  return balances;
}

/**
 * GET /api/trips/[tripId]/balances
 * Get current balances for all attendees
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AttendeeBalance[]>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Require trip access (user must be authenticated and a member)
    await requireTripAccess(tripId);

    const tripObjectId = new ObjectId(tripId);

    // Get all attendees for the trip
    const attendees = await getAttendeesByTrip(tripObjectId);

    // Calculate balances
    const balanceMap = await calculateBalances(tripObjectId);

    // Build response with attendee names
    const balances: AttendeeBalance[] = attendees.map((attendee) => ({
      attendeeId: attendee._id.toString(),
      name: attendee.name,
      balance_cents: balanceMap.get(attendee._id.toString()) || 0,
    }));

    return NextResponse.json({ success: true, data: balances }, { status: 200 });
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

    console.error('GET /api/trips/[tripId]/balances error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

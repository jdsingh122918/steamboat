/**
 * API routes for trip payments.
 *
 * GET /api/trips/[tripId]/payments - List all payments for a trip
 * POST /api/trips/[tripId]/payments - Record a new payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import {
  getPaymentsByTrip,
  createPayment,
  listPayments,
} from '@/lib/db/operations/payments';
import { getAttendeeById, getAttendeesByTrip } from '@/lib/db/operations/attendees';
import { PaymentMethods, PaymentStatuses, type Payment, type Attendee } from '@/lib/db/models';
import { triggerTripEvent } from '@/lib/pusher-server';
import { PusherEventType } from '@/lib/pusher';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Serialize a payment for JSON response with participant names.
 */
function serializePayment(
  payment: Payment,
  attendeeMap: Map<string, Attendee>
): Record<string, unknown> {
  const from = attendeeMap.get(payment.fromId.toString());
  const to = attendeeMap.get(payment.toId.toString());

  return {
    ...payment,
    _id: payment._id.toString(),
    tripId: payment.tripId.toString(),
    fromId: payment.fromId.toString(),
    toId: payment.toId.toString(),
    fromName: from?.name || 'Unknown',
    toName: to?.name || 'Unknown',
    expenseIds: payment.expenseIds?.map((id) => id.toString()),
  };
}

/**
 * GET /api/trips/[tripId]/payments
 *
 * List all payments for a trip. Requires trip access.
 * Query params: ?status=pending|confirmed|cancelled, ?fromId=attendeeId, ?toId=attendeeId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check trip access
    await requireTripAccess(tripId);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const fromId = searchParams.get('fromId');
    const toId = searchParams.get('toId');

    // Validate status if provided
    if (status && !PaymentStatuses.includes(status as any)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${PaymentStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate fromId if provided
    if (fromId && !isValidObjectId(fromId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fromId format' },
        { status: 400 }
      );
    }

    // Validate toId if provided
    if (toId && !isValidObjectId(toId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid toId format' },
        { status: 400 }
      );
    }

    // Build filter
    const tripObjId = new ObjectId(tripId);
    let payments: Payment[];

    if (status || fromId || toId) {
      // Use listPayments with filter
      const filter: Record<string, unknown> = {
        tripId: tripObjId,
        deletedAt: null,
      };

      if (status) {
        filter.status = status;
      }
      if (fromId) {
        filter.fromId = new ObjectId(fromId);
      }
      if (toId) {
        filter.toId = new ObjectId(toId);
      }

      const result = await listPayments(filter as any, { page: 1, limit: 1000 });
      payments = result.data;
    } else {
      // Get all payments for the trip
      payments = await getPaymentsByTrip(tripObjId);
    }

    // Get all attendees for name lookup
    const attendees = await getAttendeesByTrip(tripObjId);
    const attendeeMap = new Map(
      attendees.map((a) => [a._id.toString(), a])
    );

    // Serialize payments with names
    const serializedPayments = payments.map((p) =>
      serializePayment(p, attendeeMap)
    );

    return NextResponse.json({
      success: true,
      data: serializedPayments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    if (message.includes('NEXT_REDIRECT') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('GET /api/trips/[tripId]/payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips/[tripId]/payments
 *
 * Record a new payment. Requires trip access.
 * Body: { fromId, toId, amount_cents, method?: 'venmo'|'paypal'|'cash'|'other', note? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check trip access
    await requireTripAccess(tripId);

    // Parse request body
    const body = await request.json();
    const { fromId, toId, amount_cents, method = 'other', note } = body;

    // Validate required fields
    if (!fromId || !toId || amount_cents === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: fromId, toId, amount_cents',
        },
        { status: 400 }
      );
    }

    // Validate fromId format
    if (!isValidObjectId(fromId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fromId format' },
        { status: 400 }
      );
    }

    // Validate toId format
    if (!isValidObjectId(toId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid toId format' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount_cents !== 'number' || amount_cents <= 0) {
      return NextResponse.json(
        { success: false, error: 'amount_cents must be a positive number' },
        { status: 400 }
      );
    }

    // Validate method
    if (!PaymentMethods.includes(method)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid method. Must be one of: ${PaymentMethods.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate fromId and toId are different
    if (fromId === toId) {
      return NextResponse.json(
        { success: false, error: 'Sender and receiver cannot be the same' },
        { status: 400 }
      );
    }

    // Verify sender exists and belongs to this trip
    const sender = await getAttendeeById(new ObjectId(fromId));
    if (!sender) {
      return NextResponse.json(
        { success: false, error: 'Sender not found' },
        { status: 404 }
      );
    }
    if (sender.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Sender not found in this trip' },
        { status: 404 }
      );
    }

    // Verify receiver exists and belongs to this trip
    const receiver = await getAttendeeById(new ObjectId(toId));
    if (!receiver) {
      return NextResponse.json(
        { success: false, error: 'Receiver not found' },
        { status: 404 }
      );
    }
    if (receiver.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Receiver not found in this trip' },
        { status: 404 }
      );
    }

    // Create the payment
    const payment = await createPayment({
      tripId: new ObjectId(tripId),
      fromId: new ObjectId(fromId),
      toId: new ObjectId(toId),
      amount_cents,
      method,
      status: 'pending',
      note: note || undefined,
    });

    // Serialize payment
    const attendeeMap = new Map([
      [sender._id.toString(), sender],
      [receiver._id.toString(), receiver],
    ]);

    const serializedPayment = serializePayment(payment, attendeeMap);

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.PAYMENT_RECEIVED, {
      payment: serializedPayment,
    });

    return NextResponse.json(
      { success: true, data: serializedPayment },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    if (message.includes('NEXT_REDIRECT') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('POST /api/trips/[tripId]/payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

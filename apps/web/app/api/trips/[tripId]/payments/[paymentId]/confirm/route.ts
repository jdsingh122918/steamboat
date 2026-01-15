/**
 * API route to confirm a payment.
 *
 * POST /api/trips/[tripId]/payments/[paymentId]/confirm - Confirm payment receipt
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import {
  getPaymentById,
  confirmPayment,
  updatePayment,
} from '@/lib/db/operations/payments';
import { getAttendeeById } from '@/lib/db/operations/attendees';
import type { Payment } from '@/lib/db/models';
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
  fromName?: string,
  toName?: string
): Record<string, unknown> {
  return {
    ...payment,
    _id: payment._id.toString(),
    tripId: payment.tripId.toString(),
    fromId: payment.fromId.toString(),
    toId: payment.toId.toString(),
    fromName: fromName || 'Unknown',
    toName: toName || 'Unknown',
    expenseIds: payment.expenseIds?.map((id) => id.toString()),
  };
}

/**
 * POST /api/trips/[tripId]/payments/[paymentId]/confirm
 *
 * Confirm payment receipt. Only the receiver can confirm.
 * Optionally link to expense settlements via expenseIds in body.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; paymentId: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { tripId, paymentId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check trip access
    const { attendee } = await requireTripAccess(tripId);

    // Validate paymentId format
    if (!isValidObjectId(paymentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid paymentId format' },
        { status: 400 }
      );
    }

    // Get the payment
    const payment = await getPaymentById(new ObjectId(paymentId));

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Verify the payment belongs to this trip
    if (payment.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check authorization: only receiver can confirm
    const isReceiver = payment.toId.toString() === attendee._id.toString();

    if (!isReceiver) {
      return NextResponse.json(
        { success: false, error: 'Only the receiver can confirm this payment' },
        { status: 403 }
      );
    }

    // Check payment status
    if (payment.status === 'confirmed') {
      return NextResponse.json(
        { success: false, error: 'Payment is already confirmed' },
        { status: 400 }
      );
    }

    if (payment.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot confirm a cancelled payment' },
        { status: 400 }
      );
    }

    // Parse optional body for expense IDs
    let expenseIds: ObjectId[] | undefined;
    let body: Record<string, unknown> = {};

    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is fine
    }

    if (body.expenseIds) {
      if (!Array.isArray(body.expenseIds)) {
        return NextResponse.json(
          { success: false, error: 'expenseIds must be an array' },
          { status: 400 }
        );
      }

      // Validate each expense ID
      for (const id of body.expenseIds) {
        if (!isValidObjectId(id)) {
          return NextResponse.json(
            { success: false, error: `Invalid expenseId format: ${id}` },
            { status: 400 }
          );
        }
      }

      expenseIds = (body.expenseIds as string[]).map((id) => new ObjectId(id));
    }

    // Confirm the payment
    let confirmedPayment: Payment | null;

    if (expenseIds && expenseIds.length > 0) {
      // Use updatePayment to include expense IDs
      confirmedPayment = await updatePayment(new ObjectId(paymentId), {
        status: 'confirmed',
        confirmedAt: new Date(),
        expenseIds,
      });
    } else {
      // Use confirmPayment for simple confirmation
      confirmedPayment = await confirmPayment(new ObjectId(paymentId));
    }

    if (!confirmedPayment) {
      return NextResponse.json(
        { success: false, error: 'Failed to confirm payment' },
        { status: 500 }
      );
    }

    // Get participant names
    const [from, to] = await Promise.all([
      getAttendeeById(confirmedPayment.fromId),
      getAttendeeById(confirmedPayment.toId),
    ]);

    const serializedPayment = serializePayment(confirmedPayment, from?.name, to?.name);

    // Trigger real-time event (settlement updated)
    await triggerTripEvent(tripId, PusherEventType.SETTLEMENT_UPDATED, {
      payment: serializedPayment,
    });

    return NextResponse.json({
      success: true,
      data: serializedPayment,
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

    console.error('POST /api/trips/[tripId]/payments/[paymentId]/confirm error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

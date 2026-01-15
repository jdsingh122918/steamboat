/**
 * API routes for a specific payment.
 *
 * GET /api/trips/[tripId]/payments/[paymentId] - Get a single payment
 * PUT /api/trips/[tripId]/payments/[paymentId] - Update a payment
 * DELETE /api/trips/[tripId]/payments/[paymentId] - Cancel a payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import {
  getPaymentById,
  updatePayment,
  cancelPayment,
} from '@/lib/db/operations/payments';
import { getAttendeeById } from '@/lib/db/operations/attendees';
import { PaymentMethods, type Payment, type Attendee } from '@/lib/db/models';
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
 * GET /api/trips/[tripId]/payments/[paymentId]
 *
 * Get a single payment. Requires trip access.
 */
export async function GET(
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
    await requireTripAccess(tripId);

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

    // Get participant names
    const [from, to] = await Promise.all([
      getAttendeeById(payment.fromId),
      getAttendeeById(payment.toId),
    ]);

    return NextResponse.json({
      success: true,
      data: serializePayment(payment, from?.name, to?.name),
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

    console.error('GET /api/trips/[tripId]/payments/[paymentId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trips/[tripId]/payments/[paymentId]
 *
 * Update a payment. Only sender or admin can update, and only if pending.
 */
export async function PUT(
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

    // Check authorization: must be sender or admin
    const isSender = payment.fromId.toString() === attendee._id.toString();
    const isAdmin = attendee.role === 'admin';

    if (!isSender && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only the sender or admin can update this payment' },
        { status: 403 }
      );
    }

    // Can only update pending payments
    if (payment.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Can only update pending payments' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Update amount if provided
    if (body.amount_cents !== undefined) {
      if (typeof body.amount_cents !== 'number' || body.amount_cents <= 0) {
        return NextResponse.json(
          { success: false, error: 'amount_cents must be a positive number' },
          { status: 400 }
        );
      }
      updateData.amount_cents = body.amount_cents;
    }

    // Update method if provided
    if (body.method !== undefined) {
      if (!PaymentMethods.includes(body.method)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid method. Must be one of: ${PaymentMethods.join(', ')}`,
          },
          { status: 400 }
        );
      }
      updateData.method = body.method;
    }

    // Update note if provided
    if (body.note !== undefined) {
      updateData.note = body.note || undefined;
    }

    // Perform update
    const updatedPayment = await updatePayment(
      new ObjectId(paymentId),
      updateData as any
    );

    if (!updatedPayment) {
      return NextResponse.json(
        { success: false, error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    // Get participant names
    const [from, to] = await Promise.all([
      getAttendeeById(updatedPayment.fromId),
      getAttendeeById(updatedPayment.toId),
    ]);

    const serializedPayment = serializePayment(updatedPayment, from?.name, to?.name);

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.PAYMENT_RECEIVED, {
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

    console.error('PUT /api/trips/[tripId]/payments/[paymentId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[tripId]/payments/[paymentId]
 *
 * Cancel a payment. Only sender or admin can cancel, and only if pending.
 */
export async function DELETE(
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

    // Check authorization: must be sender or admin
    const isSender = payment.fromId.toString() === attendee._id.toString();
    const isAdmin = attendee.role === 'admin';

    if (!isSender && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only the sender or admin can cancel this payment' },
        { status: 403 }
      );
    }

    // Can only cancel pending payments
    if (payment.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Can only cancel pending payments' },
        { status: 400 }
      );
    }

    // Cancel the payment
    const cancelledPayment = await cancelPayment(new ObjectId(paymentId));

    if (!cancelledPayment) {
      return NextResponse.json(
        { success: false, error: 'Failed to cancel payment' },
        { status: 500 }
      );
    }

    // Get participant names
    const [from, to] = await Promise.all([
      getAttendeeById(cancelledPayment.fromId),
      getAttendeeById(cancelledPayment.toId),
    ]);

    const serializedPayment = serializePayment(cancelledPayment, from?.name, to?.name);

    // Trigger real-time event (settlement changed due to cancellation)
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

    console.error('DELETE /api/trips/[tripId]/payments/[paymentId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

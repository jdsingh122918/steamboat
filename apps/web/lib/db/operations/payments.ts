/**
 * Payment-specific database operations.
 */

import { ObjectId, Filter } from 'mongodb';
import { getCollection, COLLECTIONS } from '@/lib/db/client';
import { Payment, CreatePayment, UpdatePayment, PaymentStatus } from '@/lib/db/models';
import {
  create,
  getById,
  update,
  softDelete,
  list,
  PaginationOptions,
  PaginatedResult,
  GetByIdOptions,
} from './base';

/**
 * Create a new payment record.
 */
export async function createPayment(data: CreatePayment): Promise<Payment> {
  return create<Payment>(COLLECTIONS.PAYMENTS, data);
}

/**
 * Get a payment by ID.
 */
export async function getPaymentById(
  id: ObjectId,
  options?: GetByIdOptions
): Promise<Payment | null> {
  return getById<Payment>(COLLECTIONS.PAYMENTS, id, options);
}

/**
 * Update a payment.
 */
export async function updatePayment(
  id: ObjectId,
  data: UpdatePayment
): Promise<Payment | null> {
  return update<Payment>(COLLECTIONS.PAYMENTS, id, data);
}

/**
 * Soft delete a payment.
 */
export async function deletePayment(id: ObjectId): Promise<boolean> {
  return softDelete(COLLECTIONS.PAYMENTS, id);
}

/**
 * List payments with optional filtering.
 */
export async function listPayments(
  filter: Filter<Payment>,
  options?: PaginationOptions
): Promise<PaginatedResult<Payment>> {
  return list<Payment>(COLLECTIONS.PAYMENTS, filter, options);
}

/**
 * Get all payments for a trip.
 */
export async function getPaymentsByTrip(tripId: ObjectId): Promise<Payment[]> {
  const collection = await getCollection<Payment>(COLLECTIONS.PAYMENTS);

  return collection
    .find({
      tripId,
      deletedAt: null,
    })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Get payments where an attendee is the payer.
 */
export async function getPaymentsByPayer(
  tripId: ObjectId,
  payerId: ObjectId
): Promise<Payment[]> {
  const collection = await getCollection<Payment>(COLLECTIONS.PAYMENTS);

  return collection
    .find({
      tripId,
      fromId: payerId,
      deletedAt: null,
    })
    .toArray();
}

/**
 * Get payments where an attendee is the recipient.
 */
export async function getPaymentsToRecipient(
  tripId: ObjectId,
  recipientId: ObjectId
): Promise<Payment[]> {
  const collection = await getCollection<Payment>(COLLECTIONS.PAYMENTS);

  return collection
    .find({
      tripId,
      toId: recipientId,
      deletedAt: null,
    })
    .toArray();
}

/**
 * Confirm a payment (mark as confirmed).
 */
export async function confirmPayment(paymentId: ObjectId): Promise<Payment | null> {
  return updatePayment(paymentId, {
    status: 'confirmed',
    confirmedAt: new Date(),
  });
}

/**
 * Cancel a payment.
 */
export async function cancelPayment(paymentId: ObjectId): Promise<Payment | null> {
  return updatePayment(paymentId, {
    status: 'cancelled',
    cancelledAt: new Date(),
  });
}

/**
 * Update payment status.
 */
export async function updatePaymentStatus(
  paymentId: ObjectId,
  status: PaymentStatus
): Promise<Payment | null> {
  const data: UpdatePayment = { status };
  if (status === 'confirmed') {
    data.confirmedAt = new Date();
  } else if (status === 'cancelled') {
    data.cancelledAt = new Date();
  }
  return updatePayment(paymentId, data);
}

/**
 * Get pending payments for a trip.
 */
export async function getPendingPayments(tripId: ObjectId): Promise<Payment[]> {
  const collection = await getCollection<Payment>(COLLECTIONS.PAYMENTS);

  return collection
    .find({
      tripId,
      status: 'pending',
      deletedAt: null,
    })
    .toArray();
}

/**
 * Get payment summary between two attendees.
 */
export async function getPaymentsBetween(
  tripId: ObjectId,
  attendee1: ObjectId,
  attendee2: ObjectId
): Promise<Payment[]> {
  const collection = await getCollection<Payment>(COLLECTIONS.PAYMENTS);

  return collection
    .find({
      tripId,
      $or: [
        { fromId: attendee1, toId: attendee2 },
        { fromId: attendee2, toId: attendee1 },
      ],
      deletedAt: null,
    })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Get total confirmed and pending amounts for a trip.
 */
export async function getPaymentTotals(
  tripId: ObjectId
): Promise<{ confirmed_cents: number; pending_cents: number }> {
  const collection = await getCollection<Payment>(COLLECTIONS.PAYMENTS);

  const result = await collection
    .aggregate([
      { $match: { tripId, deletedAt: null } },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount_cents' },
        },
      },
    ])
    .toArray();

  const totals = { confirmed_cents: 0, pending_cents: 0 };

  for (const item of result) {
    if (item._id === 'confirmed') {
      totals.confirmed_cents = item.total;
    } else if (item._id === 'pending') {
      totals.pending_cents = item.total;
    }
  }

  return totals;
}

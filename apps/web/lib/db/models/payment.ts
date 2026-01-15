/**
 * Payment data model.
 *
 * Represents a payment record between two attendees.
 */

import { z } from 'zod';
import { BaseDocumentSchema, ObjectIdSchema } from './types';

/**
 * Payment status values.
 */
export const PaymentStatuses = ['pending', 'confirmed', 'cancelled'] as const;
export type PaymentStatus = (typeof PaymentStatuses)[number];

/**
 * Payment methods.
 */
export const PaymentMethods = ['venmo', 'paypal', 'cashapp', 'cash', 'zelle', 'other'] as const;
export type PaymentMethod = (typeof PaymentMethods)[number];

/**
 * Payment document schema.
 */
export const PaymentSchema = BaseDocumentSchema.extend({
  /** Reference to the trip */
  tripId: ObjectIdSchema,

  /** ID of the payer */
  fromId: ObjectIdSchema,

  /** ID of the recipient */
  toId: ObjectIdSchema,

  /** Amount in cents */
  amount_cents: z.number().int().positive(),

  /** Payment status */
  status: z.enum(PaymentStatuses),

  /** Payment method used */
  method: z.enum(PaymentMethods),

  /** Optional note for the payment */
  note: z.string().optional(),

  /** When the payment was confirmed by the receiver */
  confirmedAt: z.date().optional(),

  /** When the payment was cancelled */
  cancelledAt: z.date().optional(),

  /** Expense IDs this payment settles */
  expenseIds: z.array(ObjectIdSchema).optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

/**
 * Schema for creating a new payment.
 */
export const CreatePaymentSchema = PaymentSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreatePayment = z.infer<typeof CreatePaymentSchema>;

/**
 * Schema for updating a payment.
 */
export const UpdatePaymentSchema = CreatePaymentSchema.partial();

export type UpdatePayment = z.infer<typeof UpdatePaymentSchema>;

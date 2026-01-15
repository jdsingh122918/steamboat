/**
 * Expense data model.
 *
 * Represents a shared expense within a trip.
 * Amounts are stored in cents to avoid floating-point issues.
 */

import { z } from 'zod';
import { BaseDocumentSchema, ObjectIdSchema } from './types';

/**
 * Expense categories.
 */
export const ExpenseCategories = [
  'food',
  'transport',
  'accommodation',
  'activities',
  'drinks',
  'other',
] as const;
export type ExpenseCategory = (typeof ExpenseCategories)[number];

/**
 * Expense status values.
 */
export const ExpenseStatuses = ['pending', 'settled'] as const;
export type ExpenseStatus = (typeof ExpenseStatuses)[number];

/**
 * Participant share in an expense.
 */
export const ExpenseParticipantSchema = z.object({
  /** Attendee ID */
  attendeeId: ObjectIdSchema,

  /** Whether they opted into this expense */
  optedIn: z.boolean(),

  /** Their share in cents (if different from equal split) */
  share_cents: z.number().int().nonnegative().optional(),
});

export type ExpenseParticipant = z.infer<typeof ExpenseParticipantSchema>;

/**
 * Dispute information for an expense.
 */
export const ExpenseDisputeSchema = z.object({
  /** ID of the attendee who filed the dispute */
  filedBy: ObjectIdSchema,

  /** Reason for the dispute */
  reason: z.string().min(1),

  /** When the dispute was filed */
  filedAt: z.date(),

  /** ID of the admin who resolved the dispute */
  resolvedBy: ObjectIdSchema.optional(),

  /** Resolution explanation */
  resolution: z.string().optional(),

  /** When the dispute was resolved */
  resolvedAt: z.date().optional(),
});

export type ExpenseDispute = z.infer<typeof ExpenseDisputeSchema>;

/**
 * Expense document schema.
 */
export const ExpenseSchema = BaseDocumentSchema.extend({
  /** Reference to the trip */
  tripId: ObjectIdSchema,

  /** ID of the attendee who paid */
  payerId: ObjectIdSchema,

  /** Amount in cents (e.g., $15.00 = 1500) */
  amount_cents: z.number().int().nonnegative(),

  /** Currency code */
  currency: z.string().default('USD'),

  /** Expense category */
  category: z.enum(ExpenseCategories),

  /** Description of the expense */
  description: z.string().min(1),

  /** URL to receipt image */
  receiptUrl: z.string().url().optional(),

  /** Participants and their opt-in status */
  participants: z.array(ExpenseParticipantSchema),

  /** Linked activity ID */
  linkedActivityId: ObjectIdSchema.optional(),

  /** Settlement status */
  status: z.enum(ExpenseStatuses),

  /** Dispute information if the expense has been disputed */
  dispute: ExpenseDisputeSchema.optional(),
});

export type Expense = z.infer<typeof ExpenseSchema>;

/**
 * Schema for creating a new expense.
 */
export const CreateExpenseSchema = ExpenseSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateExpense = z.infer<typeof CreateExpenseSchema>;

/**
 * Schema for updating an expense.
 */
export const UpdateExpenseSchema = CreateExpenseSchema.partial();

export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>;

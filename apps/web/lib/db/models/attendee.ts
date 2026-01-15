/**
 * Attendee data model.
 *
 * Represents a participant in a bachelor party trip.
 */

import { z } from 'zod';
import { BaseDocumentSchema, ObjectIdSchema } from './types';

/**
 * Attendee role enum values.
 */
export const AttendeeRoles = ['admin', 'member'] as const;
export type AttendeeRole = (typeof AttendeeRoles)[number];

/**
 * RSVP status enum values.
 */
export const RsvpStatuses = ['pending', 'confirmed', 'declined', 'maybe'] as const;
export type RsvpStatus = (typeof RsvpStatuses)[number];

/**
 * Payment handles schema for various payment methods.
 */
export const PaymentHandlesSchema = z.object({
  venmo: z.string().optional(),
  paypal: z.string().optional(),
  zelle: z.string().optional(),
  cashapp: z.string().optional(),
});

export type PaymentHandles = z.infer<typeof PaymentHandlesSchema>;

/**
 * Attendee document schema.
 */
export const AttendeeSchema = BaseDocumentSchema.extend({
  /** Reference to the trip */
  tripId: ObjectIdSchema,

  /** Display name */
  name: z.string().min(1),

  /** Email address */
  email: z.string().email(),

  /** Role in the trip */
  role: z.enum(AttendeeRoles),

  /** Payment handles for settling expenses */
  paymentHandles: PaymentHandlesSchema.optional(),

  /** Invite token used to join */
  inviteToken: z.string().optional(),

  /** RSVP status for the trip */
  rsvpStatus: z.enum(RsvpStatuses),
});

export type Attendee = z.infer<typeof AttendeeSchema>;

/**
 * Schema for creating a new attendee.
 */
export const CreateAttendeeSchema = AttendeeSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateAttendee = z.infer<typeof CreateAttendeeSchema>;

/**
 * Schema for updating an attendee.
 */
export const UpdateAttendeeSchema = CreateAttendeeSchema.partial();

export type UpdateAttendee = z.infer<typeof UpdateAttendeeSchema>;

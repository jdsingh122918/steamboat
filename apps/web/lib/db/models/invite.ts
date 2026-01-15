/**
 * Invite data model.
 *
 * Represents an invitation to join a trip.
 */

import { z } from 'zod';
import { BaseDocumentSchema, ObjectIdSchema } from './types';

/**
 * Invite status values.
 */
export const InviteStatuses = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InviteStatus = (typeof InviteStatuses)[number];

/**
 * Invite document schema.
 */
export const InviteSchema = BaseDocumentSchema.extend({
  /** Reference to the trip */
  tripId: ObjectIdSchema,

  /** Email address of invitee */
  email: z.string().email(),

  /** Unique invite token */
  token: z.string().min(1),

  /** Expiration date */
  expiresAt: z.date(),

  /** Current status */
  status: z.enum(InviteStatuses),

  /** ID of the user who created the invite */
  createdBy: ObjectIdSchema,
});

export type Invite = z.infer<typeof InviteSchema>;

/**
 * Schema for creating a new invite.
 */
export const CreateInviteSchema = InviteSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateInvite = z.infer<typeof CreateInviteSchema>;

/**
 * Schema for updating an invite.
 */
export const UpdateInviteSchema = CreateInviteSchema.partial();

export type UpdateInvite = z.infer<typeof UpdateInviteSchema>;

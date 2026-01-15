/**
 * Poll data model.
 *
 * Represents a poll for group decision making.
 */

import { z } from 'zod';
import { BaseDocumentSchema, ObjectIdSchema } from './types';

/**
 * Poll status values.
 */
export const PollStatuses = ['open', 'closed'] as const;
export type PollStatus = (typeof PollStatuses)[number];

/**
 * Poll option schema.
 */
export const PollOptionSchema = z.object({
  /** Unique ID for this option */
  id: z.string().min(1),

  /** Display text */
  text: z.string().min(1),
});

export type PollOption = z.infer<typeof PollOptionSchema>;

/**
 * Poll vote schema.
 */
export const PollVoteSchema = z.object({
  /** Attendee who voted */
  attendeeId: ObjectIdSchema,

  /** ID of the option they voted for */
  optionId: z.string().min(1),
});

export type PollVote = z.infer<typeof PollVoteSchema>;

/**
 * Poll document schema.
 */
export const PollSchema = BaseDocumentSchema.extend({
  /** Reference to the trip */
  tripId: ObjectIdSchema,

  /** Poll question */
  question: z.string().min(1),

  /** Available options (at least 1) */
  options: z.array(PollOptionSchema).min(1),

  /** Votes cast */
  votes: z.array(PollVoteSchema),

  /** Poll status */
  status: z.enum(PollStatuses),
});

export type Poll = z.infer<typeof PollSchema>;

/**
 * Schema for creating a new poll.
 */
export const CreatePollSchema = PollSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreatePoll = z.infer<typeof CreatePollSchema>;

/**
 * Schema for updating a poll.
 */
export const UpdatePollSchema = CreatePollSchema.partial();

export type UpdatePoll = z.infer<typeof UpdatePollSchema>;

/**
 * Activity data model.
 *
 * Represents a scheduled activity or event during a trip.
 */

import { z } from 'zod';
import { BaseDocumentSchema, ObjectIdSchema } from './types';

/**
 * Activity categories.
 */
export const ActivityCategories = [
  'entertainment',
  'dining',
  'sports',
  'nightlife',
  'relaxation',
  'adventure',
  'travel',
  'other',
] as const;
export type ActivityCategory = (typeof ActivityCategories)[number];

/**
 * RSVP status for an activity.
 */
export const ActivityRsvpStatuses = ['going', 'maybe', 'not_going'] as const;
export type ActivityRsvpStatus = (typeof ActivityRsvpStatuses)[number];

/**
 * Individual RSVP for an activity.
 */
export const ActivityRsvpSchema = z.object({
  /** Attendee ID */
  attendeeId: ObjectIdSchema,

  /** RSVP status */
  status: z.enum(ActivityRsvpStatuses),
});

export type ActivityRsvp = z.infer<typeof ActivityRsvpSchema>;

/**
 * Activity document schema.
 */
export const ActivitySchema = BaseDocumentSchema.extend({
  /** Reference to the trip */
  tripId: ObjectIdSchema,

  /** Activity name */
  name: z.string().min(1),

  /** Description of the activity */
  description: z.string().optional(),

  /** Start date/time */
  startDate: z.date(),

  /** End date/time */
  endDate: z.date().optional(),

  /** Location of the activity */
  location: z.string().optional(),

  /** Activity category */
  category: z.enum(ActivityCategories),

  /** RSVPs from attendees */
  rsvps: z.array(ActivityRsvpSchema),

  /** Linked expense IDs */
  linkedExpenseIds: z.array(ObjectIdSchema).optional(),
});

export type Activity = z.infer<typeof ActivitySchema>;

/**
 * Schema for creating a new activity.
 */
export const CreateActivitySchema = ActivitySchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateActivity = z.infer<typeof CreateActivitySchema>;

/**
 * Schema for updating an activity.
 */
export const UpdateActivitySchema = CreateActivitySchema.partial();

export type UpdateActivity = z.infer<typeof UpdateActivitySchema>;

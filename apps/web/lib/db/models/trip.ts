/**
 * Trip data model.
 *
 * Represents a bachelor party trip with all metadata and settings.
 */

import { z } from 'zod';
import { BaseDocumentSchema, ObjectIdSchema } from './types';

/**
 * Trip settings schema.
 */
export const TripSettingsSchema = z.object({
  currency: z.string().default('USD'),
  timezone: z.string().default('America/New_York'),
  isPublic: z.boolean().default(false),
});

export type TripSettings = z.infer<typeof TripSettingsSchema>;

/**
 * Trip document schema.
 */
export const TripSchema = BaseDocumentSchema.extend({
  /** Display name of the trip */
  name: z.string().min(1),

  /** Location/destination of the trip */
  location: z.string().min(1),

  /** Trip start date */
  startDate: z.date(),

  /** Trip end date */
  endDate: z.date(),

  /** ObjectId of the groom/honoree */
  groomId: ObjectIdSchema,

  /** List of admin user IDs */
  adminIds: z.array(ObjectIdSchema),

  /** Trip settings */
  settings: TripSettingsSchema.optional(),
});

export type Trip = z.infer<typeof TripSchema>;

/**
 * Schema for creating a new trip (without _id and timestamps).
 */
export const CreateTripSchema = TripSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateTrip = z.infer<typeof CreateTripSchema>;

/**
 * Schema for updating a trip (all fields optional).
 */
export const UpdateTripSchema = CreateTripSchema.partial();

export type UpdateTrip = z.infer<typeof UpdateTripSchema>;

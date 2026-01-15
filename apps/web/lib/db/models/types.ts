/**
 * Shared types and utilities for data models.
 */

import { z } from 'zod';
import { ObjectId } from 'mongodb';

/**
 * Custom Zod schema for MongoDB ObjectId.
 * Accepts either an ObjectId instance or a valid 24-character hex string.
 */
export const ObjectIdSchema = z.custom<ObjectId>(
  (val) => val instanceof ObjectId || (typeof val === 'string' && /^[a-fA-F0-9]{24}$/.test(val)),
  { message: 'Invalid ObjectId' }
);

/**
 * Timestamp fields for all documents.
 * Provides createdAt, updatedAt, and deletedAt (for soft delete).
 */
export const TimestampsSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export type Timestamps = z.infer<typeof TimestampsSchema>;

/**
 * Base document schema with _id and timestamps.
 */
export const BaseDocumentSchema = z.object({
  _id: ObjectIdSchema,
}).merge(TimestampsSchema);

export type BaseDocument = z.infer<typeof BaseDocumentSchema>;

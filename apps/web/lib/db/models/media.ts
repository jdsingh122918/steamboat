/**
 * Media data model.
 *
 * Represents uploaded photos and videos in the trip gallery.
 */

import { z } from 'zod';
import { BaseDocumentSchema, ObjectIdSchema } from './types';

/**
 * Media types.
 */
export const MediaTypes = ['photo', 'video'] as const;
export type MediaType = (typeof MediaTypes)[number];

/**
 * EXIF metadata schema matching the Rust WASM ExifData structure.
 */
export const ExifDataSchema = z.object({
  date_taken: z.string().optional(),
  camera_make: z.string().optional(),
  camera_model: z.string().optional(),
  gps_latitude: z.number().optional(),
  gps_longitude: z.number().optional(),
  orientation: z.number().int().min(1).max(8).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type ExifData = z.infer<typeof ExifDataSchema>;

/**
 * Media document schema.
 */
export const MediaSchema = BaseDocumentSchema.extend({
  /** Reference to the trip */
  tripId: ObjectIdSchema,

  /** ID of the uploader */
  uploaderId: ObjectIdSchema,

  /** Type of media */
  type: z.enum(MediaTypes),

  /** Full-resolution URL (Cloudinary) */
  url: z.string().url(),

  /** Thumbnail URL */
  thumbnailUrl: z.string().url().optional(),

  /** EXIF metadata extracted from image */
  exif: ExifDataSchema.optional(),

  /** User-provided caption */
  caption: z.string().optional(),

  /** Tags for organization/search */
  tags: z.array(z.string()).optional(),

  /** File size in bytes */
  fileSize: z.number().int().positive(),
});

export type Media = z.infer<typeof MediaSchema>;

/**
 * Schema for creating new media.
 */
export const CreateMediaSchema = MediaSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateMedia = z.infer<typeof CreateMediaSchema>;

/**
 * Schema for updating media.
 */
export const UpdateMediaSchema = CreateMediaSchema.partial();

export type UpdateMedia = z.infer<typeof UpdateMediaSchema>;

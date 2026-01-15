/**
 * Media-specific database operations.
 */

import { ObjectId, Filter } from 'mongodb';
import { getCollection, COLLECTIONS } from '@/lib/db/client';
import { Media, CreateMedia, UpdateMedia } from '@/lib/db/models';
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
 * Create a new media item.
 */
export async function createMedia(data: CreateMedia): Promise<Media> {
  return create<Media>(COLLECTIONS.MEDIA, data);
}

/**
 * Get a media item by ID.
 */
export async function getMediaById(
  id: ObjectId,
  options?: GetByIdOptions
): Promise<Media | null> {
  return getById<Media>(COLLECTIONS.MEDIA, id, options);
}

/**
 * Update a media item.
 */
export async function updateMedia(
  id: ObjectId,
  data: UpdateMedia
): Promise<Media | null> {
  return update<Media>(COLLECTIONS.MEDIA, id, data);
}

/**
 * Soft delete a media item.
 */
export async function deleteMedia(id: ObjectId): Promise<boolean> {
  return softDelete(COLLECTIONS.MEDIA, id);
}

/**
 * List media items with optional filtering.
 */
export async function listMedia(
  filter: Filter<Media>,
  options?: PaginationOptions
): Promise<PaginatedResult<Media>> {
  return list<Media>(COLLECTIONS.MEDIA, filter, options);
}

/**
 * Get all media for a trip.
 */
export async function getMediaByTrip(
  tripId: ObjectId,
  options?: PaginationOptions
): Promise<PaginatedResult<Media>> {
  return list<Media>(COLLECTIONS.MEDIA, { tripId } as Filter<Media>, options);
}

/**
 * Get media uploaded by a specific attendee.
 */
export async function getMediaByUploader(
  tripId: ObjectId,
  uploaderId: ObjectId
): Promise<Media[]> {
  const collection = await getCollection<Media>(COLLECTIONS.MEDIA);

  return collection
    .find({
      tripId,
      uploaderId,
      deletedAt: null,
    })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Get media by type (photo/video).
 */
export async function getMediaByType(
  tripId: ObjectId,
  type: Media['type']
): Promise<Media[]> {
  const collection = await getCollection<Media>(COLLECTIONS.MEDIA);

  return collection
    .find({
      tripId,
      type,
      deletedAt: null,
    })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Search media by tags.
 */
export async function searchMediaByTags(
  tripId: ObjectId,
  tags: string[]
): Promise<Media[]> {
  const collection = await getCollection<Media>(COLLECTIONS.MEDIA);

  return collection
    .find({
      tripId,
      tags: { $in: tags },
      deletedAt: null,
    })
    .toArray();
}

/**
 * Add tags to a media item.
 */
export async function addMediaTags(
  mediaId: ObjectId,
  tags: string[]
): Promise<Media | null> {
  const collection = await getCollection<Media>(COLLECTIONS.MEDIA);

  await collection.updateOne(
    { _id: mediaId },
    {
      $addToSet: { tags: { $each: tags } } as unknown as never,
      $set: { updatedAt: new Date() },
    }
  );

  return getMediaById(mediaId);
}

/**
 * Get media with GPS coordinates for a trip (for map view).
 */
export async function getGeotaggedMedia(tripId: ObjectId): Promise<Media[]> {
  const collection = await getCollection<Media>(COLLECTIONS.MEDIA);

  return collection
    .find({
      tripId,
      'exif.gps_latitude': { $exists: true },
      'exif.gps_longitude': { $exists: true },
      deletedAt: null,
    })
    .toArray();
}

/**
 * Get total media count and size for a trip.
 */
export async function getMediaStats(
  tripId: ObjectId
): Promise<{ count: number; totalSize: number }> {
  const collection = await getCollection<Media>(COLLECTIONS.MEDIA);

  const result = await collection
    .aggregate([
      { $match: { tripId, deletedAt: null } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
        },
      },
    ])
    .toArray();

  return {
    count: result[0]?.count ?? 0,
    totalSize: result[0]?.totalSize ?? 0,
  };
}

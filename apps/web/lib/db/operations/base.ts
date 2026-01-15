/**
 * Base CRUD operations for MongoDB collections.
 *
 * These generic helpers provide a consistent interface for database operations
 * with support for soft deletes, pagination, and type safety.
 */

import { ObjectId, Document, Filter, Sort, WithId, OptionalUnlessRequiredId } from 'mongodb';
import { getCollection } from '@/lib/db/client';

/**
 * Pagination options for list operations.
 */
export interface PaginationOptions {
  /** Page number (1-indexed, default: 1) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  limit?: number;
  /** Sort order */
  sort?: Sort;
}

/**
 * Paginated list result.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Options for getById operation.
 */
export interface GetByIdOptions {
  /** Include soft-deleted documents (default: false) */
  includeDeleted?: boolean;
}

/**
 * Add timestamps to a new document.
 */
function addTimestamps<T extends Document>(doc: T): T & {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: null;
} {
  const now = new Date();
  return {
    _id: new ObjectId(),
    ...doc,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

/**
 * Create a new document in the collection.
 *
 * @param collectionName - Name of the collection
 * @param document - Document to insert (without _id or timestamps)
 * @returns The created document with _id and timestamps
 *
 * @example
 * const trip = await create('trips', { name: 'Vegas', location: 'NV' });
 */
export async function create<T extends Document>(
  collectionName: string,
  document: Omit<T, '_id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
): Promise<T & { _id: ObjectId; createdAt: Date; updatedAt: Date; deletedAt: null }> {
  const collection = await getCollection<T>(collectionName);
  const docWithTimestamps = addTimestamps(document as Document);

  await collection.insertOne(docWithTimestamps as unknown as OptionalUnlessRequiredId<T>);

  return docWithTimestamps as T & {
    _id: ObjectId;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: null;
  };
}

/**
 * Get a document by its ObjectId.
 *
 * @param collectionName - Name of the collection
 * @param id - Document ObjectId
 * @param options - Query options
 * @returns The document or null if not found
 *
 * @example
 * const trip = await getById('trips', tripId);
 */
export async function getById<T extends Document>(
  collectionName: string,
  id: ObjectId,
  options?: GetByIdOptions
): Promise<T | null> {
  const collection = await getCollection<T>(collectionName);

  const filter = options?.includeDeleted
    ? { _id: id }
    : { _id: id, deletedAt: null };

  const result = await collection.findOne(filter as Filter<T>);
  return result as T | null;
}

/**
 * Update a document by its ObjectId.
 *
 * @param collectionName - Name of the collection
 * @param id - Document ObjectId
 * @param updates - Fields to update
 * @returns The updated document or null if not found
 *
 * @example
 * const updated = await update('trips', tripId, { name: 'New Name' });
 */
export async function update<T extends Document>(
  collectionName: string,
  id: ObjectId,
  updates: Partial<T>
): Promise<T | null> {
  const collection = await getCollection<T>(collectionName);

  const result = await collection.updateOne(
    { _id: id, deletedAt: null } as unknown as Filter<T>,
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return null;
  }

  return getById<T>(collectionName, id);
}

/**
 * Soft delete a document by setting deletedAt timestamp.
 *
 * @param collectionName - Name of the collection
 * @param id - Document ObjectId
 * @returns True if document was deleted, false if not found
 *
 * @example
 * const deleted = await softDelete('trips', tripId);
 */
export async function softDelete(
  collectionName: string,
  id: ObjectId
): Promise<boolean> {
  const collection = await getCollection(collectionName);

  const result = await collection.updateOne(
    { _id: id } as Filter<Document>,
    {
      $set: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return result.matchedCount > 0;
}

/**
 * Permanently delete a document.
 *
 * @param collectionName - Name of the collection
 * @param id - Document ObjectId
 * @returns True if document was deleted, false if not found
 *
 * @example
 * const deleted = await hardDelete('trips', tripId);
 */
export async function hardDelete(
  collectionName: string,
  id: ObjectId
): Promise<boolean> {
  const collection = await getCollection(collectionName);

  const result = await collection.deleteOne({ _id: id } as Filter<Document>);

  return result.deletedCount > 0;
}

/**
 * List documents with filtering and pagination.
 *
 * @param collectionName - Name of the collection
 * @param filter - MongoDB filter
 * @param options - Pagination options
 * @returns Paginated result with data and metadata
 *
 * @example
 * const { data, total } = await list('trips', { groomId }, { page: 1, limit: 10 });
 */
export async function list<T extends Document>(
  collectionName: string,
  filter: Filter<T>,
  options?: PaginationOptions
): Promise<PaginatedResult<T>> {
  const collection = await getCollection<T>(collectionName);

  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(100, Math.max(1, options?.limit ?? 20));
  const skip = (page - 1) * limit;
  const sort = options?.sort ?? { createdAt: -1 };

  // Add soft delete filter
  const filterWithDeleted = {
    ...filter,
    deletedAt: null,
  } as Filter<T>;

  const [data, total] = await Promise.all([
    collection.find(filterWithDeleted).skip(skip).limit(limit).sort(sort).toArray(),
    collection.countDocuments(filterWithDeleted),
  ]);

  return {
    data: data as T[],
    total,
    page,
    limit,
  };
}

/**
 * Count documents matching a filter.
 *
 * @param collectionName - Name of the collection
 * @param filter - MongoDB filter
 * @returns Document count
 *
 * @example
 * const count = await count('expenses', { tripId });
 */
export async function count<T extends Document>(
  collectionName: string,
  filter: Filter<T>
): Promise<number> {
  const collection = await getCollection<T>(collectionName);

  const filterWithDeleted = {
    ...filter,
    deletedAt: null,
  } as Filter<T>;

  return collection.countDocuments(filterWithDeleted);
}

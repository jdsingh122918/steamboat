/**
 * Database module exports.
 *
 * This module provides a unified interface for MongoDB operations.
 *
 * @example
 * import { getDb, getCollection, COLLECTIONS } from '@/lib/db';
 *
 * const trips = await getCollection<Trip>(COLLECTIONS.TRIPS);
 */

export {
  getClient,
  getDb,
  getCollection,
  closeConnection,
  ping,
  COLLECTIONS,
  type CollectionName,
} from './client';

// Re-export all models
export * from './models';

// Re-export all operations
export * from './operations';

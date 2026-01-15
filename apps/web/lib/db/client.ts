/**
 * MongoDB client singleton for database connections.
 *
 * This module provides a singleton MongoClient instance with connection pooling.
 * It handles connection management, reconnection, and graceful shutdown.
 *
 * @example
 * import { getDb, getCollection, COLLECTIONS } from '@/lib/db/client';
 *
 * const trips = await getCollection<Trip>(COLLECTIONS.TRIPS);
 * const allTrips = await trips.find({}).toArray();
 */

import { MongoClient, Db, Collection, Document } from 'mongodb';

/**
 * Collection name constants for type-safe collection access.
 */
export const COLLECTIONS = {
  TRIPS: 'trips',
  ATTENDEES: 'attendees',
  EXPENSES: 'expenses',
  ACTIVITIES: 'activities',
  MEDIA: 'media',
  INVITES: 'invites',
  PAYMENTS: 'payments',
  POLLS: 'polls',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * MongoDB connection options.
 */
const MONGODB_OPTIONS = {
  maxPoolSize: 50,
  minPoolSize: 10,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
  w: 'majority' as const,
};

// Singleton client instance
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

/**
 * Get the MongoDB URI from environment variables.
 *
 * @throws Error if MONGODB_URI is not set
 * @returns The MongoDB connection string
 */
function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI environment variable is not set. ' +
        'Please add it to your .env.local file.'
    );
  }

  return uri;
}

/**
 * Extract database name from MongoDB URI.
 *
 * @param uri - MongoDB connection string
 * @returns Database name or 'steamboat' as default
 */
function extractDbName(uri: string): string {
  try {
    const url = new URL(uri);
    const pathname = url.pathname;
    // Remove leading slash
    const dbName = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    // Remove any query parameters
    return dbName.split('?')[0] || 'steamboat';
  } catch {
    return 'steamboat';
  }
}

/**
 * Get or create the singleton MongoClient instance.
 *
 * Uses a promise-based singleton pattern to ensure only one connection
 * is established even with concurrent calls.
 *
 * @returns Promise resolving to the MongoClient instance
 *
 * @example
 * const client = await getClient();
 * const db = client.db('steamboat');
 */
export async function getClient(): Promise<MongoClient> {
  if (client) {
    return client;
  }

  if (clientPromise) {
    return clientPromise;
  }

  const uri = getMongoUri();

  clientPromise = (async () => {
    const newClient = new MongoClient(uri, MONGODB_OPTIONS);
    await newClient.connect();
    client = newClient;
    return newClient;
  })();

  return clientPromise;
}

/**
 * Get the database instance.
 *
 * @param dbName - Optional database name (defaults to name from URI)
 * @returns Promise resolving to the Db instance
 *
 * @example
 * const db = await getDb();
 * const collection = db.collection('trips');
 */
export async function getDb(dbName?: string): Promise<Db> {
  const mongoClient = await getClient();
  const name = dbName ?? extractDbName(getMongoUri());
  return mongoClient.db(name);
}

/**
 * Get a typed collection from the database.
 *
 * @param collectionName - Name of the collection
 * @returns Promise resolving to the typed Collection
 *
 * @example
 * interface Trip {
 *   _id: ObjectId;
 *   name: string;
 * }
 *
 * const trips = await getCollection<Trip>(COLLECTIONS.TRIPS);
 * const trip = await trips.findOne({ name: 'Vegas Trip' });
 */
export async function getCollection<TSchema extends Document = Document>(
  collectionName: string
): Promise<Collection<TSchema>> {
  const db = await getDb();
  return db.collection<TSchema>(collectionName);
}

/**
 * Close the MongoDB connection.
 *
 * Should be called during graceful shutdown.
 *
 * @example
 * process.on('SIGTERM', async () => {
 *   await closeConnection();
 *   process.exit(0);
 * });
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    clientPromise = null;
  }
}

/**
 * Ping the database to verify connection.
 *
 * @returns Promise resolving to true if ping succeeds
 *
 * @example
 * const isConnected = await ping();
 * console.log('MongoDB connected:', isConnected);
 */
export async function ping(): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.command({ ping: 1 });
    return result.ok === 1;
  } catch {
    return false;
  }
}

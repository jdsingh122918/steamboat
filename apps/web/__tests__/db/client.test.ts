import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock MongoDB to avoid actual database connections in unit tests
vi.mock('mongodb', () => {
  const mockDb = {
    collection: vi.fn().mockReturnValue({
      find: vi.fn(),
      findOne: vi.fn(),
      insertOne: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
    }),
    command: vi.fn().mockResolvedValue({ ok: 1 }),
  };

  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue(mockDb),
    topology: { isConnected: () => true },
  };

  return {
    MongoClient: vi.fn().mockImplementation(() => mockClient),
    ObjectId: vi.fn().mockImplementation((id?: string) => ({
      toString: () => id || 'mock-object-id',
      toHexString: () => id || 'mock-object-id',
    })),
  };
});

describe('MongoDB Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.MONGODB_URI = 'mongodb://localhost:27017/steamboat-test';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('getClient', () => {
    it('should return a MongoClient instance', async () => {
      const { getClient } = await import('@/lib/db/client');

      const client = await getClient();

      expect(client).toBeDefined();
      expect(client.db).toBeDefined();
    });

    it('should return the same client instance on subsequent calls (singleton)', async () => {
      const { getClient } = await import('@/lib/db/client');

      const client1 = await getClient();
      const client2 = await getClient();

      expect(client1).toBe(client2);
    });

    it('should call connect only once for multiple getClient calls', async () => {
      const { MongoClient } = await import('mongodb');
      const { getClient } = await import('@/lib/db/client');

      await getClient();
      await getClient();
      await getClient();

      // The mock client's connect should only be called once
      const mockInstance = (MongoClient as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(mockInstance?.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDb', () => {
    it('should return a database instance', async () => {
      const { getDb } = await import('@/lib/db/client');

      const db = await getDb();

      expect(db).toBeDefined();
      expect(db.collection).toBeDefined();
    });

    it('should use the database name from the connection string', async () => {
      const { getDb, getClient } = await import('@/lib/db/client');

      await getDb();
      const client = await getClient();

      expect(client.db).toHaveBeenCalled();
    });
  });

  describe('getCollection', () => {
    it('should return a typed collection', async () => {
      const { getCollection } = await import('@/lib/db/client');

      interface TestDoc {
        _id: string;
        name: string;
      }

      const collection = await getCollection<TestDoc>('test');

      expect(collection).toBeDefined();
      expect(collection.find).toBeDefined();
      expect(collection.findOne).toBeDefined();
    });

    it('should call db.collection with the correct name', async () => {
      const { getCollection, getDb } = await import('@/lib/db/client');

      interface TestDoc {
        _id: string;
      }

      await getCollection<TestDoc>('trips');
      const db = await getDb();

      expect(db.collection).toHaveBeenCalledWith('trips');
    });
  });

  describe('closeConnection', () => {
    it('should close the client connection', async () => {
      const { getClient, closeConnection } = await import('@/lib/db/client');

      const client = await getClient();
      await closeConnection();

      expect(client.close).toHaveBeenCalled();
    });

    it('should allow reconnecting after close', async () => {
      const { getClient, closeConnection } = await import('@/lib/db/client');

      await getClient();
      await closeConnection();

      // Reset modules to simulate fresh state after close
      vi.resetModules();
      process.env.MONGODB_URI = 'mongodb://localhost:27017/steamboat-test';

      const { getClient: getClientNew } = await import('@/lib/db/client');
      const newClient = await getClientNew();

      expect(newClient).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw error when MONGODB_URI is not set', async () => {
      delete process.env.MONGODB_URI;
      vi.resetModules();

      const { getClient } = await import('@/lib/db/client');

      await expect(getClient()).rejects.toThrow(/MONGODB_URI/);
    });
  });

  describe('ping', () => {
    it('should successfully ping the database', async () => {
      const { ping } = await import('@/lib/db/client');

      const result = await ping();

      expect(result).toBe(true);
    });
  });
});

describe('Collection Types', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.MONGODB_URI = 'mongodb://localhost:27017/steamboat-test';
  });

  it('should export collection name constants', async () => {
    const { COLLECTIONS } = await import('@/lib/db/client');

    expect(COLLECTIONS).toBeDefined();
    expect(COLLECTIONS.TRIPS).toBe('trips');
    expect(COLLECTIONS.ATTENDEES).toBe('attendees');
    expect(COLLECTIONS.EXPENSES).toBe('expenses');
    expect(COLLECTIONS.ACTIVITIES).toBe('activities');
    expect(COLLECTIONS.MEDIA).toBe('media');
    expect(COLLECTIONS.INVITES).toBe('invites');
    expect(COLLECTIONS.PAYMENTS).toBe('payments');
    expect(COLLECTIONS.POLLS).toBe('polls');
  });
});

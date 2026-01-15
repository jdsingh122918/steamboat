import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';

// Mock the MongoDB client
vi.mock('@/lib/db/client', () => {
  const mockCollection = {
    findOne: vi.fn(),
    find: vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    }),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    countDocuments: vi.fn(),
  };

  return {
    getCollection: vi.fn().mockResolvedValue(mockCollection),
    COLLECTIONS: {
      TRIPS: 'trips',
      ATTENDEES: 'attendees',
      EXPENSES: 'expenses',
      ACTIVITIES: 'activities',
      MEDIA: 'media',
      INVITES: 'invites',
      PAYMENTS: 'payments',
      POLLS: 'polls',
    },
  };
});

describe('Base CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a document and return it with _id', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { create } = await import('@/lib/db/operations/base');

      const mockId = new ObjectId();
      const mockCollection = await getCollection('test');
      (mockCollection.insertOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        insertedId: mockId,
        acknowledged: true,
      });

      const doc = { name: 'Test Trip', location: 'Vegas' };
      const result = await create('test', doc);

      expect(mockCollection.insertOne).toHaveBeenCalled();
      expect(result._id).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should add timestamps to new documents', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { create } = await import('@/lib/db/operations/base');

      const mockId = new ObjectId();
      const mockCollection = await getCollection('test');
      (mockCollection.insertOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        insertedId: mockId,
        acknowledged: true,
      });

      const doc = { name: 'Test' };
      const result = await create('test', doc);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.deletedAt).toBeNull();
    });
  });

  describe('getById', () => {
    it('should find a document by ObjectId', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { getById } = await import('@/lib/db/operations/base');

      const mockId = new ObjectId();
      const mockDoc = { _id: mockId, name: 'Test' };
      const mockCollection = await getCollection('test');
      (mockCollection.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(mockDoc);

      const result = await getById('test', mockId);

      expect(mockCollection.findOne).toHaveBeenCalledWith({
        _id: mockId,
        deletedAt: null,
      });
      expect(result).toEqual(mockDoc);
    });

    it('should return null for non-existent document', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { getById } = await import('@/lib/db/operations/base');

      const mockCollection = await getCollection('test');
      (mockCollection.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getById('test', new ObjectId());

      expect(result).toBeNull();
    });

    it('should exclude soft-deleted documents by default', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { getById } = await import('@/lib/db/operations/base');

      const mockId = new ObjectId();
      const mockCollection = await getCollection('test');
      (mockCollection.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await getById('test', mockId);

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null })
      );
    });

    it('should include soft-deleted documents when specified', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { getById } = await import('@/lib/db/operations/base');

      const mockId = new ObjectId();
      const mockCollection = await getCollection('test');
      (mockCollection.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await getById('test', mockId, { includeDeleted: true });

      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: mockId });
    });
  });

  describe('update', () => {
    it('should update a document and return updated version', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { update } = await import('@/lib/db/operations/base');

      const mockId = new ObjectId();
      const mockCollection = await getCollection('test');
      (mockCollection.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });
      (mockCollection.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: mockId,
        name: 'Updated',
      });

      const result = await update('test', mockId, { name: 'Updated' });

      expect(mockCollection.updateOne).toHaveBeenCalled();
      expect(result?.name).toBe('Updated');
    });

    it('should set updatedAt timestamp on update', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { update } = await import('@/lib/db/operations/base');

      const mockId = new ObjectId();
      const mockCollection = await getCollection('test');
      (mockCollection.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });
      (mockCollection.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        _id: mockId,
      });

      await update('test', mockId, { name: 'Updated' });

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            updatedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should return null if document not found', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { update } = await import('@/lib/db/operations/base');

      const mockCollection = await getCollection('test');
      (mockCollection.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0,
      });

      const result = await update('test', new ObjectId(), { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt instead of removing document', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { softDelete } = await import('@/lib/db/operations/base');

      const mockId = new ObjectId();
      const mockCollection = await getCollection('test');
      (mockCollection.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const result = await softDelete('test', mockId);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockId },
        expect.objectContaining({
          $set: expect.objectContaining({
            deletedAt: expect.any(Date),
            updatedAt: expect.any(Date),
          }),
        })
      );
      expect(result).toBe(true);
    });

    it('should return false if document not found', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { softDelete } = await import('@/lib/db/operations/base');

      const mockCollection = await getCollection('test');
      (mockCollection.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0,
      });

      const result = await softDelete('test', new ObjectId());

      expect(result).toBe(false);
    });
  });

  describe('hardDelete', () => {
    it('should permanently remove a document', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { hardDelete } = await import('@/lib/db/operations/base');

      const mockId = new ObjectId();
      const mockCollection = await getCollection('test');
      (mockCollection.deleteOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletedCount: 1,
      });

      const result = await hardDelete('test', mockId);

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: mockId });
      expect(result).toBe(true);
    });

    it('should return false if document not found', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { hardDelete } = await import('@/lib/db/operations/base');

      const mockCollection = await getCollection('test');
      (mockCollection.deleteOne as ReturnType<typeof vi.fn>).mockResolvedValue({
        deletedCount: 0,
      });

      const result = await hardDelete('test', new ObjectId());

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('should return documents with default pagination', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { list } = await import('@/lib/db/operations/base');

      const mockDocs = [{ _id: new ObjectId() }, { _id: new ObjectId() }];
      const mockCollection = await getCollection('test');
      const mockFind = mockCollection.find as ReturnType<typeof vi.fn>;
      mockFind.mockReturnValue({
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockDocs),
      });

      const result = await list('test', {});

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null })
      );
      expect(result.data).toEqual(mockDocs);
    });

    it('should support custom pagination', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { list } = await import('@/lib/db/operations/base');

      const mockCollection = await getCollection('test');
      const mockCursor = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      };
      (mockCollection.find as ReturnType<typeof vi.fn>).mockReturnValue(mockCursor);

      await list('test', {}, { page: 2, limit: 10 });

      expect(mockCursor.skip).toHaveBeenCalledWith(10);
      expect(mockCursor.limit).toHaveBeenCalledWith(10);
    });

    it('should support sorting', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { list } = await import('@/lib/db/operations/base');

      const mockCollection = await getCollection('test');
      const mockCursor = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      };
      (mockCollection.find as ReturnType<typeof vi.fn>).mockReturnValue(mockCursor);

      await list('test', {}, { sort: { createdAt: -1 } });

      expect(mockCursor.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('count', () => {
    it('should return document count with filter', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { count } = await import('@/lib/db/operations/base');

      const mockCollection = await getCollection('test');
      (mockCollection.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(5);

      const result = await count('test', { status: 'active' });

      expect(mockCollection.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          deletedAt: null,
        })
      );
      expect(result).toBe(5);
    });
  });
});

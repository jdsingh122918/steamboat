import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';

// Mock the base operations
vi.mock('@/lib/db/operations/base', () => ({
  create: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  list: vi.fn(),
  count: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  getCollection: vi.fn(),
  COLLECTIONS: {
    TRIPS: 'trips',
    ATTENDEES: 'attendees',
    EXPENSES: 'expenses',
    ACTIVITIES: 'activities',
  },
}));

describe('Trip Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTrip', () => {
    it('should create a trip with required fields', async () => {
      const { create } = await import('@/lib/db/operations/base');
      const { createTrip } = await import('@/lib/db/operations/trips');

      const mockTrip = {
        _id: new ObjectId(),
        name: 'Vegas Bachelor Party',
        location: 'Las Vegas, NV',
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-06-18'),
        groomId: new ObjectId(),
        adminIds: [new ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (create as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);

      const result = await createTrip({
        name: 'Vegas Bachelor Party',
        location: 'Las Vegas, NV',
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-06-18'),
        groomId: new ObjectId(),
        adminIds: [new ObjectId()],
      });

      expect(create).toHaveBeenCalledWith('trips', expect.objectContaining({
        name: 'Vegas Bachelor Party',
      }));
      expect(result).toEqual(mockTrip);
    });
  });

  describe('getTripById', () => {
    it('should get a trip by its ID', async () => {
      const { getById } = await import('@/lib/db/operations/base');
      const { getTripById } = await import('@/lib/db/operations/trips');

      const mockId = new ObjectId();
      const mockTrip = { _id: mockId, name: 'Test Trip' };
      (getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);

      const result = await getTripById(mockId);

      expect(getById).toHaveBeenCalledWith('trips', mockId, undefined);
      expect(result).toEqual(mockTrip);
    });

    it('should return null for non-existent trip', async () => {
      const { getById } = await import('@/lib/db/operations/base');
      const { getTripById } = await import('@/lib/db/operations/trips');

      (getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getTripById(new ObjectId());

      expect(result).toBeNull();
    });
  });

  describe('updateTrip', () => {
    it('should update trip fields', async () => {
      const { update } = await import('@/lib/db/operations/base');
      const { updateTrip } = await import('@/lib/db/operations/trips');

      const mockId = new ObjectId();
      const mockTrip = { _id: mockId, name: 'Updated Trip' };
      (update as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrip);

      const result = await updateTrip(mockId, { name: 'Updated Trip' });

      expect(update).toHaveBeenCalledWith('trips', mockId, { name: 'Updated Trip' });
      expect(result?.name).toBe('Updated Trip');
    });
  });

  describe('deleteTrip', () => {
    it('should soft delete a trip', async () => {
      const { softDelete } = await import('@/lib/db/operations/base');
      const { deleteTrip } = await import('@/lib/db/operations/trips');

      const mockId = new ObjectId();
      (softDelete as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await deleteTrip(mockId);

      expect(softDelete).toHaveBeenCalledWith('trips', mockId);
      expect(result).toBe(true);
    });
  });

  describe('listTrips', () => {
    it('should list all trips with pagination', async () => {
      const { list } = await import('@/lib/db/operations/base');
      const { listTrips } = await import('@/lib/db/operations/trips');

      const mockTrips = [{ _id: new ObjectId() }, { _id: new ObjectId() }];
      (list as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockTrips,
        total: 2,
        page: 1,
        limit: 20,
      });

      const result = await listTrips({});

      expect(list).toHaveBeenCalledWith('trips', {}, undefined);
      expect(result.data).toEqual(mockTrips);
    });
  });

  describe('getTripsByAttendee', () => {
    it('should get trips for an attendee', async () => {
      const { getCollection } = await import('@/lib/db/client');
      const { getTripsByAttendee } = await import('@/lib/db/operations/trips');

      const mockAttendeeId = new ObjectId();
      const mockTrips = [{ _id: new ObjectId(), name: 'Trip 1' }];

      const mockAttendeeCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ tripId: mockTrips[0]._id }]),
        }),
      };

      const mockTripsCollection = {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockTrips),
        }),
      };

      (getCollection as ReturnType<typeof vi.fn>).mockImplementation((name: string) => {
        if (name === 'attendees') return Promise.resolve(mockAttendeeCollection);
        if (name === 'trips') return Promise.resolve(mockTripsCollection);
        return Promise.resolve({});
      });

      const result = await getTripsByAttendee(mockAttendeeId);

      expect(result).toEqual(mockTrips);
    });
  });

  describe('getTripStats', () => {
    it('should return trip statistics', async () => {
      const { getCollection, COLLECTIONS } = await import('@/lib/db/client');
      const { getTripStats } = await import('@/lib/db/operations/trips');

      const mockTripId = new ObjectId();

      const mockCountFn = vi.fn().mockResolvedValue(5);
      const mockAggregateFn = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ total: 25000 }]),
      });

      const mockCollection = {
        countDocuments: mockCountFn,
        aggregate: mockAggregateFn,
      };

      (getCollection as ReturnType<typeof vi.fn>).mockResolvedValue(mockCollection);

      const result = await getTripStats(mockTripId);

      expect(result).toBeDefined();
      expect(typeof result.attendeeCount).toBe('number');
      expect(typeof result.expenseCount).toBe('number');
      expect(typeof result.activityCount).toBe('number');
      expect(typeof result.totalExpenses_cents).toBe('number');
    });
  });
});

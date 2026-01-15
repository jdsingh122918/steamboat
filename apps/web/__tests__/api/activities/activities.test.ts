import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

// Mock the activity operations
vi.mock('@/lib/db/operations/activities', () => ({
  getActivitiesByTrip: vi.fn(),
  createActivity: vi.fn(),
  getActivityRsvpCounts: vi.fn(),
}));

import { GET, POST } from '@/app/api/trips/[tripId]/activities/route';
import * as guards from '@/lib/auth/guards';
import * as activityOps from '@/lib/db/operations/activities';
import { Activity, Attendee } from '@/lib/db/models';

// Helper to create mock attendee
function createMockAttendee(overrides: Partial<Attendee> = {}): Attendee {
  return {
    _id: new ObjectId(),
    tripId: new ObjectId(),
    name: 'Test User',
    email: 'test@example.com',
    role: 'member',
    rsvpStatus: 'confirmed',
    inviteToken: 'test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Attendee;
}

// Helper to create mock activity
function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    _id: new ObjectId(),
    tripId: new ObjectId(),
    name: 'Test Activity',
    description: 'Test description',
    startDate: new Date('2025-06-15T10:00:00Z'),
    endDate: new Date('2025-06-15T12:00:00Z'),
    location: 'Test Location',
    category: 'entertainment',
    rsvps: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Activity;
}

describe('Activities API - List and Create', () => {
  const tripId = new ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips/[tripId]/activities', () => {
    it('should return 403 when user does not have trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Forbidden: Not a member of this trip')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    it('should return 400 for invalid tripId format', async () => {
      const invalidTripId = 'invalid-id';
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Invalid ObjectId')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${invalidTripId}/activities`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId: invalidTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    it('should return activities list sorted by startDate', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivities = [
        createMockActivity({
          tripId: tripObjectId,
          name: 'Activity 1',
          startDate: new Date('2025-06-15T10:00:00Z'),
        }),
        createMockActivity({
          tripId: tripObjectId,
          name: 'Activity 2',
          startDate: new Date('2025-06-16T10:00:00Z'),
        }),
      ];

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivitiesByTrip).mockResolvedValue(mockActivities);
      vi.mocked(activityOps.getActivityRsvpCounts).mockResolvedValue({
        going: 2,
        maybe: 1,
        not_going: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('Activity 1');
      expect(data.data[1].name).toBe('Activity 2');
    });

    it('should filter activities by date when query param provided', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivities = [
        createMockActivity({
          tripId: tripObjectId,
          name: 'Activity on target date',
          startDate: new Date('2025-06-15T10:00:00Z'),
        }),
        createMockActivity({
          tripId: tripObjectId,
          name: 'Activity on different date',
          startDate: new Date('2025-06-16T10:00:00Z'),
        }),
      ];

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      // Return only activities that match the date filter (simulating filtered result)
      vi.mocked(activityOps.getActivitiesByTrip).mockResolvedValue(mockActivities);
      vi.mocked(activityOps.getActivityRsvpCounts).mockResolvedValue({
        going: 2,
        maybe: 1,
        not_going: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities?date=2025-06-15`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // The route should filter by date
      expect(data.data.every((a: any) =>
        a.startDate.startsWith('2025-06-15') || new Date(a.startDate).toISOString().startsWith('2025-06-15')
      )).toBe(true);
    });

    it('should include RSVP counts in response', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        tripId: tripObjectId,
        rsvps: [
          { attendeeId: new ObjectId(), status: 'going' },
          { attendeeId: new ObjectId(), status: 'going' },
          { attendeeId: new ObjectId(), status: 'maybe' },
        ],
      });

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivitiesByTrip).mockResolvedValue([mockActivity]);
      vi.mocked(activityOps.getActivityRsvpCounts).mockResolvedValue({
        going: 2,
        maybe: 1,
        not_going: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0].rsvpCounts).toBeDefined();
      expect(data.data[0].rsvpCounts.going).toBe(2);
      expect(data.data[0].rsvpCounts.maybe).toBe(1);
      expect(data.data[0].rsvpCounts.not_going).toBe(0);
    });

    it('should return empty array when no activities exist', async () => {
      const mockAttendee = createMockAttendee();

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivitiesByTrip).mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`
      );

      const response = await GET(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });
  });

  describe('POST /api/trips/[tripId]/activities', () => {
    it('should return 403 when user is not admin', async () => {
      vi.mocked(guards.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Activity',
            startDate: '2025-06-15T10:00:00Z',
            category: 'entertainment',
          }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    it('should return 400 for missing required fields', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`,
        {
          method: 'POST',
          body: JSON.stringify({
            // Missing name, startDate, category
          }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should return 400 for invalid category', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Activity',
            startDate: '2025-06-15T10:00:00Z',
            category: 'invalid_category',
          }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('category');
    });

    it('should create activity successfully', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const tripObjectId = new ObjectId(tripId);

      const createdActivity = createMockActivity({
        tripId: tripObjectId,
        name: 'Test Activity',
        startDate: new Date('2025-06-15T10:00:00Z'),
        category: 'entertainment',
      });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.createActivity).mockResolvedValue(createdActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Activity',
            startDate: '2025-06-15T10:00:00Z',
            category: 'entertainment',
          }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test Activity');
    });

    it('should set tripId and rsvps array automatically', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const tripObjectId = new ObjectId(tripId);

      const createdActivity = createMockActivity({
        tripId: tripObjectId,
        name: 'Test Activity',
        rsvps: [],
      });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.createActivity).mockResolvedValue(createdActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Activity',
            startDate: '2025-06-15T10:00:00Z',
            category: 'entertainment',
          }),
        }
      );

      await POST(request, { params: Promise.resolve({ tripId }) });

      // Verify createActivity was called with tripId and empty rsvps
      expect(activityOps.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: expect.any(ObjectId),
          rsvps: [],
        })
      );
    });

    it('should accept optional fields', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const tripObjectId = new ObjectId(tripId);

      const createdActivity = createMockActivity({
        tripId: tripObjectId,
        name: 'Test Activity',
        description: 'Test description',
        location: 'Test Location',
        endDate: new Date('2025-06-15T12:00:00Z'),
      });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.createActivity).mockResolvedValue(createdActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Activity',
            description: 'Test description',
            location: 'Test Location',
            startDate: '2025-06-15T10:00:00Z',
            endDate: '2025-06-15T12:00:00Z',
            category: 'entertainment',
          }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.description).toBe('Test description');
      expect(data.data.location).toBe('Test Location');
    });

    it('should handle database errors', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.createActivity).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Activity',
            startDate: '2025-06-15T10:00:00Z',
            category: 'entertainment',
          }),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ tripId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});

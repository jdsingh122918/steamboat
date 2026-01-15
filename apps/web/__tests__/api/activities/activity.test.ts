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
  getActivityById: vi.fn(),
  updateActivity: vi.fn(),
  deleteActivity: vi.fn(),
  getActivityRsvpCounts: vi.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/trips/[tripId]/activities/[activityId]/route';
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

describe('Activities API - Single Activity', () => {
  const tripId = new ObjectId().toString();
  const activityId = new ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/trips/[tripId]/activities/[activityId]', () => {
    it('should return 403 when user does not have trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Forbidden: Not a member of this trip')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    it('should return 400 for invalid activityId format', async () => {
      const mockAttendee = createMockAttendee();
      const invalidActivityId = 'invalid-id';

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${invalidActivityId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId, activityId: invalidActivityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    it('should return 404 when activity not found', async () => {
      const mockAttendee = createMockAttendee();

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 404 when activity belongs to different trip', async () => {
      const mockAttendee = createMockAttendee();
      const differentTripId = new ObjectId();

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: differentTripId, // Different trip
      });

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return activity with RSVP details', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
        rsvps: [
          { attendeeId: new ObjectId(), status: 'going' },
          { attendeeId: new ObjectId(), status: 'maybe' },
        ],
      });

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.getActivityRsvpCounts).mockResolvedValue({
        going: 1,
        maybe: 1,
        not_going: 0,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`
      );

      const response = await GET(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data._id).toBe(activityId);
      expect(data.data.rsvps).toHaveLength(2);
      expect(data.data.rsvpCounts).toEqual({
        going: 1,
        maybe: 1,
        not_going: 0,
      });
    });
  });

  describe('PUT /api/trips/[tripId]/activities/[activityId]', () => {
    it('should return 403 when user is not admin', async () => {
      vi.mocked(guards.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    it('should return 400 for invalid activityId format', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const invalidActivityId = 'invalid-id';

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${invalidActivityId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId, activityId: invalidActivityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when activity not found', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid update data', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ category: 'invalid_category' }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should update activity successfully', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      const updatedActivity = {
        ...mockActivity,
        name: 'Updated Activity',
        description: 'Updated description',
      };

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivity).mockResolvedValue(updatedActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Activity',
            description: 'Updated description',
          }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Updated Activity');
      expect(data.data.description).toBe('Updated description');
    });

    it('should not allow changing tripId', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivity).mockResolvedValue(mockActivity);

      const newTripId = new ObjectId().toString();
      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: 'Updated Activity',
            tripId: newTripId, // Attempt to change tripId
          }),
        }
      );

      await PUT(request, {
        params: Promise.resolve({ tripId, activityId }),
      });

      // Verify updateActivity was called without tripId
      expect(activityOps.updateActivity).toHaveBeenCalledWith(
        expect.any(ObjectId),
        expect.not.objectContaining({ tripId: expect.anything() })
      );
    });
  });

  describe('DELETE /api/trips/[tripId]/activities/[activityId]', () => {
    it('should return 403 when user is not admin', async () => {
      vi.mocked(guards.requireAdmin).mockRejectedValue(
        new Error('Forbidden: Admin access required')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    it('should return 400 for invalid activityId format', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const invalidActivityId = 'invalid-id';

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${invalidActivityId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId, activityId: invalidActivityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 when activity not found', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should soft delete activity successfully', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.deleteActivity).mockResolvedValue(true);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(activityOps.deleteActivity).toHaveBeenCalledWith(
        expect.any(ObjectId)
      );
    });

    it('should return 500 when delete operation fails', async () => {
      const mockAttendee = createMockAttendee({ role: 'admin' });
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      vi.mocked(guards.requireAdmin).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.deleteActivity).mockResolvedValue(false);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

// Mock the activity operations
vi.mock('@/lib/db/operations/activities', () => ({
  getActivityById: vi.fn(),
  updateActivityRsvp: vi.fn(),
  updateActivity: vi.fn(),
}));

import { POST, DELETE } from '@/app/api/trips/[tripId]/activities/[activityId]/rsvp/route';
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

describe('Activities API - RSVP', () => {
  const tripId = new ObjectId().toString();
  const activityId = new ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/trips/[tripId]/activities/[activityId]/rsvp', () => {
    it('should return 403 when user does not have trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Forbidden: Not a member of this trip')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'going' }),
        }
      );

      const response = await POST(request, {
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
        `http://localhost/api/trips/${tripId}/activities/${invalidActivityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'going' }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId, activityId: invalidActivityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    it('should return 400 for missing status field', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('status');
    });

    it('should return 400 for invalid status value', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'invalid_status' }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('status');
    });

    it('should return 404 when activity not found', async () => {
      const mockAttendee = createMockAttendee();

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'going' }),
        }
      );

      const response = await POST(request, {
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
        tripId: differentTripId,
      });

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'going' }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should add RSVP successfully with going status', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      const updatedActivity = {
        ...mockActivity,
        rsvps: [{ attendeeId: mockAttendee._id, status: 'going' as const }],
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivityRsvp).mockResolvedValue(updatedActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'going' }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(activityOps.updateActivityRsvp).toHaveBeenCalledWith(
        expect.any(ObjectId),
        expect.any(ObjectId),
        'going'
      );
    });

    it('should add RSVP with maybe status', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      const updatedActivity = {
        ...mockActivity,
        rsvps: [{ attendeeId: mockAttendee._id, status: 'maybe' as const }],
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivityRsvp).mockResolvedValue(updatedActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'maybe' }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(activityOps.updateActivityRsvp).toHaveBeenCalledWith(
        expect.any(ObjectId),
        expect.any(ObjectId),
        'maybe'
      );
    });

    it('should add RSVP with not_going status', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      const updatedActivity = {
        ...mockActivity,
        rsvps: [{ attendeeId: mockAttendee._id, status: 'not_going' as const }],
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivityRsvp).mockResolvedValue(updatedActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'not_going' }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(activityOps.updateActivityRsvp).toHaveBeenCalledWith(
        expect.any(ObjectId),
        expect.any(ObjectId),
        'not_going'
      );
    });

    it('should update existing RSVP', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      // Activity already has an RSVP from this attendee
      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
        rsvps: [{ attendeeId: mockAttendee._id, status: 'maybe' }],
      });

      const updatedActivity = {
        ...mockActivity,
        rsvps: [{ attendeeId: mockAttendee._id, status: 'going' as const }],
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivityRsvp).mockResolvedValue(updatedActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'going' }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(activityOps.updateActivityRsvp).toHaveBeenCalledWith(
        expect.any(ObjectId),
        expect.any(ObjectId),
        'going'
      );
    });

    it('should only allow attendee to RSVP for themselves', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivityRsvp).mockResolvedValue(mockActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'going' }),
        }
      );

      await POST(request, {
        params: Promise.resolve({ tripId, activityId }),
      });

      // Verify updateActivityRsvp was called with the current attendee's ID
      expect(activityOps.updateActivityRsvp).toHaveBeenCalledWith(
        expect.any(ObjectId),
        new ObjectId(mockAttendee._id.toString()),
        'going'
      );
    });

    it('should handle database errors', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
      });

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivityRsvp).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status: 'going' }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/trips/[tripId]/activities/[activityId]/rsvp', () => {
    it('should return 403 when user does not have trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(
        new Error('Forbidden: Not a member of this trip')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
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
      const mockAttendee = createMockAttendee();
      const invalidActivityId = 'invalid-id';

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${invalidActivityId}/rsvp`,
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
      const mockAttendee = createMockAttendee();

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should remove RSVP successfully', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      // Activity has an RSVP from this attendee
      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
        rsvps: [
          { attendeeId: mockAttendee._id, status: 'going' },
          { attendeeId: new ObjectId(), status: 'maybe' },
        ],
      });

      const updatedActivity = {
        ...mockActivity,
        rsvps: [{ attendeeId: new ObjectId(), status: 'maybe' as const }],
      };

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivity).mockResolvedValue(updatedActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when RSVP does not exist', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      // Activity has no RSVP from this attendee
      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
        rsvps: [{ attendeeId: new ObjectId(), status: 'going' }],
      });

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ tripId, activityId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('RSVP');
    });

    it('should only remove the current attendee RSVP', async () => {
      const mockAttendee = createMockAttendee();
      const otherAttendeeId = new ObjectId();
      const tripObjectId = new ObjectId(tripId);

      // Activity has RSVPs from multiple attendees
      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
        rsvps: [
          { attendeeId: mockAttendee._id, status: 'going' },
          { attendeeId: otherAttendeeId, status: 'maybe' },
        ],
      });

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivity).mockResolvedValue({
        ...mockActivity,
        rsvps: [{ attendeeId: otherAttendeeId, status: 'maybe' }],
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
        { method: 'DELETE' }
      );

      await DELETE(request, {
        params: Promise.resolve({ tripId, activityId }),
      });

      // Verify updateActivity was called with rsvps excluding the current attendee
      expect(activityOps.updateActivity).toHaveBeenCalledWith(
        expect.any(ObjectId),
        expect.objectContaining({
          rsvps: expect.arrayContaining([
            expect.objectContaining({
              attendeeId: otherAttendeeId,
            }),
          ]),
        })
      );

      // Verify the current attendee's RSVP was removed
      const updateCall = vi.mocked(activityOps.updateActivity).mock.calls[0];
      const updatedRsvps = updateCall[1].rsvps;
      const hasCurrentAttendeeRsvp = updatedRsvps?.some(
        (r) => r.attendeeId.toString() === mockAttendee._id.toString()
      );
      expect(hasCurrentAttendeeRsvp).toBe(false);
    });

    it('should handle database errors', async () => {
      const mockAttendee = createMockAttendee();
      const tripObjectId = new ObjectId(tripId);

      const mockActivity = createMockActivity({
        _id: new ObjectId(activityId),
        tripId: tripObjectId,
        rsvps: [{ attendeeId: mockAttendee._id, status: 'going' }],
      });

      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendee._id.toString() } as any,
        attendee: mockAttendee,
      });
      vi.mocked(activityOps.getActivityById).mockResolvedValue(mockActivity);
      vi.mocked(activityOps.updateActivity).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest(
        `http://localhost/api/trips/${tripId}/activities/${activityId}/rsvp`,
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

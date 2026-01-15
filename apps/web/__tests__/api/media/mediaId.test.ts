import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

// Mock the media operations
vi.mock('@/lib/db/operations/media', () => ({
  getMediaById: vi.fn(),
  updateMedia: vi.fn(),
  deleteMedia: vi.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/trips/[tripId]/media/[mediaId]/route';
import * as guards from '@/lib/auth/guards';
import * as mediaOps from '@/lib/db/operations/media';

describe('/api/trips/[tripId]/media/[mediaId] route', () => {
  const mockTripId = new ObjectId().toString();
  const mockMediaId = new ObjectId().toString();
  const mockAttendeeId = new ObjectId();
  const mockAttendee = {
    _id: mockAttendeeId,
    tripId: new ObjectId(mockTripId),
    name: 'Test User',
    role: 'member' as const,
  };
  const mockAdminAttendee = {
    ...mockAttendee,
    role: 'admin' as const,
  };

  const mockMediaItem = {
    _id: new ObjectId(mockMediaId),
    tripId: new ObjectId(mockTripId),
    uploaderId: mockAttendeeId,
    type: 'photo' as const,
    url: 'https://res.cloudinary.com/test/image/upload/v123/photo1.jpg',
    fileSize: 1024000,
    caption: 'Test caption',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authorized for trip access
    vi.mocked(guards.requireTripAccess).mockResolvedValue({
      session: { attendeeId: mockAttendeeId.toString() } as any,
      attendee: mockAttendee as any,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/trips/[tripId]/media/[mediaId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest('http://localhost/api/trips/invalid-id/media/abc');
      const response = await GET(request, {
        params: Promise.resolve({ tripId: 'invalid-id', mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 400 for invalid mediaId format', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/invalid-id`);
      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid mediaId');
    });

    it('should return 403 when user lacks trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(new Error('Forbidden: Not a member of this trip'));

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`);
      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 404 when media not found', async () => {
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`);
      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should return 404 when media belongs to different trip', async () => {
      const differentTripMedia = {
        ...mockMediaItem,
        tripId: new ObjectId(), // Different trip
      };
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(differentTripMedia as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`);
      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return media item successfully', async () => {
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mockMediaItem as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`);
      const response = await GET(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.url).toBe(mockMediaItem.url);
      expect(data.data.type).toBe('photo');
    });
  });

  describe('PUT /api/trips/[tripId]/media/[mediaId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest('http://localhost/api/trips/invalid-id/media/' + mockMediaId, {
        method: 'PUT',
        body: JSON.stringify({ caption: 'Updated caption' }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ tripId: 'invalid-id', mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 400 for invalid mediaId format', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/invalid-id`, {
        method: 'PUT',
        body: JSON.stringify({ caption: 'Updated caption' }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid mediaId');
    });

    it('should return 403 when user lacks trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(new Error('Forbidden: Not a member of this trip'));

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'PUT',
        body: JSON.stringify({ caption: 'Updated caption' }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 404 when media not found', async () => {
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'PUT',
        body: JSON.stringify({ caption: 'Updated caption' }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 403 when non-uploader/non-admin tries to update', async () => {
      const otherUploaderId = new ObjectId();
      const mediaByOther = {
        ...mockMediaItem,
        uploaderId: otherUploaderId,
      };
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mediaByOther as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'PUT',
        body: JSON.stringify({ caption: 'Updated caption' }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Only the uploader or admin');
    });

    it('should allow admin to update any media', async () => {
      const otherUploaderId = new ObjectId();
      const mediaByOther = {
        ...mockMediaItem,
        uploaderId: otherUploaderId,
      };
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mediaByOther as any);
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAdminAttendee as any,
      });

      const updatedMedia = {
        ...mediaByOther,
        caption: 'Admin updated caption',
      };
      vi.mocked(mediaOps.updateMedia).mockResolvedValue(updatedMedia as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'PUT',
        body: JSON.stringify({ caption: 'Admin updated caption' }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow uploader to update their own media', async () => {
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mockMediaItem as any);

      const updatedMedia = {
        ...mockMediaItem,
        caption: 'Updated caption',
      };
      vi.mocked(mediaOps.updateMedia).mockResolvedValue(updatedMedia as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'PUT',
        body: JSON.stringify({ caption: 'Updated caption' }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.caption).toBe('Updated caption');
    });

    it('should update media tags', async () => {
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mockMediaItem as any);

      const updatedMedia = {
        ...mockMediaItem,
        tags: ['sunset', 'cabin', 'day-2'],
      };
      vi.mocked(mediaOps.updateMedia).mockResolvedValue(updatedMedia as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'PUT',
        body: JSON.stringify({ tags: ['sunset', 'cabin', 'day-2'] }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tags).toEqual(['sunset', 'cabin', 'day-2']);
    });

    it('should return 400 for invalid update fields', async () => {
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mockMediaItem as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'PUT',
        body: JSON.stringify({ url: 'https://malicious.com/hack.jpg' }), // Cannot change URL
      });
      const response = await PUT(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid update');
    });
  });

  describe('DELETE /api/trips/[tripId]/media/[mediaId]', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest('http://localhost/api/trips/invalid-id/media/' + mockMediaId, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: 'invalid-id', mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 400 for invalid mediaId format', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/invalid-id`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: 'invalid-id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid mediaId');
    });

    it('should return 403 when user lacks trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(new Error('Forbidden: Not a member of this trip'));

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 404 when media not found', async () => {
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 403 when non-uploader/non-admin tries to delete', async () => {
      const otherUploaderId = new ObjectId();
      const mediaByOther = {
        ...mockMediaItem,
        uploaderId: otherUploaderId,
      };
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mediaByOther as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Only the uploader or admin');
    });

    it('should allow admin to delete any media', async () => {
      const otherUploaderId = new ObjectId();
      const mediaByOther = {
        ...mockMediaItem,
        uploaderId: otherUploaderId,
      };
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mediaByOther as any);
      vi.mocked(guards.requireTripAccess).mockResolvedValue({
        session: { attendeeId: mockAttendeeId.toString() } as any,
        attendee: mockAdminAttendee as any,
      });
      vi.mocked(mediaOps.deleteMedia).mockResolvedValue(true);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow uploader to delete their own media', async () => {
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mockMediaItem as any);
      vi.mocked(mediaOps.deleteMedia).mockResolvedValue(true);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ deleted: true });
    });

    it('should handle delete failure gracefully', async () => {
      vi.mocked(mediaOps.getMediaById).mockResolvedValue(mockMediaItem as any);
      vi.mocked(mediaOps.deleteMedia).mockResolvedValue(false);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/${mockMediaId}`, {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ tripId: mockTripId, mediaId: mockMediaId }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});

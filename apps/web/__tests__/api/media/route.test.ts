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
  createMedia: vi.fn(),
  listMedia: vi.fn(),
  getMediaByTrip: vi.fn(),
}));

import { GET, POST } from '@/app/api/trips/[tripId]/media/route';
import * as guards from '@/lib/auth/guards';
import * as mediaOps from '@/lib/db/operations/media';

describe('/api/trips/[tripId]/media route', () => {
  const mockTripId = new ObjectId().toString();
  const mockAttendeeId = new ObjectId();
  const mockAttendee = {
    _id: mockAttendeeId,
    tripId: new ObjectId(mockTripId),
    name: 'Test User',
    role: 'member' as const,
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

  describe('GET /api/trips/[tripId]/media', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest('http://localhost/api/trips/invalid-id/media');
      const response = await GET(request, { params: Promise.resolve({ tripId: 'invalid-id' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 403 when user lacks trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(new Error('Forbidden: Not a member of this trip'));

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`);
      const response = await GET(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    it('should return empty list when no media exists', async () => {
      vi.mocked(mediaOps.listMedia).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`);
      const response = await GET(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should return media items for the trip', async () => {
      const mockMedia = [
        {
          _id: new ObjectId(),
          tripId: new ObjectId(mockTripId),
          uploaderId: mockAttendeeId,
          type: 'photo',
          url: 'https://res.cloudinary.com/test/image/upload/v123/photo1.jpg',
          fileSize: 1024000,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      vi.mocked(mediaOps.listMedia).mockResolvedValue({
        data: mockMedia as any,
        total: 1,
        page: 1,
        limit: 20,
      });

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`);
      const response = await GET(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].type).toBe('photo');
    });

    it('should filter by type=photo', async () => {
      vi.mocked(mediaOps.listMedia).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media?type=photo`);
      const response = await GET(request, { params: Promise.resolve({ tripId: mockTripId }) });

      expect(response.status).toBe(200);
      expect(vi.mocked(mediaOps.listMedia)).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'photo' }),
        expect.any(Object)
      );
    });

    it('should filter by type=video', async () => {
      vi.mocked(mediaOps.listMedia).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media?type=video`);
      const response = await GET(request, { params: Promise.resolve({ tripId: mockTripId }) });

      expect(response.status).toBe(200);
      expect(vi.mocked(mediaOps.listMedia)).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'video' }),
        expect.any(Object)
      );
    });

    it('should filter by uploadedBy', async () => {
      const uploaderId = new ObjectId().toString();
      vi.mocked(mediaOps.listMedia).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media?uploadedBy=${uploaderId}`);
      const response = await GET(request, { params: Promise.resolve({ tripId: mockTripId }) });

      expect(response.status).toBe(200);
      expect(vi.mocked(mediaOps.listMedia)).toHaveBeenCalledWith(
        expect.objectContaining({ uploaderId: expect.any(ObjectId) }),
        expect.any(Object)
      );
    });

    it('should return 400 for invalid uploadedBy format', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media?uploadedBy=invalid`);
      const response = await GET(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid uploadedBy');
    });

    it('should return 400 for invalid type filter value', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media?type=document`);
      const response = await GET(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid type');
    });

    it('should combine multiple filters', async () => {
      const uploaderId = new ObjectId().toString();
      vi.mocked(mediaOps.listMedia).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const request = new NextRequest(
        `http://localhost/api/trips/${mockTripId}/media?type=photo&uploadedBy=${uploaderId}`
      );
      const response = await GET(request, { params: Promise.resolve({ tripId: mockTripId }) });

      expect(response.status).toBe(200);
      expect(vi.mocked(mediaOps.listMedia)).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: expect.any(ObjectId),
          type: 'photo',
          uploaderId: expect.any(ObjectId),
        }),
        expect.any(Object)
      );
    });
  });

  describe('POST /api/trips/[tripId]/media', () => {
    const validMediaData = {
      url: 'https://res.cloudinary.com/test/image/upload/v123/photo1.jpg',
      type: 'photo',
      fileSize: 1024000,
    };

    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest('http://localhost/api/trips/invalid-id/media', {
        method: 'POST',
        body: JSON.stringify(validMediaData),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: 'invalid-id' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 403 when user lacks trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(new Error('Forbidden: Not a member of this trip'));

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify(validMediaData),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 when url is missing', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify({ type: 'photo', fileSize: 1024 }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('url');
    });

    it('should return 400 when type is missing', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/photo.jpg', fileSize: 1024 }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('type');
    });

    it('should return 400 when fileSize is missing', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/photo.jpg', type: 'photo' }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('fileSize');
    });

    it('should return 400 for invalid type', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/file.pdf', type: 'document', fileSize: 1024 }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('type');
    });

    it('should return 400 for invalid url format', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify({ url: 'not-a-valid-url', type: 'photo', fileSize: 1024 }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('url');
    });

    it('should return 400 for negative fileSize', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com/photo.jpg', type: 'photo', fileSize: -100 }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('fileSize');
    });

    it('should create media record successfully', async () => {
      const createdMedia = {
        _id: new ObjectId(),
        tripId: new ObjectId(mockTripId),
        uploaderId: mockAttendeeId,
        url: validMediaData.url,
        type: validMediaData.type,
        fileSize: validMediaData.fileSize,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(mediaOps.createMedia).mockResolvedValue(createdMedia as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify(validMediaData),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('photo');
      expect(data.data.url).toBe(validMediaData.url);
    });

    it('should create media with optional exif data', async () => {
      const mediaDataWithExif = {
        ...validMediaData,
        exif: {
          date_taken: '2024-01-15T12:00:00Z',
          gps_latitude: 39.7392,
          gps_longitude: -104.9903,
          camera_make: 'Apple',
          camera_model: 'iPhone 15 Pro',
        },
      };

      const createdMedia = {
        _id: new ObjectId(),
        tripId: new ObjectId(mockTripId),
        uploaderId: mockAttendeeId,
        ...mediaDataWithExif,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(mediaOps.createMedia).mockResolvedValue(createdMedia as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify(mediaDataWithExif),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.exif.gps_latitude).toBe(39.7392);
      expect(data.data.exif.camera_make).toBe('Apple');
    });

    it('should create media with optional caption', async () => {
      const mediaDataWithCaption = {
        ...validMediaData,
        caption: 'Beautiful sunset at the cabin',
      };

      const createdMedia = {
        _id: new ObjectId(),
        tripId: new ObjectId(mockTripId),
        uploaderId: mockAttendeeId,
        ...mediaDataWithCaption,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(mediaOps.createMedia).mockResolvedValue(createdMedia as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify(mediaDataWithCaption),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.caption).toBe('Beautiful sunset at the cabin');
    });

    it('should create media with optional tags', async () => {
      const mediaDataWithTags = {
        ...validMediaData,
        tags: ['cabin', 'sunset', 'day-1'],
      };

      const createdMedia = {
        _id: new ObjectId(),
        tripId: new ObjectId(mockTripId),
        uploaderId: mockAttendeeId,
        ...mediaDataWithTags,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(mediaOps.createMedia).mockResolvedValue(createdMedia as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify(mediaDataWithTags),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.tags).toEqual(['cabin', 'sunset', 'day-1']);
    });

    it('should create video media type', async () => {
      const videoData = {
        url: 'https://res.cloudinary.com/test/video/upload/v123/video1.mp4',
        type: 'video',
        fileSize: 10240000,
      };

      const createdMedia = {
        _id: new ObjectId(),
        tripId: new ObjectId(mockTripId),
        uploaderId: mockAttendeeId,
        ...videoData,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(mediaOps.createMedia).mockResolvedValue(createdMedia as any);

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify(videoData),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe('video');
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(mediaOps.createMedia).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media`, {
        method: 'POST',
        body: JSON.stringify(validMediaData),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });
});

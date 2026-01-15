import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock the auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

// Mock the env module
vi.mock('@/lib/env', () => ({
  env: {
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: '123456789',
    CLOUDINARY_API_SECRET: 'test-secret',
  },
}));

import { POST } from '@/app/api/trips/[tripId]/media/upload-url/route';
import * as guards from '@/lib/auth/guards';

describe('/api/trips/[tripId]/media/upload-url route', () => {
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

  describe('POST /api/trips/[tripId]/media/upload-url', () => {
    it('should return 400 for invalid tripId format', async () => {
      const request = new NextRequest('http://localhost/api/trips/invalid-id/media/upload-url', {
        method: 'POST',
        body: JSON.stringify({ type: 'photo' }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: 'invalid-id' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid tripId');
    });

    it('should return 403 when user lacks trip access', async () => {
      vi.mocked(guards.requireTripAccess).mockRejectedValue(new Error('Forbidden: Not a member of this trip'));

      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'photo' }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 when type is missing', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('type');
    });

    it('should return 400 for invalid type', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'document' }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('type');
    });

    it('should generate upload URL for photo', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'photo' }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.uploadUrl).toContain('cloudinary.com');
      expect(data.data.publicId).toBeDefined();
      expect(data.data.signature).toBeDefined();
      expect(data.data.timestamp).toBeDefined();
      expect(data.data.apiKey).toBe('123456789');
      expect(data.data.cloudName).toBe('test-cloud');
    });

    it('should generate upload URL for video', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'video' }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.uploadUrl).toContain('cloudinary.com');
      expect(data.data.resourceType).toBe('video');
    });

    it('should include proper folder structure in publicId', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'photo' }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.publicId).toContain(`trips/${mockTripId}`);
    });

    it('should generate unique publicId on each request', async () => {
      const request1 = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'photo' }),
      });
      const request2 = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'photo' }),
      });

      const response1 = await POST(request1, { params: Promise.resolve({ tripId: mockTripId }) });
      const response2 = await POST(request2, { params: Promise.resolve({ tripId: mockTripId }) });

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.data.publicId).not.toBe(data2.data.publicId);
    });

    it('should use different resource types for photos vs videos', async () => {
      const photoRequest = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'photo' }),
      });
      const videoRequest = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'video' }),
      });

      const photoResponse = await POST(photoRequest, { params: Promise.resolve({ tripId: mockTripId }) });
      const videoResponse = await POST(videoRequest, { params: Promise.resolve({ tripId: mockTripId }) });

      const photoData = await photoResponse.json();
      const videoData = await videoResponse.json();

      expect(photoData.data.resourceType).toBe('image');
      expect(videoData.data.resourceType).toBe('video');
    });

    it('should set proper upload preset options', async () => {
      const request = new NextRequest(`http://localhost/api/trips/${mockTripId}/media/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ type: 'photo' }),
      });

      const response = await POST(request, { params: Promise.resolve({ tripId: mockTripId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.folder).toBe(`trips/${mockTripId}`);
    });
  });
});

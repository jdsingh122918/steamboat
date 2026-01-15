/**
 * Tests for POST /api/trips/[tripId]/polls/[pollId]/close
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireAdmin: vi.fn(),
}));

// Mock poll operations
vi.mock('@/lib/db/operations/polls', () => ({
  getPollById: vi.fn(),
  closePoll: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { POST } from '@/app/api/trips/[tripId]/polls/[pollId]/close/route';
import { requireAdmin } from '@/lib/auth/guards';
import * as pollOps from '@/lib/db/operations/polls';

describe('POST /api/trips/[tripId]/polls/[pollId]/close', () => {
  const tripId = new ObjectId();
  const pollId = new ObjectId();
  const attendeeId = new ObjectId();

  const mockAdminAttendee = {
    _id: attendeeId,
    tripId,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    rsvpStatus: 'confirmed',
  };

  const mockSession = {
    attendeeId: attendeeId.toString(),
    tripId: tripId.toString(),
  };

  const mockOpenPoll = {
    _id: pollId,
    tripId,
    question: 'Where should we eat?',
    options: [
      { id: 'opt1', text: 'Italian' },
      { id: 'opt2', text: 'Mexican' },
    ],
    votes: [
      { attendeeId, optionId: 'opt1' },
      { attendeeId: new ObjectId(), optionId: 'opt2' },
    ],
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockClosedPoll = {
    ...mockOpenPoll,
    status: 'closed',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee as any,
    });
  });

  it('should return 400 for invalid tripId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/invalid-id/polls/${pollId}/close`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: 'invalid-id', pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid trip ID');
  });

  it('should return 400 for invalid pollId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/invalid-id/close`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: 'invalid-id' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid poll ID');
  });

  it('should return 403 when not admin', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Error('Forbidden: Admin access required')
    );

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/close`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 404 when poll not found', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/close`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Poll not found');
  });

  it('should return 404 when poll belongs to different trip', async () => {
    const differentTripPoll = { ...mockOpenPoll, tripId: new ObjectId() };
    vi.mocked(pollOps.getPollById).mockResolvedValue(differentTripPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/close`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Poll not found');
  });

  it('should return 400 when poll is already closed', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockClosedPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/close`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('already closed');
  });

  it('should close poll successfully', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockOpenPoll as any);
    vi.mocked(pollOps.closePoll).mockResolvedValue(mockClosedPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/close`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('closed');
    expect(pollOps.closePoll).toHaveBeenCalledWith(expect.any(ObjectId));
  });

  it('should handle close failure gracefully', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockOpenPoll as any);
    vi.mocked(pollOps.closePoll).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/close`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to close');
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockOpenPoll as any);
    vi.mocked(pollOps.closePoll).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/close`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to close');
  });
});

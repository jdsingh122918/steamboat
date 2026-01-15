/**
 * Tests for GET/PUT/DELETE /api/trips/[tripId]/polls/[pollId]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

// Mock poll operations
vi.mock('@/lib/db/operations/polls', () => ({
  getPollById: vi.fn(),
  updatePoll: vi.fn(),
  deletePoll: vi.fn(),
  getPollResults: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/trips/[tripId]/polls/[pollId]/route';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import * as pollOps from '@/lib/db/operations/polls';

describe('GET /api/trips/[tripId]/polls/[pollId]', () => {
  const tripId = new ObjectId();
  const pollId = new ObjectId();
  const attendeeId = new ObjectId();

  const mockAttendee = {
    _id: attendeeId,
    tripId,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'member',
    rsvpStatus: 'confirmed',
  };

  const mockSession = {
    attendeeId: attendeeId.toString(),
    tripId: tripId.toString(),
  };

  const mockPoll = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee as any,
    });
  });

  it('should return 400 for invalid tripId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/invalid-id/polls/${pollId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: 'invalid-id', pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid trip ID');
  });

  it('should return 400 for invalid pollId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/invalid-id`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: 'invalid-id' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid poll ID');
  });

  it('should return 403 when not a trip member', async () => {
    vi.mocked(requireTripAccess).mockRejectedValue(
      new Error('Forbidden: Not a member of this trip')
    );

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`
    );

    const response = await GET(request, {
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
      `http://localhost/api/trips/${tripId}/polls/${pollId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Poll not found');
  });

  it('should return 404 when poll belongs to different trip', async () => {
    const differentTripPoll = { ...mockPoll, tripId: new ObjectId() };
    vi.mocked(pollOps.getPollById).mockResolvedValue(differentTripPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Poll not found');
  });

  it('should return poll with vote counts', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPoll as any);
    vi.mocked(pollOps.getPollResults).mockResolvedValue([
      { optionId: 'opt1', optionText: 'Italian', votes: 1 },
      { optionId: 'opt2', optionText: 'Mexican', votes: 1 },
    ]);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.question).toBe('Where should we eat?');
    expect(data.data.voteCounts).toBeDefined();
    expect(data.data.voteCounts).toHaveLength(2);
  });

  it('should include current user vote status', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPoll as any);
    vi.mocked(pollOps.getPollResults).mockResolvedValue([
      { optionId: 'opt1', optionText: 'Italian', votes: 1 },
      { optionId: 'opt2', optionText: 'Mexican', votes: 1 },
    ]);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.myVote).toBeDefined();
    expect(data.data.myVote.optionId).toBe('opt1');
  });
});

describe('PUT /api/trips/[tripId]/polls/[pollId]', () => {
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

  const mockPollNoVotes = {
    _id: pollId,
    tripId,
    question: 'Original question?',
    options: [
      { id: 'opt1', text: 'Option A' },
      { id: 'opt2', text: 'Option B' },
    ],
    votes: [],
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPollWithVotes = {
    ...mockPollNoVotes,
    votes: [{ attendeeId: new ObjectId(), optionId: 'opt1' }],
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
      `http://localhost/api/trips/invalid-id/polls/${pollId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ question: 'Updated?' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: 'invalid-id', pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid trip ID');
  });

  it('should return 400 for invalid pollId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/invalid-id`,
      {
        method: 'PUT',
        body: JSON.stringify({ question: 'Updated?' }),
      }
    );

    const response = await PUT(request, {
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
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ question: 'Updated?' }),
      }
    );

    const response = await PUT(request, {
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
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ question: 'Updated?' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Poll not found');
  });

  it('should return 400 when poll has existing votes', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPollWithVotes as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ question: 'Updated?' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('votes');
  });

  it('should update poll question when no votes exist', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPollNoVotes as any);
    vi.mocked(pollOps.updatePoll).mockResolvedValue({
      ...mockPollNoVotes,
      question: 'Updated question?',
    } as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ question: 'Updated question?' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.question).toBe('Updated question?');
  });

  it('should update poll options when no votes exist', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPollNoVotes as any);
    vi.mocked(pollOps.updatePoll).mockResolvedValue({
      ...mockPollNoVotes,
      options: [
        { id: 'opt1', text: 'New A' },
        { id: 'opt2', text: 'New B' },
        { id: 'opt3', text: 'New C' },
      ],
    } as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ options: ['New A', 'New B', 'New C'] }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.options).toHaveLength(3);
  });

  it('should return 400 for invalid options update', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPollNoVotes as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ options: ['Only one'] }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('at least 2');
  });
});

describe('DELETE /api/trips/[tripId]/polls/[pollId]', () => {
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

  const mockPoll = {
    _id: pollId,
    tripId,
    question: 'To delete?',
    options: [
      { id: 'opt1', text: 'Yes' },
      { id: 'opt2', text: 'No' },
    ],
    votes: [],
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
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
      `http://localhost/api/trips/invalid-id/polls/${pollId}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: 'invalid-id', pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid trip ID');
  });

  it('should return 400 for invalid pollId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/invalid-id`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
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
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
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
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Poll not found');
  });

  it('should soft delete poll successfully', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPoll as any);
    vi.mocked(pollOps.deletePoll).mockResolvedValue(true);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message).toContain('deleted');
    expect(pollOps.deletePoll).toHaveBeenCalledWith(expect.any(ObjectId));
  });

  it('should handle delete failure gracefully', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPoll as any);
    vi.mocked(pollOps.deletePoll).mockResolvedValue(false);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to delete');
  });
});

/**
 * Tests for POST/PUT/DELETE /api/trips/[tripId]/polls/[pollId]/vote
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

// Mock poll operations
vi.mock('@/lib/db/operations/polls', () => ({
  getPollById: vi.fn(),
  castVote: vi.fn(),
  removeVote: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { POST, PUT, DELETE } from '@/app/api/trips/[tripId]/polls/[pollId]/vote/route';
import { requireTripAccess } from '@/lib/auth/guards';
import * as pollOps from '@/lib/db/operations/polls';

describe('POST /api/trips/[tripId]/polls/[pollId]/vote', () => {
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

  const mockOpenPoll = {
    _id: pollId,
    tripId,
    question: 'Where should we eat?',
    options: [
      { id: 'opt1', text: 'Italian' },
      { id: 'opt2', text: 'Mexican' },
      { id: 'opt3', text: 'Chinese' },
    ],
    votes: [],
    status: 'open',
    allowMultiple: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockClosedPoll = {
    ...mockOpenPoll,
    status: 'closed',
  };

  const mockMultipleChoicePoll = {
    ...mockOpenPoll,
    allowMultiple: true,
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
      `http://localhost/api/trips/invalid-id/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [0] }),
      }
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
      `http://localhost/api/trips/${tripId}/polls/invalid-id/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [0] }),
      }
    );

    const response = await POST(request, {
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
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [0] }),
      }
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
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [0] }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Poll not found');
  });

  it('should return 400 when poll is closed', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockClosedPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [0] }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('closed');
  });

  it('should return 400 for missing optionIndices', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockOpenPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('optionIndices');
  });

  it('should return 400 for empty optionIndices array', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockOpenPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [] }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('optionIndices');
  });

  it('should return 400 for invalid option index (out of bounds)', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockOpenPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [10] }), // Out of bounds
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid option');
  });

  it('should return 400 for negative option index', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockOpenPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [-1] }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid option');
  });

  it('should return 400 when multiple votes on single choice poll', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockOpenPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [0, 1] }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('single');
  });

  it('should cast vote successfully for single choice poll', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockOpenPoll as any);
    vi.mocked(pollOps.castVote).mockResolvedValue({
      ...mockOpenPoll,
      votes: [{ attendeeId, optionId: 'opt1' }],
    } as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [0] }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(pollOps.castVote).toHaveBeenCalled();
  });

  it('should allow multiple votes on multi-choice poll', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockMultipleChoicePoll as any);
    vi.mocked(pollOps.castVote).mockResolvedValue({
      ...mockMultipleChoicePoll,
      votes: [
        { attendeeId, optionId: 'opt1' },
        { attendeeId, optionId: 'opt2' },
      ],
    } as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [0, 1] }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 400 when user has already voted', async () => {
    const pollWithExistingVote = {
      ...mockOpenPoll,
      votes: [{ attendeeId, optionId: 'opt1' }],
    };
    vi.mocked(pollOps.getPollById).mockResolvedValue(pollWithExistingVote as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ optionIndices: [1] }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('already voted');
  });
});

describe('PUT /api/trips/[tripId]/polls/[pollId]/vote', () => {
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

  const mockPollWithVote = {
    _id: pollId,
    tripId,
    question: 'Where should we eat?',
    options: [
      { id: 'opt1', text: 'Italian' },
      { id: 'opt2', text: 'Mexican' },
    ],
    votes: [{ attendeeId, optionId: 'opt1' }],
    status: 'open',
    allowMultiple: false,
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
      `http://localhost/api/trips/invalid-id/polls/${pollId}/vote`,
      {
        method: 'PUT',
        body: JSON.stringify({ optionIndices: [1] }),
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

  it('should return 404 when poll not found', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'PUT',
        body: JSON.stringify({ optionIndices: [1] }),
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

  it('should return 400 when poll is closed', async () => {
    const closedPoll = { ...mockPollWithVote, status: 'closed' };
    vi.mocked(pollOps.getPollById).mockResolvedValue(closedPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'PUT',
        body: JSON.stringify({ optionIndices: [1] }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('closed');
  });

  it('should return 400 when user has not voted yet', async () => {
    const pollNoVote = { ...mockPollWithVote, votes: [] };
    vi.mocked(pollOps.getPollById).mockResolvedValue(pollNoVote as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'PUT',
        body: JSON.stringify({ optionIndices: [1] }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not voted');
  });

  it('should change vote successfully', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPollWithVote as any);
    vi.mocked(pollOps.castVote).mockResolvedValue({
      ...mockPollWithVote,
      votes: [{ attendeeId, optionId: 'opt2' }],
    } as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      {
        method: 'PUT',
        body: JSON.stringify({ optionIndices: [1] }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(pollOps.castVote).toHaveBeenCalled();
  });
});

describe('DELETE /api/trips/[tripId]/polls/[pollId]/vote', () => {
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

  const mockPollWithVote = {
    _id: pollId,
    tripId,
    question: 'Where should we eat?',
    options: [
      { id: 'opt1', text: 'Italian' },
      { id: 'opt2', text: 'Mexican' },
    ],
    votes: [{ attendeeId, optionId: 'opt1' }],
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
      `http://localhost/api/trips/invalid-id/polls/${pollId}/vote`,
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

  it('should return 404 when poll not found', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
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

  it('should return 400 when poll is closed', async () => {
    const closedPoll = { ...mockPollWithVote, status: 'closed' };
    vi.mocked(pollOps.getPollById).mockResolvedValue(closedPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('closed');
  });

  it('should return 400 when user has not voted', async () => {
    const pollNoVote = { ...mockPollWithVote, votes: [] };
    vi.mocked(pollOps.getPollById).mockResolvedValue(pollNoVote as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not voted');
  });

  it('should remove vote successfully', async () => {
    vi.mocked(pollOps.getPollById).mockResolvedValue(mockPollWithVote as any);
    vi.mocked(pollOps.removeVote).mockResolvedValue({
      ...mockPollWithVote,
      votes: [],
    } as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls/${pollId}/vote`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), pollId: pollId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message).toContain('removed');
    expect(pollOps.removeVote).toHaveBeenCalledWith(
      expect.any(ObjectId),
      expect.any(ObjectId)
    );
  });
});

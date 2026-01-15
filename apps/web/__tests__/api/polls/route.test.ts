/**
 * Tests for GET/POST /api/trips/[tripId]/polls
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
  getPollsByTrip: vi.fn(),
  getOpenPolls: vi.fn(),
  listPolls: vi.fn(),
  createPoll: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { GET, POST } from '@/app/api/trips/[tripId]/polls/route';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import * as pollOps from '@/lib/db/operations/polls';

describe('GET /api/trips/[tripId]/polls', () => {
  const tripId = new ObjectId();
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

  const mockPolls = [
    {
      _id: new ObjectId(),
      tripId,
      question: 'Where should we eat?',
      options: [
        { id: 'opt1', text: 'Italian' },
        { id: 'opt2', text: 'Mexican' },
      ],
      votes: [],
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      _id: new ObjectId(),
      tripId,
      question: 'What time to meet?',
      options: [
        { id: 'opt1', text: '6 PM' },
        { id: 'opt2', text: '7 PM' },
      ],
      votes: [{ attendeeId, optionId: 'opt1' }],
      status: 'closed',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee as any,
    });
  });

  it('should return 400 for invalid tripId format', async () => {
    const request = new NextRequest(
      'http://localhost/api/trips/invalid-id/polls'
    );

    const response = await GET(request, { params: Promise.resolve({ tripId: 'invalid-id' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid trip ID');
  });

  it('should return 403 when not a trip member', async () => {
    vi.mocked(requireTripAccess).mockRejectedValue(
      new Error('Forbidden: Not a member of this trip')
    );

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`
    );

    const response = await GET(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Forbidden');
  });

  it('should return all polls for a trip', async () => {
    vi.mocked(pollOps.getPollsByTrip).mockResolvedValue(mockPolls as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`
    );

    const response = await GET(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(pollOps.getPollsByTrip).toHaveBeenCalledWith(expect.any(ObjectId));
  });

  it('should filter by status=open', async () => {
    const openPolls = mockPolls.filter((p) => p.status === 'open');
    vi.mocked(pollOps.listPolls).mockResolvedValue({
      data: openPolls as any,
      total: openPolls.length,
      page: 1,
      limit: 50,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls?status=open`
    );

    const response = await GET(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].status).toBe('open');
  });

  it('should filter by status=closed', async () => {
    const closedPolls = mockPolls.filter((p) => p.status === 'closed');
    vi.mocked(pollOps.listPolls).mockResolvedValue({
      data: closedPolls as any,
      total: closedPolls.length,
      page: 1,
      limit: 50,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls?status=closed`
    );

    const response = await GET(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].status).toBe('closed');
  });

  it('should return 400 for invalid status filter', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls?status=invalid`
    );

    const response = await GET(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('status');
  });

  it('should include vote counts in response', async () => {
    vi.mocked(pollOps.getPollsByTrip).mockResolvedValue(mockPolls as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`
    );

    const response = await GET(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    // Verify vote counts are included
    const closedPoll = data.data.find((p: any) => p.status === 'closed');
    expect(closedPoll.voteCounts).toBeDefined();
  });
});

describe('POST /api/trips/[tripId]/polls', () => {
  const tripId = new ObjectId();
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee as any,
    });
  });

  it('should return 400 for invalid tripId format', async () => {
    const request = new NextRequest(
      'http://localhost/api/trips/invalid-id/polls',
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test?',
          options: ['A', 'B'],
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: 'invalid-id' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid trip ID');
  });

  it('should return 403 when not admin', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Error('Forbidden: Admin access required')
    );

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test?',
          options: ['A', 'B'],
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 400 for missing question', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          options: ['A', 'B'],
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('question');
  });

  it('should return 400 for missing options', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test?',
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('options');
  });

  it('should return 400 for empty options array', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test?',
          options: [],
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('options');
  });

  it('should return 400 for less than 2 options', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test?',
          options: ['Only one'],
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('at least 2');
  });

  it('should create poll successfully with minimal fields', async () => {
    const createdPoll = {
      _id: new ObjectId(),
      tripId,
      question: 'Where to eat?',
      options: [
        { id: expect.any(String), text: 'Italian' },
        { id: expect.any(String), text: 'Mexican' },
      ],
      votes: [],
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(pollOps.createPoll).mockResolvedValue(createdPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Where to eat?',
          options: ['Italian', 'Mexican'],
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.question).toBe('Where to eat?');
    expect(pollOps.createPoll).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: expect.any(ObjectId),
        question: 'Where to eat?',
        options: expect.arrayContaining([
          expect.objectContaining({ text: 'Italian' }),
          expect.objectContaining({ text: 'Mexican' }),
        ]),
        votes: [],
        status: 'open',
      })
    );
  });

  it('should create poll with allowMultiple option', async () => {
    const createdPoll = {
      _id: new ObjectId(),
      tripId,
      question: 'Which activities?',
      options: [
        { id: 'opt1', text: 'Skiing' },
        { id: 'opt2', text: 'Snowboarding' },
      ],
      votes: [],
      status: 'open',
      allowMultiple: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(pollOps.createPoll).mockResolvedValue(createdPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Which activities?',
          options: ['Skiing', 'Snowboarding'],
          allowMultiple: true,
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should create poll with closesAt date', async () => {
    const closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    const createdPoll = {
      _id: new ObjectId(),
      tripId,
      question: 'Vote by tomorrow?',
      options: [
        { id: 'opt1', text: 'Yes' },
        { id: 'opt2', text: 'No' },
      ],
      votes: [],
      status: 'open',
      closesAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    vi.mocked(pollOps.createPoll).mockResolvedValue(createdPoll as any);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Vote by tomorrow?',
          options: ['Yes', 'No'],
          closesAt: closesAt.toISOString(),
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should return 400 for closesAt in the past', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Past poll?',
          options: ['Yes', 'No'],
          closesAt: pastDate.toISOString(),
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('closesAt');
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(pollOps.createPoll).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/polls`,
      {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test?',
          options: ['A', 'B'],
        }),
      }
    );

    const response = await POST(request, { params: Promise.resolve({ tripId: tripId.toString() }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to create poll');
  });
});

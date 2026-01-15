/**
 * Tests for POST/DELETE /api/trips/[tripId]/expenses/[expenseId]/participants
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
}));

// Mock expense operations
vi.mock('@/lib/db/operations/expenses', () => ({
  getExpenseById: vi.fn(),
  optIntoExpense: vi.fn(),
  optOutOfExpense: vi.fn(),
  updateExpense: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { POST, DELETE } from '@/app/api/trips/[tripId]/expenses/[expenseId]/participants/route';
import { requireTripAccess } from '@/lib/auth/guards';
import * as expenseOps from '@/lib/db/operations/expenses';
import { Expense, Attendee } from '@/lib/db/models';

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

// Helper to create mock expense
function createMockExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    _id: new ObjectId(),
    tripId: new ObjectId(),
    payerId: new ObjectId(),
    amount_cents: 5000,
    currency: 'USD',
    category: 'food',
    description: 'Test expense',
    participants: [],
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Expense;
}

describe('POST /api/trips/[tripId]/expenses/[expenseId]/participants', () => {
  const tripId = new ObjectId();
  const expenseId = new ObjectId();
  const attendeeId = new ObjectId();

  const mockAttendee = createMockAttendee({
    _id: attendeeId,
    tripId,
  });

  const mockSession = {
    attendeeId: attendeeId.toString(),
    tripId: tripId.toString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
  });

  it('should return 400 for invalid tripId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/invalid-id/expenses/${expenseId}/participants`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: 'invalid-id', expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid');
  });

  it('should return 400 for invalid expenseId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/invalid-id/participants`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: 'invalid-id' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid');
  });

  it('should return 403 when user does not have trip access', async () => {
    vi.mocked(requireTripAccess).mockRejectedValue(
      new Error('Forbidden: Not a member of this trip')
    );

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 404 when expense not found', async () => {
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });

  it('should return 400 when expense is settled', async () => {
    const settledExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'settled',
    });

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(settledExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('settled');
  });

  it('should allow user to opt into expense', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      participants: [],
    });

    const updatedExpense = {
      ...existingExpense,
      participants: [{ attendeeId, optedIn: true, share_cents: 5000 }],
    };

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);
    vi.mocked(expenseOps.optIntoExpense).mockResolvedValue(updatedExpense);
    vi.mocked(expenseOps.updateExpense).mockResolvedValue(updatedExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(expenseOps.optIntoExpense).toHaveBeenCalledWith(
      expect.any(ObjectId),
      expect.any(ObjectId)
    );
  });

  it('should recalculate shares when new participant opts in (equal split)', async () => {
    const otherParticipant = new ObjectId();
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      amount_cents: 1000,
      status: 'pending',
      participants: [
        { attendeeId: otherParticipant, optedIn: true, share_cents: 1000 },
      ],
    });

    const updatedExpense = {
      ...existingExpense,
      participants: [
        { attendeeId: otherParticipant, optedIn: true, share_cents: 500 },
        { attendeeId, optedIn: true, share_cents: 500 },
      ],
    };

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);
    vi.mocked(expenseOps.optIntoExpense).mockResolvedValue(updatedExpense);
    vi.mocked(expenseOps.updateExpense).mockResolvedValue(updatedExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 400 when already opted in', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      participants: [
        { attendeeId, optedIn: true, share_cents: 5000 },
      ],
    });

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'POST' }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('already');
  });
});

describe('DELETE /api/trips/[tripId]/expenses/[expenseId]/participants', () => {
  const tripId = new ObjectId();
  const expenseId = new ObjectId();
  const attendeeId = new ObjectId();

  const mockAttendee = createMockAttendee({
    _id: attendeeId,
    tripId,
  });

  const mockSession = {
    attendeeId: attendeeId.toString(),
    tripId: tripId.toString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
  });

  it('should return 400 for invalid tripId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/invalid-id/expenses/${expenseId}/participants`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: 'invalid-id', expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid');
  });

  it('should return 400 for invalid expenseId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/invalid-id/participants`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: 'invalid-id' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid');
  });

  it('should return 403 when user does not have trip access', async () => {
    vi.mocked(requireTripAccess).mockRejectedValue(
      new Error('Forbidden: Not a member of this trip')
    );

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 404 when expense not found', async () => {
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });

  it('should return 400 when expense is settled', async () => {
    const settledExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'settled',
    });

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(settledExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('settled');
  });

  it('should return 400 when user is not a participant', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      participants: [], // No participants
    });

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not a participant');
  });

  it('should allow user to opt out of expense', async () => {
    const otherParticipant = new ObjectId();
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      amount_cents: 1000,
      participants: [
        { attendeeId, optedIn: true, share_cents: 500 },
        { attendeeId: otherParticipant, optedIn: true, share_cents: 500 },
      ],
    });

    const updatedExpense = {
      ...existingExpense,
      participants: [
        { attendeeId, optedIn: false, share_cents: 0 },
        { attendeeId: otherParticipant, optedIn: true, share_cents: 1000 },
      ],
    };

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);
    vi.mocked(expenseOps.optOutOfExpense).mockResolvedValue(updatedExpense);
    vi.mocked(expenseOps.updateExpense).mockResolvedValue(updatedExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(expenseOps.optOutOfExpense).toHaveBeenCalledWith(
      expect.any(ObjectId),
      expect.any(ObjectId)
    );
  });

  it('should recalculate shares when participant opts out', async () => {
    const otherParticipant = new ObjectId();
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      amount_cents: 1000,
      status: 'pending',
      participants: [
        { attendeeId, optedIn: true, share_cents: 500 },
        { attendeeId: otherParticipant, optedIn: true, share_cents: 500 },
      ],
    });

    const updatedExpense = {
      ...existingExpense,
      participants: [
        { attendeeId, optedIn: false, share_cents: 0 },
        { attendeeId: otherParticipant, optedIn: true, share_cents: 1000 },
      ],
    };

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);
    vi.mocked(expenseOps.optOutOfExpense).mockResolvedValue(updatedExpense);
    vi.mocked(expenseOps.updateExpense).mockResolvedValue(updatedExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 400 when already opted out', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      participants: [
        { attendeeId, optedIn: false, share_cents: 0 }, // Already opted out
      ],
    });

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/participants`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not opted in');
  });
});

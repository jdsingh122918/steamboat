/**
 * Tests for GET/PUT/DELETE /api/trips/[tripId]/expenses/[expenseId]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

// Mock auth guards
vi.mock('@/lib/auth/guards', () => ({
  requireTripAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

// Mock expense operations
vi.mock('@/lib/db/operations/expenses', () => ({
  getExpenseById: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/trips/[tripId]/expenses/[expenseId]/route';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
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

describe('GET /api/trips/[tripId]/expenses/[expenseId]', () => {
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
      `http://localhost/api/trips/invalid-id/expenses/${expenseId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: 'invalid-id', expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid');
  });

  it('should return 400 for invalid expenseId format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/invalid-id`
    );

    const response = await GET(request, {
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
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`
    );

    const response = await GET(request, {
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
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });

  it('should return 404 when expense belongs to different trip', async () => {
    const differentTripExpense = createMockExpense({
      _id: expenseId,
      tripId: new ObjectId(), // Different trip
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(differentTripExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });

  it('should return expense with participant details', async () => {
    const participant1 = new ObjectId();
    const participant2 = new ObjectId();

    const mockExpense = createMockExpense({
      _id: expenseId,
      tripId,
      participants: [
        { attendeeId: participant1, optedIn: true, share_cents: 2500 },
        { attendeeId: participant2, optedIn: true, share_cents: 2500 },
      ],
    });

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(mockExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.participants).toHaveLength(2);
    expect(data.data.amount_cents).toBe(5000);
  });
});

describe('PUT /api/trips/[tripId]/expenses/[expenseId]', () => {
  const tripId = new ObjectId();
  const expenseId = new ObjectId();
  const attendeeId = new ObjectId();
  const creatorId = new ObjectId();

  const mockAttendee = createMockAttendee({
    _id: attendeeId,
    tripId,
    role: 'member',
  });

  const mockAdminAttendee = createMockAttendee({
    _id: attendeeId,
    tripId,
    role: 'admin',
  });

  const mockSession = {
    attendeeId: attendeeId.toString(),
    tripId: tripId.toString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for invalid tripId format', async () => {
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/invalid-id/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ description: 'Updated' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: 'invalid-id', expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid');
  });

  it('should return 400 for invalid expenseId format', async () => {
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/invalid-id`,
      {
        method: 'PUT',
        body: JSON.stringify({ description: 'Updated' }),
      }
    );

    const response = await PUT(request, {
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
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ description: 'Updated' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 404 when expense not found', async () => {
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ description: 'Updated' }),
      }
    );

    const response = await PUT(request, {
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
      payerId: attendeeId,
      status: 'settled',
    });

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(settledExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ description: 'Updated' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('settled');
  });

  it('should return 403 when user is not creator or admin', async () => {
    const otherCreatorExpense = createMockExpense({
      _id: expenseId,
      tripId,
      payerId: creatorId, // Different from attendeeId
      status: 'pending',
    });

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee, // Regular member
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(otherCreatorExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ description: 'Updated' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Forbidden');
  });

  it('should allow creator to update expense', async () => {
    const creatorExpense = createMockExpense({
      _id: expenseId,
      tripId,
      payerId: attendeeId, // Same as current user
      status: 'pending',
    });

    const updatedExpense = {
      ...creatorExpense,
      description: 'Updated description',
    };

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(creatorExpense);
    vi.mocked(expenseOps.updateExpense).mockResolvedValue(updatedExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ description: 'Updated description' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.description).toBe('Updated description');
  });

  it('should allow admin to update any expense', async () => {
    const otherCreatorExpense = createMockExpense({
      _id: expenseId,
      tripId,
      payerId: creatorId, // Different from admin
      status: 'pending',
    });

    const updatedExpense = {
      ...otherCreatorExpense,
      description: 'Admin updated',
    };

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee, // Admin user
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(otherCreatorExpense);
    vi.mocked(expenseOps.updateExpense).mockResolvedValue(updatedExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ description: 'Admin updated' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.description).toBe('Admin updated');
  });

  it('should update expense amount and recalculate shares', async () => {
    const participant1 = new ObjectId();
    const participant2 = new ObjectId();

    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      payerId: attendeeId,
      amount_cents: 1000,
      status: 'pending',
      participants: [
        { attendeeId: participant1, optedIn: true, share_cents: 500 },
        { attendeeId: participant2, optedIn: true, share_cents: 500 },
      ],
    });

    const updatedExpense = {
      ...existingExpense,
      amount_cents: 2000,
      participants: [
        { attendeeId: participant1, optedIn: true, share_cents: 1000 },
        { attendeeId: participant2, optedIn: true, share_cents: 1000 },
      ],
    };

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);
    vi.mocked(expenseOps.updateExpense).mockResolvedValue(updatedExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ amount_cents: 2000 }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.amount_cents).toBe(2000);
  });

  it('should return 400 for invalid category update', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      payerId: attendeeId,
      status: 'pending',
    });

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ category: 'invalid_category' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('category');
  });
});

describe('DELETE /api/trips/[tripId]/expenses/[expenseId]', () => {
  const tripId = new ObjectId();
  const expenseId = new ObjectId();
  const attendeeId = new ObjectId();
  const creatorId = new ObjectId();

  const mockAttendee = createMockAttendee({
    _id: attendeeId,
    tripId,
    role: 'member',
  });

  const mockAdminAttendee = createMockAttendee({
    _id: attendeeId,
    tripId,
    role: 'admin',
  });

  const mockSession = {
    attendeeId: attendeeId.toString(),
    tripId: tripId.toString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for invalid tripId format', async () => {
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/invalid-id/expenses/${expenseId}`,
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
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/invalid-id`,
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
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
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
    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
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
      payerId: attendeeId,
      status: 'settled',
    });

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(settledExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
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

  it('should return 403 when user is not creator or admin', async () => {
    const otherCreatorExpense = createMockExpense({
      _id: expenseId,
      tripId,
      payerId: creatorId,
      status: 'pending',
    });

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(otherCreatorExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
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

  it('should allow creator to delete expense', async () => {
    const creatorExpense = createMockExpense({
      _id: expenseId,
      tripId,
      payerId: attendeeId,
      status: 'pending',
    });

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(creatorExpense);
    vi.mocked(expenseOps.deleteExpense).mockResolvedValue(true);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message).toContain('deleted');
  });

  it('should allow admin to delete any expense', async () => {
    const otherCreatorExpense = createMockExpense({
      _id: expenseId,
      tripId,
      payerId: creatorId,
      status: 'pending',
    });

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(otherCreatorExpense);
    vi.mocked(expenseOps.deleteExpense).mockResolvedValue(true);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.message).toContain('deleted');
  });

  it('should handle delete failure gracefully', async () => {
    const creatorExpense = createMockExpense({
      _id: expenseId,
      tripId,
      payerId: attendeeId,
      status: 'pending',
    });

    vi.mocked(requireTripAccess).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(creatorExpense);
    vi.mocked(expenseOps.deleteExpense).mockResolvedValue(false);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}`,
      { method: 'DELETE' }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed');
  });
});

/**
 * Tests for POST/PUT /api/trips/[tripId]/expenses/[expenseId]/dispute
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
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { POST, PUT } from '@/app/api/trips/[tripId]/expenses/[expenseId]/dispute/route';
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
function createMockExpense(overrides: Partial<any> = {}): Expense {
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

describe('POST /api/trips/[tripId]/expenses/[expenseId]/dispute', () => {
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
      `http://localhost/api/trips/invalid-id/expenses/${expenseId}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: 'This is wrong' }),
      }
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
      `http://localhost/api/trips/${tripId}/expenses/invalid-id/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: 'This is wrong' }),
      }
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
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: 'This is wrong' }),
      }
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
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: 'This is wrong' }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not found');
  });

  it('should return 400 when reason is missing', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
    });

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('reason');
  });

  it('should return 400 when reason is empty', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
    });

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: '   ' }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('reason');
  });

  it('should return 400 when expense already has a dispute', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      dispute: {
        filedBy: new ObjectId(),
        reason: 'Already disputed',
        filedAt: new Date(),
      },
    });

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: 'New dispute' }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('already');
  });

  it('should file a dispute successfully', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
    });

    const updatedExpense = {
      ...existingExpense,
      dispute: {
        filedBy: attendeeId,
        reason: 'This charge is incorrect',
        filedAt: new Date(),
      },
    };

    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);
    vi.mocked(expenseOps.updateExpense).mockResolvedValue(updatedExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: 'This charge is incorrect' }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.dispute).toBeDefined();
    expect(data.data.dispute.reason).toBe('This charge is incorrect');
    expect(expenseOps.updateExpense).toHaveBeenCalledWith(
      expect.any(ObjectId),
      expect.objectContaining({
        dispute: expect.objectContaining({
          filedBy: attendeeId,
          reason: 'This charge is incorrect',
        }),
      })
    );
  });
});

describe('PUT /api/trips/[tripId]/expenses/[expenseId]/dispute', () => {
  const tripId = new ObjectId();
  const expenseId = new ObjectId();
  const attendeeId = new ObjectId();
  const disputeFilerId = new ObjectId();

  const mockAdminAttendee = createMockAttendee({
    _id: attendeeId,
    tripId,
    role: 'admin',
  });

  const mockMemberAttendee = createMockAttendee({
    _id: attendeeId,
    tripId,
    role: 'member',
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
      attendee: mockAdminAttendee,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/invalid-id/expenses/${expenseId}/dispute`,
      {
        method: 'PUT',
        body: JSON.stringify({ resolution: 'Resolved' }),
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
      attendee: mockAdminAttendee,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/invalid-id/dispute`,
      {
        method: 'PUT',
        body: JSON.stringify({ resolution: 'Resolved' }),
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

  it('should return 403 when user is not admin', async () => {
    vi.mocked(requireAdmin).mockRejectedValue(
      new Error('Forbidden: Admin access required')
    );

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'PUT',
        body: JSON.stringify({ resolution: 'Resolved' }),
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
    vi.mocked(requireAdmin).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'PUT',
        body: JSON.stringify({ resolution: 'Resolved' }),
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

  it('should return 400 when expense has no dispute', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      // No dispute field
    });

    vi.mocked(requireAdmin).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'PUT',
        body: JSON.stringify({ resolution: 'Resolved' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('no dispute');
  });

  it('should return 400 when dispute is already resolved', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      dispute: {
        filedBy: disputeFilerId,
        reason: 'Incorrect',
        filedAt: new Date(),
        resolvedBy: attendeeId,
        resolution: 'Already resolved',
        resolvedAt: new Date(),
      },
    });

    vi.mocked(requireAdmin).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'PUT',
        body: JSON.stringify({ resolution: 'New resolution' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('already been resolved');
  });

  it('should return 400 when resolution is missing', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      dispute: {
        filedBy: disputeFilerId,
        reason: 'Incorrect',
        filedAt: new Date(),
      },
    });

    vi.mocked(requireAdmin).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'PUT',
        body: JSON.stringify({}),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('resolution');
  });

  it('should return 400 when resolution is empty', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      dispute: {
        filedBy: disputeFilerId,
        reason: 'Incorrect',
        filedAt: new Date(),
      },
    });

    vi.mocked(requireAdmin).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'PUT',
        body: JSON.stringify({ resolution: '   ' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('resolution');
  });

  it('should resolve a dispute successfully', async () => {
    const existingExpense = createMockExpense({
      _id: expenseId,
      tripId,
      status: 'pending',
      dispute: {
        filedBy: disputeFilerId,
        reason: 'This charge is incorrect',
        filedAt: new Date(),
      },
    });

    const updatedExpense = {
      ...existingExpense,
      dispute: {
        filedBy: disputeFilerId,
        reason: 'This charge is incorrect',
        filedAt: existingExpense.dispute!.filedAt,
        resolvedBy: attendeeId,
        resolution: 'Amount was corrected',
        resolvedAt: new Date(),
      },
    };

    vi.mocked(requireAdmin).mockResolvedValue({
      session: mockSession as any,
      attendee: mockAdminAttendee,
    });
    vi.mocked(expenseOps.getExpenseById).mockResolvedValue(existingExpense);
    vi.mocked(expenseOps.updateExpense).mockResolvedValue(updatedExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses/${expenseId}/dispute`,
      {
        method: 'PUT',
        body: JSON.stringify({ resolution: 'Amount was corrected' }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ tripId: tripId.toString(), expenseId: expenseId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.dispute.resolution).toBe('Amount was corrected');
    expect(data.data.dispute.resolvedBy).toBeDefined();
    expect(data.data.dispute.resolvedAt).toBeDefined();
  });
});

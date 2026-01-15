/**
 * Tests for GET/POST /api/trips/[tripId]/expenses
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
  listExpenses: vi.fn(),
  createExpense: vi.fn(),
  getExpensesByTrip: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { GET, POST } from '@/app/api/trips/[tripId]/expenses/route';
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
    amount_cents: 5000, // $50.00
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

describe('GET /api/trips/[tripId]/expenses', () => {
  const tripId = new ObjectId();
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
      'http://localhost/api/trips/invalid-id/expenses'
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: 'invalid-id' }),
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
      `http://localhost/api/trips/${tripId}/expenses`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Forbidden');
  });

  it('should return all expenses for a trip', async () => {
    const mockExpenses = [
      createMockExpense({ tripId, description: 'Lunch' }),
      createMockExpense({ tripId, description: 'Dinner' }),
    ];

    vi.mocked(expenseOps.listExpenses).mockResolvedValue({
      data: mockExpenses,
      total: 2,
      page: 1,
      limit: 20,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
  });

  it('should filter expenses by category', async () => {
    const mockExpenses = [
      createMockExpense({ tripId, category: 'food', description: 'Lunch' }),
    ];

    vi.mocked(expenseOps.listExpenses).mockResolvedValue({
      data: mockExpenses,
      total: 1,
      page: 1,
      limit: 20,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses?category=food`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(expenseOps.listExpenses).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'food' }),
      expect.anything()
    );
  });

  it('should filter expenses by paidBy', async () => {
    const payerId = new ObjectId();
    const mockExpenses = [
      createMockExpense({ tripId, payerId, description: 'Paid by user' }),
    ];

    vi.mocked(expenseOps.listExpenses).mockResolvedValue({
      data: mockExpenses,
      total: 1,
      page: 1,
      limit: 20,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses?paidBy=${payerId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(expenseOps.listExpenses).toHaveBeenCalledWith(
      expect.objectContaining({ payerId: expect.any(ObjectId) }),
      expect.anything()
    );
  });

  it('should filter expenses by status', async () => {
    const mockExpenses = [
      createMockExpense({ tripId, status: 'settled', description: 'Settled expense' }),
    ];

    vi.mocked(expenseOps.listExpenses).mockResolvedValue({
      data: mockExpenses,
      total: 1,
      page: 1,
      limit: 20,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses?status=settled`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(expenseOps.listExpenses).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'settled' }),
      expect.anything()
    );
  });

  it('should return 400 for invalid category filter', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses?category=invalid_category`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('category');
  });

  it('should return 400 for invalid status filter', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses?status=invalid_status`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('status');
  });

  it('should return empty array when no expenses exist', async () => {
    vi.mocked(expenseOps.listExpenses).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`
    );

    const response = await GET(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual([]);
  });
});

describe('POST /api/trips/[tripId]/expenses', () => {
  const tripId = new ObjectId();
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
      'http://localhost/api/trips/invalid-id/expenses',
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: 'invalid-id' }),
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
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 400 when description is missing', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('description');
  });

  it('should return 400 when amount_cents is missing', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          category: 'food',
          paidById: attendeeId.toString(),
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('amount_cents');
  });

  it('should return 400 when amount_cents is negative', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: -100,
          category: 'food',
          paidById: attendeeId.toString(),
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('amount_cents');
  });

  it('should return 400 when category is invalid', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'invalid_category',
          paidById: attendeeId.toString(),
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('category');
  });

  it('should return 400 when paidById is missing', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('paidById');
  });

  it('should return 400 when paidById is invalid ObjectId', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
          paidById: 'invalid-id',
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('paidById');
  });

  it('should create expense with equal split by default', async () => {
    const participant1 = new ObjectId();
    const participant2 = new ObjectId();

    const createdExpense = createMockExpense({
      tripId,
      payerId: attendeeId,
      amount_cents: 1000,
      description: 'Test expense',
      category: 'food',
      participants: [
        { attendeeId: participant1, optedIn: true, share_cents: 500 },
        { attendeeId: participant2, optedIn: true, share_cents: 500 },
      ],
    });

    vi.mocked(expenseOps.createExpense).mockResolvedValue(createdExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
          participantIds: [participant1.toString(), participant2.toString()],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.amount_cents).toBe(1000);
  });

  it('should create expense with custom split', async () => {
    const participant1 = new ObjectId();
    const participant2 = new ObjectId();

    const createdExpense = createMockExpense({
      tripId,
      payerId: attendeeId,
      amount_cents: 1000,
      description: 'Test expense',
      category: 'food',
      participants: [
        { attendeeId: participant1, optedIn: true, share_cents: 700 },
        { attendeeId: participant2, optedIn: true, share_cents: 300 },
      ],
    });

    vi.mocked(expenseOps.createExpense).mockResolvedValue(createdExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
          splitType: 'custom',
          participants: [
            { attendeeId: participant1.toString(), share_cents: 700 },
            { attendeeId: participant2.toString(), share_cents: 300 },
          ],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should return 400 when custom split does not sum to total', async () => {
    const participant1 = new ObjectId();
    const participant2 = new ObjectId();

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
          splitType: 'custom',
          participants: [
            { attendeeId: participant1.toString(), share_cents: 600 },
            { attendeeId: participant2.toString(), share_cents: 300 },
          ],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('sum');
  });

  it('should create expense with percentage split', async () => {
    const participant1 = new ObjectId();
    const participant2 = new ObjectId();

    const createdExpense = createMockExpense({
      tripId,
      payerId: attendeeId,
      amount_cents: 1000,
      description: 'Test expense',
      category: 'food',
      participants: [
        { attendeeId: participant1, optedIn: true, share_cents: 600 },
        { attendeeId: participant2, optedIn: true, share_cents: 400 },
      ],
    });

    vi.mocked(expenseOps.createExpense).mockResolvedValue(createdExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
          splitType: 'percentage',
          participants: [
            { attendeeId: participant1.toString(), percentage: 60 },
            { attendeeId: participant2.toString(), percentage: 40 },
          ],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should return 400 when percentages do not sum to 100', async () => {
    const participant1 = new ObjectId();
    const participant2 = new ObjectId();

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
          splitType: 'percentage',
          participants: [
            { attendeeId: participant1.toString(), percentage: 50 },
            { attendeeId: participant2.toString(), percentage: 30 },
          ],
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('100');
  });

  it('should accept optional date field', async () => {
    const createdExpense = createMockExpense({
      tripId,
      payerId: attendeeId,
      amount_cents: 1000,
      description: 'Test expense',
      category: 'food',
    });

    vi.mocked(expenseOps.createExpense).mockResolvedValue(createdExpense);

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
          date: '2025-06-15T10:00:00Z',
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should return 400 for invalid date format', async () => {
    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
          date: 'invalid-date',
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('date');
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(expenseOps.createExpense).mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new NextRequest(
      `http://localhost/api/trips/${tripId}/expenses`,
      {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test expense',
          amount_cents: 1000,
          category: 'food',
          paidById: attendeeId.toString(),
        }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ tripId: tripId.toString() }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

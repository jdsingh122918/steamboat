import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the expense-optimizer WASM module
vi.mock('expense-optimizer', () => ({
  default: vi.fn().mockResolvedValue(undefined),
  optimize_settlements: vi.fn(),
}));

import { POST, GET } from '@/app/api/mcp/expense-optimizer/route';
import * as wasmModule from 'expense-optimizer';

describe('expense-optimizer API route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/mcp/expense-optimizer', () => {
    it('should return 400 for missing debts array', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/expense-optimizer',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('debts');
    });

    it('should return 400 for invalid debt structure', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/expense-optimizer',
        {
          method: 'POST',
          body: JSON.stringify({
            debts: [{ invalid: 'structure' }],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid debt');
    });

    it('should successfully optimize settlements', async () => {
      vi.mocked(wasmModule.optimize_settlements).mockReturnValue({
        original_count: 2,
        optimized_count: 1,
        payments: [
          {
            from: 'alice',
            to: 'charlie',
            amount_cents: 10000,
            reason: 'Settlement',
          },
        ],
        savings_percent: 50.0,
      });

      const request = new NextRequest(
        'http://localhost/api/mcp/expense-optimizer',
        {
          method: 'POST',
          body: JSON.stringify({
            debts: [
              {
                debtor: 'alice',
                creditor: 'bob',
                amount_cents: 10000,
                expense_ids: ['exp1'],
              },
              {
                debtor: 'bob',
                creditor: 'charlie',
                amount_cents: 10000,
                expense_ids: ['exp2'],
              },
            ],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.original_count).toBe(2);
      expect(data.data.optimized_count).toBe(1);
      expect(data.data.savings_percent).toBe(50.0);
      expect(data.data.payments).toHaveLength(1);
    });

    it('should handle empty debts array', async () => {
      vi.mocked(wasmModule.optimize_settlements).mockReturnValue({
        original_count: 0,
        optimized_count: 0,
        payments: [],
        savings_percent: 0,
      });

      const request = new NextRequest(
        'http://localhost/api/mcp/expense-optimizer',
        {
          method: 'POST',
          body: JSON.stringify({ debts: [] }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.payments).toHaveLength(0);
    });

    it('should handle WASM error', async () => {
      vi.mocked(wasmModule.optimize_settlements).mockImplementation(() => {
        throw new Error('WASM execution failed');
      });

      const request = new NextRequest(
        'http://localhost/api/mcp/expense-optimizer',
        {
          method: 'POST',
          body: JSON.stringify({
            debts: [
              {
                debtor: 'alice',
                creditor: 'bob',
                amount_cents: 100,
                expense_ids: [],
              },
            ],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('WASM');
    });

    it('should include timing metadata', async () => {
      vi.mocked(wasmModule.optimize_settlements).mockReturnValue({
        original_count: 0,
        optimized_count: 0,
        payments: [],
        savings_percent: 0,
      });

      const request = new NextRequest(
        'http://localhost/api/mcp/expense-optimizer',
        {
          method: 'POST',
          body: JSON.stringify({ debts: [] }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data.meta).toBeDefined();
      expect(typeof data.meta.duration_ms).toBe('number');
      expect(data.meta.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('should validate debt amount is positive', async () => {
      const request = new NextRequest(
        'http://localhost/api/mcp/expense-optimizer',
        {
          method: 'POST',
          body: JSON.stringify({
            debts: [
              {
                debtor: 'alice',
                creditor: 'bob',
                amount_cents: -100,
                expense_ids: [],
              },
            ],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('positive');
    });
  });

  describe('GET /api/mcp/expense-optimizer', () => {
    it('should return health check response', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.service).toBe('expense-optimizer-mcp');
      expect(data.status).toBe('healthy');
      expect(data.methods).toContain('optimize_settlements');
    });
  });
});

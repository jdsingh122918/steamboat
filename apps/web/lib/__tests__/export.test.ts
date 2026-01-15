import { describe, it, expect } from 'vitest';

import {
  generateExpenseCSV,
  generateSettlementSummary,
  generateTripReport,
  formatCurrency,
  formatDate,
  CSVRow,
} from '../export';

describe('Export Utilities', () => {
  describe('formatCurrency', () => {
    it('should format positive amounts', () => {
      expect(formatCurrency(100)).toBe('$100.00');
    });

    it('should format negative amounts', () => {
      expect(formatCurrency(-50.5)).toBe('-$50.50');
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle decimals', () => {
      expect(formatCurrency(125.99)).toBe('$125.99');
    });
  });

  describe('formatDate', () => {
    it('should format ISO date string', () => {
      const result = formatDate('2024-03-15');
      expect(result).toContain('2024');
    });

    it('should format Date object', () => {
      const date = new Date('2024-03-15');
      const result = formatDate(date);
      expect(result).toContain('2024');
    });
  });

  describe('generateExpenseCSV', () => {
    const mockExpenses = [
      {
        id: 'exp1',
        description: 'Dinner at restaurant',
        amount: 150.0,
        date: '2024-03-15',
        category: 'dining',
        paidBy: 'Alice',
        participants: ['Alice', 'Bob', 'Charlie'],
      },
      {
        id: 'exp2',
        description: 'Hotel room',
        amount: 450.0,
        date: '2024-03-16',
        category: 'lodging',
        paidBy: 'Bob',
        participants: ['Alice', 'Bob', 'Charlie', 'Dave'],
      },
    ];

    it('should generate valid CSV headers', () => {
      const csv = generateExpenseCSV(mockExpenses);
      const headers = csv.split('\n')[0];
      expect(headers).toContain('Description');
      expect(headers).toContain('Amount');
      expect(headers).toContain('Date');
      expect(headers).toContain('Category');
      expect(headers).toContain('Paid By');
    });

    it('should include all expenses', () => {
      const csv = generateExpenseCSV(mockExpenses);
      const lines = csv.split('\n');
      expect(lines.length).toBe(3); // Header + 2 expenses
    });

    it('should properly escape commas in descriptions', () => {
      const expenses = [
        {
          id: 'exp1',
          description: 'Dinner, drinks, and dessert',
          amount: 100.0,
          date: '2024-03-15',
          category: 'dining',
          paidBy: 'Alice',
          participants: ['Alice', 'Bob'],
        },
      ];
      const csv = generateExpenseCSV(expenses);
      expect(csv).toContain('"Dinner, drinks, and dessert"');
    });

    it('should return empty CSV with just headers for no expenses', () => {
      const csv = generateExpenseCSV([]);
      const lines = csv.split('\n');
      expect(lines.length).toBe(1);
    });
  });

  describe('generateSettlementSummary', () => {
    const mockSettlements = [
      {
        from: 'Bob',
        to: 'Alice',
        amount: 75.0,
      },
      {
        from: 'Charlie',
        to: 'Alice',
        amount: 50.0,
      },
    ];

    it('should generate markdown summary', () => {
      const summary = generateSettlementSummary({
        tripName: 'Vegas Trip',
        settlements: mockSettlements,
        generatedAt: '2024-03-20',
      });

      expect(summary).toContain('Vegas Trip');
      expect(summary).toContain('Settlement Summary');
    });

    it('should list all settlements', () => {
      const summary = generateSettlementSummary({
        tripName: 'Vegas Trip',
        settlements: mockSettlements,
        generatedAt: '2024-03-20',
      });

      expect(summary).toContain('Bob');
      expect(summary).toContain('Alice');
      expect(summary).toContain('$75.00');
    });

    it('should include total settlement amount', () => {
      const summary = generateSettlementSummary({
        tripName: 'Vegas Trip',
        settlements: mockSettlements,
        generatedAt: '2024-03-20',
      });

      expect(summary).toContain('$125.00');
    });

    it('should handle no settlements', () => {
      const summary = generateSettlementSummary({
        tripName: 'Vegas Trip',
        settlements: [],
        generatedAt: '2024-03-20',
      });

      expect(summary).toContain('No settlements needed');
    });
  });

  describe('generateTripReport', () => {
    const mockTripData = {
      tripName: 'Bachelor Party 2024',
      location: 'Steamboat, Colorado',
      startDate: '2024-03-15',
      endDate: '2024-03-18',
      attendees: [
        { name: 'John', role: 'organizer' },
        { name: 'Mike', role: 'groom' },
        { name: 'Dave', role: 'attendee' },
      ],
      expenses: [
        { description: 'Hotel', amount: 1200, category: 'lodging' },
        { description: 'Dinner', amount: 450, category: 'dining' },
      ],
      totalExpenses: 1650,
    };

    it('should generate complete trip report', () => {
      const report = generateTripReport(mockTripData);

      expect(report).toContain('Bachelor Party 2024');
      expect(report).toContain('Steamboat, Colorado');
    });

    it('should include attendee list', () => {
      const report = generateTripReport(mockTripData);

      expect(report).toContain('John');
      expect(report).toContain('Mike');
      expect(report).toContain('Dave');
    });

    it('should include expense summary', () => {
      const report = generateTripReport(mockTripData);

      expect(report).toContain('$1,650.00');
    });

    it('should include category breakdown', () => {
      const report = generateTripReport(mockTripData);

      expect(report).toContain('lodging');
      expect(report).toContain('dining');
    });
  });

  describe('CSVRow type', () => {
    it('should accept valid row data', () => {
      const row: CSVRow = {
        Description: 'Test',
        Amount: 100,
        Date: '2024-03-15',
      };
      expect(row.Description).toBe('Test');
    });
  });
});

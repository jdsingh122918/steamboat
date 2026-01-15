import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-document">{children}</div>
  ),
  Page: ({ children, size, style }: { children: React.ReactNode; size: string; style?: object }) => (
    <div data-testid="pdf-page" data-size={size} style={style}>
      {children}
    </div>
  ),
  View: ({ children, style }: { children: React.ReactNode; style?: object }) => (
    <div data-testid="pdf-view" style={style}>
      {children}
    </div>
  ),
  Text: ({ children, style }: { children: React.ReactNode; style?: object }) => (
    <span data-testid="pdf-text" style={style}>
      {children}
    </span>
  ),
  StyleSheet: {
    create: (styles: object) => styles,
  },
  pdf: vi.fn().mockReturnValue({
    toBlob: vi.fn().mockResolvedValue(new Blob(['pdf content'])),
  }),
}));

import {
  ExpenseReportPDF,
  ExpenseReportProps,
  generateExpenseReportBlob,
} from '../expense-report';

describe('ExpenseReportPDF', () => {
  const defaultProps: ExpenseReportProps = {
    tripName: 'Vegas Bachelor Party 2025',
    tripDates: {
      start: new Date('2025-06-15'),
      end: new Date('2025-06-18'),
    },
    expenses: [
      {
        id: 'exp1',
        description: 'Hotel Room',
        category: 'accommodation',
        amount: 500,
        paidBy: 'John',
        date: new Date('2025-06-15'),
      },
      {
        id: 'exp2',
        description: 'Dinner at Nobu',
        category: 'food',
        amount: 250,
        paidBy: 'Mike',
        date: new Date('2025-06-16'),
      },
      {
        id: 'exp3',
        description: 'Club Entry',
        category: 'activities',
        amount: 100,
        paidBy: 'John',
        date: new Date('2025-06-17'),
      },
    ],
    currency: 'USD',
    totalAmount: 850,
    attendees: ['John', 'Mike', 'Steve', 'Dave'],
  };

  describe('component rendering', () => {
    it('should render document structure', () => {
      const result = ExpenseReportPDF(defaultProps);
      expect(result).toBeDefined();
    });

    it('should include trip name', () => {
      const result = ExpenseReportPDF(defaultProps);
      const rendered = JSON.stringify(result);
      expect(rendered).toContain('Vegas Bachelor Party 2025');
    });

    it('should include total amount', () => {
      const result = ExpenseReportPDF(defaultProps);
      const rendered = JSON.stringify(result);
      expect(rendered).toContain('850');
    });

    it('should include expense descriptions', () => {
      const result = ExpenseReportPDF(defaultProps);
      const rendered = JSON.stringify(result);
      expect(rendered).toContain('Hotel Room');
      expect(rendered).toContain('Dinner at Nobu');
      expect(rendered).toContain('Club Entry');
    });

    it('should include payer names', () => {
      const result = ExpenseReportPDF(defaultProps);
      const rendered = JSON.stringify(result);
      expect(rendered).toContain('John');
      expect(rendered).toContain('Mike');
    });

    it('should handle empty expenses', () => {
      const props = { ...defaultProps, expenses: [], totalAmount: 0 };
      const result = ExpenseReportPDF(props);
      expect(result).toBeDefined();
    });
  });

  describe('currency formatting', () => {
    it('should format USD correctly', () => {
      const result = ExpenseReportPDF(defaultProps);
      const rendered = JSON.stringify(result);
      expect(rendered).toContain('$');
    });

    it('should format EUR correctly', () => {
      const props = { ...defaultProps, currency: 'EUR' };
      const result = ExpenseReportPDF(props);
      const rendered = JSON.stringify(result);
      expect(rendered).toContain('€');
    });
  });

  describe('category breakdown', () => {
    it('should include category labels', () => {
      const result = ExpenseReportPDF(defaultProps);
      const rendered = JSON.stringify(result);
      // Should have accommodation, food, activities
      expect(rendered.toLowerCase()).toContain('accommodation');
      expect(rendered.toLowerCase()).toContain('food');
      expect(rendered.toLowerCase()).toContain('activities');
    });
  });

  describe('date formatting', () => {
    it('should include formatted dates', () => {
      const result = ExpenseReportPDF(defaultProps);
      const rendered = JSON.stringify(result);
      // Should have dates in some format
      expect(rendered).toContain('2025');
    });
  });

  describe('optional fields', () => {
    it('should include balances when provided', () => {
      const props = {
        ...defaultProps,
        balances: [
          { attendee: 'Mike', balance: -75 },
          { attendee: 'Steve', balance: 150 },
        ],
      };
      const result = ExpenseReportPDF(props);
      const rendered = JSON.stringify(result);
      expect(rendered).toContain('75');
      expect(rendered).toContain('150');
    });

    it('should include settlements when provided', () => {
      const props = {
        ...defaultProps,
        settlements: [
          { from: 'Mike', to: 'John', amount: 50 },
          { from: 'Steve', to: 'John', amount: 75 },
        ],
      };
      const result = ExpenseReportPDF(props);
      const rendered = JSON.stringify(result);
      expect(rendered).toContain('50');
    });
  });
});

describe('generateExpenseReportBlob', () => {
  it('should generate a blob', async () => {
    const props: ExpenseReportProps = {
      tripName: 'Test Trip',
      tripDates: {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-05'),
      },
      expenses: [],
      currency: 'USD',
      totalAmount: 0,
      attendees: ['John'],
    };

    const blob = await generateExpenseReportBlob(props);
    expect(blob).toBeInstanceOf(Blob);
  });
});

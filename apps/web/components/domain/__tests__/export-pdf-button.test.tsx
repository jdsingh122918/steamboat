import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock PDF generation
vi.mock('@/lib/pdf/expense-report', () => ({
  generateExpenseReportBlob: vi.fn().mockResolvedValue(new Blob(['pdf content'])),
}));

import { ExportPDFButton } from '../export-pdf-button';
import type { ExpenseReportProps } from '@/lib/pdf/expense-report';
import { saveAs } from 'file-saver';

describe('ExportPDFButton', () => {
  const mockSaveAs = vi.mocked(saveAs);

  const defaultProps: ExpenseReportProps = {
    tripName: 'Vegas Bachelor Party 2025',
    tripDates: {
      start: new Date('2025-06-15'),
      end: new Date('2025-06-18'),
    },
    expenses: [
      {
        id: 'exp1',
        description: 'Hotel',
        category: 'accommodation',
        amount: 500,
        paidBy: 'John',
        date: new Date('2025-06-15'),
      },
    ],
    currency: 'USD',
    totalAmount: 500,
    attendees: ['John', 'Mike'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render download button', () => {
      render(<ExportPDFButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should display default text', () => {
      render(<ExportPDFButton {...defaultProps} />);

      expect(screen.getByText(/download/i)).toBeInTheDocument();
    });

    it('should display custom text when provided', () => {
      render(<ExportPDFButton {...defaultProps} buttonText="Export Report" />);

      expect(screen.getByText('Export Report')).toBeInTheDocument();
    });
  });

  describe('downloading', () => {
    it('should generate and download PDF on click', async () => {
      render(<ExportPDFButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSaveAs).toHaveBeenCalledWith(
          expect.any(Blob),
          expect.stringContaining('.pdf')
        );
      });
    });

    it('should use trip name in filename', async () => {
      render(<ExportPDFButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSaveAs).toHaveBeenCalledWith(
          expect.any(Blob),
          expect.stringContaining('vegas-bachelor-party-2025')
        );
      });
    });

    it('should use custom filename when provided', async () => {
      render(<ExportPDFButton {...defaultProps} fileName="custom-report.pdf" />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSaveAs).toHaveBeenCalledWith(
          expect.any(Blob),
          'custom-report.pdf'
        );
      });
    });

    it('should show loading state while generating', async () => {
      render(<ExportPDFButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Button should be disabled during download
      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle generation errors gracefully', async () => {
      const { generateExpenseReportBlob } = await import('@/lib/pdf/expense-report');
      vi.mocked(generateExpenseReportBlob).mockRejectedValueOnce(new Error('Generation failed'));

      const onError = vi.fn();
      render(<ExportPDFButton {...defaultProps} onError={onError} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it('should re-enable button after error', async () => {
      const { generateExpenseReportBlob } = await import('@/lib/pdf/expense-report');
      vi.mocked(generateExpenseReportBlob).mockRejectedValueOnce(new Error('Generation failed'));

      render(<ExportPDFButton {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess after successful download', async () => {
      const onSuccess = vi.fn();
      render(<ExportPDFButton {...defaultProps} onSuccess={onSuccess} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('disabled state', () => {
    it('should respect disabled prop', () => {
      render(<ExportPDFButton {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should not trigger download when disabled', async () => {
      render(<ExportPDFButton {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await new Promise((r) => setTimeout(r, 100));
      expect(mockSaveAs).not.toHaveBeenCalled();
    });
  });
});

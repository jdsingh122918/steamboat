'use client';

/**
 * PDF Export Button Component.
 *
 * Generates and downloads PDF expense reports.
 */

import * as React from 'react';
import { saveAs } from 'file-saver';
import {
  generateExpenseReportBlob,
  type ExpenseReportProps,
} from '@/lib/pdf/expense-report';

/**
 * Props for ExportPDFButton component.
 */
export interface ExportPDFButtonProps extends ExpenseReportProps {
  /** Custom button text */
  buttonText?: string;
  /** Custom filename for the PDF */
  fileName?: string;
  /** Called when download succeeds */
  onSuccess?: () => void;
  /** Called when download fails */
  onError?: (error: Error) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Generate a safe filename from trip name.
 */
function generateFileName(tripName: string): string {
  const safeName = tripName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const date = new Date().toISOString().split('T')[0];
  return `${safeName}-expenses-${date}.pdf`;
}

/**
 * Button component for exporting expense reports as PDF.
 *
 * @example
 * <ExportPDFButton
 *   tripName="Vegas Bachelor Party"
 *   tripDates={{ start: new Date(), end: new Date() }}
 *   expenses={expenses}
 *   currency="USD"
 *   totalAmount={1500}
 *   attendees={['John', 'Mike']}
 * />
 */
export function ExportPDFButton({
  buttonText = 'Download PDF',
  fileName,
  onSuccess,
  onError,
  disabled = false,
  className,
  ...reportProps
}: ExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleDownload = async () => {
    if (disabled || isGenerating) return;

    setIsGenerating(true);

    try {
      const blob = await generateExpenseReportBlob(reportProps);
      const outputFileName = fileName || generateFileName(reportProps.tripName);
      saveAs(blob, outputFileName);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      onError?.(error instanceof Error ? error : new Error('PDF generation failed'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled || isGenerating}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: isGenerating ? '#94a3b8' : '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: disabled || isGenerating ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s',
      }}
    >
      {isGenerating ? (
        <>
          <svg
            style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Generating...
        </>
      ) : (
        <>
          <svg
            style={{ width: 16, height: 16 }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {buttonText}
        </>
      )}
    </button>
  );
}

export default ExportPDFButton;

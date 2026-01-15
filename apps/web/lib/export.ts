/**
 * Export Utilities
 *
 * Functions for generating CSV and text exports of trip data.
 */

import { formatCurrency, formatDate } from '@/lib/utils/format';

export { formatCurrency, formatDate };

export type CSVRow = Record<string, string | number | boolean>;

/**
 * Escape a value for CSV
 */
function escapeCSV(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  paidBy: string;
  participants: string[];
}

/**
 * Generate CSV from expense data
 */
export function generateExpenseCSV(expenses: ExpenseData[]): string {
  const headers = ['Description', 'Amount', 'Date', 'Category', 'Paid By', 'Participants', 'Per Person'];

  const rows = expenses.map((expense) => {
    const perPerson = expense.participants.length > 0
      ? expense.amount / expense.participants.length
      : expense.amount;

    return [
      escapeCSV(expense.description),
      formatCurrency(expense.amount),
      formatDate(expense.date),
      expense.category,
      expense.paidBy,
      expense.participants.join('; '),
      formatCurrency(perPerson),
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface SettlementSummaryInput {
  tripName: string;
  settlements: Settlement[];
  generatedAt: string;
}

/**
 * Generate markdown settlement summary
 */
export function generateSettlementSummary(input: SettlementSummaryInput): string {
  const lines: string[] = [];

  lines.push(`# Settlement Summary`);
  lines.push(`## ${input.tripName}`);
  lines.push('');
  lines.push(`Generated: ${formatDate(input.generatedAt)}`);
  lines.push('');

  if (input.settlements.length === 0) {
    lines.push('**No settlements needed** - all balances are even!');
    return lines.join('\n');
  }

  lines.push('## Payments to Make');
  lines.push('');

  let total = 0;
  for (const settlement of input.settlements) {
    lines.push(`- **${settlement.from}** pays **${settlement.to}**: ${formatCurrency(settlement.amount)}`);
    total += settlement.amount;
  }

  lines.push('');
  lines.push('---');
  lines.push(`**Total Amount to Settle:** ${formatCurrency(total)}`);

  return lines.join('\n');
}

export interface TripReportInput {
  tripName: string;
  location: string;
  startDate: string;
  endDate: string;
  attendees: Array<{ name: string; role: string }>;
  expenses: Array<{ description: string; amount: number; category: string }>;
  totalExpenses: number;
}

/**
 * Generate a complete trip report
 */
export function generateTripReport(input: TripReportInput): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Trip Report: ${input.tripName}`);
  lines.push('');
  lines.push(`**Location:** ${input.location}`);
  lines.push(`**Dates:** ${formatDate(input.startDate)} - ${formatDate(input.endDate)}`);
  lines.push('');

  // Attendees
  lines.push('## Attendees');
  lines.push('');
  for (const attendee of input.attendees) {
    const roleLabel = attendee.role === 'organizer' ? ' (Organizer)' :
                      attendee.role === 'groom' ? ' (Groom)' : '';
    lines.push(`- ${attendee.name}${roleLabel}`);
  }
  lines.push('');

  // Expenses by category
  lines.push('## Expense Summary');
  lines.push('');

  const byCategory: Record<string, number> = {};
  for (const expense of input.expenses) {
    byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
  }

  for (const [category, amount] of Object.entries(byCategory)) {
    lines.push(`- **${category}:** ${formatCurrency(amount)}`);
  }

  lines.push('');
  lines.push('---');
  lines.push(`**Total Expenses:** ${formatCurrency(input.totalExpenses)}`);
  lines.push(`**Per Person (${input.attendees.length} attendees):** ${formatCurrency(input.totalExpenses / input.attendees.length)}`);

  return lines.join('\n');
}

/**
 * Download a file in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Download expenses as CSV
 */
export function downloadExpensesCSV(expenses: ExpenseData[], tripName: string): void {
  const csv = generateExpenseCSV(expenses);
  const filename = `${tripName.replace(/[^a-z0-9]/gi, '_')}_expenses.csv`;
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Download settlement summary as markdown
 */
export function downloadSettlementSummary(input: SettlementSummaryInput): void {
  const summary = generateSettlementSummary(input);
  const filename = `${input.tripName.replace(/[^a-z0-9]/gi, '_')}_settlements.md`;
  downloadFile(summary, filename, 'text/markdown');
}

/**
 * Download trip report as markdown
 */
export function downloadTripReport(input: TripReportInput): void {
  const report = generateTripReport(input);
  const filename = `${input.tripName.replace(/[^a-z0-9]/gi, '_')}_report.md`;
  downloadFile(report, filename, 'text/markdown');
}

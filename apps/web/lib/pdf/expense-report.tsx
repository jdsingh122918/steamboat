/**
 * PDF expense report generator using @react-pdf/renderer.
 *
 * Generates downloadable PDF expense reports for trips.
 */

import * as React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

/**
 * Expense item for the report.
 */
export interface ExpenseItem {
  id: string;
  description: string;
  category: string;
  amount: number;
  paidBy: string;
  date: Date;
}

/**
 * Balance for an attendee.
 */
export interface AttendeeBalance {
  attendee: string;
  balance: number;
}

/**
 * Settlement between attendees.
 */
export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * Props for the expense report PDF.
 */
export interface ExpenseReportProps {
  tripName: string;
  tripDates: {
    start: Date;
    end: Date;
  };
  expenses: ExpenseItem[];
  currency: string;
  totalAmount: number;
  attendees: string[];
  balances?: AttendeeBalance[];
  settlements?: Settlement[];
}

/**
 * Format currency for PDF with specific currency.
 */
function formatPdfCurrency(amount: number, currency: string): string {
  return formatCurrency(amount, { currency });
}

/**
 * Format date for PDF display.
 */
function formatPdfDate(date: Date): string {
  return formatDateShort(date);
}

/**
 * Capitalize category name.
 */
function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * PDF styles.
 */
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #3b82f6',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: '1px solid #e2e8f0',
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 4,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 10,
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#0f172a',
    fontSize: 10,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'right',
    marginTop: 10,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 9,
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e2e8f0',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#fafafa',
  },
  colDate: { width: '15%' },
  colDescription: { width: '35%' },
  colCategory: { width: '15%' },
  colPaidBy: { width: '15%' },
  colAmount: { width: '20%', textAlign: 'right' },
  categoryBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 8,
  },
  balancePositive: {
    color: '#059669',
  },
  balanceNegative: {
    color: '#dc2626',
  },
  settlementRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e2e8f0',
    alignItems: 'center',
  },
  settlementArrow: {
    marginHorizontal: 10,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: 20,
  },
});

/**
 * Expense Report PDF component.
 *
 * @example
 * const doc = <ExpenseReportPDF {...props} />;
 * const blob = await pdf(doc).toBlob();
 */
export function ExpenseReportPDF({
  tripName,
  tripDates,
  expenses,
  currency,
  totalAmount,
  attendees,
  balances,
  settlements,
}: ExpenseReportProps) {
  // Group expenses by category for summary
  const categoryTotals = expenses.reduce(
    (acc, exp) => {
      const cat = exp.category;
      acc[cat] = (acc[cat] || 0) + exp.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{tripName}</Text>
          <Text style={styles.subtitle}>
            Expense Report • {formatPdfDate(tripDates.start)} - {formatPdfDate(tripDates.end)}
          </Text>
        </View>

        {/* Summary Box */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Attendees</Text>
            <Text style={styles.summaryValue}>{attendees.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryValue}>{expenses.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Per Person Average</Text>
            <Text style={styles.summaryValue}>
              {formatPdfCurrency(totalAmount / Math.max(attendees.length, 1), currency)}
            </Text>
          </View>
          <Text style={styles.totalAmount}>
            Total: {formatPdfCurrency(totalAmount, currency)}
          </Text>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Breakdown by Category</Text>
          {Object.entries(categoryTotals).map(([category, amount]) => (
            <View key={category} style={styles.summaryRow}>
              <Text style={styles.categoryBadge}>{formatCategory(category)}</Text>
              <Text style={styles.summaryValue}>{formatPdfCurrency(amount, currency)}</Text>
            </View>
          ))}
        </View>

        {/* Expenses Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Expenses</Text>
          {expenses.length === 0 ? (
            <Text style={styles.emptyMessage}>No expenses recorded</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colDate}>Date</Text>
                <Text style={styles.colDescription}>Description</Text>
                <Text style={styles.colCategory}>Category</Text>
                <Text style={styles.colPaidBy}>Paid By</Text>
                <Text style={styles.colAmount}>Amount</Text>
              </View>
              {expenses.map((expense, index) => (
                <View
                  key={expense.id}
                  style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={styles.colDate}>{formatPdfDate(expense.date)}</Text>
                  <Text style={styles.colDescription}>{expense.description}</Text>
                  <Text style={styles.colCategory}>{formatCategory(expense.category)}</Text>
                  <Text style={styles.colPaidBy}>{expense.paidBy}</Text>
                  <Text style={styles.colAmount}>
                    {formatPdfCurrency(expense.amount, currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Balances Section */}
        {balances && balances.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Balances</Text>
            {balances.map((item) => (
              <View key={item.attendee} style={styles.summaryRow}>
                <Text>{item.attendee}</Text>
                <Text
                  style={item.balance >= 0 ? styles.balancePositive : styles.balanceNegative}
                >
                  {item.balance >= 0 ? '+' : '-'}
                  {formatPdfCurrency(item.balance, currency)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Settlements Section */}
        {settlements && settlements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Settlements</Text>
            {settlements.map((settlement, index) => (
              <View key={index} style={styles.settlementRow}>
                <Text>{settlement.from}</Text>
                <Text style={styles.settlementArrow}>→</Text>
                <Text>{settlement.to}</Text>
                <Text style={{ marginLeft: 'auto' }}>
                  {formatPdfCurrency(settlement.amount, currency)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by Steamboat • {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Generate a PDF blob from expense report data.
 *
 * @param props - Expense report props
 * @returns Blob containing the PDF
 *
 * @example
 * const blob = await generateExpenseReportBlob(props);
 * saveAs(blob, 'expense-report.pdf');
 */
export async function generateExpenseReportBlob(
  props: ExpenseReportProps
): Promise<Blob> {
  const doc = <ExpenseReportPDF {...props} />;
  return pdf(doc).toBlob();
}

export default ExpenseReportPDF;

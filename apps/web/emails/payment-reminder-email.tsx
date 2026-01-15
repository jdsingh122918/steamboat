/**
 * Payment reminder email template.
 *
 * Sent to remind users about outstanding payments.
 */

import {
  Button,
  Heading,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';
import { formatCurrency } from '@/lib/utils/format';

/**
 * Expense breakdown item.
 */
interface ExpenseItem {
  description: string;
  amount: number;
}

/**
 * Props for the PaymentReminderEmail component.
 */
export interface PaymentReminderEmailProps {
  /** Name of the person who owes money */
  recipientName: string;
  /** Name of the trip */
  tripName: string;
  /** Total amount owed */
  amountOwed: number;
  /** Currency code */
  currency?: string;
  /** Name of the person to pay */
  creditorName: string;
  /** URL to the payment page */
  paymentUrl: string;
  /** Optional due date */
  dueDate?: string;
  /** Optional expense breakdown */
  expenseBreakdown?: ExpenseItem[];
}

/**
 * Styles for the payment reminder email.
 */
const styles = {
  heading: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#0f172a',
    textAlign: 'center' as const,
    margin: '0 0 24px 0',
  },
  intro: {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#334155',
    margin: '0 0 24px 0',
  },
  amountCard: {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
    textAlign: 'center' as const,
  },
  amountLabel: {
    fontSize: '14px',
    color: '#92400e',
    margin: '0 0 8px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  amountValue: {
    fontSize: '36px',
    fontWeight: 'bold' as const,
    color: '#92400e',
    margin: '0',
  },
  dueDate: {
    fontSize: '14px',
    color: '#b45309',
    margin: '12px 0 0 0',
  },
  breakdownSection: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
  },
  breakdownTitle: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    color: '#334155',
    margin: '0 0 12px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  breakdownItem: {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#64748b',
    margin: '8px 0',
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
  },
  buttonContainer: {
    textAlign: 'center' as const,
    margin: '32px 0',
  },
  button: {
    backgroundColor: '#f59e0b',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    textDecoration: 'none',
    padding: '14px 28px',
    display: 'inline-block' as const,
  },
  note: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center' as const,
    margin: '16px 0 0 0',
  },
};

/**
 * Payment reminder email component.
 *
 * @example
 * <PaymentReminderEmail
 *   recipientName="Mike"
 *   tripName="Vegas Bachelor Party"
 *   amountOwed={150}
 *   creditorName="John"
 *   paymentUrl="https://steamboat.app/trips/123/finances"
 * />
 */
export function PaymentReminderEmail({
  recipientName,
  tripName,
  amountOwed,
  currency = 'USD',
  creditorName,
  paymentUrl,
  dueDate,
  expenseBreakdown,
}: PaymentReminderEmailProps) {
  const formattedAmount = formatCurrency(amountOwed, { currency });
  const previewText = `Friendly reminder: You owe ${formattedAmount} for ${tripName}`;

  return (
    <BaseLayout previewText={previewText} title={`Payment Reminder - ${tripName}`}>
      <Heading style={styles.heading}>Payment Reminder 💸</Heading>

      <Text style={styles.intro}>
        Hi {recipientName}, this is a friendly reminder that you have an outstanding
        balance for <strong>{tripName}</strong>.
      </Text>

      {/* Amount Card */}
      <Section style={styles.amountCard}>
        <Text style={styles.amountLabel}>Amount Owed to {creditorName}</Text>
        <Text style={styles.amountValue}>{formattedAmount}</Text>
        {dueDate && <Text style={styles.dueDate}>Due by {dueDate}</Text>}
      </Section>

      {/* Expense Breakdown */}
      {expenseBreakdown && expenseBreakdown.length > 0 && (
        <Section style={styles.breakdownSection}>
          <Text style={styles.breakdownTitle}>Expense Breakdown</Text>
          {expenseBreakdown.map((item, index) => (
            <Text key={index} style={styles.breakdownItem}>
              <span>{item.description}</span>
              <span>{formatCurrency(item.amount, { currency })}</span>
            </Text>
          ))}
        </Section>
      )}

      {/* CTA Button */}
      <Section style={styles.buttonContainer}>
        <Button href={paymentUrl} style={styles.button}>
          Settle Up Now
        </Button>
      </Section>

      <Text style={styles.note}>
        Click the button above to view payment options and settle your balance.
      </Text>
    </BaseLayout>
  );
}

export default PaymentReminderEmail;

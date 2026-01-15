/**
 * Settlement notification email template.
 *
 * Sent when a payment is confirmed between trip attendees.
 */

import {
  Button,
  Heading,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

/**
 * Props for the SettlementEmail component.
 */
export interface SettlementEmailProps {
  /** Name of the email recipient */
  recipientName: string;
  /** Name of the trip */
  tripName: string;
  /** Name of the person who paid */
  payerName: string;
  /** Settlement amount */
  amount: number;
  /** Currency code */
  currency?: string;
  /** Payment method used */
  paymentMethod: string;
  /** When the settlement was confirmed */
  settledAt: Date;
  /** URL to the trip */
  tripUrl: string;
  /** Type of notification */
  type?: 'received' | 'confirmed';
  /** Optional note from payer */
  note?: string;
}

/**
 * Format currency amount.
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
  };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Styles for the settlement email.
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
  settlementCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
    border: '1px solid #a7f3d0',
  },
  settlementHeader: {
    fontSize: '14px',
    color: '#065f46',
    margin: '0 0 8px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  settlementAmount: {
    fontSize: '36px',
    fontWeight: 'bold' as const,
    color: '#059669',
    margin: '0 0 16px 0',
    textAlign: 'center' as const,
  },
  detailRow: {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#047857',
    margin: '8px 0',
  },
  detailLabel: {
    fontWeight: 'bold' as const,
  },
  noteSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    padding: '16px',
    margin: '24px 0',
    borderLeft: '4px solid #0ea5e9',
  },
  noteLabel: {
    fontSize: '12px',
    color: '#0369a1',
    margin: '0 0 8px 0',
    textTransform: 'uppercase' as const,
  },
  noteText: {
    fontSize: '14px',
    color: '#334155',
    margin: '0',
    fontStyle: 'italic' as const,
  },
  buttonContainer: {
    textAlign: 'center' as const,
    margin: '32px 0',
  },
  button: {
    backgroundColor: '#059669',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    textDecoration: 'none',
    padding: '14px 28px',
    display: 'inline-block' as const,
  },
  footer: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center' as const,
    margin: '16px 0 0 0',
  },
};

/**
 * Settlement notification email component.
 *
 * @example
 * <SettlementEmail
 *   recipientName="John"
 *   tripName="Vegas Bachelor Party"
 *   payerName="Mike"
 *   amount={150}
 *   paymentMethod="Venmo"
 *   settledAt={new Date()}
 *   tripUrl="https://steamboat.app/trips/123"
 * />
 */
export function SettlementEmail({
  recipientName,
  tripName,
  payerName,
  amount,
  currency = 'USD',
  paymentMethod,
  settledAt,
  tripUrl,
  type = 'received',
  note,
}: SettlementEmailProps) {
  const formattedAmount = formatCurrency(amount, currency);
  const formattedDate = formatDate(settledAt);

  const isReceived = type === 'received';
  const headerText = isReceived
    ? 'Payment Received! ✅'
    : 'Payment Confirmed! ✅';

  const previewText = isReceived
    ? `${payerName} paid you ${formattedAmount} for ${tripName}`
    : `Your payment of ${formattedAmount} to ${recipientName} has been confirmed`;

  const introText = isReceived
    ? `Great news! ${payerName} has sent you a payment for ${tripName}.`
    : `Your payment has been confirmed and recorded for ${tripName}.`;

  return (
    <BaseLayout previewText={previewText} title={`Settlement - ${tripName}`}>
      <Heading style={styles.heading}>{headerText}</Heading>

      <Text style={styles.intro}>Hi {recipientName}, {introText}</Text>

      {/* Settlement Card */}
      <Section style={styles.settlementCard}>
        <Text style={styles.settlementHeader}>
          {isReceived ? 'Payment Received' : 'Payment Confirmed'}
        </Text>
        <Text style={styles.settlementAmount}>{formattedAmount}</Text>

        <Text style={styles.detailRow}>
          <span style={styles.detailLabel}>
            {isReceived ? 'From:' : 'To:'}
          </span>{' '}
          {isReceived ? payerName : recipientName}
        </Text>

        <Text style={styles.detailRow}>
          <span style={styles.detailLabel}>Method:</span> {paymentMethod}
        </Text>

        <Text style={styles.detailRow}>
          <span style={styles.detailLabel}>Date:</span> {formattedDate}
        </Text>
      </Section>

      {/* Note Section */}
      {note && (
        <Section style={styles.noteSection}>
          <Text style={styles.noteLabel}>Note from {payerName}</Text>
          <Text style={styles.noteText}>&ldquo;{note}&rdquo;</Text>
        </Section>
      )}

      {/* CTA Button */}
      <Section style={styles.buttonContainer}>
        <Button href={tripUrl} style={styles.button}>
          View Trip Details
        </Button>
      </Section>

      <Text style={styles.footer}>
        This settlement has been recorded in your trip finances.
      </Text>
    </BaseLayout>
  );
}

export default SettlementEmail;

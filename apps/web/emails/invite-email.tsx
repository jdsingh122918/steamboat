/**
 * Trip invitation email template.
 *
 * Sent when a user is invited to join a trip on Steamboat.
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
 * Props for the InviteEmail component.
 */
export interface InviteEmailProps {
  /** Name of the person sending the invite */
  inviterName: string;
  /** Name of the trip */
  tripName: string;
  /** URL to accept the invitation */
  inviteUrl: string;
  /** Optional trip location */
  tripLocation?: string;
  /** Optional trip dates */
  tripDates?: string;
  /** Optional personal message from inviter */
  personalMessage?: string;
}

/**
 * Styles for the invite email.
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
  tripCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '24px',
    margin: '24px 0',
  },
  tripName: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  tripDetail: {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#64748b',
    margin: '8px 0',
  },
  tripDetailLabel: {
    fontWeight: 'bold' as const,
    color: '#334155',
  },
  message: {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#334155',
    fontStyle: 'italic' as const,
    backgroundColor: '#eff6ff',
    borderLeft: '4px solid #3b82f6',
    padding: '16px',
    margin: '24px 0',
    borderRadius: '0 4px 4px 0',
  },
  buttonContainer: {
    textAlign: 'center' as const,
    margin: '32px 0',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    textDecoration: 'none',
    padding: '14px 28px',
    display: 'inline-block' as const,
  },
  fallbackLink: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center' as const,
    margin: '16px 0 0 0',
    wordBreak: 'break-all' as const,
  },
};

/**
 * Trip invitation email component.
 *
 * @example
 * <InviteEmail
 *   inviterName="John"
 *   tripName="Vegas Bachelor Party"
 *   inviteUrl="https://steamboat.app/invite/abc123"
 *   tripLocation="Las Vegas, NV"
 *   tripDates="June 15-18, 2025"
 * />
 */
export function InviteEmail({
  inviterName,
  tripName,
  inviteUrl,
  tripLocation,
  tripDates,
  personalMessage,
}: InviteEmailProps) {
  const previewText = `${inviterName} has invited you to ${tripName}!`;

  return (
    <BaseLayout previewText={previewText} title={`You're Invited to ${tripName}`}>
      <Heading style={styles.heading}>You&apos;re Invited! 🎉</Heading>

      <Text style={styles.intro}>
        <strong>{inviterName}</strong> has invited you to join an upcoming trip on
        Steamboat. Here are the details:
      </Text>

      {/* Trip Details Card */}
      <Section style={styles.tripCard}>
        <Text style={styles.tripName}>{tripName}</Text>

        {tripLocation && (
          <Text style={styles.tripDetail}>
            <span style={styles.tripDetailLabel}>📍 Location:</span> {tripLocation}
          </Text>
        )}

        {tripDates && (
          <Text style={styles.tripDetail}>
            <span style={styles.tripDetailLabel}>📅 Dates:</span> {tripDates}
          </Text>
        )}
      </Section>

      {/* Personal Message */}
      {personalMessage && (
        <Text style={styles.message}>&ldquo;{personalMessage}&rdquo;</Text>
      )}

      {/* CTA Button */}
      <Section style={styles.buttonContainer}>
        <Button href={inviteUrl} style={styles.button}>
          Accept Invitation
        </Button>
      </Section>

      <Text style={styles.fallbackLink}>
        Or copy and paste this link into your browser: {inviteUrl}
      </Text>
    </BaseLayout>
  );
}

export default InviteEmail;

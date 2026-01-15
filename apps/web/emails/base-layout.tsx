/**
 * Base email layout component.
 *
 * Provides consistent styling and structure for all Steamboat emails.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

/**
 * Props for the BaseLayout component.
 */
interface BaseLayoutProps {
  /** Email preview text (shown in email clients) */
  previewText: string;
  /** Optional custom title */
  title?: string;
  /** Email content */
  children: React.ReactNode;
}

/**
 * Styles for the email layout.
 */
const styles = {
  html: {
    backgroundColor: '#f6f9fc',
  },
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
    margin: '0',
    padding: '0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '40px auto',
    padding: '40px',
    maxWidth: '600px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  logo: {
    fontSize: '28px',
    fontWeight: 'bold' as const,
    color: '#0f172a',
    margin: '0',
  },
  tagline: {
    fontSize: '14px',
    color: '#64748b',
    margin: '8px 0 0 0',
  },
  content: {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#334155',
  },
  hr: {
    borderColor: '#e2e8f0',
    margin: '32px 0',
  },
  footer: {
    textAlign: 'center' as const,
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '32px',
  },
  footerText: {
    margin: '4px 0',
    fontSize: '12px',
    color: '#94a3b8',
  },
};

/**
 * Base layout component for all Steamboat emails.
 *
 * @example
 * <BaseLayout previewText="You have a new message">
 *   <Text>Hello!</Text>
 *   <Button href="https://steamboat.app">View Message</Button>
 * </BaseLayout>
 */
export function BaseLayout({
  previewText,
  title = 'Steamboat',
  children,
}: BaseLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <Html lang="en">
      <Head>
        <title>{title}</title>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>🚢 Steamboat</Heading>
            <Text style={styles.tagline}>Bachelor Party Planning Made Easy</Text>
          </Section>

          {/* Content */}
          <Section style={styles.content}>{children}</Section>

          {/* Footer */}
          <Hr style={styles.hr} />
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              © {currentYear} Steamboat. All rights reserved.
            </Text>
            <Text style={styles.footerText}>
              You&apos;re receiving this email because you&apos;re part of a trip on
              Steamboat.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BaseLayout;

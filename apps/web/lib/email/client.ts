/**
 * Email client using Resend.
 *
 * Provides a singleton Resend client and utilities for sending emails.
 */

import { Resend } from 'resend';

/**
 * Options for sending an email.
 */
export interface EmailSendOptions {
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject */
  subject: string;
  /** HTML content */
  html?: string;
  /** Plain text content */
  text?: string;
  /** Sender email address (defaults to EMAIL_FROM env var) */
  from?: string;
  /** Reply-to email address */
  replyTo?: string;
}

/**
 * Result of sending an email.
 */
export interface EmailResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Email ID if successful */
  id?: string;
  /** Error message if failed */
  error?: string;
}

/** Singleton Resend client instance */
let resendClient: Resend | null = null;

/**
 * Default from address for emails.
 */
const DEFAULT_FROM_ADDRESS = 'Steamboat <noreply@steamboat.app>';

/**
 * Get the default from address from environment or fallback.
 */
function getDefaultFromAddress(): string {
  return process.env.EMAIL_FROM || DEFAULT_FROM_ADDRESS;
}

/**
 * Create or return the singleton Resend client.
 *
 * @returns Resend client instance or null if not configured
 */
export function createEmailClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

/**
 * Send an email using Resend.
 *
 * @param options - Email options including to, subject, and content
 * @returns Result with success status and email ID or error
 *
 * @example
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<p>Hello!</p>',
 * });
 *
 * if (result.success) {
 *   console.log('Email sent:', result.id);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 */
export async function sendEmail(options: EmailSendOptions): Promise<EmailResult> {
  const client = createEmailClient();

  if (!client) {
    return {
      success: false,
      error: 'Email client not configured. Set RESEND_API_KEY environment variable.',
    };
  }

  try {
    const { to, subject, html, text, from, replyTo } = options;

    // Ensure at least one content type is provided
    if (!html && !text) {
      return {
        success: false,
        error: 'Either html or text content must be provided',
      };
    }

    // Build email payload with the content that's available
    // We've already validated that at least one of html/text is defined
    const response = await client.emails.send({
      from: from || getDefaultFromAddress(),
      to,
      subject,
      html: html || text!, // Use html if available, otherwise text
      ...(text && html ? { text } : {}), // Include text as fallback if html is primary
      ...(replyTo ? { replyTo } : {}),
    });

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
      };
    }

    return {
      success: true,
      id: response.data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Reset the client for testing purposes.
 * @internal
 */
export function __resetClientForTesting(): void {
  resendClient = null;
}

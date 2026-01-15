/**
 * Send Invite Email API Route
 *
 * Sends trip invitation emails to specified recipients.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { render } from '@react-email/render';
import { sendEmail } from '@/lib/email';
import { requireAdmin } from '@/lib/auth/guards';
import { InviteEmail } from '@/emails/invite-email';

/**
 * Request body schema for sending invite email.
 */
const SendInviteSchema = z.object({
  tripId: z.string().min(1, 'tripId is required'),
  recipientEmail: z.union([
    z.string().email('Invalid email format'),
    z.array(z.string().email('Invalid email format')),
  ]),
  inviterName: z.string().min(1, 'inviterName is required'),
  tripName: z.string().min(1, 'tripName is required'),
  inviteUrl: z.string().url('inviteUrl must be a valid URL'),
  tripLocation: z.string().optional(),
  tripDates: z.string().optional(),
  personalMessage: z.string().optional(),
});

/**
 * POST /api/email/send-invite
 *
 * Send a trip invitation email. Requires admin role.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = SendInviteSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const {
      tripId,
      recipientEmail,
      inviterName,
      tripName,
      inviteUrl,
      tripLocation,
      tripDates,
      personalMessage,
    } = parseResult.data;

    // Require admin authentication for this trip
    await requireAdmin(tripId);

    // Render the email template
    const emailHtml = await render(
      InviteEmail({
        inviterName,
        tripName,
        inviteUrl,
        tripLocation,
        tripDates,
        personalMessage,
      })
    );

    // Send the email
    const result = await sendEmail({
      to: recipientEmail,
      subject: `You're invited to ${tripName}!`,
      html: emailHtml,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { emailId: result.id },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Error sending invite email:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Settlement Notification Email API Route
 *
 * Sends settlement confirmation emails when payments are confirmed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { render } from '@react-email/render';
import { sendEmail } from '@/lib/email';
import { requireAuth } from '@/lib/auth/guards';
import { SettlementEmail } from '@/emails/settlement-email';

/**
 * Request body schema for sending settlement notification.
 */
const SettlementNotificationSchema = z.object({
  recipientEmail: z.string().email('Invalid email format'),
  recipientName: z.string().min(1, 'recipientName is required'),
  tripName: z.string().min(1, 'tripName is required'),
  payerName: z.string().min(1, 'payerName is required'),
  payerEmail: z.string().email().optional(),
  amount: z.number().positive('amount must be positive'),
  paymentMethod: z.string().min(1, 'paymentMethod is required'),
  tripUrl: z.string().url('tripUrl must be a valid URL'),
  currency: z.string().optional(),
  type: z.enum(['received', 'confirmed']).optional(),
  note: z.string().optional(),
  sendToBoth: z.boolean().optional(),
});

/**
 * POST /api/email/settlement-notification
 *
 * Send a settlement notification email. Requires authentication.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth();

    // Parse and validate request body
    const body = await request.json();
    const parseResult = SettlementNotificationSchema.safeParse(body);

    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const {
      recipientEmail,
      recipientName,
      tripName,
      payerName,
      payerEmail,
      amount,
      paymentMethod,
      tripUrl,
      currency,
      type,
      note,
      sendToBoth,
    } = parseResult.data;

    const settledAt = new Date();
    const emailResults: { success: boolean; id?: string; error?: string }[] = [];

    // Send to recipient (creditor)
    const recipientEmailHtml = await render(
      SettlementEmail({
        recipientName,
        tripName,
        payerName,
        amount,
        currency,
        paymentMethod,
        settledAt,
        tripUrl,
        type: type || 'received',
        note,
      })
    );

    const recipientResult = await sendEmail({
      to: recipientEmail,
      subject: `Settlement Confirmed: ${tripName}`,
      html: recipientEmailHtml,
    });

    emailResults.push(recipientResult);

    // Optionally send to payer as well
    if (sendToBoth && payerEmail) {
      const payerEmailHtml = await render(
        SettlementEmail({
          recipientName: payerName,
          tripName,
          payerName,
          amount,
          currency,
          paymentMethod,
          settledAt,
          tripUrl,
          type: 'confirmed',
          note,
        })
      );

      const payerResult = await sendEmail({
        to: payerEmail,
        subject: `Payment Confirmed: ${tripName}`,
        html: payerEmailHtml,
      });

      emailResults.push(payerResult);
    }

    // Check if any email failed
    const failedResults = emailResults.filter((r) => !r.success);
    if (failedResults.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: failedResults[0].error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        emailId: emailResults[0].id,
        emailsSent: emailResults.length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Error sending settlement notification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

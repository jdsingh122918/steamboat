/**
 * Payment Reminder Email API Route
 *
 * Sends payment reminder emails to attendees with outstanding balances.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { render } from '@react-email/render';
import { sendEmail } from '@/lib/email';
import { requireAdmin } from '@/lib/auth/guards';
import { PaymentReminderEmail } from '@/emails/payment-reminder-email';

/**
 * Expense breakdown item schema.
 */
const ExpenseItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
});

/**
 * Request body schema for sending payment reminder.
 */
const PaymentReminderSchema = z.object({
  tripId: z.string().min(1, 'tripId is required'),
  recipientEmail: z.string().email('Invalid email format'),
  recipientName: z.string().min(1, 'recipientName is required'),
  tripName: z.string().min(1, 'tripName is required'),
  amountOwed: z.number().positive('amountOwed must be positive'),
  creditorName: z.string().min(1, 'creditorName is required'),
  paymentUrl: z.string().url('paymentUrl must be a valid URL'),
  currency: z.string().optional(),
  dueDate: z.string().optional(),
  expenseBreakdown: z.array(ExpenseItemSchema).optional(),
});

/**
 * POST /api/email/payment-reminder
 *
 * Send a payment reminder email. Requires admin role.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const parseResult = PaymentReminderSchema.safeParse(body);

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
      recipientName,
      tripName,
      amountOwed,
      creditorName,
      paymentUrl,
      currency,
      dueDate,
      expenseBreakdown,
    } = parseResult.data;

    // Require admin authentication for this trip
    await requireAdmin(tripId);

    // Render the email template
    const emailHtml = await render(
      PaymentReminderEmail({
        recipientName,
        tripName,
        amountOwed,
        creditorName,
        paymentUrl,
        currency,
        dueDate,
        expenseBreakdown,
      })
    );

    // Send the email
    const result = await sendEmail({
      to: recipientEmail,
      subject: `Payment Reminder: ${tripName}`,
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

    console.error('Error sending payment reminder:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

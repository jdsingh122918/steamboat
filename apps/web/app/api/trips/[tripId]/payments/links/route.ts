/**
 * API route to generate payment deep links.
 *
 * POST /api/trips/[tripId]/payments/links - Generate a payment deep link
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import { getAttendeeById } from '@/lib/db/operations/attendees';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaymentLinkResult {
  method: string;
  link: string;
  receiverName: string;
  amount: string;
}

// Valid payment methods that support deep links
const LINK_METHODS = ['venmo', 'paypal', 'cashapp'] as const;
type LinkMethod = (typeof LINK_METHODS)[number];

/**
 * Validate ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Format cents as dollars (e.g., 15000 -> "150.00").
 */
function formatDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Generate payment link for the given method.
 */
function generatePaymentLink(
  method: LinkMethod,
  recipient: string,
  amount_cents: number,
  note: string = 'Payment'
): string {
  const amount = formatDollars(amount_cents);
  const encodedNote = encodeURIComponent(note);

  switch (method) {
    case 'venmo': {
      // Add @ prefix if missing
      const venmoRecipient = recipient.startsWith('@')
        ? recipient
        : `@${recipient}`;
      return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(venmoRecipient)}&amount=${amount}&note=${encodedNote}`;
    }

    case 'paypal': {
      return `https://paypal.me/${encodeURIComponent(recipient)}/${amount}`;
    }

    case 'cashapp': {
      // Add $ prefix if missing
      const cashappRecipient = recipient.startsWith('$')
        ? recipient
        : `$${recipient}`;
      return `https://cash.app/${encodeURIComponent(cashappRecipient)}/${amount}`;
    }
  }
}

/**
 * POST /api/trips/[tripId]/payments/links
 *
 * Generate payment deep link.
 * Body: { toId, amount_cents, method: 'venmo'|'paypal'|'cashapp' }
 * Uses receiver's payment handles from attendee record.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<PaymentLinkResult>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check trip access
    await requireTripAccess(tripId);

    // Parse request body
    const body = await request.json();
    const { toId, amount_cents, method } = body;

    // Validate required fields
    if (!toId || amount_cents === undefined || !method) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: toId, amount_cents, method',
        },
        { status: 400 }
      );
    }

    // Validate toId format
    if (!isValidObjectId(toId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid toId format' },
        { status: 400 }
      );
    }

    // Validate method
    if (!LINK_METHODS.includes(method as LinkMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid method. Must be one of: ${LINK_METHODS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount_cents !== 'number' || amount_cents <= 0) {
      return NextResponse.json(
        { success: false, error: 'amount_cents must be a positive number' },
        { status: 400 }
      );
    }

    // Get receiver
    const receiver = await getAttendeeById(new ObjectId(toId));

    if (!receiver) {
      return NextResponse.json(
        { success: false, error: 'Receiver not found' },
        { status: 404 }
      );
    }

    // Verify receiver belongs to this trip
    if (receiver.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Receiver not found in this trip' },
        { status: 404 }
      );
    }

    // Check receiver has payment handles
    if (!receiver.paymentHandles) {
      return NextResponse.json(
        {
          success: false,
          error: `${receiver.name} has not set up any payment handles`,
        },
        { status: 400 }
      );
    }

    // Get the specific payment handle
    const handle = receiver.paymentHandles[method as keyof typeof receiver.paymentHandles];

    if (!handle) {
      return NextResponse.json(
        {
          success: false,
          error: `${receiver.name} has not set up a ${method} payment handle`,
        },
        { status: 400 }
      );
    }

    // Generate the payment link
    const link = generatePaymentLink(
      method as LinkMethod,
      handle,
      amount_cents,
      `Payment to ${receiver.name}`
    );

    return NextResponse.json({
      success: true,
      data: {
        method,
        link,
        receiverName: receiver.name,
        amount: formatDollars(amount_cents),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    if (message.includes('NEXT_REDIRECT') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('POST /api/trips/[tripId]/payments/links error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import type { PaymentPlatform, PaymentLinkResult } from '@/lib/wasm/types';

// Note: Edge runtime is configured in vercel.json
// For local testing, we use Node.js runtime

// Valid platforms
const VALID_PLATFORMS: PaymentPlatform[] = ['venmo', 'paypal', 'cashapp', 'zelle'];

// Types for request
interface PaymentLinkRequest {
  platform: PaymentPlatform;
  recipient: string;
  amount_cents: number;
  memo: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    duration_ms: number;
  };
}

/**
 * Format cents as dollars (e.g., 15000 -> "150.00").
 */
function formatDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Generate payment link for the given platform.
 */
function generatePaymentLink(
  platform: PaymentPlatform,
  recipient: string,
  amount_cents: number,
  memo: string
): PaymentLinkResult {
  const amount = formatDollars(amount_cents);
  const encodedMemo = encodeURIComponent(memo);

  switch (platform) {
    case 'venmo': {
      // Add @ prefix if missing
      const venmoRecipient = recipient.startsWith('@')
        ? recipient
        : `@${recipient}`;
      const link = `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(venmoRecipient)}&amount=${amount}&note=${encodedMemo}`;
      return {
        platform: 'venmo',
        link,
        fallback_text: `Pay ${venmoRecipient} $${amount} via Venmo: ${memo}`,
      };
    }

    case 'paypal': {
      const link = `https://paypal.me/${encodeURIComponent(recipient)}/${amount}`;
      return {
        platform: 'paypal',
        link,
        fallback_text: `Pay ${recipient} $${amount} via PayPal: ${memo}`,
      };
    }

    case 'cashapp': {
      // Add $ prefix if missing
      const cashappRecipient = recipient.startsWith('$')
        ? recipient
        : `$${recipient}`;
      const link = `https://cash.app/${encodeURIComponent(cashappRecipient)}/${amount}`;
      return {
        platform: 'cashapp',
        link,
        fallback_text: `Pay ${cashappRecipient} $${amount} via Cash App: ${memo}`,
      };
    }

    case 'zelle': {
      // Zelle doesn't support deep links
      return {
        platform: 'zelle',
        link: null,
        fallback_text: `Pay ${recipient} $${amount} via Zelle: ${memo}`,
      };
    }
  }
}

/**
 * POST /api/mcp/payment-links
 *
 * Generate payment links for various platforms.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PaymentLinkResult>>> {
  const startTime = performance.now();

  try {
    // Parse request body
    const body = (await request.json()) as PaymentLinkRequest;

    // Validate required fields
    if (
      !body.platform ||
      !body.recipient ||
      body.amount_cents === undefined ||
      !body.memo
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid request: platform, recipient, amount_cents, and memo are required',
        },
        { status: 400 }
      );
    }

    // Validate platform
    if (!VALID_PLATFORMS.includes(body.platform)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid platform: ${body.platform}. Valid platforms: ${VALID_PLATFORMS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof body.amount_cents !== 'number' || body.amount_cents <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid amount_cents: must be a positive number',
        },
        { status: 400 }
      );
    }

    // Validate recipient
    if (
      typeof body.recipient !== 'string' ||
      body.recipient.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid recipient: must be a non-empty string',
        },
        { status: 400 }
      );
    }

    // Generate payment link
    const result = generatePaymentLink(
      body.platform,
      body.recipient,
      body.amount_cents,
      body.memo
    );

    const duration = performance.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        duration_ms: Math.round(duration * 100) / 100,
      },
    });
  } catch (error) {
    const duration = performance.now() - startTime;

    console.error('payment-links error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        meta: {
          duration_ms: Math.round(duration * 100) / 100,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mcp/payment-links
 *
 * Health check endpoint.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'payment-links-mcp',
    status: 'healthy',
    methods: ['generate_payment_link'],
    supported_platforms: VALID_PLATFORMS,
  });
}

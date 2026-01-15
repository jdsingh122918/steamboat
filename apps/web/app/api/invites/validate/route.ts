import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { validateInviteToken } from '@/lib/db/operations/invites';
import { getTripById } from '@/lib/db/operations/trips';

/**
 * Standard API response interface.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validation result for the response.
 */
interface ValidationResult {
  valid: boolean;
  trip?: {
    _id: string;
    name: string;
    destination: string;
    startDate: Date;
    endDate: Date;
  };
  expired?: boolean;
  reason?: string;
}

/**
 * POST /api/invites/validate
 *
 * Validate an invite token without accepting it.
 * Body: { token: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required field: token' },
        { status: 400 }
      );
    }

    // Validate token
    const validationResult = await validateInviteToken(token);

    if (!validationResult.valid || !validationResult.invite) {
      // Check if it's expired
      const isExpired = validationResult.reason?.toLowerCase().includes('expired');

      return NextResponse.json<ApiResponse<ValidationResult>>({
        success: true,
        data: {
          valid: false,
          expired: isExpired || undefined,
          reason: validationResult.reason,
        },
      });
    }

    const invite = validationResult.invite;

    // Get trip details
    const trip = await getTripById(invite.tripId as ObjectId);

    if (!trip) {
      return NextResponse.json<ApiResponse<ValidationResult>>({
        success: true,
        data: {
          valid: false,
          reason: 'Trip not found',
        },
      });
    }

    // Return validation result with trip details (without sensitive info)
    return NextResponse.json<ApiResponse<ValidationResult>>({
      success: true,
      data: {
        valid: true,
        trip: {
          _id: (trip._id as ObjectId).toString(),
          name: trip.name,
          destination: trip.location,
          startDate: trip.startDate,
          endDate: trip.endDate,
        },
      },
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { createSession } from '@/lib/auth/session';
import { validateInviteToken, acceptInvite } from '@/lib/db/operations/invites';
import { createAttendee, getAttendeeByEmail } from '@/lib/db/operations/attendees';
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
 * Validate email format.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * POST /api/invites/accept
 *
 * Accept an invite and create an attendee.
 * Body: { token: string, name: string, email?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, name, email: providedEmail } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required field: token' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Validate token
    const validationResult = await validateInviteToken(token);

    if (!validationResult.valid || !validationResult.invite) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: validationResult.reason || 'Invalid invite token' },
        { status: 400 }
      );
    }

    const invite = validationResult.invite;

    // Use email from invite or from request body
    const email = providedEmail || invite.email;

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if attendee already exists for this trip
    if (email) {
      const existingAttendee = await getAttendeeByEmail(
        invite.tripId as ObjectId,
        email
      );

      if (existingAttendee) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'An attendee with this email already exists for this trip' },
          { status: 409 }
        );
      }
    }

    // Get trip details
    const trip = await getTripById(invite.tripId as ObjectId);

    if (!trip) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Create attendee
    const attendee = await createAttendee({
      tripId: invite.tripId as ObjectId,
      name: name.trim(),
      email: email || '',
      role: 'member',
      rsvpStatus: 'pending',
      inviteToken: token,
    });

    // Mark invite as accepted
    await acceptInvite(invite._id as ObjectId);

    // Create session for the new attendee
    await createSession(
      (attendee._id as ObjectId).toString(),
      (invite.tripId as ObjectId).toString(),
      'member'
    );

    // Serialize for JSON response
    const serializedAttendee = {
      ...attendee,
      _id: (attendee._id as ObjectId).toString(),
      tripId: (attendee.tripId as ObjectId).toString(),
    };

    const serializedTrip = {
      ...trip,
      _id: (trip._id as ObjectId).toString(),
      adminIds: trip.adminIds.map((id) =>
        id instanceof ObjectId ? id.toString() : String(id)
      ),
    };

    return NextResponse.json<ApiResponse<{ attendee: typeof serializedAttendee; trip: typeof serializedTrip }>>({
      success: true,
      data: {
        attendee: serializedAttendee,
        trip: serializedTrip,
      },
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

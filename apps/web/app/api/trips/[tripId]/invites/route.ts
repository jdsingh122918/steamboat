import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSession } from '@/lib/auth/session';
import { getAttendeeById } from '@/lib/db/operations/attendees';
import { listInvites } from '@/lib/db/operations/invites';
import { createTripInvite } from '@/lib/auth/tokens';

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
 * Check if user is admin for the trip.
 * Returns error response if not authorized.
 */
async function checkAdminAccess(
  tripId: string
): Promise<{ authorized: true; attendeeId: ObjectId } | { authorized: false; response: NextResponse }> {
  const session = await getSession();

  if (!session.attendeeId) {
    return {
      authorized: false,
      response: NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized: Please log in' },
        { status: 401 }
      ),
    };
  }

  const attendee = await getAttendeeById(new ObjectId(session.attendeeId));

  if (!attendee) {
    return {
      authorized: false,
      response: NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized: Attendee not found' },
        { status: 401 }
      ),
    };
  }

  if (attendee.tripId.toString() !== tripId) {
    return {
      authorized: false,
      response: NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden: Not a member of this trip' },
        { status: 403 }
      ),
    };
  }

  if (attendee.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, attendeeId: attendee._id as ObjectId };
}

/**
 * GET /api/trips/[tripId]/invites
 *
 * List all invites for a trip. Requires admin access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse> {
  try {
    const { tripId } = await params;
    const authResult = await checkAdminAccess(tripId);

    if (!authResult.authorized) {
      return authResult.response;
    }

    const result = await listInvites(
      { tripId: new ObjectId(tripId), deletedAt: null },
      { page: 1, limit: 50 }
    );

    // Convert ObjectIds to strings for JSON serialization
    const serializedData = result.data.map((invite) => ({
      ...invite,
      _id: invite._id?.toString(),
      tripId: invite.tripId.toString(),
      createdBy: invite.createdBy.toString(),
    }));

    return NextResponse.json<ApiResponse<{ items: typeof serializedData; total: number; page: number; limit: number }>>({
      success: true,
      data: {
        items: serializedData,
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    console.error('Error listing invites:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips/[tripId]/invites
 *
 * Create a new invite for a trip. Requires admin access.
 * Body: { email?: string, expiresInDays?: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse> {
  try {
    const { tripId } = await params;
    const authResult = await checkAdminAccess(tripId);

    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const { email = '', expiresInDays = 7 } = body;

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const invite = await createTripInvite(
      new ObjectId(tripId),
      email,
      authResult.attendeeId,
      expiresInDays
    );

    // Serialize for JSON response
    const serializedInvite = {
      ...invite,
      _id: invite._id?.toString(),
      tripId: invite.tripId.toString(),
      createdBy: invite.createdBy.toString(),
    };

    return NextResponse.json<ApiResponse<typeof serializedInvite>>(
      { success: true, data: serializedInvite },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSession } from '@/lib/auth/session';
import { getAttendeeById } from '@/lib/db/operations/attendees';
import { getInviteById, revokeInvite } from '@/lib/db/operations/invites';

/**
 * Standard API response interface.
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Check if a string is a valid ObjectId.
 */
function isValidObjectId(id: string): boolean {
  try {
    new ObjectId(id);
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
  } catch {
    return false;
  }
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
 * GET /api/trips/[tripId]/invites/[inviteId]
 *
 * Get details for a single invite. Requires admin access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; inviteId: string }> }
): Promise<NextResponse> {
  try {
    const { tripId, inviteId } = await params;
    const authResult = await checkAdminAccess(tripId);

    if (!authResult.authorized) {
      return authResult.response;
    }

    // Validate inviteId format
    if (!isValidObjectId(inviteId)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid invite ID format' },
        { status: 400 }
      );
    }

    const invite = await getInviteById(new ObjectId(inviteId));

    if (!invite) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Check that invite belongs to this trip
    if (invite.tripId.toString() !== tripId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invite does not belong to this trip' },
        { status: 403 }
      );
    }

    // Serialize for JSON response
    const serializedInvite = {
      ...invite,
      _id: invite._id?.toString(),
      tripId: invite.tripId.toString(),
      createdBy: invite.createdBy.toString(),
    };

    return NextResponse.json<ApiResponse<typeof serializedInvite>>({
      success: true,
      data: serializedInvite,
    });
  } catch (error) {
    console.error('Error getting invite:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[tripId]/invites/[inviteId]
 *
 * Revoke an invite. Requires admin access.
 * Can only revoke pending invites.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string; inviteId: string }> }
): Promise<NextResponse> {
  try {
    const { tripId, inviteId } = await params;
    const authResult = await checkAdminAccess(tripId);

    if (!authResult.authorized) {
      return authResult.response;
    }

    // Validate inviteId format
    if (!isValidObjectId(inviteId)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid invite ID format' },
        { status: 400 }
      );
    }

    const invite = await getInviteById(new ObjectId(inviteId));

    if (!invite) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Check that invite belongs to this trip
    if (invite.tripId.toString() !== tripId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invite does not belong to this trip' },
        { status: 403 }
      );
    }

    // Check if invite can be revoked
    if (invite.status !== 'pending') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Cannot revoke invite: already ${invite.status}` },
        { status: 400 }
      );
    }

    const revokedInvite = await revokeInvite(new ObjectId(inviteId));

    if (!revokedInvite) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to revoke invite' },
        { status: 500 }
      );
    }

    // Serialize for JSON response
    const serializedInvite = {
      ...revokedInvite,
      _id: revokedInvite._id?.toString(),
      tripId: revokedInvite.tripId.toString(),
      createdBy: revokedInvite.createdBy.toString(),
    };

    return NextResponse.json<ApiResponse<typeof serializedInvite>>({
      success: true,
      data: serializedInvite,
    });
  } catch (error) {
    console.error('Error revoking invite:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * API routes for trip attendees.
 *
 * GET /api/trips/[tripId]/attendees - List all attendees for a trip
 * POST /api/trips/[tripId]/attendees - Add a new attendee to a trip
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import {
  getAttendeesByTrip,
  createAttendee,
  getAttendeeByEmail,
} from '@/lib/db/operations/attendees';
import { CreateAttendeeSchema } from '@/lib/db/models';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate ObjectId format.
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
 * GET /api/trips/[tripId]/attendees
 *
 * List all attendees for a trip. Requires trip access.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
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

    // Get all attendees for the trip
    const attendees = await getAttendeesByTrip(new ObjectId(tripId));

    return NextResponse.json({
      success: true,
      data: attendees,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    // Handle redirect errors from requireAuth
    if (message.includes('NEXT_REDIRECT') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('GET /api/trips/[tripId]/attendees error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips/[tripId]/attendees
 *
 * Add a new attendee to a trip. Requires admin access.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Check admin access
    await requireAdmin(tripId);

    // Parse and validate request body
    const body = await request.json();
    const attendeeData = {
      ...body,
      tripId: new ObjectId(tripId),
    };

    const parseResult = CreateAttendeeSchema.safeParse(attendeeData);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request body: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check if email already exists in this trip
    const existingAttendee = await getAttendeeByEmail(
      new ObjectId(tripId),
      parseResult.data.email
    );
    if (existingAttendee) {
      return NextResponse.json(
        {
          success: false,
          error: 'An attendee with this email already exists in this trip',
        },
        { status: 409 }
      );
    }

    // Create the attendee
    const attendee = await createAttendee(parseResult.data);

    return NextResponse.json({ success: true, data: attendee }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    // Handle redirect errors from requireAuth
    if (message.includes('NEXT_REDIRECT') || message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('POST /api/trips/[tripId]/attendees error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

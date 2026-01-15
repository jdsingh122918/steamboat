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
import {
  type ApiResponse,
  isValidObjectId,
  errorResponse,
  successResponse,
  handleApiError,
} from '@/lib/api';

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
      return errorResponse('Invalid tripId format', 400);
    }

    // Check trip access
    await requireTripAccess(tripId);

    // Get all attendees for the trip
    const attendees = await getAttendeesByTrip(new ObjectId(tripId));

    return successResponse(attendees);
  } catch (error) {
    return handleApiError(error, 'GET /api/trips/[tripId]/attendees');
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
      return errorResponse('Invalid tripId format', 400);
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
      return errorResponse(
        `Invalid request body: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
        400
      );
    }

    // Check if email already exists in this trip
    const existingAttendee = await getAttendeeByEmail(
      new ObjectId(tripId),
      parseResult.data.email
    );
    if (existingAttendee) {
      return errorResponse(
        'An attendee with this email already exists in this trip',
        409
      );
    }

    // Create the attendee
    const attendee = await createAttendee(parseResult.data);

    return successResponse(attendee, 201);
  } catch (error) {
    return handleApiError(error, 'POST /api/trips/[tripId]/attendees');
  }
}

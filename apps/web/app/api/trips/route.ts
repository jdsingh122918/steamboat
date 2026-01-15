/**
 * Trip API routes - /api/trips
 *
 * GET: List trips for authenticated user
 * POST: Create new trip (creator becomes admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';
import { requireAuth } from '@/lib/auth/guards';
import { createTrip, listTrips } from '@/lib/db/operations/trips';
import { createAttendee, getAttendeeById } from '@/lib/db/operations/attendees';

/**
 * API response interface
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Schema for creating a trip via API
 */
const CreateTripApiSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    location: z.string().min(1, 'Location is required'),
    startDate: z.string().transform((val) => new Date(val)),
    endDate: z.string().transform((val) => new Date(val)),
    settings: z
      .object({
        currency: z.string().default('USD'),
        timezone: z.string().default('America/New_York'),
        isPublic: z.boolean().default(false),
      })
      .optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'endDate must be after or equal to startDate',
    path: ['endDate'],
  });

/**
 * GET /api/trips
 * List trips for the authenticated user
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    // Require authentication
    const session = await requireAuth();

    if (!session.attendeeId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get attendee to find their trip
    const attendee = await getAttendeeById(new ObjectId(session.attendeeId));

    if (!attendee) {
      return NextResponse.json(
        { success: false, error: 'Attendee not found' },
        { status: 404 }
      );
    }

    // List trips where this user is an attendee
    // For now, we return the single trip the user is associated with
    const result = await listTrips(
      { _id: attendee.tripId, deletedAt: null },
      { limit: 50, page: 1 }
    );

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 200 }
    );
  } catch (error) {
    // Handle redirect from requireAuth
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('GET /api/trips error:', error);
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
}

/**
 * POST /api/trips
 * Create a new trip. The creator becomes an admin.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    // Get session to check authentication
    const session = await getSession();

    if (!session.attendeeId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the current attendee info
    const currentAttendee = await getAttendeeById(
      new ObjectId(session.attendeeId)
    );

    if (!currentAttendee) {
      return NextResponse.json(
        { success: false, error: 'Attendee not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = CreateTripApiSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const tripData = parseResult.data;

    // Create a placeholder ObjectId for the new attendee (will be the admin)
    const newAttendeeId = new ObjectId();

    // Create the trip with the creator as admin
    const trip = await createTrip({
      name: tripData.name,
      location: tripData.location,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      groomId: new ObjectId(session.attendeeId), // Default groom to creator
      adminIds: [newAttendeeId],
      settings: tripData.settings,
    });

    // Create an attendee record for the creator as admin in the new trip
    await createAttendee({
      tripId: trip._id,
      name: currentAttendee.name,
      email: currentAttendee.email,
      role: 'admin',
      rsvpStatus: 'confirmed',
    });

    return NextResponse.json({ success: true, data: trip }, { status: 201 });
  } catch (error) {
    console.error('POST /api/trips error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

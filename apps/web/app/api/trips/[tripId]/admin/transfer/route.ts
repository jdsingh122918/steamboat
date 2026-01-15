/**
 * Admin Transfer API routes - /api/trips/[tripId]/admin/transfer
 *
 * POST: Transfer admin role to another trip member (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { getTripById, updateTrip } from '@/lib/db/operations/trips';
import { getAttendeesByTrip, updateAttendee } from '@/lib/db/operations/attendees';

/**
 * API response interface
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Admin transfer response
 */
interface AdminTransferResponse {
  success: boolean;
  previousAdmin: { id: string; name: string };
  newAdmin: { id: string; name: string };
}

/**
 * Request body schema
 */
const AdminTransferSchema = z.object({
  newAdminId: z.string().min(1, 'newAdminId is required'),
});

/**
 * Validate that a string is a valid MongoDB ObjectId
 */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Route params type for Next.js 15
 */
type RouteParams = { params: Promise<{ tripId: string }> };

/**
 * POST /api/trips/[tripId]/admin/transfer
 * Transfer admin role to another trip member
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<AdminTransferResponse>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Require admin access
    const { attendee: currentAdmin } = await requireAdmin(tripId);

    // Parse and validate request body
    const body = await request.json();
    const parseResult = AdminTransferSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors
        .map((e) => e.message)
        .join(', ');

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const { newAdminId } = parseResult.data;

    // Validate newAdminId format
    if (!isValidObjectId(newAdminId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid newAdminId format' },
        { status: 400 }
      );
    }

    const tripObjectId = new ObjectId(tripId);
    const newAdminObjectId = new ObjectId(newAdminId);

    // Get trip to check current admins
    const trip = await getTripById(tripObjectId);

    if (!trip) {
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Check if newAdminId is already an admin
    const isAlreadyAdmin = trip.adminIds.some((adminId) => {
      if (adminId instanceof ObjectId) {
        return adminId.equals(newAdminObjectId);
      }
      return String(adminId) === newAdminId;
    });

    if (isAlreadyAdmin) {
      return NextResponse.json(
        { success: false, error: 'This user is already an admin' },
        { status: 400 }
      );
    }

    // Get all attendees to verify newAdminId is a trip member
    const attendees = await getAttendeesByTrip(tripObjectId);

    const newAdminAttendee = attendees.find((a) => {
      if (a._id instanceof ObjectId) {
        return a._id.equals(newAdminObjectId);
      }
      return String(a._id) === newAdminId;
    });

    if (!newAdminAttendee) {
      return NextResponse.json(
        { success: false, error: 'New admin not found as trip member' },
        { status: 404 }
      );
    }

    // Get current admin's ID
    const currentAdminId = currentAdmin._id;

    // Update both attendee records atomically
    // 1. Demote current admin to member
    await updateAttendee(currentAdminId, { role: 'member' });

    // 2. Promote new admin
    await updateAttendee(newAdminObjectId, { role: 'admin' });

    // 3. Update trip's adminIds
    const newAdminIds = trip.adminIds
      .filter((adminId) => {
        if (adminId instanceof ObjectId) {
          return !adminId.equals(currentAdminId);
        }
        return String(adminId) !== currentAdminId.toString();
      })
      .concat([newAdminObjectId]);

    await updateTrip(tripObjectId, { adminIds: newAdminIds });

    const response: AdminTransferResponse = {
      success: true,
      previousAdmin: {
        id: currentAdminId.toString(),
        name: currentAdmin.name,
      },
      newAdmin: {
        id: newAdminId,
        name: newAdminAttendee.name,
      },
    };

    return NextResponse.json({ success: true, data: response }, { status: 200 });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error) {
      if (
        error.message === 'NEXT_REDIRECT' ||
        error.message === 'Unauthorized'
      ) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }

    console.error('POST /api/trips/[tripId]/admin/transfer error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

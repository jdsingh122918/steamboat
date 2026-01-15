/**
 * Permanently Delete Item API - /api/trips/[tripId]/deleted/[itemId]
 *
 * DELETE: Permanently delete a soft-deleted item (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth/guards';
import { getCollection, COLLECTIONS } from '@/lib/db/client';

/**
 * API response interface
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate that a string is a valid MongoDB ObjectId
 */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Route params type for Next.js 15
 */
type RouteParams = { params: Promise<{ tripId: string; itemId: string }> };

/**
 * DELETE /api/trips/[tripId]/deleted/[itemId]
 * Permanently delete a soft-deleted item
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ deleted: boolean; type: string }>>> {
  try {
    const { tripId, itemId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tripId format' },
        { status: 400 }
      );
    }

    // Validate itemId format
    if (!isValidObjectId(itemId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid itemId format' },
        { status: 400 }
      );
    }

    // Require admin access
    await requireAdmin(tripId);

    const tripObjectId = new ObjectId(tripId);
    const itemObjectId = new ObjectId(itemId);

    // Get all collections
    const [expensesCollection, mediaCollection, activitiesCollection] =
      await Promise.all([
        getCollection(COLLECTIONS.EXPENSES),
        getCollection(COLLECTIONS.MEDIA),
        getCollection(COLLECTIONS.ACTIVITIES),
      ]);

    // Only allow permanent deletion of items that are already soft-deleted
    // Try expenses first
    const expenseResult = await expensesCollection.findOneAndDelete({
      _id: itemObjectId,
      tripId: tripObjectId,
      deletedAt: { $ne: null },
    });

    if (expenseResult) {
      return NextResponse.json(
        { success: true, data: { deleted: true, type: 'expense' } },
        { status: 200 }
      );
    }

    // Try media
    const mediaResult = await mediaCollection.findOneAndDelete({
      _id: itemObjectId,
      tripId: tripObjectId,
      deletedAt: { $ne: null },
    });

    if (mediaResult) {
      return NextResponse.json(
        { success: true, data: { deleted: true, type: 'media' } },
        { status: 200 }
      );
    }

    // Try activities
    const activityResult = await activitiesCollection.findOneAndDelete({
      _id: itemObjectId,
      tripId: tripObjectId,
      deletedAt: { $ne: null },
    });

    if (activityResult) {
      return NextResponse.json(
        { success: true, data: { deleted: true, type: 'activity' } },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Deleted item not found' },
      { status: 404 }
    );
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

    console.error('DELETE /api/trips/[tripId]/deleted/[itemId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

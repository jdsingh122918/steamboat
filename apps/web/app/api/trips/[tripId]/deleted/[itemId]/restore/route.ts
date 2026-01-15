/**
 * Restore Deleted Item API - /api/trips/[tripId]/deleted/[itemId]/restore
 *
 * POST: Restore a soft-deleted item (admin only)
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
 * POST /api/trips/[tripId]/deleted/[itemId]/restore
 * Restore a soft-deleted item
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ restored: boolean; type: string }>>> {
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

    // Try to find and restore the item from each collection
    const [expensesCollection, mediaCollection, activitiesCollection] =
      await Promise.all([
        getCollection(COLLECTIONS.EXPENSES),
        getCollection(COLLECTIONS.MEDIA),
        getCollection(COLLECTIONS.ACTIVITIES),
      ]);

    // Check if item is past auto-delete date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Try expenses first
    const expenseResult = await expensesCollection.findOneAndUpdate(
      {
        _id: itemObjectId,
        tripId: tripObjectId,
        deletedAt: { $ne: null, $gte: thirtyDaysAgo },
      },
      {
        $set: { deletedAt: null, deletedBy: null, updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    if (expenseResult) {
      return NextResponse.json(
        { success: true, data: { restored: true, type: 'expense' } },
        { status: 200 }
      );
    }

    // Try media
    const mediaResult = await mediaCollection.findOneAndUpdate(
      {
        _id: itemObjectId,
        tripId: tripObjectId,
        deletedAt: { $ne: null, $gte: thirtyDaysAgo },
      },
      {
        $set: { deletedAt: null, deletedBy: null, updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    if (mediaResult) {
      return NextResponse.json(
        { success: true, data: { restored: true, type: 'media' } },
        { status: 200 }
      );
    }

    // Try activities
    const activityResult = await activitiesCollection.findOneAndUpdate(
      {
        _id: itemObjectId,
        tripId: tripObjectId,
        deletedAt: { $ne: null, $gte: thirtyDaysAgo },
      },
      {
        $set: { deletedAt: null, deletedBy: null, updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    if (activityResult) {
      return NextResponse.json(
        { success: true, data: { restored: true, type: 'activity' } },
        { status: 200 }
      );
    }

    // Check if item exists but is past auto-delete date
    const [expenseCheck, mediaCheck, activityCheck] = await Promise.all([
      expensesCollection.findOne({
        _id: itemObjectId,
        tripId: tripObjectId,
        deletedAt: { $ne: null, $lt: thirtyDaysAgo },
      }),
      mediaCollection.findOne({
        _id: itemObjectId,
        tripId: tripObjectId,
        deletedAt: { $ne: null, $lt: thirtyDaysAgo },
      }),
      activitiesCollection.findOne({
        _id: itemObjectId,
        tripId: tripObjectId,
        deletedAt: { $ne: null, $lt: thirtyDaysAgo },
      }),
    ]);

    if (expenseCheck || mediaCheck || activityCheck) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot restore item: auto-delete period has expired',
        },
        { status: 410 }
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

    console.error('POST /api/trips/[tripId]/deleted/[itemId]/restore error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

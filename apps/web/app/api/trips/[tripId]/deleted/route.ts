/**
 * Deleted Items API routes - /api/trips/[tripId]/deleted
 *
 * GET: List all soft-deleted items for a trip (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth/guards';
import { getCollection, COLLECTIONS } from '@/lib/db/client';
import { getAttendeeById } from '@/lib/db/operations/attendees';

/**
 * API response interface
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Deleted item structure
 */
interface DeletedItem {
  id: string;
  type: 'expense' | 'media' | 'activity';
  title: string;
  deletedAt: string;
  deletedBy: { id: string; name: string };
  autoDeleteAt: string;
  metadata?: {
    amount_cents?: number;
    thumbnailUrl?: string;
    scheduledAt?: string;
  };
}

/**
 * Validate that a string is a valid MongoDB ObjectId
 */
function isValidObjectId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Calculate auto-delete date (30 days from deletion)
 */
function calculateAutoDeleteDate(deletedAt: Date): Date {
  const autoDelete = new Date(deletedAt);
  autoDelete.setDate(autoDelete.getDate() + 30);
  return autoDelete;
}

/**
 * Route params type for Next.js 15
 */
type RouteParams = { params: Promise<{ tripId: string }> };

/**
 * GET /api/trips/[tripId]/deleted
 * List all soft-deleted items for a trip (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<DeletedItem[]>>> {
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
    await requireAdmin(tripId);

    const tripObjectId = new ObjectId(tripId);

    // Get optional type filter
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get('type');

    // Fetch deleted items from all collections
    const [expensesCollection, mediaCollection, activitiesCollection] =
      await Promise.all([
        getCollection(COLLECTIONS.EXPENSES),
        getCollection(COLLECTIONS.MEDIA),
        getCollection(COLLECTIONS.ACTIVITIES),
      ]);

    // Build query for deleted items
    const deletedQuery = {
      tripId: tripObjectId,
      deletedAt: { $ne: null },
    };

    // Fetch all deleted items in parallel
    const [deletedExpenses, deletedMedia, deletedActivities] = await Promise.all([
      typeFilter && typeFilter !== 'expense'
        ? Promise.resolve([])
        : expensesCollection.find(deletedQuery).toArray(),
      typeFilter && typeFilter !== 'media'
        ? Promise.resolve([])
        : mediaCollection.find(deletedQuery).toArray(),
      typeFilter && typeFilter !== 'activity'
        ? Promise.resolve([])
        : activitiesCollection.find(deletedQuery).toArray(),
    ]);

    // Cache for attendee names
    const attendeeCache = new Map<string, { id: string; name: string }>();

    async function getDeletedByInfo(
      deletedById: ObjectId | undefined
    ): Promise<{ id: string; name: string }> {
      if (!deletedById) {
        return { id: 'unknown', name: 'Unknown' };
      }

      const cacheKey = deletedById.toString();
      if (attendeeCache.has(cacheKey)) {
        return attendeeCache.get(cacheKey)!;
      }

      const attendee = await getAttendeeById(deletedById);
      const info = {
        id: deletedById.toString(),
        name: attendee?.name || 'Unknown',
      };
      attendeeCache.set(cacheKey, info);
      return info;
    }

    // Transform expenses
    const expenseItems: DeletedItem[] = await Promise.all(
      deletedExpenses.map(async (expense: any) => ({
        id: expense._id.toString(),
        type: 'expense' as const,
        title: expense.description || 'Untitled Expense',
        deletedAt: expense.deletedAt.toISOString(),
        deletedBy: await getDeletedByInfo(expense.deletedBy),
        autoDeleteAt: calculateAutoDeleteDate(expense.deletedAt).toISOString(),
        metadata: {
          amount_cents: expense.amount_cents,
        },
      }))
    );

    // Transform media
    const mediaItems: DeletedItem[] = await Promise.all(
      deletedMedia.map(async (media: any) => ({
        id: media._id.toString(),
        type: 'media' as const,
        title: media.filename || 'Untitled Media',
        deletedAt: media.deletedAt.toISOString(),
        deletedBy: await getDeletedByInfo(media.deletedBy),
        autoDeleteAt: calculateAutoDeleteDate(media.deletedAt).toISOString(),
        metadata: {
          thumbnailUrl: media.thumbnailUrl,
        },
      }))
    );

    // Transform activities
    const activityItems: DeletedItem[] = await Promise.all(
      deletedActivities.map(async (activity: any) => ({
        id: activity._id.toString(),
        type: 'activity' as const,
        title: activity.title || 'Untitled Activity',
        deletedAt: activity.deletedAt.toISOString(),
        deletedBy: await getDeletedByInfo(activity.deletedBy),
        autoDeleteAt: calculateAutoDeleteDate(activity.deletedAt).toISOString(),
        metadata: {
          scheduledAt: activity.startDate?.toISOString(),
        },
      }))
    );

    // Combine and sort by deletedAt (newest first)
    const allItems = [...expenseItems, ...mediaItems, ...activityItems].sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );

    return NextResponse.json(
      { success: true, data: allItems },
      { status: 200 }
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

    console.error('GET /api/trips/[tripId]/deleted error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

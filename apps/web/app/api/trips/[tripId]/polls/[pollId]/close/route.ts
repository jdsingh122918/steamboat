/**
 * Close Poll API Route
 *
 * POST /api/trips/[tripId]/polls/[pollId]/close - Close poll early (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth/guards';
import { getPollById, closePoll } from '@/lib/db/operations/polls';
import { Poll } from '@/lib/db/models';
import { triggerTripEvent } from '@/lib/pusher-server';
import { PusherEventType } from '@/lib/pusher';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate MongoDB ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

/**
 * POST /api/trips/[tripId]/polls/[pollId]/close
 *
 * Close poll early (admin only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; pollId: string }> }
): Promise<NextResponse<ApiResponse<Poll>>> {
  try {
    const { tripId, pollId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trip ID format' },
        { status: 400 }
      );
    }

    // Validate pollId format
    if (!isValidObjectId(pollId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid poll ID format' },
        { status: 400 }
      );
    }

    // Require admin access
    try {
      await requireAdmin(tripId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    // Get the poll
    const poll = await getPollById(new ObjectId(pollId));

    if (!poll || poll.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Check if poll is already closed
    if (poll.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Poll is already closed' },
        { status: 400 }
      );
    }

    // Close the poll
    const closedPoll = await closePoll(new ObjectId(pollId));

    if (!closedPoll) {
      return NextResponse.json(
        { success: false, error: 'Failed to close poll' },
        { status: 500 }
      );
    }

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.POLL_CLOSED, {
      pollId,
      poll: closedPoll,
    });

    return NextResponse.json({
      success: true,
      data: closedPoll,
    });
  } catch (error) {
    console.error('POST /api/trips/[tripId]/polls/[pollId]/close error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to close poll',
      },
      { status: 500 }
    );
  }
}

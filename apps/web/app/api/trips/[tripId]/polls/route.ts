/**
 * Polls API Routes
 *
 * GET /api/trips/[tripId]/polls - List all polls for a trip
 * POST /api/trips/[tripId]/polls - Create a new poll (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import {
  getPollsByTrip,
  listPolls,
  createPoll,
  getPollResults,
} from '@/lib/db/operations/polls';
import { Poll, PollStatuses } from '@/lib/db/models';
import { randomUUID } from 'crypto';
import { triggerTripEvent } from '@/lib/pusher-server';
import { PusherEventType } from '@/lib/pusher';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PollWithVoteCounts extends Poll {
  voteCounts: Array<{ optionId: string; optionText: string; votes: number }>;
}

/**
 * Validate MongoDB ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

/**
 * Add vote counts to a poll.
 */
function addVoteCounts(poll: Poll): PollWithVoteCounts {
  const voteCounts: Record<string, number> = {};

  for (const vote of poll.votes) {
    voteCounts[vote.optionId] = (voteCounts[vote.optionId] ?? 0) + 1;
  }

  return {
    ...poll,
    voteCounts: poll.options.map((option) => ({
      optionId: option.id,
      optionText: option.text,
      votes: voteCounts[option.id] ?? 0,
    })),
  };
}

/**
 * GET /api/trips/[tripId]/polls
 *
 * List all polls for a trip.
 * Query params:
 *   - status: 'open' | 'closed' (optional filter)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<PollWithVoteCounts[]>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trip ID format' },
        { status: 400 }
      );
    }

    // Verify trip access
    try {
      await requireTripAccess(tripId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    const tripObjectId = new ObjectId(tripId);
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // Validate status filter if provided
    if (statusFilter && !PollStatuses.includes(statusFilter as any)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status filter. Must be one of: ${PollStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    let polls: Poll[];

    if (statusFilter) {
      // Use listPolls with filter
      const result = await listPolls(
        {
          tripId: tripObjectId,
          status: statusFilter as Poll['status'],
          deletedAt: null,
        },
        { limit: 50 }
      );
      polls = result.data;
    } else {
      // Get all polls for trip
      polls = await getPollsByTrip(tripObjectId);
    }

    // Add vote counts to each poll
    const pollsWithCounts = polls.map(addVoteCounts);

    return NextResponse.json({
      success: true,
      data: pollsWithCounts,
    });
  } catch (error) {
    console.error('GET /api/trips/[tripId]/polls error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch polls',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips/[tripId]/polls
 *
 * Create a new poll (admin only).
 * Body:
 *   - question: string (required)
 *   - options: string[] (required, at least 2)
 *   - allowMultiple?: boolean (default false)
 *   - closesAt?: string (ISO date, must be in the future)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
): Promise<NextResponse<ApiResponse<Poll>>> {
  try {
    const { tripId } = await params;

    // Validate tripId format
    if (!isValidObjectId(tripId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trip ID format' },
        { status: 400 }
      );
    }

    // Require admin access
    let attendee;
    try {
      const result = await requireAdmin(tripId);
      attendee = result.attendee;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Forbidden:')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    // Parse request body
    const body = await request.json();
    const { question, options, allowMultiple, closesAt } = body;

    // Validate required fields
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'question is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!options || !Array.isArray(options)) {
      return NextResponse.json(
        { success: false, error: 'options is required and must be an array' },
        { status: 400 }
      );
    }

    if (options.length < 2) {
      return NextResponse.json(
        { success: false, error: 'options must have at least 2 items' },
        { status: 400 }
      );
    }

    // Validate all options are non-empty strings
    for (const opt of options) {
      if (typeof opt !== 'string' || opt.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'All options must be non-empty strings' },
          { status: 400 }
        );
      }
    }

    // Validate closesAt if provided
    if (closesAt) {
      const closesAtDate = new Date(closesAt);
      if (isNaN(closesAtDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'closesAt must be a valid ISO date string' },
          { status: 400 }
        );
      }
      if (closesAtDate <= new Date()) {
        return NextResponse.json(
          { success: false, error: 'closesAt must be in the future' },
          { status: 400 }
        );
      }
    }

    // Create poll options with unique IDs
    const pollOptions = options.map((text: string) => ({
      id: randomUUID(),
      text: text.trim(),
    }));

    // Create the poll
    const pollData = {
      tripId: new ObjectId(tripId),
      question: question.trim(),
      options: pollOptions,
      votes: [],
      status: 'open' as const,
      ...(allowMultiple !== undefined && { allowMultiple }),
      ...(closesAt && { closesAt: new Date(closesAt) }),
    };

    const createdPoll = await createPoll(pollData);

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.POLL_CREATED, {
      poll: createdPoll,
    });

    return NextResponse.json(
      { success: true, data: createdPoll },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/trips/[tripId]/polls error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create poll',
      },
      { status: 500 }
    );
  }
}

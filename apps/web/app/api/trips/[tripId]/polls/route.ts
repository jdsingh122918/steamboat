/**
 * Polls API Routes
 *
 * GET /api/trips/[tripId]/polls - List all polls for a trip
 * POST /api/trips/[tripId]/polls - Create a new poll (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import {
  getPollsByTrip,
  listPolls,
  createPoll,
  getPollResults,
} from '@/lib/db/operations/polls';
import { Poll, PollStatuses } from '@/lib/db/models';
import { triggerTripEvent } from '@/lib/pusher-server';
import { PusherEventType } from '@/lib/pusher';
import {
  type ApiResponse,
  isValidObjectId,
  errorResponse,
  successResponse,
  handleTripAccessError,
} from '@/lib/api';

interface PollWithVoteCounts extends Poll {
  voteCounts: Array<{ optionId: string; optionText: string; votes: number }>;
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
      return errorResponse('Invalid trip ID format', 400);
    }

    // Verify trip access
    try {
      await requireTripAccess(tripId);
    } catch (error) {
      const accessError = handleTripAccessError(error);
      if (accessError) return accessError;
      throw error;
    }

    const tripObjectId = new ObjectId(tripId);
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // Validate status filter if provided
    if (statusFilter && !PollStatuses.includes(statusFilter as any)) {
      return errorResponse(
        `Invalid status filter. Must be one of: ${PollStatuses.join(', ')}`,
        400
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

    return successResponse(pollsWithCounts);
  } catch (error) {
    console.error('GET /api/trips/[tripId]/polls error:', error);
    return errorResponse('Failed to fetch polls', 500);
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
      return errorResponse('Invalid trip ID format', 400);
    }

    // Require admin access
    let attendee;
    try {
      const result = await requireAdmin(tripId);
      attendee = result.attendee;
    } catch (error) {
      const accessError = handleTripAccessError(error);
      if (accessError) return accessError;
      throw error;
    }

    // Parse request body
    const body = await request.json();
    const { question, options, allowMultiple, closesAt } = body;

    // Validate required fields
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return errorResponse('question is required and must be a non-empty string', 400);
    }

    if (!options || !Array.isArray(options)) {
      return errorResponse('options is required and must be an array', 400);
    }

    if (options.length < 2) {
      return errorResponse('options must have at least 2 items', 400);
    }

    // Validate all options are non-empty strings
    for (const opt of options) {
      if (typeof opt !== 'string' || opt.trim().length === 0) {
        return errorResponse('All options must be non-empty strings', 400);
      }
    }

    // Validate closesAt if provided
    if (closesAt) {
      const closesAtDate = new Date(closesAt);
      if (isNaN(closesAtDate.getTime())) {
        return errorResponse('closesAt must be a valid ISO date string', 400);
      }
      if (closesAtDate <= new Date()) {
        return errorResponse('closesAt must be in the future', 400);
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

    return successResponse(createdPoll, 201);
  } catch (error) {
    console.error('POST /api/trips/[tripId]/polls error:', error);
    return errorResponse('Failed to create poll', 500);
  }
}

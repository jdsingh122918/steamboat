/**
 * Single Poll API Routes
 *
 * GET /api/trips/[tripId]/polls/[pollId] - Get a single poll with vote counts
 * PUT /api/trips/[tripId]/polls/[pollId] - Update a poll (admin only, no votes yet)
 * DELETE /api/trips/[tripId]/polls/[pollId] - Soft delete a poll (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess, requireAdmin } from '@/lib/auth/guards';
import {
  getPollById,
  updatePoll,
  deletePoll,
  getPollResults,
} from '@/lib/db/operations/polls';
import { Poll } from '@/lib/db/models';
import { randomUUID } from 'crypto';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PollWithVoteCountsAndMyVote extends Poll {
  voteCounts: Array<{ optionId: string; optionText: string; votes: number }>;
  myVote?: { optionId: string } | null;
}

/**
 * Validate MongoDB ObjectId format.
 */
function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

/**
 * GET /api/trips/[tripId]/polls/[pollId]
 *
 * Get a single poll with vote counts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; pollId: string }> }
): Promise<NextResponse<ApiResponse<PollWithVoteCountsAndMyVote>>> {
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

    // Verify trip access
    let attendee;
    try {
      const result = await requireTripAccess(tripId);
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

    // Get the poll
    const poll = await getPollById(new ObjectId(pollId));

    if (!poll || poll.tripId.toString() !== tripId) {
      return NextResponse.json(
        { success: false, error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Get vote counts
    const voteCounts = await getPollResults(new ObjectId(pollId));

    // Find current user's vote
    const myVote = poll.votes.find((v) => {
      const voteAttendeeId = v.attendeeId instanceof ObjectId
        ? v.attendeeId.toString()
        : String(v.attendeeId);
      return voteAttendeeId === attendee._id.toString();
    });

    const pollWithCounts: PollWithVoteCountsAndMyVote = {
      ...poll,
      voteCounts,
      myVote: myVote ? { optionId: myVote.optionId } : null,
    };

    return NextResponse.json({
      success: true,
      data: pollWithCounts,
    });
  } catch (error) {
    console.error('GET /api/trips/[tripId]/polls/[pollId] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch poll',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trips/[tripId]/polls/[pollId]
 *
 * Update a poll (admin only, only if no votes yet).
 * Body:
 *   - question?: string
 *   - options?: string[]
 *   - allowMultiple?: boolean
 *   - closesAt?: string | null
 */
export async function PUT(
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

    // Check if poll has votes
    if (poll.votes.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify poll with existing votes' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { question, options, allowMultiple, closesAt } = body;

    // Build update object
    const updateData: Record<string, any> = {};

    if (question !== undefined) {
      if (typeof question !== 'string' || question.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'question must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.question = question.trim();
    }

    if (options !== undefined) {
      if (!Array.isArray(options)) {
        return NextResponse.json(
          { success: false, error: 'options must be an array' },
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
      updateData.options = options.map((text: string) => ({
        id: randomUUID(),
        text: text.trim(),
      }));
    }

    if (allowMultiple !== undefined) {
      updateData.allowMultiple = Boolean(allowMultiple);
    }

    if (closesAt !== undefined) {
      if (closesAt === null) {
        updateData.closesAt = null;
      } else {
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
        updateData.closesAt = closesAtDate;
      }
    }

    // Update the poll
    const updatedPoll = await updatePoll(new ObjectId(pollId), updateData);

    if (!updatedPoll) {
      return NextResponse.json(
        { success: false, error: 'Failed to update poll' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedPoll,
    });
  } catch (error) {
    console.error('PUT /api/trips/[tripId]/polls/[pollId] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update poll',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[tripId]/polls/[pollId]
 *
 * Soft delete a poll (admin only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; pollId: string }> }
): Promise<NextResponse<ApiResponse<{ message: string }>>> {
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

    // Soft delete the poll
    const deleted = await deletePoll(new ObjectId(pollId));

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete poll' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Poll deleted successfully' },
    });
  } catch (error) {
    console.error('DELETE /api/trips/[tripId]/polls/[pollId] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete poll',
      },
      { status: 500 }
    );
  }
}

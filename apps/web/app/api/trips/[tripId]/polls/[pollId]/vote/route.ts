/**
 * Vote API Routes
 *
 * POST /api/trips/[tripId]/polls/[pollId]/vote - Cast vote(s) for current attendee
 * PUT /api/trips/[tripId]/polls/[pollId]/vote - Change vote (if poll still open)
 * DELETE /api/trips/[tripId]/polls/[pollId]/vote - Remove vote
 */

import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireTripAccess } from '@/lib/auth/guards';
import { getPollById, castVote, removeVote } from '@/lib/db/operations/polls';
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
 * Check if an attendee has voted on a poll.
 */
function hasVoted(poll: Poll, attendeeId: ObjectId): boolean {
  return poll.votes.some((v) => {
    const voteAttendeeId =
      v.attendeeId instanceof ObjectId
        ? v.attendeeId.toString()
        : String(v.attendeeId);
    return voteAttendeeId === attendeeId.toString();
  });
}

/**
 * POST /api/trips/[tripId]/polls/[pollId]/vote
 *
 * Cast vote(s) for current attendee.
 * Body:
 *   - optionIndices: number[] (array of option indices to vote for)
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

    // Check if poll is open
    if (poll.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Cannot vote on a closed poll' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { optionIndices } = body;

    // Validate optionIndices
    if (!optionIndices || !Array.isArray(optionIndices) || optionIndices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'optionIndices is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each option index
    for (const idx of optionIndices) {
      if (typeof idx !== 'number' || idx < 0 || idx >= poll.options.length) {
        return NextResponse.json(
          { success: false, error: `Invalid option index: ${idx}` },
          { status: 400 }
        );
      }
    }

    // Check if single choice poll allows only one vote
    const allowMultiple = (poll as any).allowMultiple ?? false;
    if (!allowMultiple && optionIndices.length > 1) {
      return NextResponse.json(
        { success: false, error: 'This poll only allows a single vote' },
        { status: 400 }
      );
    }

    // Check if user has already voted
    if (hasVoted(poll, attendee._id)) {
      return NextResponse.json(
        { success: false, error: 'You have already voted on this poll. Use PUT to change your vote.' },
        { status: 400 }
      );
    }

    // Cast vote(s) - for simplicity, cast first vote (existing operation handles single vote)
    // TODO: Update castVote to handle multiple votes if allowMultiple is true
    const optionId = poll.options[optionIndices[0]].id;
    const updatedPoll = await castVote(new ObjectId(pollId), attendee._id, optionId);

    if (!updatedPoll) {
      return NextResponse.json(
        { success: false, error: 'Failed to cast vote' },
        { status: 500 }
      );
    }

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.POLL_VOTED, {
      pollId,
      poll: updatedPoll,
      attendeeId: attendee._id.toString(),
    });

    return NextResponse.json({
      success: true,
      data: updatedPoll,
    });
  } catch (error) {
    console.error('POST /api/trips/[tripId]/polls/[pollId]/vote error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cast vote',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/trips/[tripId]/polls/[pollId]/vote
 *
 * Change vote (if poll still open).
 * Body:
 *   - optionIndices: number[] (array of option indices to vote for)
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

    // Check if poll is open
    if (poll.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Cannot change vote on a closed poll' },
        { status: 400 }
      );
    }

    // Check if user has voted
    if (!hasVoted(poll, attendee._id)) {
      return NextResponse.json(
        { success: false, error: 'You have not voted on this poll yet. Use POST to cast your vote.' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { optionIndices } = body;

    // Validate optionIndices
    if (!optionIndices || !Array.isArray(optionIndices) || optionIndices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'optionIndices is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each option index
    for (const idx of optionIndices) {
      if (typeof idx !== 'number' || idx < 0 || idx >= poll.options.length) {
        return NextResponse.json(
          { success: false, error: `Invalid option index: ${idx}` },
          { status: 400 }
        );
      }
    }

    // Check if single choice poll allows only one vote
    const allowMultiple = (poll as any).allowMultiple ?? false;
    if (!allowMultiple && optionIndices.length > 1) {
      return NextResponse.json(
        { success: false, error: 'This poll only allows a single vote' },
        { status: 400 }
      );
    }

    // Change vote - castVote handles updating existing votes
    const optionId = poll.options[optionIndices[0]].id;
    const updatedPoll = await castVote(new ObjectId(pollId), attendee._id, optionId);

    if (!updatedPoll) {
      return NextResponse.json(
        { success: false, error: 'Failed to change vote' },
        { status: 500 }
      );
    }

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.POLL_VOTED, {
      pollId,
      poll: updatedPoll,
      attendeeId: attendee._id.toString(),
    });

    return NextResponse.json({
      success: true,
      data: updatedPoll,
    });
  } catch (error) {
    console.error('PUT /api/trips/[tripId]/polls/[pollId]/vote error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to change vote',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/trips/[tripId]/polls/[pollId]/vote
 *
 * Remove vote.
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

    // Check if poll is open
    if (poll.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Cannot remove vote from a closed poll' },
        { status: 400 }
      );
    }

    // Check if user has voted
    if (!hasVoted(poll, attendee._id)) {
      return NextResponse.json(
        { success: false, error: 'You have not voted on this poll' },
        { status: 400 }
      );
    }

    // Remove vote
    const updatedPoll = await removeVote(new ObjectId(pollId), attendee._id);

    if (!updatedPoll) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove vote' },
        { status: 500 }
      );
    }

    // Trigger real-time event
    await triggerTripEvent(tripId, PusherEventType.POLL_VOTED, {
      pollId,
      poll: updatedPoll,
      attendeeId: attendee._id.toString(),
      removed: true,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Vote removed successfully' },
    });
  } catch (error) {
    console.error('DELETE /api/trips/[tripId]/polls/[pollId]/vote error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove vote',
      },
      { status: 500 }
    );
  }
}

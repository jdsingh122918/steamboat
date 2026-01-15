/**
 * Poll-specific database operations.
 */

import { ObjectId, Filter } from 'mongodb';
import { getCollection, COLLECTIONS } from '@/lib/db/client';
import { Poll, CreatePoll, UpdatePoll, PollStatus } from '@/lib/db/models';
import {
  create,
  getById,
  update,
  softDelete,
  list,
  PaginationOptions,
  PaginatedResult,
  GetByIdOptions,
} from './base';

/**
 * Create a new poll.
 */
export async function createPoll(data: CreatePoll): Promise<Poll> {
  return create<Poll>(COLLECTIONS.POLLS, data);
}

/**
 * Get a poll by ID.
 */
export async function getPollById(
  id: ObjectId,
  options?: GetByIdOptions
): Promise<Poll | null> {
  return getById<Poll>(COLLECTIONS.POLLS, id, options);
}

/**
 * Update a poll.
 */
export async function updatePoll(
  id: ObjectId,
  data: UpdatePoll
): Promise<Poll | null> {
  return update<Poll>(COLLECTIONS.POLLS, id, data);
}

/**
 * Soft delete a poll.
 */
export async function deletePoll(id: ObjectId): Promise<boolean> {
  return softDelete(COLLECTIONS.POLLS, id);
}

/**
 * List polls with optional filtering.
 */
export async function listPolls(
  filter: Filter<Poll>,
  options?: PaginationOptions
): Promise<PaginatedResult<Poll>> {
  return list<Poll>(COLLECTIONS.POLLS, filter, options);
}

/**
 * Get all polls for a trip.
 */
export async function getPollsByTrip(tripId: ObjectId): Promise<Poll[]> {
  const collection = await getCollection<Poll>(COLLECTIONS.POLLS);

  return collection
    .find({
      tripId,
      deletedAt: null,
    })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Get open polls for a trip.
 */
export async function getOpenPolls(tripId: ObjectId): Promise<Poll[]> {
  const collection = await getCollection<Poll>(COLLECTIONS.POLLS);

  return collection
    .find({
      tripId,
      status: 'open',
      deletedAt: null,
    })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Cast a vote on a poll.
 */
export async function castVote(
  pollId: ObjectId,
  attendeeId: ObjectId,
  optionId: string
): Promise<Poll | null> {
  const collection = await getCollection<Poll>(COLLECTIONS.POLLS);
  const poll = await getPollById(pollId);

  if (!poll) {
    return null;
  }

  if (poll.status !== 'open') {
    throw new Error('Cannot vote on a closed poll');
  }

  // Check if option exists
  const optionExists = poll.options.some((o) => o.id === optionId);
  if (!optionExists) {
    throw new Error('Invalid option ID');
  }

  // Check if already voted
  const existingVote = poll.votes.find((v) =>
    v.attendeeId instanceof ObjectId
      ? v.attendeeId.equals(attendeeId)
      : String(v.attendeeId) === String(attendeeId)
  );

  if (existingVote) {
    // Update existing vote
    await collection.updateOne(
      {
        _id: pollId,
        'votes.attendeeId': attendeeId,
      },
      {
        $set: {
          'votes.$.optionId': optionId,
          updatedAt: new Date(),
        },
      }
    );
  } else {
    // Add new vote
    await collection.updateOne(
      { _id: pollId },
      {
        $push: {
          votes: {
            attendeeId,
            optionId,
          },
        } as unknown as never,
        $set: { updatedAt: new Date() },
      }
    );
  }

  return getPollById(pollId);
}

/**
 * Remove a vote from a poll.
 */
export async function removeVote(
  pollId: ObjectId,
  attendeeId: ObjectId
): Promise<Poll | null> {
  const collection = await getCollection<Poll>(COLLECTIONS.POLLS);

  await collection.updateOne(
    { _id: pollId },
    {
      $pull: { votes: { attendeeId } } as unknown as never,
      $set: { updatedAt: new Date() },
    }
  );

  return getPollById(pollId);
}

/**
 * Close a poll.
 */
export async function closePoll(pollId: ObjectId): Promise<Poll | null> {
  return updatePoll(pollId, { status: 'closed' });
}

/**
 * Reopen a poll.
 */
export async function reopenPoll(pollId: ObjectId): Promise<Poll | null> {
  return updatePoll(pollId, { status: 'open' });
}

/**
 * Get vote counts for each option.
 */
export async function getPollResults(
  pollId: ObjectId
): Promise<Array<{ optionId: string; optionText: string; votes: number }>> {
  const poll = await getPollById(pollId);

  if (!poll) {
    return [];
  }

  const voteCounts: Record<string, number> = {};

  for (const vote of poll.votes) {
    voteCounts[vote.optionId] = (voteCounts[vote.optionId] ?? 0) + 1;
  }

  return poll.options.map((option) => ({
    optionId: option.id,
    optionText: option.text,
    votes: voteCounts[option.id] ?? 0,
  }));
}

/**
 * Check if an attendee has voted on a poll.
 */
export async function hasVoted(
  pollId: ObjectId,
  attendeeId: ObjectId
): Promise<boolean> {
  const poll = await getPollById(pollId);

  if (!poll) {
    return false;
  }

  return poll.votes.some((v) =>
    v.attendeeId instanceof ObjectId
      ? v.attendeeId.equals(attendeeId)
      : String(v.attendeeId) === String(attendeeId)
  );
}

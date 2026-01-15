/**
 * Invite-specific database operations.
 */

import { ObjectId, Filter } from 'mongodb';
import { getCollection, COLLECTIONS } from '@/lib/db/client';
import { Invite, CreateInvite, UpdateInvite, InviteStatus } from '@/lib/db/models';
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
 * Create a new invite.
 */
export async function createInvite(data: CreateInvite): Promise<Invite> {
  return create<Invite>(COLLECTIONS.INVITES, data);
}

/**
 * Get an invite by ID.
 */
export async function getInviteById(
  id: ObjectId,
  options?: GetByIdOptions
): Promise<Invite | null> {
  return getById<Invite>(COLLECTIONS.INVITES, id, options);
}

/**
 * Update an invite.
 */
export async function updateInvite(
  id: ObjectId,
  data: UpdateInvite
): Promise<Invite | null> {
  return update<Invite>(COLLECTIONS.INVITES, id, data);
}

/**
 * Soft delete an invite.
 */
export async function deleteInvite(id: ObjectId): Promise<boolean> {
  return softDelete(COLLECTIONS.INVITES, id);
}

/**
 * List invites with optional filtering.
 */
export async function listInvites(
  filter: Filter<Invite>,
  options?: PaginationOptions
): Promise<PaginatedResult<Invite>> {
  return list<Invite>(COLLECTIONS.INVITES, filter, options);
}

/**
 * Get an invite by its token.
 */
export async function getInviteByToken(token: string): Promise<Invite | null> {
  const collection = await getCollection<Invite>(COLLECTIONS.INVITES);

  return collection.findOne({
    token,
    deletedAt: null,
  });
}

/**
 * Validate an invite token.
 * Checks if the token exists, is not expired, and has pending status.
 */
export async function validateInviteToken(
  token: string
): Promise<{ valid: boolean; invite: Invite | null; reason?: string }> {
  const invite = await getInviteByToken(token);

  if (!invite) {
    return { valid: false, invite: null, reason: 'Invite not found' };
  }

  if (invite.status !== 'pending') {
    return { valid: false, invite, reason: `Invite is ${invite.status}` };
  }

  if (invite.expiresAt < new Date()) {
    // Mark as expired
    await updateInviteStatus(invite._id as ObjectId, 'expired');
    return { valid: false, invite, reason: 'Invite has expired' };
  }

  return { valid: true, invite };
}

/**
 * Accept an invite.
 */
export async function acceptInvite(inviteId: ObjectId): Promise<Invite | null> {
  return updateInviteStatus(inviteId, 'accepted');
}

/**
 * Revoke an invite.
 */
export async function revokeInvite(inviteId: ObjectId): Promise<Invite | null> {
  return updateInviteStatus(inviteId, 'revoked');
}

/**
 * Update invite status.
 */
export async function updateInviteStatus(
  inviteId: ObjectId,
  status: InviteStatus
): Promise<Invite | null> {
  return updateInvite(inviteId, { status });
}

/**
 * Get all active invites for a trip.
 */
export async function getActiveInvites(tripId: ObjectId): Promise<Invite[]> {
  const collection = await getCollection<Invite>(COLLECTIONS.INVITES);

  return collection
    .find({
      tripId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
      deletedAt: null,
    })
    .toArray();
}

/**
 * Get invite by email for a trip.
 */
export async function getInviteByEmail(
  tripId: ObjectId,
  email: string
): Promise<Invite | null> {
  const collection = await getCollection<Invite>(COLLECTIONS.INVITES);

  return collection.findOne({
    tripId,
    email: email.toLowerCase(),
    deletedAt: null,
  });
}

/**
 * Expire all old invites for a trip.
 */
export async function expireOldInvites(tripId: ObjectId): Promise<number> {
  const collection = await getCollection<Invite>(COLLECTIONS.INVITES);

  const result = await collection.updateMany(
    {
      tripId,
      status: 'pending',
      expiresAt: { $lt: new Date() },
    },
    {
      $set: {
        status: 'expired',
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
}

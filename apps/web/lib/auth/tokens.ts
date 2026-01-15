import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import {
  createInvite,
  getInviteByToken,
  revokeInvite as revokeInviteById,
} from '@/lib/db/operations/invites';
import { Invite } from '@/lib/db/models';

/**
 * Generate a cryptographically secure invite token.
 * Returns 64-char hex string (32 bytes of randomness).
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new invite for a trip with a secure token.
 */
export async function createTripInvite(
  tripId: ObjectId,
  email: string,
  createdBy: ObjectId,
  expiresInDays: number = 7
): Promise<Invite> {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  return createInvite({
    tripId,
    email: email.toLowerCase(),
    token,
    expiresAt,
    status: 'pending',
    createdBy,
  });
}

/**
 * Revoke an invite by its token.
 */
export async function revokeInviteByToken(token: string): Promise<boolean> {
  const invite = await getInviteByToken(token);
  if (!invite || !invite._id) return false;
  const result = await revokeInviteById(invite._id as ObjectId);
  return result !== null;
}

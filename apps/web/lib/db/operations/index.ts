/**
 * Database operations module exports.
 *
 * This module exports all CRUD operations for each entity type.
 *
 * @example
 * import { createTrip, getExpensesByTrip, castVote } from '@/lib/db/operations';
 */

// Base CRUD helpers
export {
  create,
  getById,
  update,
  softDelete,
  hardDelete,
  list,
  count,
  type PaginationOptions,
  type PaginatedResult,
  type GetByIdOptions,
} from './base';

// Trip operations
export {
  createTrip,
  getTripById,
  updateTrip,
  deleteTrip,
  listTrips,
  getTripsByAttendee,
  getTripStats,
  getAdminTrips,
  isUserTripAdmin,
  type TripStats,
} from './trips';

// Attendee operations
export {
  createAttendee,
  getAttendeeById,
  updateAttendee,
  deleteAttendee,
  listAttendees,
  getAttendeesByTrip,
  getAttendeeByEmail,
  getAttendeeByInviteToken,
  updateRsvpStatus,
  getTripAdmins,
} from './attendees';

// Expense operations
export {
  createExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  listExpenses,
  getExpensesByTrip,
  getExpensesByCategory,
  getExpensesByPayer,
  optIntoExpense,
  optOutOfExpense,
  getTripTotalExpenses,
  getExpenseSummaryByCategory,
} from './expenses';

// Activity operations
export {
  createActivity,
  getActivityById,
  updateActivity,
  deleteActivity,
  listActivities,
  getActivitiesByTrip,
  getUpcomingActivities,
  updateActivityRsvp,
  getActivityRsvpCounts,
  linkExpenseToActivity,
} from './activities';

// Media operations
export {
  createMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
  listMedia,
  getMediaByTrip,
  getMediaByUploader,
  getMediaByType,
  searchMediaByTags,
  addMediaTags,
  getGeotaggedMedia,
  getMediaStats,
} from './media';

// Invite operations
export {
  createInvite,
  getInviteById,
  updateInvite,
  deleteInvite,
  listInvites,
  getInviteByToken,
  validateInviteToken,
  acceptInvite,
  revokeInvite,
  updateInviteStatus,
  getActiveInvites,
  getInviteByEmail,
  expireOldInvites,
} from './invites';

// Payment operations
export {
  createPayment,
  getPaymentById,
  updatePayment,
  deletePayment,
  listPayments,
  getPaymentsByTrip,
  getPaymentsByPayer,
  getPaymentsToRecipient,
  confirmPayment,
  cancelPayment,
  updatePaymentStatus,
  getPendingPayments,
  getPaymentsBetween,
  getPaymentTotals,
} from './payments';

// Poll operations
export {
  createPoll,
  getPollById,
  updatePoll,
  deletePoll,
  listPolls,
  getPollsByTrip,
  getOpenPolls,
  castVote,
  removeVote,
  closePoll,
  reopenPoll,
  getPollResults,
  hasVoted,
} from './polls';

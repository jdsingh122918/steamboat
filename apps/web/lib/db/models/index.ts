/**
 * Data models module exports.
 *
 * This module exports all Zod schemas and TypeScript types for the database models.
 *
 * @example
 * import { TripSchema, Trip, AttendeeSchema, Attendee } from '@/lib/db/models';
 *
 * const trip = TripSchema.parse(data);
 */

// Shared types
export {
  ObjectIdSchema,
  TimestampsSchema,
  BaseDocumentSchema,
  type Timestamps,
  type BaseDocument,
} from './types';

// Trip
export {
  TripSchema,
  TripSettingsSchema,
  CreateTripSchema,
  UpdateTripSchema,
  type Trip,
  type TripSettings,
  type CreateTrip,
  type UpdateTrip,
} from './trip';

// Attendee
export {
  AttendeeSchema,
  PaymentHandlesSchema,
  CreateAttendeeSchema,
  UpdateAttendeeSchema,
  AttendeeRoles,
  RsvpStatuses,
  type Attendee,
  type PaymentHandles,
  type CreateAttendee,
  type UpdateAttendee,
  type AttendeeRole,
  type RsvpStatus,
} from './attendee';

// Expense
export {
  ExpenseSchema,
  ExpenseParticipantSchema,
  CreateExpenseSchema,
  UpdateExpenseSchema,
  ExpenseCategories,
  ExpenseStatuses,
  type Expense,
  type ExpenseParticipant,
  type CreateExpense,
  type UpdateExpense,
  type ExpenseCategory,
  type ExpenseStatus,
} from './expense';

// Activity
export {
  ActivitySchema,
  ActivityRsvpSchema,
  CreateActivitySchema,
  UpdateActivitySchema,
  ActivityCategories,
  ActivityRsvpStatuses,
  type Activity,
  type ActivityRsvp,
  type CreateActivity,
  type UpdateActivity,
  type ActivityCategory,
  type ActivityRsvpStatus,
} from './activity';

// Media
export {
  MediaSchema,
  ExifDataSchema,
  CreateMediaSchema,
  UpdateMediaSchema,
  MediaTypes,
  type Media,
  type ExifData,
  type CreateMedia,
  type UpdateMedia,
  type MediaType,
} from './media';

// Invite
export {
  InviteSchema,
  CreateInviteSchema,
  UpdateInviteSchema,
  InviteStatuses,
  type Invite,
  type CreateInvite,
  type UpdateInvite,
  type InviteStatus,
} from './invite';

// Payment
export {
  PaymentSchema,
  CreatePaymentSchema,
  UpdatePaymentSchema,
  PaymentStatuses,
  PaymentMethods,
  type Payment,
  type CreatePayment,
  type UpdatePayment,
  type PaymentStatus,
  type PaymentMethod,
} from './payment';

// Poll
export {
  PollSchema,
  PollOptionSchema,
  PollVoteSchema,
  CreatePollSchema,
  UpdatePollSchema,
  PollStatuses,
  type Poll,
  type PollOption,
  type PollVote,
  type CreatePoll,
  type UpdatePoll,
  type PollStatus,
} from './poll';

// AI Settings
export {
  AISettingsSchema,
  AgentConfigSchema,
  DefaultSettingsSchema,
  CreateAISettingsSchema,
  UpdateAISettingsSchema,
  AgentRoles,
  type AISettings,
  type AgentConfig,
  type DefaultSettings,
  type CreateAISettings,
  type UpdateAISettings,
  type AgentRoleKey,
} from './ai-settings';

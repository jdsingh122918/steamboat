import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';

describe('Data Models', () => {
  describe('Trip Model', () => {
    it('should validate a complete trip document', async () => {
      const { TripSchema } = await import('@/lib/db/models');

      const validTrip = {
        _id: new ObjectId(),
        name: 'Vegas Bachelor Party',
        location: 'Las Vegas, NV',
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-06-18'),
        groomId: new ObjectId(),
        adminIds: [new ObjectId()],
        settings: {
          currency: 'USD',
          timezone: 'America/Los_Angeles',
          isPublic: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = TripSchema.safeParse(validTrip);
      expect(result.success).toBe(true);
    });

    it('should reject trip without required name field', async () => {
      const { TripSchema } = await import('@/lib/db/models');

      const invalidTrip = {
        _id: new ObjectId(),
        location: 'Las Vegas, NV',
        startDate: new Date('2025-06-15'),
        endDate: new Date('2025-06-18'),
        groomId: new ObjectId(),
        adminIds: [new ObjectId()],
      };

      const result = TripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });

    it('should reject trip with invalid dates', async () => {
      const { TripSchema } = await import('@/lib/db/models');

      const invalidTrip = {
        _id: new ObjectId(),
        name: 'Test Trip',
        location: 'Test',
        startDate: 'not-a-date',
        endDate: new Date(),
        groomId: new ObjectId(),
        adminIds: [],
      };

      const result = TripSchema.safeParse(invalidTrip);
      expect(result.success).toBe(false);
    });
  });

  describe('Attendee Model', () => {
    it('should validate a complete attendee document', async () => {
      const { AttendeeSchema } = await import('@/lib/db/models');

      const validAttendee = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        name: 'John Doe',
        email: 'john@example.com',
        role: 'member',
        paymentHandles: {
          venmo: '@johndoe',
          paypal: 'john@example.com',
        },
        inviteToken: 'abc123token',
        rsvpStatus: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = AttendeeSchema.safeParse(validAttendee);
      expect(result.success).toBe(true);
    });

    it('should validate attendee with admin role', async () => {
      const { AttendeeSchema } = await import('@/lib/db/models');

      const adminAttendee = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        rsvpStatus: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = AttendeeSchema.safeParse(adminAttendee);
      expect(result.success).toBe(true);
    });

    it('should reject attendee with invalid role', async () => {
      const { AttendeeSchema } = await import('@/lib/db/models');

      const invalidAttendee = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        name: 'Test User',
        email: 'test@example.com',
        role: 'superuser', // Invalid role
        rsvpStatus: 'confirmed',
      };

      const result = AttendeeSchema.safeParse(invalidAttendee);
      expect(result.success).toBe(false);
    });

    it('should reject attendee with invalid email', async () => {
      const { AttendeeSchema } = await import('@/lib/db/models');

      const invalidAttendee = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        name: 'Test User',
        email: 'not-an-email',
        role: 'member',
        rsvpStatus: 'confirmed',
      };

      const result = AttendeeSchema.safeParse(invalidAttendee);
      expect(result.success).toBe(false);
    });
  });

  describe('Expense Model', () => {
    it('should validate a complete expense document', async () => {
      const { ExpenseSchema } = await import('@/lib/db/models');

      const validExpense = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        payerId: new ObjectId(),
        amount_cents: 15000,
        currency: 'USD',
        category: 'food',
        description: 'Group dinner at steakhouse',
        receiptUrl: 'https://cloudinary.com/receipt.jpg',
        participants: [
          { attendeeId: new ObjectId(), optedIn: true, share_cents: 5000 },
          { attendeeId: new ObjectId(), optedIn: true, share_cents: 5000 },
          { attendeeId: new ObjectId(), optedIn: false },
        ],
        linkedActivityId: new ObjectId(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = ExpenseSchema.safeParse(validExpense);
      expect(result.success).toBe(true);
    });

    it('should store amounts in cents as integers', async () => {
      const { ExpenseSchema } = await import('@/lib/db/models');

      const expense = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        payerId: new ObjectId(),
        amount_cents: 9999,
        currency: 'USD',
        category: 'transport',
        description: 'Uber ride',
        status: 'settled',
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = ExpenseSchema.safeParse(expense);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.amount_cents).toBe('number');
        expect(Number.isInteger(result.data.amount_cents)).toBe(true);
      }
    });

    it('should reject expense with negative amount', async () => {
      const { ExpenseSchema } = await import('@/lib/db/models');

      const invalidExpense = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        payerId: new ObjectId(),
        amount_cents: -100,
        currency: 'USD',
        category: 'food',
        description: 'Test',
        status: 'pending',
        participants: [],
      };

      const result = ExpenseSchema.safeParse(invalidExpense);
      expect(result.success).toBe(false);
    });

    it('should validate all expense categories', async () => {
      const { ExpenseSchema } = await import('@/lib/db/models');
      const categories = ['food', 'transport', 'accommodation', 'activities', 'drinks', 'other'];

      for (const category of categories) {
        const expense = {
          _id: new ObjectId(),
          tripId: new ObjectId(),
          payerId: new ObjectId(),
          amount_cents: 1000,
          currency: 'USD',
          category,
          description: 'Test',
          status: 'pending',
          participants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = ExpenseSchema.safeParse(expense);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Activity Model', () => {
    it('should validate a complete activity document', async () => {
      const { ActivitySchema } = await import('@/lib/db/models');

      const validActivity = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        name: 'Pool Party',
        description: 'Rooftop pool party at the hotel',
        startDate: new Date('2025-06-16T14:00:00Z'),
        endDate: new Date('2025-06-16T18:00:00Z'),
        location: 'MGM Grand Pool',
        category: 'entertainment',
        rsvps: [
          { attendeeId: new ObjectId(), status: 'going' },
          { attendeeId: new ObjectId(), status: 'maybe' },
        ],
        linkedExpenseIds: [new ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = ActivitySchema.safeParse(validActivity);
      expect(result.success).toBe(true);
    });

    it('should validate all RSVP statuses', async () => {
      const { ActivityRsvpSchema } = await import('@/lib/db/models');
      const statuses = ['going', 'maybe', 'not_going'];

      for (const status of statuses) {
        const rsvp = {
          attendeeId: new ObjectId(),
          status,
        };

        const result = ActivityRsvpSchema.safeParse(rsvp);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Media Model', () => {
    it('should validate a photo with EXIF data', async () => {
      const { MediaSchema } = await import('@/lib/db/models');

      const validMedia = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        uploaderId: new ObjectId(),
        type: 'photo',
        url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg',
        thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/c_thumb,w_200/photo.jpg',
        exif: {
          date_taken: '2025-06-16T14:30:00Z',
          camera_make: 'Apple',
          camera_model: 'iPhone 15 Pro',
          gps_latitude: 36.1699,
          gps_longitude: -115.1398,
          orientation: 1,
          width: 4032,
          height: 3024,
        },
        caption: 'Pool party vibes',
        tags: ['pool', 'party', 'vegas'],
        fileSize: 2500000,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = MediaSchema.safeParse(validMedia);
      expect(result.success).toBe(true);
    });

    it('should validate a video without EXIF', async () => {
      const { MediaSchema } = await import('@/lib/db/models');

      const videoMedia = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        uploaderId: new ObjectId(),
        type: 'video',
        url: 'https://res.cloudinary.com/demo/video/upload/video.mp4',
        thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/so_0/video.jpg',
        fileSize: 15000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = MediaSchema.safeParse(videoMedia);
      expect(result.success).toBe(true);
    });

    it('should reject invalid media type', async () => {
      const { MediaSchema } = await import('@/lib/db/models');

      const invalidMedia = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        uploaderId: new ObjectId(),
        type: 'audio', // Invalid
        url: 'https://example.com/file.mp3',
        fileSize: 1000,
      };

      const result = MediaSchema.safeParse(invalidMedia);
      expect(result.success).toBe(false);
    });
  });

  describe('Invite Model', () => {
    it('should validate a complete invite document', async () => {
      const { InviteSchema } = await import('@/lib/db/models');

      const validInvite = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        email: 'friend@example.com',
        token: 'secure-random-token-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'pending',
        createdBy: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = InviteSchema.safeParse(validInvite);
      expect(result.success).toBe(true);
    });

    it('should validate all invite statuses', async () => {
      const { InviteSchema } = await import('@/lib/db/models');
      const statuses = ['pending', 'accepted', 'revoked', 'expired'];

      for (const status of statuses) {
        const invite = {
          _id: new ObjectId(),
          tripId: new ObjectId(),
          email: 'test@example.com',
          token: 'token-123',
          expiresAt: new Date(),
          status,
          createdBy: new ObjectId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = InviteSchema.safeParse(invite);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Payment Model', () => {
    it('should validate a complete payment document', async () => {
      const { PaymentSchema } = await import('@/lib/db/models');

      const validPayment = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        fromId: new ObjectId(),
        toId: new ObjectId(),
        amount_cents: 5000,
        status: 'pending',
        method: 'venmo',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = PaymentSchema.safeParse(validPayment);
      expect(result.success).toBe(true);
    });

    it('should validate paid status with markedPaidAt', async () => {
      const { PaymentSchema } = await import('@/lib/db/models');

      const paidPayment = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        fromId: new ObjectId(),
        toId: new ObjectId(),
        amount_cents: 5000,
        status: 'confirmed',
        method: 'cash',
        confirmedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = PaymentSchema.safeParse(paidPayment);
      expect(result.success).toBe(true);
    });

    it('should validate all payment methods', async () => {
      const { PaymentSchema } = await import('@/lib/db/models');
      const methods = ['venmo', 'paypal', 'cashapp', 'cash', 'zelle', 'other'];

      for (const method of methods) {
        const payment = {
          _id: new ObjectId(),
          tripId: new ObjectId(),
          fromId: new ObjectId(),
          toId: new ObjectId(),
          amount_cents: 1000,
          status: 'pending',
          method,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = PaymentSchema.safeParse(payment);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Poll Model', () => {
    it('should validate a complete poll document', async () => {
      const { PollSchema } = await import('@/lib/db/models');

      const validPoll = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        question: 'Where should we go for dinner?',
        options: [
          { id: 'opt1', text: 'Steakhouse' },
          { id: 'opt2', text: 'Italian' },
          { id: 'opt3', text: 'Sushi' },
        ],
        votes: [
          { attendeeId: new ObjectId(), optionId: 'opt1' },
          { attendeeId: new ObjectId(), optionId: 'opt2' },
        ],
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = PollSchema.safeParse(validPoll);
      expect(result.success).toBe(true);
    });

    it('should validate poll with closed status', async () => {
      const { PollSchema } = await import('@/lib/db/models');

      const closedPoll = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        question: 'Past poll',
        options: [{ id: 'opt1', text: 'Option 1' }],
        votes: [],
        status: 'closed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = PollSchema.safeParse(closedPoll);
      expect(result.success).toBe(true);
    });

    it('should reject poll without options', async () => {
      const { PollSchema } = await import('@/lib/db/models');

      const invalidPoll = {
        _id: new ObjectId(),
        tripId: new ObjectId(),
        question: 'Empty poll',
        options: [],
        votes: [],
        status: 'open',
      };

      const result = PollSchema.safeParse(invalidPoll);
      expect(result.success).toBe(false);
    });
  });

  describe('Timestamps', () => {
    it('should include timestamp fields on all models', async () => {
      const { TripSchema, AttendeeSchema, ExpenseSchema } = await import('@/lib/db/models');

      const baseDoc = {
        _id: new ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      // Test that createdAt and updatedAt are required
      const trip = TripSchema.safeParse({
        ...baseDoc,
        name: 'Test',
        location: 'Test',
        startDate: new Date(),
        endDate: new Date(),
        groomId: new ObjectId(),
        adminIds: [],
      });

      expect(trip.success).toBe(true);
      if (trip.success) {
        expect(trip.data.createdAt).toBeInstanceOf(Date);
        expect(trip.data.updatedAt).toBeInstanceOf(Date);
        expect(trip.data.deletedAt).toBeNull();
      }
    });

    it('should allow null deletedAt for soft delete support', async () => {
      const { TripSchema } = await import('@/lib/db/models');

      const trip = {
        _id: new ObjectId(),
        name: 'Test',
        location: 'Test',
        startDate: new Date(),
        endDate: new Date(),
        groomId: new ObjectId(),
        adminIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const result = TripSchema.safeParse(trip);
      expect(result.success).toBe(true);

      // Now with a date for soft delete
      const deletedTrip = {
        ...trip,
        deletedAt: new Date(),
      };

      const deletedResult = TripSchema.safeParse(deletedTrip);
      expect(deletedResult.success).toBe(true);
    });
  });

  describe('Type Inference', () => {
    it('should export TypeScript types matching schemas', async () => {
      const models = await import('@/lib/db/models');

      // Verify types are exported
      expect(models.TripSchema).toBeDefined();
      expect(models.AttendeeSchema).toBeDefined();
      expect(models.ExpenseSchema).toBeDefined();
      expect(models.ActivitySchema).toBeDefined();
      expect(models.MediaSchema).toBeDefined();
      expect(models.InviteSchema).toBeDefined();
      expect(models.PaymentSchema).toBeDefined();
      expect(models.PollSchema).toBeDefined();

      // These are inferred types - can't test at runtime, but TS will catch errors
    });
  });
});

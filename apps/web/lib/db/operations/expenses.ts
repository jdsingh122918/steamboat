/**
 * Expense-specific database operations.
 */

import { ObjectId, Filter } from 'mongodb';
import { getCollection, COLLECTIONS } from '@/lib/db/client';
import {
  Expense,
  CreateExpense,
  UpdateExpense,
  ExpenseCategory,
} from '@/lib/db/models';
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
 * Create a new expense.
 */
export async function createExpense(data: CreateExpense): Promise<Expense> {
  return create<Expense>(COLLECTIONS.EXPENSES, data);
}

/**
 * Get an expense by ID.
 */
export async function getExpenseById(
  id: ObjectId,
  options?: GetByIdOptions
): Promise<Expense | null> {
  return getById<Expense>(COLLECTIONS.EXPENSES, id, options);
}

/**
 * Update an expense.
 */
export async function updateExpense(
  id: ObjectId,
  data: UpdateExpense
): Promise<Expense | null> {
  return update<Expense>(COLLECTIONS.EXPENSES, id, data);
}

/**
 * Soft delete an expense.
 */
export async function deleteExpense(id: ObjectId): Promise<boolean> {
  return softDelete(COLLECTIONS.EXPENSES, id);
}

/**
 * List expenses with optional filtering.
 */
export async function listExpenses(
  filter: Filter<Expense>,
  options?: PaginationOptions
): Promise<PaginatedResult<Expense>> {
  return list<Expense>(COLLECTIONS.EXPENSES, filter, options);
}

/**
 * Get all expenses for a trip.
 */
export async function getExpensesByTrip(
  tripId: ObjectId,
  options?: PaginationOptions
): Promise<PaginatedResult<Expense>> {
  return list<Expense>(COLLECTIONS.EXPENSES, { tripId } as Filter<Expense>, options);
}

/**
 * Get expenses by category for a trip.
 */
export async function getExpensesByCategory(
  tripId: ObjectId,
  category: ExpenseCategory
): Promise<Expense[]> {
  const collection = await getCollection<Expense>(COLLECTIONS.EXPENSES);

  return collection
    .find({
      tripId,
      category,
      deletedAt: null,
    })
    .toArray();
}

/**
 * Get expenses paid by a specific attendee.
 */
export async function getExpensesByPayer(
  tripId: ObjectId,
  payerId: ObjectId
): Promise<Expense[]> {
  const collection = await getCollection<Expense>(COLLECTIONS.EXPENSES);

  return collection
    .find({
      tripId,
      payerId,
      deletedAt: null,
    })
    .toArray();
}

/**
 * Opt an attendee into an expense.
 */
export async function optIntoExpense(
  expenseId: ObjectId,
  attendeeId: ObjectId
): Promise<Expense | null> {
  const collection = await getCollection<Expense>(COLLECTIONS.EXPENSES);

  // First check if already a participant
  const expense = await getExpenseById(expenseId);
  if (!expense) {
    return null;
  }

  const existingParticipant = expense.participants.find((p) =>
    p.attendeeId instanceof ObjectId
      ? p.attendeeId.equals(attendeeId)
      : String(p.attendeeId) === String(attendeeId)
  );

  if (existingParticipant) {
    // Update existing participant to opted in
    await collection.updateOne(
      {
        _id: expenseId,
        'participants.attendeeId': attendeeId,
      },
      {
        $set: {
          'participants.$.optedIn': true,
          updatedAt: new Date(),
        },
      }
    );
  } else {
    // Add new participant
    await collection.updateOne(
      { _id: expenseId },
      {
        $push: {
          participants: {
            attendeeId,
            optedIn: true,
          },
        } as unknown as never,
        $set: { updatedAt: new Date() },
      }
    );
  }

  return getExpenseById(expenseId);
}

/**
 * Opt an attendee out of an expense.
 */
export async function optOutOfExpense(
  expenseId: ObjectId,
  attendeeId: ObjectId
): Promise<Expense | null> {
  const collection = await getCollection<Expense>(COLLECTIONS.EXPENSES);

  await collection.updateOne(
    {
      _id: expenseId,
      'participants.attendeeId': attendeeId,
    },
    {
      $set: {
        'participants.$.optedIn': false,
        updatedAt: new Date(),
      },
    }
  );

  return getExpenseById(expenseId);
}

/**
 * Get total expenses for a trip.
 */
export async function getTripTotalExpenses(tripId: ObjectId): Promise<number> {
  const collection = await getCollection<Expense>(COLLECTIONS.EXPENSES);

  const result = await collection
    .aggregate([
      { $match: { tripId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$amount_cents' } } },
    ])
    .toArray();

  return result[0]?.total ?? 0;
}

/**
 * Get expense summary by category for a trip.
 */
export async function getExpenseSummaryByCategory(
  tripId: ObjectId
): Promise<Array<{ category: ExpenseCategory; total_cents: number; count: number }>> {
  const collection = await getCollection<Expense>(COLLECTIONS.EXPENSES);

  return collection
    .aggregate([
      { $match: { tripId, deletedAt: null } },
      {
        $group: {
          _id: '$category',
          total_cents: { $sum: '$amount_cents' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          total_cents: 1,
          count: 1,
        },
      },
    ])
    .toArray() as Promise<Array<{ category: ExpenseCategory; total_cents: number; count: number }>>;
}

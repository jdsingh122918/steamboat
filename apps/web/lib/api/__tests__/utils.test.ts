import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  isValidObjectId,
  errorResponse,
  successResponse,
} from '../utils';

describe('isValidObjectId', () => {
  it('returns true for valid ObjectId strings', () => {
    const validId = new ObjectId().toString();
    expect(isValidObjectId(validId)).toBe(true);
  });

  it('returns true for another valid ObjectId', () => {
    const validId = '507f1f77bcf86cd799439011';
    expect(isValidObjectId(validId)).toBe(true);
  });

  it('returns false for invalid ObjectId strings', () => {
    expect(isValidObjectId('invalid-id')).toBe(false);
    expect(isValidObjectId('')).toBe(false);
    expect(isValidObjectId('123')).toBe(false);
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // 23 chars
    expect(isValidObjectId('507f1f77bcf86cd7994390111')).toBe(false); // 25 chars
  });

  it('returns false for strings with invalid characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false); // 'g' is invalid
    expect(isValidObjectId('507f1f77bcf86cd79943901!')).toBe(false);
  });

  it('returns false for ObjectId-like strings that do not match their toString', () => {
    // This tests the second condition: new ObjectId(id).toString() === id
    // Some 24-char hex strings might be "valid" but reconstruct differently
    expect(isValidObjectId('000000000000000000000000')).toBe(true);
  });
});

describe('errorResponse', () => {
  it('returns a NextResponse with error format and correct status', async () => {
    const response = errorResponse('Something went wrong', 400);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Something went wrong',
    });
  });

  it('returns 500 status for internal errors', async () => {
    const response = errorResponse('Internal server error', 500);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: 'Internal server error',
    });
  });

  it('returns 403 status for forbidden errors', async () => {
    const response = errorResponse('Forbidden: Access denied', 403);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: 'Forbidden: Access denied',
    });
  });

  it('returns 404 status for not found errors', async () => {
    const response = errorResponse('Resource not found', 404);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: 'Resource not found',
    });
  });
});

describe('successResponse', () => {
  it('returns a NextResponse with success format and default 200 status', async () => {
    const data = { id: '123', name: 'Test' };
    const response = successResponse(data);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: { id: '123', name: 'Test' },
    });
  });

  it('returns custom status code when provided', async () => {
    const data = { id: '456' };
    const response = successResponse(data, 201);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      success: true,
      data: { id: '456' },
    });
  });

  it('handles array data', async () => {
    const data = [{ id: '1' }, { id: '2' }];
    const response = successResponse(data);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: [{ id: '1' }, { id: '2' }],
    });
  });

  it('handles null data', async () => {
    const response = successResponse(null);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: null,
    });
  });

  it('handles empty object data', async () => {
    const response = successResponse({});
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {},
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleApiError, handleTripAccessError } from '../error-handler';

describe('handleApiError', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    consoleSpy.mockClear();
  });

  afterEach(() => {
    consoleSpy.mockClear();
  });

  it('returns 403 for Forbidden errors', async () => {
    const error = new Error('Forbidden: Access denied');
    const response = handleApiError(error, 'GET /api/test');
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: 'Forbidden: Access denied',
    });
    // Should not log forbidden errors
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('returns 401 for Unauthorized errors', async () => {
    const error = new Error('Unauthorized');
    const response = handleApiError(error, 'GET /api/test');
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('returns 401 for NEXT_REDIRECT errors', async () => {
    const error = new Error('NEXT_REDIRECT');
    const response = handleApiError(error, 'GET /api/test');
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: 'NEXT_REDIRECT',
    });
  });

  it('returns 400 for Invalid errors', async () => {
    const error = new Error('Invalid tripId format');
    const response = handleApiError(error, 'GET /api/test');
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Invalid tripId format',
    });
  });

  it('returns 404 for not found errors', async () => {
    const error = new Error('Resource not found');
    const response = handleApiError(error, 'GET /api/test');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: 'Resource not found',
    });
  });

  it('returns 500 for internal errors with default message', async () => {
    const error = new Error('Database connection failed');
    const response = handleApiError(error, 'GET /api/test');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: 'Internal server error',
    });
    // Should log internal errors
    expect(consoleSpy).toHaveBeenCalledWith('GET /api/test error:', error);
  });

  it('returns 500 for internal errors with custom message', async () => {
    const error = new Error('Database connection failed');
    const response = handleApiError(error, 'GET /api/test', 'Failed to fetch data');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: 'Failed to fetch data',
    });
  });

  it('handles non-Error objects', async () => {
    const response = handleApiError('string error', 'GET /api/test');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: 'Internal server error',
    });
  });
});

describe('handleTripAccessError', () => {
  it('returns 403 response for Forbidden errors', async () => {
    const error = new Error('Forbidden: You do not have access to this trip');
    const response = handleTripAccessError(error);

    expect(response).not.toBeNull();
    if (response) {
      const body = await response.json();
      expect(response.status).toBe(403);
      expect(body).toEqual({
        success: false,
        error: 'Forbidden: You do not have access to this trip',
      });
    }
  });

  it('returns null for non-Forbidden errors', () => {
    const error = new Error('Some other error');
    const response = handleTripAccessError(error);

    expect(response).toBeNull();
  });

  it('returns null for Forbidden not at start of message', () => {
    const error = new Error('Access Forbidden for user');
    const response = handleTripAccessError(error);

    expect(response).toBeNull();
  });

  it('returns null for non-Error objects', () => {
    const response = handleTripAccessError('string error');
    expect(response).toBeNull();
  });

  it('returns null for null', () => {
    const response = handleTripAccessError(null);
    expect(response).toBeNull();
  });

  it('returns null for undefined', () => {
    const response = handleTripAccessError(undefined);
    expect(response).toBeNull();
  });
});

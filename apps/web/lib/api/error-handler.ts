import { NextResponse } from 'next/server';
import type { ApiResponse } from './utils.js';

/**
 * Standard error types for API routes.
 */
export type ApiErrorType =
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'INTERNAL';

/**
 * Determine error type from error message.
 */
function getErrorType(message: string): ApiErrorType {
  if (message.includes('Forbidden')) {
    return 'FORBIDDEN';
  }
  if (message.includes('NEXT_REDIRECT') || message.includes('Unauthorized')) {
    return 'UNAUTHORIZED';
  }
  if (message.includes('Invalid')) {
    return 'VALIDATION';
  }
  if (message.includes('not found') || message.includes('Not found')) {
    return 'NOT_FOUND';
  }
  return 'INTERNAL';
}

/**
 * Get HTTP status code for error type.
 */
function getStatusForErrorType(errorType: ApiErrorType): number {
  switch (errorType) {
    case 'FORBIDDEN':
      return 403;
    case 'UNAUTHORIZED':
      return 401;
    case 'VALIDATION':
      return 400;
    case 'NOT_FOUND':
      return 404;
    case 'INTERNAL':
      return 500;
  }
}

/**
 * Handle API errors with consistent response format.
 *
 * Usage:
 * ```ts
 * catch (error) {
 *   return handleApiError(error, 'GET /api/trips/[tripId]/expenses');
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  context: string,
  defaultMessage = 'Internal server error'
): NextResponse<ApiResponse<never>> {
  const message = error instanceof Error ? error.message : String(error);
  const errorType = getErrorType(message);

  // Log internal errors for debugging
  if (errorType === 'INTERNAL') {
    console.error(`${context} error:`, error);
  }

  const responseMessage =
    errorType === 'INTERNAL' ? defaultMessage : message;
  const status = getStatusForErrorType(errorType);

  return NextResponse.json(
    { success: false, error: responseMessage },
    { status }
  );
}

/**
 * Handle trip access errors specifically.
 * Returns null if the error should be re-thrown.
 *
 * Usage:
 * ```ts
 * try {
 *   await requireTripAccess(tripId);
 * } catch (error) {
 *   const response = handleTripAccessError(error);
 *   if (response) return response;
 *   throw error;
 * }
 * ```
 */
export function handleTripAccessError(
  error: unknown
): NextResponse<ApiResponse<never>> | null {
  if (error instanceof Error) {
    if (error.message.startsWith('Forbidden:')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
  }
  return null;
}

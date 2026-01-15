import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

/**
 * Standard API response interface used across all API routes.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate MongoDB ObjectId format.
 * Checks both validity and string representation match.
 */
export function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

/**
 * Create an error response with consistent format.
 */
export function errorResponse(
  error: string,
  status: number
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * Create a success response with consistent format.
 */
export function successResponse<T>(
  data: T,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

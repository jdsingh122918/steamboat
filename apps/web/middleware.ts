/**
 * Next.js Edge Middleware for route protection.
 *
 * Handles authentication checks at the edge before requests reach the server.
 * Uses iron-session for secure session management.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth/session';

/**
 * Routes that require authentication.
 * Users without a valid session will be redirected to /join.
 */
const protectedRoutes = ['/dashboard', '/trips'];

/**
 * Routes that are always accessible without authentication.
 */
const publicRoutes = ['/', '/join', '/invite'];

/**
 * Middleware function to protect routes.
 *
 * @param req - The incoming request
 * @returns NextResponse to continue or redirect
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;

  // Check if the route is protected
  const isProtected = protectedRoutes.some((route) => path.startsWith(route));

  // Allow public routes without session check
  if (!isProtected) {
    return NextResponse.next();
  }

  // Get session from request cookies (not from next/headers cookies)
  // For edge middleware, we need to create a response first and pass both
  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  // Redirect to /join if not authenticated
  if (!session.attendeeId) {
    const joinUrl = new URL('/join', req.nextUrl);
    return NextResponse.redirect(joinUrl);
  }

  return res;
}

/**
 * Middleware matcher configuration.
 *
 * Excludes:
 * - API routes (/api)
 * - Static files (/_next/static, /_next/image)
 * - Favicon and other assets
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};

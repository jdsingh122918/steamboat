/**
 * Pusher Trigger API Route
 *
 * POST /api/pusher/trigger - Trigger a Pusher event
 *
 * This endpoint allows server-side code to trigger Pusher events
 * for real-time updates across all connected clients.
 */

import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface TriggerRequest {
  channel: string;
  event: string;
  data: unknown;
}

// Create Pusher server instance
function getPusherServer(): Pusher | null {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    console.warn('Pusher server configuration missing');
    return null;
  }

  return new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
}

/**
 * POST /api/pusher/trigger
 *
 * Trigger a Pusher event.
 * Body:
 *   - channel: string (the channel to trigger on)
 *   - event: string (the event name)
 *   - data: unknown (the event payload)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ triggered: boolean }>>> {
  try {
    const body: TriggerRequest = await request.json();
    const { channel, event, data } = body;

    // Validate required fields
    if (!channel || typeof channel !== 'string') {
      return NextResponse.json(
        { success: false, error: 'channel is required and must be a string' },
        { status: 400 }
      );
    }

    if (!event || typeof event !== 'string') {
      return NextResponse.json(
        { success: false, error: 'event is required and must be a string' },
        { status: 400 }
      );
    }

    // Get Pusher server instance
    const pusher = getPusherServer();

    if (!pusher) {
      // Silently succeed if Pusher is not configured (development mode)
      console.warn('Pusher not configured, skipping event trigger');
      return NextResponse.json({
        success: true,
        data: { triggered: false },
      });
    }

    // Trigger the event
    await pusher.trigger(channel, event, data);

    return NextResponse.json({
      success: true,
      data: { triggered: true },
    });
  } catch (error) {
    console.error('POST /api/pusher/trigger error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger event' },
      { status: 500 }
    );
  }
}

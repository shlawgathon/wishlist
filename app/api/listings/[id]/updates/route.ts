import { NextRequest, NextResponse } from 'next/server';
import { getListingById, subscribeToListingUpdates, unsubscribeFromListingUpdates } from '@/lib/listings-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const readable = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any, event = 'message') => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          console.error('Error sending SSE event:', error);
        }
      };

      // Send initial data
      const initialListing = getListingById(id);
      if (initialListing) {
        sendEvent({
          type: 'initial',
          data: initialListing,
        }, 'listing-update');
      }

      // Subscribe to updates
      const listener = (updatedListing: any) => {
        if (updatedListing.id === id) {
          sendEvent({
            type: 'update',
            data: updatedListing,
          }, 'listing-update');
        }
      };
      
      subscribeToListingUpdates(listener);

      // Send heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        sendEvent({ type: 'heartbeat' }, 'heartbeat');
      }, 30000); // Every 30 seconds

      // Cleanup on abort
      request.signal.onabort = () => {
        unsubscribeFromListingUpdates(listener);
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch (error) {
          // Ignore errors on close
        }
      };
    },
    cancel() {
      // Cleanup on stream cancellation
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}


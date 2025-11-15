import { NextRequest, NextResponse } from 'next/server';
import { subscribeToCommentUpdates, unsubscribeFromCommentUpdates } from '@/lib/listings-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

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

      // Subscribe to comment updates
      const listener = (commentProjectId: string, comment: any) => {
        if (commentProjectId === projectId) {
          sendEvent({
            type: 'new_comment',
            data: comment,
          }, 'comment-update');
        }
      };
      
      subscribeToCommentUpdates(listener);

      // Send heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        sendEvent({ type: 'heartbeat' }, 'heartbeat');
      }, 30000); // Every 30 seconds

      // Cleanup on abort
      request.signal.onabort = () => {
        unsubscribeFromCommentUpdates(listener);
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


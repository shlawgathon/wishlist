import { NextRequest, NextResponse } from 'next/server';
import { getComments } from '@/lib/listings-store';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any, event = 'message') => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          console.error('Error sending SSE event:', error);
        }
      };

      try {
        // Send initial comments
        const initialComments = await getComments(projectId);
        if (initialComments.length > 0) {
          sendEvent({ type: 'initial', data: initialComments }, 'comment-update');
        }

        // Set up MongoDB Change Stream for real-time comment updates
        const client = await clientPromise;
        const db = client.db('database');
        const collection = db.collection('comments');

        // Watch for new comments on this listing
        const changeStream = collection.watch(
          [{ $match: { 'fullDocument.listingId': projectId } }],
          { fullDocument: 'updateLookup' }
        );

        changeStream.on('change', (change: any) => {
          if (change.operationType === 'insert' && change.fullDocument) {
            sendEvent({ type: 'new_comment', data: change.fullDocument }, 'comment-update');
          }
        });

        changeStream.on('error', (error) => {
          console.error('Change stream error:', error);
          sendEvent({ type: 'error', error: error.message }, 'error');
        });

        // Send heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          sendEvent({ type: 'heartbeat' }, 'heartbeat');
        }, 30000); // Every 30 seconds

        // Cleanup on abort
        request.signal.onabort = () => {
          clearInterval(heartbeatInterval);
          changeStream.close();
          try {
            controller.close();
          } catch (error) {
            // Ignore errors on close
          }
        };
      } catch (error) {
        console.error('Error setting up comment change stream:', error);
        sendEvent({ type: 'error', error: 'Failed to set up real-time updates' }, 'error');
        controller.close();
      }
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
    },
  });
}

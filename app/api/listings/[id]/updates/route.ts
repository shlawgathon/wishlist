import { NextRequest, NextResponse } from 'next/server';
import { getListingById } from '@/lib/listings-store';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
        // Send initial data
        const initialListing = await getListingById(id);
        if (initialListing) {
          sendEvent({ type: 'initial', data: initialListing }, 'listing-update');
        }

        // Set up MongoDB Change Stream for real-time updates
        const client = await clientPromise;
        const db = client.db('database');
        const collection = db.collection('listings');

        // Watch for changes to this specific listing
        const changeStream = collection.watch(
          [{ $match: { 'fullDocument.id': id } }],
          { fullDocument: 'updateLookup' }
        );

        changeStream.on('change', (change: any) => {
          if (change.fullDocument && change.fullDocument.id === id) {
            sendEvent({ type: 'update', data: change.fullDocument }, 'listing-update');
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
        console.error('Error setting up change stream:', error);
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

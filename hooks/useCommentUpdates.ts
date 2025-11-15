'use client';

import { useEffect, useState } from 'react';

interface Comment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: number;
}

/**
 * Hook for real-time comment updates via Server-Sent Events
 */
export function useCommentUpdates(projectId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [connected, setConnected] = useState(false);

  // Load initial comments
  useEffect(() => {
    if (!projectId) return;

    const loadComments = async () => {
      try {
        const response = await fetch(`/api/listings/${projectId}/comments`);
        if (response.ok) {
          const data = await response.json();
          setComments(data.comments || []);
        }
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    };

    loadComments();
  }, [projectId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!projectId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      try {
        eventSource = new EventSource(`/api/listings/${projectId}/comments/stream`);

        eventSource.onopen = () => {
          setConnected(true);
          reconnectAttempts = 0;
        };

        // Handle comment update events
        eventSource.addEventListener('comment-update', (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data);
            const { type, data } = parsed;
            
            if (type === 'new_comment') {
              setComments((prev) => [...prev, data]);
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        });

        eventSource.addEventListener('heartbeat', () => {
          // Just acknowledge heartbeat, no action needed
        });

        // Fallback for generic messages
        eventSource.onmessage = (event) => {
          try {
            // Skip heartbeat messages
            if (event.data.startsWith(':')) return;
            
            const parsed = JSON.parse(event.data);
            if (parsed.type === 'heartbeat') return;
            
            const { type, data } = parsed;
            
            if (type === 'new_comment') {
              setComments((prev) => [...prev, data]);
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = () => {
          setConnected(false);
          
          if (eventSource?.readyState === EventSource.CLOSED) {
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              reconnectTimeout = setTimeout(() => {
                if (eventSource) {
                  eventSource.close();
                }
                connect();
              }, 3000 * reconnectAttempts);
            }
          }
        };
      } catch (error) {
        console.error('Error creating SSE connection:', error);
        setConnected(false);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
      setConnected(false);
    };
  }, [projectId]);

  return { comments, connected };
}

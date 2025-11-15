'use client';

import { useEffect, useState } from 'react';
import type { ProjectListing } from '@/types/project';

/**
 * Hook for real-time listing updates via Server-Sent Events
 */
export function useListingUpdates(listingId: string) {
  const [listing, setListing] = useState<ProjectListing | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!listingId) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      try {
        eventSource = new EventSource(`/api/listings/${listingId}/updates`);

        eventSource.onopen = () => {
          setConnected(true);
          reconnectAttempts = 0; // Reset on successful connection
        };

        // Handle different event types
        eventSource.addEventListener('listing-update', (event: MessageEvent) => {
          try {
            const parsed = JSON.parse(event.data);
            const { type, data } = parsed;
            
            if (type === 'initial' || type === 'update') {
              // Convert to ProjectListing format
              const projectListing: ProjectListing = {
                id: data.id,
                name: data.name,
                description: data.description,
                companyProfile: data.companyProfile,
                fundingGoal: data.fundingGoal,
                amountRaised: data.amountRaised,
                backers: data.backers,
                daysLeft: data.daysLeft,
                category: data.category,
                tiers: data.tiers,
              };
              setListing(projectListing);
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
            
            if (type === 'initial' || type === 'update') {
              const projectListing: ProjectListing = {
                id: data.id,
                name: data.name,
                description: data.description,
                companyProfile: data.companyProfile,
                fundingGoal: data.fundingGoal,
                amountRaised: data.amountRaised,
                backers: data.backers,
                daysLeft: data.daysLeft,
                category: data.category,
                tiers: data.tiers,
              };
              setListing(projectListing);
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          setConnected(false);
          
          // Only log if it's not a normal connection close
          if (eventSource?.readyState === EventSource.CLOSED) {
            // Connection closed, attempt to reconnect
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              reconnectTimeout = setTimeout(() => {
                if (eventSource) {
                  eventSource.close();
                }
                connect();
              }, 3000 * reconnectAttempts); // Exponential backoff
            } else {
              console.warn('Max reconnect attempts reached for listing updates');
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
  }, [listingId]);

  return { listing, connected };
}

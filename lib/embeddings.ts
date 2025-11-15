/**
 * Voyager embeddings generation for vector search
 */

import { VoyageAIClient } from 'voyageai';
import type { Listing } from './listings-store';

// Initialize Voyager client
let voyageClient: VoyageAIClient | null = null;

function getVoyageClient(): VoyageAIClient {
  if (!voyageClient) {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
      throw new Error('VOYAGE_API_KEY environment variable is not set');
    }
    voyageClient = new VoyageAIClient({
      apiKey: apiKey as any, // BearerToken type
    });
  }
  return voyageClient;
}

/**
 * Generate embedding for a text string
 * @param text - Text to embed
 * @param model - Voyager model to use (default: 'voyage-2')
 * @returns Vector embedding array
 */
export async function generateEmbedding(
  text: string,
  model: 'voyage-2' | 'voyage-large-2' = 'voyage-2'
): Promise<number[]> {
  try {
    const voyage = getVoyageClient();
    const response = await voyage.embed({
      input: text,
      model: model,
    });
    
    if (!response.data || response.data.length === 0 || !response.data[0].embedding) {
      throw new Error('No embeddings returned from Voyager API');
    }
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embedding for a listing
 * Combines name, description, category into a single text
 * @param listing - Listing object
 * @returns Vector embedding array
 */
export async function embedListing(listing: Listing): Promise<number[]> {
  // Combine relevant fields for embedding
  const text = [
    listing.name,
    listing.description,
    listing.category,
    listing.companyProfile?.name,
    listing.companyProfile?.bio,
  ]
    .filter(Boolean)
    .join(' ');
  
  return generateEmbedding(text);
}

/**
 * Get embedding dimensions for a model
 * @param model - Voyager model name
 * @returns Dimension count
 */
export function getEmbeddingDimensions(
  model: 'voyage-2' | 'voyage-large-2' = 'voyage-2'
): number {
  return model === 'voyage-2' ? 1024 : 1536;
}


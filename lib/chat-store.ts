/**
 * Chat history store for MongoDB
 */

import clientPromise from './mongodb';
import type { ObjectId } from 'mongodb';

const DB_NAME = 'database';
const COLLECTIONS = {
  chatHistories: 'chat_histories',
};

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatHistory {
  _id?: ObjectId;
  id: string; // Client-side ID for easy reference
  userId: string; // Username
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// Get all chat histories for a user
export async function getChatHistoriesByUser(userId: string): Promise<ChatHistory[]> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<ChatHistory>(COLLECTIONS.chatHistories);
    
    const histories = await collection
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();
    
    return histories;
  } catch (error) {
    console.error('Error fetching chat histories:', error);
    return [];
  }
}

// Get a single chat history by ID
export async function getChatHistoryById(
  chatId: string,
  userId: string
): Promise<ChatHistory | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<ChatHistory>(COLLECTIONS.chatHistories);
    
    return await collection.findOne({ id: chatId, userId }) || null;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return null;
  }
}

// Create a new chat history
export async function createChatHistory(
  userId: string,
  chat: Omit<ChatHistory, '_id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<ChatHistory> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<ChatHistory>(COLLECTIONS.chatHistories);
    
    // Check if a chat with the same id already exists (prevent duplicates)
    const existing = await collection.findOne({ id: chat.id, userId });
    if (existing) {
      // Chat already exists, return it instead of creating a duplicate
      return existing;
    }
    
    const newChat: ChatHistory = {
      ...chat,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await collection.insertOne(newChat);
    return newChat;
  } catch (error) {
    console.error('Error creating chat history:', error);
    throw error;
  }
}

// Update a chat history
export async function updateChatHistory(
  chatId: string,
  userId: string,
  updates: Partial<Pick<ChatHistory, 'title' | 'messages' | 'updatedAt'>>
): Promise<ChatHistory | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<ChatHistory>(COLLECTIONS.chatHistories);
    
    const result = await collection.findOneAndUpdate(
      { id: chatId, userId },
      { 
        $set: { 
          ...updates,
          updatedAt: Date.now(),
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result || null;
  } catch (error) {
    console.error('Error updating chat history:', error);
    return null;
  }
}

// Delete a chat history
export async function deleteChatHistory(
  chatId: string,
  userId: string
): Promise<boolean> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<ChatHistory>(COLLECTIONS.chatHistories);
    
    const result = await collection.deleteOne({ id: chatId, userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting chat history:', error);
    return false;
  }
}


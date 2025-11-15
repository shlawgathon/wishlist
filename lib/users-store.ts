/**
 * User store for MongoDB
 */

import clientPromise from './mongodb';
import type { ObjectId } from 'mongodb';

const DB_NAME = 'database';
const COLLECTIONS = {
  users: 'users',
};

export interface User {
  _id?: ObjectId;
  username: string;
  passwordHash: string; // Hashed password
  buyerApiKey: string; // Locus buyer API key (required)
  createdAt: number;
  updatedAt: number;
}

// Create user
export async function createUser(user: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<User>(COLLECTIONS.users);
    
    // Check if username already exists
    const existing = await collection.findOne({ username: user.username });
    if (existing) {
      throw new Error('Username already exists');
    }
    
    const newUser: User = {
      ...user,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await collection.insertOne(newUser);
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Get user by username
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<User>(COLLECTIONS.users);
    
    return await collection.findOne({ username }) || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// Update user's buyer API key
export async function updateUserBuyerApiKey(
  username: string,
  buyerApiKey: string
): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<User>(COLLECTIONS.users);
    
    const result = await collection.findOneAndUpdate(
      { username },
      { 
        $set: { 
          buyerApiKey,
          updatedAt: Date.now(),
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result || null;
  } catch (error) {
    console.error('Error updating user buyer API key:', error);
    return null;
  }
}

// Update user password
export async function updateUserPassword(
  username: string,
  passwordHash: string
): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection<User>(COLLECTIONS.users);
    
    const result = await collection.findOneAndUpdate(
      { username },
      { 
        $set: { 
          passwordHash,
          updatedAt: Date.now(),
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result || null;
  } catch (error) {
    console.error('Error updating user password:', error);
    return null;
  }
}


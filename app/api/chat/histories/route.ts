import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getChatHistoriesByUser, createChatHistory, ChatHistory } from '@/lib/chat-store';

// GET: Get all chat histories for the current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const histories = await getChatHistoriesByUser(user.username);
    
    // Remove MongoDB _id from response
    const sanitized = histories.map(({ _id, ...rest }) => rest);
    
    return NextResponse.json({ histories: sanitized });
  } catch (error) {
    console.error('Get chat histories error:', error);
    return NextResponse.json(
      { error: 'Failed to get chat histories' },
      { status: 500 }
    );
  }
}

// POST: Create a new chat history
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, title, messages } = body;

    if (!id || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: id, title' },
        { status: 400 }
      );
    }

    const newChat = await createChatHistory(user.username, {
      id,
      title,
      messages: messages || [],
    });

    // Remove MongoDB _id from response
    const { _id, ...sanitized } = newChat;
    
    console.log('Chat history created successfully:', sanitized.id);
    return NextResponse.json({ chat: sanitized });
  } catch (error) {
    console.error('Create chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to create chat history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


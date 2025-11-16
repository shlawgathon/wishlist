import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  getChatHistoryById, 
  updateChatHistory, 
  deleteChatHistory 
} from '@/lib/chat-store';

// GET: Get a single chat history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const chat = await getChatHistoryById(id, user.username);
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat history not found' },
        { status: 404 }
      );
    }

    // Remove MongoDB _id from response
    const { _id, ...sanitized } = chat;
    
    return NextResponse.json({ chat: sanitized });
  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to get chat history' },
      { status: 500 }
    );
  }
}

// PATCH: Update a chat history
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, messages } = body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (messages !== undefined) updates.messages = messages;

    const updated = await updateChatHistory(id, user.username, updates);
    
    if (!updated) {
      console.error('Chat history not found:', id, 'for user:', user.username);
      return NextResponse.json(
        { error: 'Chat history not found' },
        { status: 404 }
      );
    }

    // Remove MongoDB _id from response
    const { _id, ...sanitized } = updated;
    
    console.log('Chat history updated successfully:', sanitized.id, 'messages:', sanitized.messages.length);
    return NextResponse.json({ chat: sanitized });
  } catch (error) {
    console.error('Update chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to update chat history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a chat history
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('Delete chat: Not authenticated');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;
    console.log('Delete chat: Attempting to delete chat', id, 'for user:', user.username);
    
    const deleted = await deleteChatHistory(id, user.username);
    
    if (!deleted) {
      console.error('Delete chat: Chat history not found', id, 'for user:', user.username);
      return NextResponse.json(
        { error: 'Chat history not found' },
        { status: 404 }
      );
    }

    console.log('✅ Delete chat: Successfully deleted chat', id, 'for user:', user.username);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Delete chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


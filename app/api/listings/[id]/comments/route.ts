import { NextRequest, NextResponse } from 'next/server';

// In-memory comments store (in production, use a database)
const comments: Record<string, Array<{
  id: string;
  author: string;
  avatar?: string;
  content: string;
  timestamp: number;
}>> = {};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json({
      comments: comments[id] || [],
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, author } = body;

    if (!content || !author) {
      return NextResponse.json(
        { error: 'Missing required fields: content, author' },
        { status: 400 }
      );
    }

    if (!comments[id]) {
      comments[id] = [];
    }

    const comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author,
      content,
      timestamp: Date.now(),
    };

    comments[id].push(comment);

    return NextResponse.json({
      success: true,
      comment,
    });
  } catch (error) {
    console.error('Error posting comment:', error);
    return NextResponse.json(
      { error: 'Failed to post comment' },
      { status: 500 }
    );
  }
}


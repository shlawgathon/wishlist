import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  try {
    const { firstMessage } = await request.json();
    
    if (!firstMessage || typeof firstMessage !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid firstMessage' },
        { status: 400 }
      );
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey: anthropicApiKey });
    
    const prompt = `Generate a concise, descriptive title (maximum 6-8 words) for a chat conversation that starts with this message:

"${firstMessage.substring(0, 500)}"

Return only the title, nothing else. Make it clear and specific.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const title = content.text.trim();
      // Fallback to simple truncation if Claude returns something too long
      if (title.length > 60) {
        return NextResponse.json({ 
          title: title.substring(0, 57) + '...' 
        });
      }
      return NextResponse.json({ title });
    }

    // Fallback
    const trimmed = firstMessage.trim();
    return NextResponse.json({ 
      title: trimmed.length > 50 ? trimmed.substring(0, 47) + '...' : trimmed 
    });
  } catch (error) {
    console.error('Error generating title:', error);
    // Fallback to simple truncation
    try {
      const { firstMessage } = await request.json();
      const trimmed = firstMessage?.trim() || 'New Chat';
      return NextResponse.json({ 
        title: trimmed.length > 50 ? trimmed.substring(0, 47) + '...' : trimmed 
      });
    } catch {
      return NextResponse.json({ title: 'New Chat' });
    }
  }
}


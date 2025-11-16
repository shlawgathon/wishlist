'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send } from 'lucide-react';
import { useCommentUpdates } from '@/hooks/useCommentUpdates';

interface ProjectCommentsProps {
  projectId: string;
  fullView?: boolean;
}

export default function ProjectComments({ projectId, fullView = false }: ProjectCommentsProps) {
  const { comments } = useCommentUpdates(projectId);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/listings/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
        }),
      });

      if (response.ok) {
        setNewComment('');
        // Comments will update automatically via SSE
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to post comment' }));
        if (response.status === 401) {
          alert('Please log in to post a comment');
        } else if (response.status === 409) {
          alert('You have already commented on this listing');
        } else {
          alert(errorData.error || 'Failed to post comment');
        }
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayComments = fullView ? comments : comments.slice(0, 3);

  return (
    <div className="space-y-4">
      {displayComments.length > 0 ? (
        <ScrollArea className={fullView ? 'h-[500px]' : 'h-auto'}>
          <div className="space-y-4 pr-4">
            {displayComments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {comment.author.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet. Be the first to comment!
        </p>
      )}

      {fullView && (
        <>
          <Separator />
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              disabled={loading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={loading || !newComment.trim()}
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  );
}


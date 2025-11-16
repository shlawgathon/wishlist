'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Save chat to MongoDB via API
async function saveChatToMongoDB(chat: { id: string; title: string; messages: ChatMessage[]; createdAt: number; updatedAt: number }): Promise<boolean> {
  try {
    // First check if chat exists
    const checkResponse = await fetch(`/api/chat/histories/${chat.id}`);
    if (checkResponse.status === 404) {
      // Chat doesn't exist, create it
      const createResponse = await fetch('/api/chat/histories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chat),
      });
      return createResponse.ok;
    } else if (checkResponse.ok) {
      // Chat exists, update it
      const updateResponse = await fetch(`/api/chat/histories/${chat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: chat.title,
          messages: chat.messages,
        }),
      });
      return updateResponse.ok;
    }
    return false;
  } catch (error) {
    console.error('Error saving chat to MongoDB:', error);
    return false;
  }
}

// Generate a title from the first user message
function generateTitle(firstMessage: string): string {
  if (!firstMessage) return 'New Chat';
  const trimmed = firstMessage.trim();
  if (trimmed.length > 50) {
    return trimmed.substring(0, 50) + '...';
  }
  return trimmed;
}

export default function AISearchBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Don't save query to sessionStorage - we don't want to save on reload

  // Ensure we're on client side - always start in search box mode
  useEffect(() => {
    setIsMounted(true);
    // Always start fresh - no auto-loading chat history
    setMessages([]);
    setIsChatMode(false);
    setCurrentChatId(null);
    
    // Clear any saved queries on reload (don't save on reload)
    sessionStorage.removeItem('current_search_query');
    sessionStorage.removeItem('pending_search_query');
  }, []);

  // Save chat to MongoDB only on exit (page unload/visibility change)
  // Don't save on reload or message changes
  const hasSavedOnExitRef = useRef(false);
  
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return;
    
    const saveChatOnExit = () => {
      // Only save once on exit
      if (hasSavedOnExitRef.current || messages.length === 0) {
        return;
      }
      
      hasSavedOnExitRef.current = true;
      
      // Create or update current chat
      let chatId = currentChatId;
      if (!chatId) {
        chatId = `chat_${Date.now()}`;
      }
      
      const firstUserMessage = messages.find(m => m.role === 'user');
      const title = firstUserMessage ? generateTitle(firstUserMessage.content) : 'New Chat';
      
      const chat = {
        id: chatId,
        title,
        messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Use fetch with keepalive for reliable saving on page unload
      // sendBeacon doesn't support custom headers needed for auth, so use fetch with keepalive
      fetch(`/api/chat/histories/${chatId}`, { method: 'HEAD' })
        .then(response => {
          if (response.status === 404) {
            // Create new chat
            fetch('/api/chat/histories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(chat),
              keepalive: true,
            }).catch(() => {});
          } else {
            // Update existing chat
            fetch(`/api/chat/histories/${chatId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, messages }),
              keepalive: true,
            }).catch(() => {});
          }
        })
        .catch(() => {
          // Fallback: try to create
          fetch('/api/chat/histories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chat),
            keepalive: true,
          }).catch(() => {});
        });
    };
    
    // Save on page unload (closing tab/window, navigating away)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveChatOnExit();
    };
    
    // Save when page becomes hidden (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveChatOnExit();
      }
    };
    
    // Save on pagehide (more reliable than beforeunload)
    const handlePageHide = () => {
      saveChatOnExit();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [messages, isMounted, currentChatId]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    // Enter chat mode when user sends first message
    if (!isChatMode) {
      setIsChatMode(true);
      // Create new chat when entering chat mode
      if (!currentChatId) {
        setCurrentChatId(`chat_${Date.now()}`);
      }
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    const currentQuery = query;
    setQuery('');

    try {
      // Try to get Locus API key from localStorage first, then let backend try session
      const locusApiKey = localStorage.getItem('locus_buyer_api_key');

      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          locusApiKey: locusApiKey || undefined, // Backend will also check user session
        }),
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Search failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          errorMessage = `Search failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const result = data.result || data.message || 'No results found';

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: result,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Error: Failed to process search. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  const clearHistory = () => {
    // Clear immediately without confirmation
    setMessages([]);
    setIsChatMode(false);
    setCurrentChatId(null);
  };

  // Auto-scroll to bottom when new messages arrive
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  if (!isChatMode) {
    // Simple search bar mode
    return (
      <div className="w-full">
        <div className="relative group w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center w-full">
            <div className="absolute left-5 z-10">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask AI about investment opportunities, projects, or get recommendations..."
              className="w-full pl-14 pr-32 sm:pr-36 h-14 sm:h-16 text-sm sm:text-base border-2 border-border/50 focus:border-primary/50 bg-background/80 backdrop-blur-md rounded-2xl shadow-lg focus:shadow-xl transition-all duration-300"
              disabled={loading}
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              size="lg"
              className="absolute right-2 h-10 sm:h-12 px-4 sm:px-6 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Searching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Search</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full chat mode
  return (
    <div className="w-full flex flex-col h-[calc(100vh-12rem)] max-h-[800px] rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/90">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI Assistant</p>
            <p className="text-xs text-muted-foreground">Ask about investment opportunities</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="h-8 gap-2"
          >
            <Trash2 className="h-3 w-3" />
            <span className="text-xs">Clear</span>
          </Button>
        )}
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 min-h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask me about investment opportunities, project recommendations, or get help finding the perfect fundraiser for you.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] sm:max-w-[65%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div
                        className="text-sm whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: message.content
                            .replace(/\n\n+/g, '<br /><br />') // Multiple newlines become double breaks
                            .replace(/\n/g, '<br />') // Single newlines become breaks
                            .replace(
                              /\[([^\]]+)\]\(([^)]+)\)/g,
                              '<a href="$2" class="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>'
                            )
                            .replace(/##\s+/g, '<strong class="text-base">') // Clean up markdown headers
                            .replace(/###\s+/g, '<strong class="text-sm">')
                            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold
                            .replace(/\*([^*]+)\*/g, '<em>$1</em>'), // Italic
                        }}
                      />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                    )}
                    <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-xs font-semibold text-primary">
                        {typeof window !== 'undefined' ? (localStorage.getItem('wallet_address')?.substring(0, 2).toUpperCase() || 'U') : 'U'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="p-4 border-t border-border/50 bg-card/90">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about investment opportunities, projects, or get recommendations..."
                className="w-full pl-4 pr-4 h-12 text-sm border-2 border-border/50 focus:border-primary/50 bg-background/80 backdrop-blur-md rounded-xl shadow-sm focus:shadow-md transition-all duration-300"
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              size="lg"
              className="h-12 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Press Enter to send • Chat history is saved automatically
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, MessageSquare, Plus, Trash2, Loader2 } from 'lucide-react';
import AISearchBar from '@/components/AISearchBar';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
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

export default function AgentConsole() {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const isInitialLoadRef = useRef(true);
  const hasSavedOnExitRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedChatIdsRef = useRef<Set<string>>(new Set()); // Track which chats have been saved

  // Load chat histories from MongoDB
  const loadChatHistories = useCallback(async () => {
    try {
      // Only show loading on initial load
      if (isInitialLoadRef.current) {
        setLoading(true);
        isInitialLoadRef.current = false;
      }
      
      const response = await fetch('/api/chat/histories');
      if (response.ok) {
        const data = await response.json();
        const histories = data.histories || [];
        
        // Mark all loaded chats as already saved (they exist in MongoDB)
        histories.forEach((chat: ChatHistory) => {
          savedChatIdsRef.current.add(chat.id);
        });
        
        setChatHistories((prevHistories) => {
          // Only update if histories actually changed
          const currentIds = prevHistories.map(c => c.id).sort().join(',');
          const newIds = histories.map((c: ChatHistory) => c.id).sort().join(',');
          
          if (currentIds !== newIds || prevHistories.length === 0) {
            return histories;
          }
          
          // Check if any chat was updated
          const hasUpdates = histories.some((newChat: ChatHistory) => {
            const oldChat = prevHistories.find(c => c.id === newChat.id);
            if (!oldChat) return true;
            return oldChat.updatedAt !== newChat.updatedAt || 
                   oldChat.messages.length !== newChat.messages.length ||
                   oldChat.title !== newChat.title;
          });
          
          return hasUpdates ? histories : prevHistories;
        });
        
        // Select the most recent chat if available and no chat is selected
        setSelectedChatId((prevId) => {
          if (!prevId && histories.length > 0) {
            const mostRecent = histories.sort((a: ChatHistory, b: ChatHistory) => b.updatedAt - a.updatedAt)[0];
            return mostRecent.id;
          }
          return prevId;
        });
      } else if (response.status === 401) {
        // Not authenticated - this is a valid state, just set empty array
        setChatHistories([]);
        setSelectedChatId(null);
      } else {
        // Only log actual errors (500, etc.), not expected states
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load chat histories:', response.status, errorData);
      }
    } catch (error) {
      // Only log unexpected network errors
      console.error('Error loading chat histories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    loadChatHistories();
    
    // Poll for chat history updates every 2 seconds to sync with AISearchBar
    const interval = setInterval(() => {
      loadChatHistories();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [loadChatHistories]);

  // Save all chats on exit (page unload, navigation, etc.)
  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted) return;

    const saveAllChatsOnExit = async () => {
      // Clear any pending debounced saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      // Save all chats immediately (only once)
      if (hasSavedOnExitRef.current) return;
      hasSavedOnExitRef.current = true;

      // Save all chats with messages (updates will sync latest state)
      const chatsToSave = chatHistories.filter(chat => chat.messages.length > 0);
      if (chatsToSave.length === 0) return;

      // Save each unsaved chat (check if exists, then create or update)
      const savePromises = chatsToSave.map(async (chat) => {
        try {
          // Check if chat exists
          const checkResponse = await fetch(`/api/chat/histories/${chat.id}`, {
            keepalive: true,
          });
          
          if (checkResponse.status === 404) {
            // Chat doesn't exist, create it
            const createResponse = await fetch('/api/chat/histories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(chat),
              keepalive: true,
            });
            if (createResponse.ok) {
              savedChatIdsRef.current.add(chat.id);
            }
          } else if (checkResponse.ok) {
            // Chat exists, update it
            const updateResponse = await fetch(`/api/chat/histories/${chat.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: chat.title,
                messages: chat.messages,
              }),
              keepalive: true,
            });
            if (updateResponse.ok) {
              savedChatIdsRef.current.add(chat.id);
            }
          }
        } catch (error) {
          // Silently fail on exit - we tried our best
        }
      });

      await Promise.all(savePromises);
    };

    // Save on page unload (closing tab/window, navigating away)
    const handleBeforeUnload = () => {
      saveAllChatsOnExit();
    };

    // Save when page becomes hidden (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveAllChatsOnExit();
      }
    };

    // Save on pagehide (more reliable than beforeunload)
    const handlePageHide = () => {
      saveAllChatsOnExit();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Save on component unmount (navigation within app)
      saveAllChatsOnExit();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [chatHistories, isMounted]);

  const createNewChat = async () => {
    // Generate a unique ID using timestamp + random string
    const uniqueId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newChat: ChatHistory = {
      id: uniqueId,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    try {
      const response = await fetch('/api/chat/histories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChat),
      });

      if (response.ok) {
        const data = await response.json();
        const createdChat = data.chat;
        // Mark as saved since it was successfully created in MongoDB
        savedChatIdsRef.current.add(createdChat.id);
        const updated = [createdChat, ...chatHistories];
        setChatHistories(updated);
        setSelectedChatId(createdChat.id);
        console.log('New chat created in MongoDB:', createdChat.id);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create chat:', response.status, errorData);
        // Still add to local state even if MongoDB save fails (don't mark as saved)
        const updated = [newChat, ...chatHistories];
        setChatHistories(updated);
        setSelectedChatId(newChat.id);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      // Still add to local state even if MongoDB save fails (don't mark as saved)
      const updated = [newChat, ...chatHistories];
      setChatHistories(updated);
      setSelectedChatId(newChat.id);
    }
  };

  const deleteChat = async (chatId: string) => {
    // Delete immediately without confirmation
    try {
      const response = await fetch(`/api/chat/histories/${chatId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from saved tracking
        savedChatIdsRef.current.delete(chatId);
        const updated = chatHistories.filter(chat => chat.id !== chatId);
        setChatHistories(updated);
        
        if (selectedChatId === chatId) {
          if (updated.length > 0) {
            setSelectedChatId(updated[0].id);
          } else {
            setSelectedChatId(null);
          }
        }
      } else {
        console.error('Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Save chat to MongoDB
  const saveChatToMongoDB = useCallback(async (chat: ChatHistory) => {
    try {
      // Check if chat exists in MongoDB
      const checkResponse = await fetch(`/api/chat/histories/${chat.id}`);
      if (checkResponse.status === 404) {
        // Chat doesn't exist, create it (only if not already marked as saved to prevent duplicates)
        if (savedChatIdsRef.current.has(chat.id)) {
          return true; // Already saved, skip creation
        }
        const createResponse = await fetch('/api/chat/histories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chat),
        });
        if (createResponse.ok) {
          savedChatIdsRef.current.add(chat.id);
          return true;
        }
        return false;
      } else if (checkResponse.ok) {
        // Chat exists, update it (always update to sync latest messages)
        const updateResponse = await fetch(`/api/chat/histories/${chat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: chat.title,
            messages: chat.messages,
          }),
        });
        if (updateResponse.ok) {
          savedChatIdsRef.current.add(chat.id);
          return true;
        }
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error saving chat to MongoDB:', error);
      return false;
    }
  }, []);

  const updateChatMessages = useCallback(async (chatId: string, messages: ChatMessage[]) => {
    // Find the chat to get current title
    let chatToSave: ChatHistory | null = null;
    
    setChatHistories(prevHistories => {
      const currentChat = prevHistories.find(chat => chat.id === chatId);
      if (!currentChat) {
        console.warn('Chat not found for update:', chatId);
        return prevHistories;
      }

      // Generate title from first user message if title is still "New Chat"
      let title = currentChat.title;
      if (title === 'New Chat' && messages.length > 0) {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          title = generateTitle(firstUserMessage.content);
        }
      }

      // Update local state immediately for responsive UI
      const updated = prevHistories.map(chat => {
        if (chat.id === chatId) {
          const updatedChat = {
            ...chat,
            title,
            messages,
            updatedAt: Date.now(),
          };
          chatToSave = updatedChat;
          return updatedChat;
        }
        return chat;
      });

      return updated;
    });

    // Save to MongoDB with debouncing (wait 1 second after last change)
    if (chatToSave) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout to save after 1 second of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        saveChatToMongoDB(chatToSave!);
      }, 1000);
    }
  }, [saveChatToMongoDB]);

  const selectedChat = chatHistories.find(chat => chat.id === selectedChatId);

  if (!isMounted || loading) {
    return <div className="space-y-6">Loading...</div>;
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)] min-h-0">
      {/* Chat Histories Sidebar */}
      <Card className="w-80 flex-shrink-0 flex flex-col h-full min-h-0">
        <CardHeader className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat Histories
            </CardTitle>
            <Button
              onClick={createNewChat}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>
          <CardDescription>
            {chatHistories.length} {chatHistories.length === 1 ? 'chat' : 'chats'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden p-0 relative">
          <ScrollArea className="absolute inset-0">
            <div className="p-4 space-y-2" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              {chatHistories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No chat histories yet</p>
                  <p className="text-xs mt-2">Create a new chat to get started</p>
                </div>
              ) : (
                chatHistories
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((chat) => (
                    <div
                      key={chat.id}
                      className={`group relative rounded-lg border cursor-pointer transition-all ${
                        selectedChatId === chat.id
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      style={{ 
                        padding: '12px',
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                      onClick={() => setSelectedChatId(chat.id)}
                    >
                      <div className="flex items-start justify-between gap-2" style={{ minWidth: 0, width: '100%' }}>
                        <div className="flex-1 min-w-0" style={{ minWidth: 0, overflow: 'hidden', maxWidth: 'calc(100% - 32px)' }}>
                          <p className="font-medium text-sm truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {chat.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {chat.messages.length} {chat.messages.length === 1 ? 'message' : 'messages'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {new Date(chat.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 flex-shrink-0"
                          style={{ flexShrink: 0, minWidth: '24px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat View */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>
            {selectedChat ? selectedChat.title : 'Select a chat'}
          </CardTitle>
          <CardDescription>
            {selectedChat
              ? `${selectedChat.messages.length} ${selectedChat.messages.length === 1 ? 'message' : 'messages'}`
              : 'Choose a chat from the sidebar to view messages'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {selectedChat ? (
            <ChatView
              chat={selectedChat}
              onMessagesChange={(messages) => updateChatMessages(selectedChat.id, messages)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-8">
              <div>
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No chat selected</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create a new chat or select one from the sidebar
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ChatViewProps {
  chat: ChatHistory;
  onMessagesChange: (messages: ChatMessage[]) => void;
}

function ChatView({ chat, onMessagesChange }: ChatViewProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(chat.messages);
  const prevChatIdRef = useRef<string>(chat.id);
  const onMessagesChangeRef = useRef(onMessagesChange);
  const prevMessagesRef = useRef<ChatMessage[]>(chat.messages);

  // Keep callback ref up to date
  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  // Sync messages when chat changes
  useEffect(() => {
    if (prevChatIdRef.current !== chat.id) {
      setMessages(chat.messages);
      prevChatIdRef.current = chat.id;
      prevMessagesRef.current = chat.messages;
    }
  }, [chat.id, chat.messages]);

  // Notify parent when messages change (but avoid infinite loop)
  useEffect(() => {
    // Only update if messages actually changed and we're on the same chat
    if (prevChatIdRef.current === chat.id) {
      const messagesChanged = JSON.stringify(messages) !== JSON.stringify(prevMessagesRef.current);
      if (messagesChanged) {
        prevMessagesRef.current = messages;
        // Call the update function to save to MongoDB
        onMessagesChangeRef.current(messages);
      }
    }
  }, [messages, chat.id]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);
    const currentQuery = query;
    setQuery('');

    try {
      const locusApiKey = localStorage.getItem('locus_buyer_api_key');

      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          locusApiKey: locusApiKey || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const result = data.result || data.message || 'No results found';

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: result,
        timestamp: Date.now(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Error: Failed to process search. Please try again.',
        timestamp: Date.now(),
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
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
                    className={`max-w-[75%] rounded-2xl p-4 ${
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
                            .replace(/\n\n+/g, '<br /><br />')
                            .replace(/\n/g, '<br />')
                            .replace(
                              /\[([^\]]+)\]\(([^)]+)\)/g,
                              '<a href="$2" class="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>'
                            )
                            .replace(/##\s+/g, '<strong class="text-base">')
                            .replace(/###\s+/g, '<strong class="text-sm">')
                            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*([^*]+)\*/g, '<em>$1</em>'),
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
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-card/90">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about investment opportunities, projects, or get recommendations..."
            className="flex-1"
            disabled={loading}
          />
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            size="lg"
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

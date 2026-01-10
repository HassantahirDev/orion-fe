'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { connectWebSocket, disconnectWebSocket, getSocket } from '@/lib/websocket';
import { sessionsApi, agentApi } from '@/lib/api';
import { ArrowLeft, Mic, Send, MessageSquare } from 'lucide-react';
import VoiceAgent from '@/components/VoiceAgent';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-open voice agent on new session
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('autoVoice') === 'true') {
      setShowVoiceAgent(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load previous conversation history
  useEffect(() => {
    // Wait for store to hydrate
    if (!hydrated) return;
    
    if (!user || !token) {
      router.push('/login');
      return;
    }

    // Load message history from backend
    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/sessions/${sessionId}/memory`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const memories = await response.json();
          // Parse memories into messages
          const historyMessages: Message[] = [];
          
          memories.forEach((memory: any) => {
            const content = memory.content;
            const metadata = memory.metadata || {};

            // Check if this has role metadata (voice messages)
            if (metadata.role) {
              historyMessages.push({
                id: memory.id,
                role: metadata.role,
                content: content,
                timestamp: new Date(memory.createdAt),
              });
            }
            // Parse "User: xxx\nAssistant: yyy" format (chat messages)
            else if (content.includes('User:') && content.includes('Assistant:')) {
              const userMatch = content.match(/User:\s*(.+?)(?:\nAssistant:|$)/s);
              const assistantMatch = content.match(/Assistant:\s*(.+)$/s);

              if (userMatch) {
                historyMessages.push({
                  id: `${memory.id}-user`,
                  role: 'user',
                  content: userMatch[1].trim(),
                  timestamp: new Date(memory.createdAt),
                });
              }
              if (assistantMatch) {
                historyMessages.push({
                  id: `${memory.id}-assistant`,
                  role: 'assistant',
                  content: assistantMatch[1].trim(),
                  timestamp: new Date(memory.createdAt),
                });
              }
            }
            // Parse "User request: xxx" format (agent planning)
            else if (content.startsWith('User request:')) {
              const userContent = content.replace('User request:', '').trim();
              if (userContent && userContent !== '...') {
                historyMessages.push({
                  id: memory.id,
                  role: 'user',
                  content: userContent,
                  timestamp: new Date(memory.createdAt),
                });
              }
            }
            // Single message (FACT type)
            else if (memory.type === 'FACT' && content && content !== '...') {
              historyMessages.push({
                id: memory.id,
                role: 'assistant',
                content: content,
                timestamp: new Date(memory.createdAt),
              });
            }
          });

          // Sort by timestamp to ensure correct order (oldest first)
          historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          setMessages(historyMessages);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    };

    loadHistory();

    const socket = connectWebSocket(sessionId, token);

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connected', (data) => {
      console.log('Connected to session:', data);
    });

    socket.on('text_chunk', (data: { text: string }) => {
      setIsStreaming(true);
      setStreamingMessage((prev) => prev + data.text);
      setLoading(false);
    });

    socket.on('text_complete', (data: { fullText: string }) => {
      // Always add the complete message (including errors with ⚠️)
      addMessage('assistant', data.fullText);
      setStreamingMessage('');
      setIsStreaming(false);
      setLoading(false);
    });

    socket.on('text_output', (data: { text: string }) => {
      // Only add if not streaming (fallback for non-streaming responses)
      if (!isStreaming) {
        addMessage('assistant', data.text);
      }
      setLoading(false);
    });

    socket.on('agent_response', (data: any) => {
      console.log('Agent response:', data);
      // Don't add message here - already handled by text_complete or text_output
      setLoading(false);
    });

    socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      
      // Only display error if it's not already shown via text_complete
      // (text_complete with ⚠️ takes precedence)
      if (!error.message?.includes('guardrails')) {
        const errorMessage = error.message || 'An error occurred';
        addMessage('assistant', `⚠️ ${errorMessage}`);
      }
      
      setLoading(false);
    });

    socket.on('session_name_updated', (data: { sessionId: string; name: string }) => {
      console.log('Session name updated:', data);
      // The name will be visible when user returns to dashboard
    });

    return () => {
      disconnectWebSocket();
    };
  }, [sessionId, user, token, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading || isStreaming) return;

    const userMessage = input;
    setInput('');
    addMessage('user', userMessage);
    setLoading(true);
    setStreamingMessage('');

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('text_input', { text: userMessage });
    } else {
      // Fallback to REST API
      try {
        const response = await agentApi.plan(sessionId, {
          input: userMessage,
        });
        const results = await agentApi.execute(sessionId, response.data);
        const responseText = results.data
          .map((r: any) => r.result?.text || JSON.stringify(r.result))
          .join('\n');
        addMessage('assistant', responseText || 'I processed your request.');
        setLoading(false);
      } catch (error: any) {
        addMessage('assistant', `Error: ${error.response?.data?.message || error.message}`);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-all duration-200 tracking-tight"
            >
              <ArrowLeft className="w-5 h-5" />
              Dashboard
            </button>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-lg">
              <div className="relative">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-white' : 'bg-white/30'
                  }`}
                />
                {isConnected && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-white animate-ping"></div>
                )}
              </div>
              <span className={`text-xs font-medium tracking-tight ${isConnected ? 'text-white' : 'text-white/30'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-white/50" />
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
                Start a conversation
              </h2>
              <p className="text-white/50 tracking-tight">
                Type a message or use voice input to interact with ORION
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl ${
                    message.role === 'user'
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-white border border-white/10'
                  } rounded-2xl px-5 py-3`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap tracking-tight">{message.content}</p>
                  <p
                    className={`text-xs mt-2 tracking-tight ${
                      message.role === 'user'
                        ? 'opacity-50'
                        : 'opacity-30'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isStreaming && streamingMessage && (
              <div className="flex justify-start">
                <div className="max-w-2xl rounded-2xl p-4 bg-white/5 text-white border border-white/10">
                  <p className="text-sm leading-relaxed tracking-tight">
                    {streamingMessage}
                    <span className="inline-block w-1 h-4 bg-white ml-1 animate-pulse"></span>
                  </p>
                </div>
              </div>
            )}
            {loading && !isStreaming && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-sm text-white/50 tracking-tight">Thinking...</p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Voice Agent Modal */}
      <VoiceAgent
        isOpen={showVoiceAgent}
        onClose={() => setShowVoiceAgent(false)}
        sessionId={sessionId}
        userId={user?.id || ''}
        onMessage={(role, content) => {
          // Add voice messages to the chat UI
          addMessage(role, content);
        }}
      />

      {/* Input */}
      <div className="border-t border-white/10 p-6">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => setShowVoiceAgent(true)}
            className="p-4 rounded-xl transition-all duration-200 bg-white/5 hover:bg-white/10 border border-white/10"
            title="Start Voice Chat"
          >
            <Mic className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200 tracking-tight"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-4 bg-white hover:bg-gray-100 text-black rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 tracking-tight"
          >
            <Send className="w-5 h-5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

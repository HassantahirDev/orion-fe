'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { X, Loader2, MessageSquare, ChevronDown } from 'lucide-react';
import { connectWebSocket, getSocket } from '@/lib/websocket';

interface VoiceAgentProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  userId: string;
  onMessage?: (role: 'user' | 'assistant', content: string) => void;
}

export default function VoiceAgent({
  isOpen,
  onClose,
  sessionId,
  userId,
  onMessage,
}: VoiceAgentProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [agentMode, setAgentMode] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [showCallUI, setShowCallUI] = useState(true);

  const micStreamRef = useRef<MediaStream | null>(null);
  const pendingMessagesRef = useRef<Array<{ role: string; content: string }>>([]);

  // ElevenLabs React SDK hook
  const conversation = useConversation({
    onConnect: () => {
      setIsConnected(true);
      setIsConnecting(false);
      setAgentMode('listening');
      console.log('✅ Voice session started');
    },
    onDisconnect: () => {
      setIsConnected(false);
      setAgentMode('idle');
      console.log('Voice session ended');
    },
    onError: (e) => {
      setConnectionError(e?.message || 'Unknown error');
      console.error('Connection error:', e);
    },
    onMessage: (m) => {
      handleMessage(m);
    },
    onModeChange: ({ mode }) => {
      if (mode === 'speaking') {
        setAgentMode('speaking');
      } else if (mode === 'listening') {
        setAgentMode('listening');
      }
    },
  });

  // Check if message needs tool execution
  const needsToolExecution = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    const toolKeywords = [
      'search', 'find', 'look up', 'get', 'fetch', 'retrieve',
      'create', 'generate', 'make', 'build', 'add', 'save',
      'update', 'modify', 'change', 'edit', 'delete', 'remove',
      'calculate', 'compute', 'execute', 'run', 'perform',
      'send', 'email', 'message', 'notify', 'alert',
      'book', 'schedule', 'remind', 'set', 'configure'
    ];
    return toolKeywords.some(keyword => lowerText.includes(keyword));
  };

  // Handle incoming messages from Eleven Labs
  const handleMessage = async (message: any) => {
    try {
      // Extract role
      let role: 'user' | 'assistant';
      if (message?.role === 'user' || message?.source === 'user') {
        role = 'user';
      } else {
        role = 'assistant';
      }

      // Extract text content
      let text = (message?.text || message?.message || message?.transcript || '').trim();
      if (!text) return;

      const originalText = text;

      // If user message needs tools, route through backend WebSocket
      if (role === 'user' && sessionId && needsToolExecution(text)) {
        console.log('🔧 Routing user message through backend for tool execution:', text);
        
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            console.error('No token available for tool execution');
            return;
          }

          // Connect WebSocket if not connected
          const socket = getSocket();
          if (!socket || !socket.connected) {
            connectWebSocket(sessionId, token);
            // Wait a bit for connection
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Send to backend for tool execution
          const responseSocket = getSocket();
          if (responseSocket && responseSocket.connected) {
            // DON'T store user message here - backend will handle it
            
            // Create promise to wait for response
            const responsePromise = new Promise<string>((resolve) => {
              const timeout = setTimeout(() => {
                resolve('Tool execution timed out');
              }, 30000); // 30 second timeout

              const onTextComplete = (data: { fullText: string }) => {
                clearTimeout(timeout);
                responseSocket.off('text_complete', onTextComplete);
                resolve(data.fullText);
              };

              responseSocket.on('text_complete', onTextComplete);
            });

            // Emit text input to backend
            responseSocket.emit('text_input', { text });

            // Wait for response
            const toolResponse = await responsePromise;
            
            console.log('✅ Tool execution response:', toolResponse);

            // DON'T store assistant response here either - backend already stored it via memory service

            // Update UI with ONLY assistant response (user message already shown by ElevenLabs)
            setMessages((prev) => [...prev, 
              { role: 'assistant', text: toolResponse }
            ]);

            // Pass ONLY assistant response to parent (user message already passed by ElevenLabs)
            if (onMessage) {
              onMessage('assistant', toolResponse);
            }

            // Don't continue processing - tool execution is complete
            return;
          }
        } catch (toolError) {
          console.error('❌ Tool execution error:', toolError);
          // Fall through to normal processing
        }
      }

      // Strip internal tags from assistant messages for display
      let displayText = text;
      if (role === 'assistant') {
        displayText = text
          .replace(/\[LOCKED_QA\][\s\S]*?\[\/LOCKED_QA\]/gi, '')
          .replace(/\[EXTRACTION_DATA\][\s\S]*?\[\/EXTRACTION_DATA\]/gi, '')
          .replace(/\[CHAT_STATUS:COMPLETE\]/gi, '')
          .replace(/\[CHAT_STATUS:FINAL\]/gi, '')
          .trim();
      }

      // Update UI
      setMessages((prev) => [...prev, { role, text: displayText }]);

      // Pass message to parent component (session page)
      if (onMessage) {
        onMessage(role, displayText);
      }

      // Store in backend
      if (sessionId) {
        await storeMessage(role, originalText);
      } else {
        // Queue for later
        pendingMessagesRef.current.push({ role, content: originalText });
      }
    } catch (err) {
      console.error('❌ Error processing message:', err);
    }
  };

  // Store message in backend
  const storeMessage = async (role: 'user' | 'assistant', content: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/voice/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          role,
          content,
        }),
      });

      if (!response.ok) {
        console.error('Failed to store message:', response.status);
      }
    } catch (error) {
      console.error('Error storing message:', error);
    }
  };

  // Start conversation
  const startConversation = async () => {
    if (isConnecting || conversation.status === 'connected') {
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);

      const token = localStorage.getItem('token');
      const userName = localStorage.getItem('user_name') || '';
      const firstName = userName.split(' ')[0] || 'there';

      // Request microphone permission
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      // Get agent config from backend
      const configResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/voice/config?type=default`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!configResponse.ok) {
        throw new Error('Failed to fetch agent config');
      }

      const config = await configResponse.json();

      // Fetch enhanced system prompt from backend
      const promptResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/voice/prompt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId,
            userName: firstName,
          }),
        },
      );

      if (!promptResponse.ok) {
        throw new Error('Failed to fetch system prompt');
      }

      const promptData = await promptResponse.json();

      // Start ElevenLabs session with enhanced prompt
      await conversation.startSession({
        agentId: config.agent_id,
        overrides: {
          agent: {
            prompt: {
              prompt: promptData.system_prompt,
            },
            firstMessage: promptData.first_message,
            language: 'en',
          },
          tts: {
            model: config.model,
          },
        },
      });

      console.log('✅ Voice session started with enhanced context');
    } catch (error: any) {
      console.error('❌ Error initializing Voice Agent:', error);
      setConnectionError(error.message);
      setIsConnecting(false);
    }
  };

  // Stop conversation
  const stopConversation = () => {
    try {
      conversation.endSession();
    } catch (error) {
      console.error('Error ending session:', error);
    }
    terminateSession();
  };

  // Terminate session and cleanup
  const terminateSession = () => {
    // Stop microphone tracks
    if (micStreamRef.current) {
      const tracks = micStreamRef.current.getTracks();
      tracks.forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // End conversation
    if (conversation.status === 'connected' || isConnected) {
      conversation.endSession();
    }

    setIsConnected(false);
    setIsConnecting(false);
    setAgentMode('idle');
    setConnectionError(null);
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      terminateSession();
    }
  }, [isOpen]);

  // Save pending messages when sessionId becomes available
  useEffect(() => {
    if (sessionId && pendingMessagesRef.current.length > 0) {
      pendingMessagesRef.current.forEach((msg) => {
        storeMessage(msg.role as 'user' | 'assistant', msg.content);
      });
      pendingMessagesRef.current = [];
    }
  }, [sessionId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Voice Call UI Overlay */}
      {showCallUI && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={() => {
              if (isConnected) {
                stopConversation();
              }
              onClose();
            }}
            className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-200 hover:scale-110"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Main Content */}
          <div className="h-full flex flex-col items-center justify-center">
            {/* Animated Gradient Circle */}
            <div className="relative flex items-center justify-center">
              {/* Outer rotating gradient */}
              <div
                className={`w-96 h-96 rounded-full ${
                  isConnected ? 'animate-spin-slow' : ''
                } transition-all duration-1000`}
                style={{
                  background: isConnected
                    ? 'conic-gradient(from 0deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))'
                    : 'conic-gradient(from 0deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))',
                }}
              />

              {/* Inner dark circle with content */}
              <div className="absolute inset-8 rounded-full bg-black border border-white/10 flex flex-col items-center justify-center gap-8">
                {/* Status indicator */}
                {isConnected && (
                  <div className="flex flex-col items-center gap-3">
                    {agentMode === 'listening' && (
                      <div className="flex gap-1.5">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1.5 bg-white rounded-full animate-sound-wave"
                            style={{
                              height: '28px',
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {agentMode === 'speaking' && (
                      <div className="flex gap-1.5">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1.5 bg-white rounded-full animate-sound-wave"
                            style={{
                              height: '36px',
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-sm font-medium text-white/70 tracking-tight">
                      {agentMode === 'listening' && 'Listening...'}
                      {agentMode === 'speaking' && 'Speaking...'}
                    </p>
                  </div>
                )}

                {/* Center Button */}
                <div className="text-center">
                  {!isConnected ? (
                    <button
                      onClick={startConversation}
                      disabled={isConnecting}
                      className="group px-12 py-5 bg-white hover:bg-gray-100 rounded-full transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin text-black" />
                            <span className="text-lg font-medium text-black tracking-tight">
                              Connecting...
                            </span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-6 h-6 text-black"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                              />
                            </svg>
                            <span className="text-lg font-medium text-black tracking-tight">
                              Connect
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={stopConversation}
                      className="px-12 py-5 bg-white hover:bg-gray-100 rounded-full transition-all duration-300 hover:scale-105"
                    >
                      <div className="flex items-center gap-3">
                        <X className="w-6 h-6 text-black" />
                        <span className="text-lg font-medium text-black tracking-tight">
                          Disconnect
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {connectionError && (
              <div className="mt-8 max-w-md p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {connectionError}
              </div>
            )}

            {/* Branding */}
            <div className="mt-16 text-center">
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                ORION
              </h1>
              <p className="text-white/50 text-sm tracking-tight">Voice Assistant</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @keyframes sound-wave {
          0%,
          100% {
            transform: scaleY(0.5);
          }
          50% {
            transform: scaleY(1.5);
          }
        }
        .animate-sound-wave {
          animation: sound-wave 0.8s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}


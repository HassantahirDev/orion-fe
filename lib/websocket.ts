import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectWebSocket = (
  sessionId: string,
  token: string,
): Socket => {
  if (socket?.connected) {
    return socket;
  }

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

  socket = io(`${WS_URL}/voice`, {
    auth: {
      token,
    },
    query: {
      sessionId,
    },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};


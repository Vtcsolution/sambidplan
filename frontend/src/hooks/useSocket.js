// frontend/src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
  .replace(/\/api$/, '');

// Module-level sockets so components share the same connection
const sockets = {};

export const getSocket = (tokenKey = 'authToken') => {
  const token = localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey);
  if (!token) return null;

  if (!sockets[tokenKey] || !sockets[tokenKey].connected) {
    sockets[tokenKey]?.disconnect();
    sockets[tokenKey] = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],  // polling first avoids WS close-before-open error
      reconnectionAttempts: 3,
      reconnectionDelay: 3000,
      timeout: 10000,
    });
  }
  return sockets[tokenKey];
};

export const disconnectSocket = (tokenKey = 'authToken') => {
  sockets[tokenKey]?.disconnect();
  delete sockets[tokenKey];
};

/**
 * Hook — connects on mount, cleans up on unmount.
 * @param {string}   tokenKey  'authToken' for users, 'adminToken' for admins
 * @param {Object}   handlers  { 'event:name': callback, ... }
 */
export const useSocket = (tokenKey = 'authToken', handlers = {}) => {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket(tokenKey);
    if (!socket) return;
    socketRef.current = socket;

    // Register event listeners
    Object.entries(handlers).forEach(([event, cb]) => socket.on(event, cb));

    return () => {
      // Clean up listeners (don't disconnect — socket is shared)
      Object.entries(handlers).forEach(([event, cb]) => socket.off(event, cb));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenKey]);

  return socketRef;
};

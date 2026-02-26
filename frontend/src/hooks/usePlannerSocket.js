import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { useAuth } from '../contexts/AuthContext';

function getSocketBaseUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
}

export function usePlannerSocket(enabled = true) {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const reconnectTriedRef = useRef(false);
  const socketUrl = useMemo(() => getSocketBaseUrl(), []);

  useEffect(() => {
    if (!enabled || !currentUser) return undefined;

    let isCancelled = false;
    let localSocket = null;

    const setup = async () => {
      try {
        const token = await currentUser.getIdToken(false);
        if (isCancelled) return;

        localSocket = io(`${socketUrl}/planner`, {
          path: '/socket.io',
          transports: ['polling', 'websocket'],
          upgrade: true,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          auth: { token },
        });

        socketRef.current = localSocket;
        setSocket(localSocket);
        localSocket.on('connect', () => {
          setConnected(true);
          setError('');
          reconnectTriedRef.current = false;
        });

        localSocket.on('disconnect', () => {
          setConnected(false);
        });

        localSocket.on('connect_error', async (err) => {
          setConnected(false);
          const message = err?.message || 'Planner socket connection failed.';
          setError(message);
          if (!reconnectTriedRef.current) {
            reconnectTriedRef.current = true;
            try {
              const freshToken = await currentUser.getIdToken(true);
              localSocket.auth = { token: freshToken };
              localSocket.connect();
            } catch {
              setError('Unable to refresh auth token for planner realtime socket.');
            }
          }
        });
      } catch {
        setError('Unable to start planner realtime socket.');
      }
    };

    setup();
    return () => {
      isCancelled = true;
      if (localSocket) {
        localSocket.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [currentUser, enabled, socketUrl]);

  const subscribeSession = useCallback((sessionId) => {
    if (!socketRef.current || !sessionId) return;
    socketRef.current.emit('planner:subscribe', { session_id: sessionId });
  }, []);

  const unsubscribeSession = useCallback((sessionId) => {
    if (!socketRef.current || !sessionId) return;
    socketRef.current.emit('planner:unsubscribe', { session_id: sessionId });
  }, []);

  return {
    socket,
    connected,
    error,
    subscribeSession,
    unsubscribeSession,
  };
}

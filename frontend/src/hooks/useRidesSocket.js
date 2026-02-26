import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

import { useAuth } from '../contexts/AuthContext';

function getSocketBaseUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
}

export function useRidesSocket(enabled = true) {
  const { currentUser } = useAuth();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const reconnectTriedRef = useRef(false);

  const socketUrl = useMemo(() => getSocketBaseUrl(), []);

  useEffect(() => {
    if (!enabled || !currentUser) return undefined;

    let isCancelled = false;
    let localSocket = null;

    const setup = async (forceRefresh = false) => {
      try {
        const token = await currentUser.getIdToken(forceRefresh);
        if (isCancelled) return;

        localSocket = io(`${socketUrl}/rides`, {
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
          const message = err?.message || 'Socket connection failed.';
          setError(message);

          if (!reconnectTriedRef.current) {
            reconnectTriedRef.current = true;
            try {
              const freshToken = await currentUser.getIdToken(true);
              localSocket.auth = { token: freshToken };
              localSocket.connect();
            } catch {
              setError('Unable to refresh auth token for realtime rides.');
            }
          }
        });
      } catch {
        setError('Unable to start realtime rides socket.');
      }
    };

    setup(false);

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

  const emitEvent = useCallback((event, payload = {}) => {
    if (socketRef.current) {
      socketRef.current.emit(event, payload);
    }
  }, []);

  return {
    socket,
    connected,
    error,
    emitEvent,
  };
}

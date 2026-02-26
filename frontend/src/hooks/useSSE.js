import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useSSE(channelUrl) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    let eventSource;

    const connectSSE = async () => {
      try {
        const token = await currentUser.getIdToken();
        // Since EventSource doesn't support custom headers (like Authorization),
        // we append the token as a query parameter for SSE auth.
        // NOTE: Make sure the backend auth decorator checks request.args.get('token') for SSE routes!
        const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}${channelUrl}?token=${token}`;
        
        eventSource = new EventSource(url);

        eventSource.onopen = () => setConnected(true);

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            setEvents(prev => [data, ...prev].slice(0, 50)); // Keep last 50 events
          } catch (err) {
            console.error("Failed to parse SSE data", err);
          }
        };

        eventSource.onerror = (err) => {
          console.error("SSE Connection Error", err);
          setConnected(false);
          eventSource.close();
        };

      } catch (err) {
        console.error("Failed to setup SSE", err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentUser, channelUrl]);

  return { events, connected };
}

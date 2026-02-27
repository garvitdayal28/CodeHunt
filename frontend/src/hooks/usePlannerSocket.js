import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

import { useAuth } from "../contexts/AuthContext";

function getSocketBaseUrl() {
  const apiBase =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  return apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
}

export function usePlannerSocket(enabled = true) {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
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
          path: "/socket.io",
          transports: ["polling", "websocket"],
          upgrade: true,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          auth: { token },
        });

        socketRef.current = localSocket;
        setSocket(localSocket);
        localSocket.on("connect", () => {
          console.debug("[PlannerSocket] connected sid=%s", localSocket.id);
          setConnected(true);
          setError("");
          reconnectTriedRef.current = false;
        });

        localSocket.on("disconnect", (reason) => {
          console.debug("[PlannerSocket] disconnected reason=%s", reason);
          setConnected(false);
        });

        localSocket.on("connect_error", async (err) => {
          console.warn("[PlannerSocket] connect_error:", err?.message);
          setConnected(false);
          const message = err?.message || "Planner socket connection failed.";
          setError(message);
          if (!reconnectTriedRef.current) {
            reconnectTriedRef.current = true;
            try {
              const freshToken = await currentUser.getIdToken(true);
              localSocket.auth = { token: freshToken };
              localSocket.connect();
            } catch {
              setError(
                "Unable to refresh auth token for planner realtime socket.",
              );
            }
          }
        });
      } catch {
        setError("Unable to start planner realtime socket.");
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
    console.debug("[PlannerSocket] subscribing to session=%s", sessionId);
    socketRef.current.emit("planner:subscribe", { session_id: sessionId });
    // Log all incoming planner events for this session for debugging
    const debugEvents = [
      "planner:subscribed",
      "planner:progress",
      "planner:token",
      "planner:complete",
      "planner:error",
      "planner:cancelled",
    ];
    debugEvents.forEach((ev) => {
      socketRef.current.on(ev, (payload) => {
        if (ev === "planner:token") {
          console.debug(
            "[PlannerSocket] %s chunk_len=%d",
            ev,
            payload?.chunk?.length ?? 0,
          );
        } else {
          console.debug("[PlannerSocket] %s", ev, payload);
        }
      });
    });
  }, []);

  const unsubscribeSession = useCallback((sessionId) => {
    if (!socketRef.current || !sessionId) return;
    socketRef.current.emit("planner:unsubscribe", { session_id: sessionId });
  }, []);

  return {
    socket,
    connected,
    error,
    subscribeSession,
    unsubscribeSession,
  };
}

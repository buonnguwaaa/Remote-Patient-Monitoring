import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { useAuth } from "./AuthContext";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import {
  createRealtimeSocket,
  type RealtimeEvent,
} from "../services/realtimeService";

// ─── Context type ────────────────────────────────────────────────────────────

interface RealtimeNotificationContextType {
  unreadTotal: number;
  unreadByConversation: Record<string, number>;
  lastChatEvent: RealtimeEvent | null;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  markConversationRead: (conversationId: string) => void;
  requestBrowserNotificationPermission: () => Promise<NotificationPermission | null>;
}

const RealtimeNotificationContext = createContext<
  RealtimeNotificationContextType | undefined
>(undefined);

// ─── Constants ───────────────────────────────────────────────────────────────

const NOTIFICATION_LOCK_TTL_MS = 45_000;
const RECONNECT_DELAYS = [1000, 2000, 5000, 10_000, 15_000, 30_000];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseRealtimeMessages(rawData: string): RealtimeEvent[] {
  return rawData
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as RealtimeEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is RealtimeEvent => e !== null && !!e.type && !!e.eventId);
}

/** Cross-tab dedup via localStorage */
function tryAcquireNotificationLock(eventId: string): boolean {
  const key = `rpm:notified:${eventId}`;
  const existing = localStorage.getItem(key);
  if (existing) {
    const ts = Number(existing);
    if (Date.now() - ts < NOTIFICATION_LOCK_TTL_MS) {
      return false;
    }
  }
  localStorage.setItem(key, String(Date.now()));
  return true;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export const RealtimeNotificationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { isAuthenticated, user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [unreadByConversation, setUnreadByConversation] = useState<
    Record<string, number>
  >({});
  const [lastChatEvent, setLastChatEvent] = useState<RealtimeEvent | null>(
    null,
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const seenEventIdsRef = useRef(new Set<string>());

  // Stable refs for current values
  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const unreadTotal = Object.values(unreadByConversation).reduce(
    (sum, count) => sum + count,
    0,
  );

  // ─── markConversationRead ──────────────────────────────────────────

  const markConversationRead = useCallback((conversationId: string) => {
    setUnreadByConversation((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  // ─── requestBrowserNotificationPermission ──────────────────────────

  const requestBrowserNotificationPermission =
    useCallback(async (): Promise<NotificationPermission | null> => {
      if (typeof Notification === "undefined") return null;
      try {
        return await Notification.requestPermission();
      } catch {
        return null;
      }
    }, []);

  // ─── Handle incoming event ─────────────────────────────────────────

  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      const currentUserId = userIdRef.current;
      const currentActiveConvId = activeConversationIdRef.current;

      // Dedupe within this tab
      if (seenEventIdsRef.current.has(event.eventId)) return;
      seenEventIdsRef.current.add(event.eventId);

      // If we're the sender, skip
      if (event.data.senderId && event.data.senderId === currentUserId) return;

      // Always update lastChatEvent for list/preview updates
      setLastChatEvent(event);

      const convId = event.data.conversationId;
      const isViewingConversation =
        convId === currentActiveConvId &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible";

      if (isViewingConversation) {
        // User is viewing this conversation — no toast, no badge, no browser notification
        return;
      }

      // Increment unread
      setUnreadByConversation((prev) => ({
        ...prev,
        [convId]: (prev[convId] || 0) + 1,
      }));

      // Cross-tab dedup for notification display
      if (!tryAcquireNotificationLock(event.eventId)) return;

      // In-app toast
      const toastMessage =
        event.type === "chat.alert_message"
          ? "Có cảnh báo sức khỏe mới cần kiểm tra."
          : "Bạn có tin nhắn mới cần kiểm tra.";

      showToast(toastMessage, {
        type: "info",
        title: event.type === "chat.alert_message" ? "Cảnh báo" : "Tin nhắn mới",
        duration: 5000,
      });

      // Browser notification (only if granted and tab is hidden)
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        typeof document !== "undefined" &&
        document.hidden
      ) {
        const body =
          event.type === "chat.alert_message"
            ? "Có cảnh báo sức khỏe mới cần kiểm tra."
            : "Bạn có tin nhắn mới cần kiểm tra.";

        try {
          new Notification("RPM - Thông báo", { body, tag: event.eventId });
        } catch {
          // Browser may block Notification constructor in some contexts
        }
      }
    },
    [showToast],
  );

  // ─── WebSocket lifecycle ───────────────────────────────────────────

  useEffect(() => {
    unmountedRef.current = false;

    if (!isAuthenticated || !user?.id || user.role !== "doctor") {
      return;
    }

    const connect = () => {
      if (unmountedRef.current) return;

      const socket = createRealtimeSocket();
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onmessage = (event) => {
        const events = parseRealtimeMessages(String(event.data || ""));
        events.forEach(handleEvent);
      };

      socket.onerror = () => {
        // Will trigger onclose
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (unmountedRef.current) return;

        const attempt = reconnectAttemptRef.current;
        const delay =
          RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
        reconnectAttemptRef.current = attempt + 1;

        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, user?.role, handleEvent]);

  // ─── Cleanup old seen events periodically ──────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      // Keep the set from growing unbounded (clear every 5 minutes)
      if (seenEventIdsRef.current.size > 500) {
        seenEventIdsRef.current.clear();
      }
    }, 300_000);
    return () => clearInterval(interval);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <RealtimeNotificationContext.Provider
      value={{
        unreadTotal,
        unreadByConversation,
        lastChatEvent,
        activeConversationId,
        setActiveConversationId,
        markConversationRead,
        requestBrowserNotificationPermission,
      }}
    >
      {children}
      <Toast toast={toast} onClose={hideToast} />
    </RealtimeNotificationContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useRealtimeNotification = () => {
  const context = useContext(RealtimeNotificationContext);
  if (!context) {
    throw new Error(
      "useRealtimeNotification must be used within RealtimeNotificationProvider",
    );
  }
  return context;
};

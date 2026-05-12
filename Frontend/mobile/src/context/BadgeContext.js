import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { getUnreadNotificationCount } from "../api/notificationsApi";
import { getConversations } from "../api/chatApi";
import { subscribeNotificationEvents } from "../services/notificationEvents";
import { useAuth } from "../hooks/useAuth";

const BadgeContext = createContext({
  unreadNotifCount: 0,
  unreadMessageCount: 0,
  refreshBadges: () => {},
  markMessagesRead: () => {},
  markNotifsRead: () => {},
});

export function BadgeProvider({ children }) {
  const { user } = useAuth();
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const pollingRef = useRef(null);

  const fetchNotifCount = useCallback(async () => {
    if (!user) return;
    try {
      const response = await getUnreadNotificationCount();
      if (response?.ok) {
        const count = Number(
          response.body?.data?.count ?? response.body?.count ?? 0
        );
        setUnreadNotifCount(count);
      }
    } catch {
      // Silent fail for badge polling
    }
  }, [user]);

  const fetchMessageCount = useCallback(async () => {
    if (!user) return;
    try {
      const response = await getConversations(20);
      if (response?.ok) {
        const conversations =
          response.body?.data?.conversations ||
          response.body?.conversations ||
          [];
        const currentUserId = String(user?.id || user?._id || "");
        let unread = 0;

        conversations.forEach((conv) => {
          const latestMsgId = conv.latestMessageId
            ? String(conv.latestMessageId)
            : null;

          // No messages in conversation at all
          if (!latestMsgId) return;

          const participants = Array.isArray(conv.participants)
            ? conv.participants
            : [];
          const me = participants.find(
            (p) =>
              String(p?.userId || p?.id || "") === currentUserId
          );

          const myLastRead = me?.lastReadMessageId
            ? String(me.lastReadMessageId)
            : null;

          // Unread if latestMessageId is different from what I last read
          if (latestMsgId !== myLastRead) {
            unread += 1;
          }
        });

        setUnreadMessageCount(unread);
      }
    } catch {
      // Silent fail
    }
  }, [user]);

  const refreshBadges = useCallback(() => {
    void fetchNotifCount();
    void fetchMessageCount();
  }, [fetchNotifCount, fetchMessageCount]);

  const markMessagesRead = useCallback(() => {
    setUnreadMessageCount(0);
  }, []);

  const markNotifsRead = useCallback(() => {
    setUnreadNotifCount(0);
  }, []);

  // Initial fetch + polling every 30s
  useEffect(() => {
    if (!user) {
      setUnreadNotifCount(0);
      setUnreadMessageCount(0);
      return;
    }

    refreshBadges();

    pollingRef.current = setInterval(() => {
      refreshBadges();
    }, 30000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [user, refreshBadges]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshBadges();
      }
    });
    return () => subscription.remove();
  }, [refreshBadges]);

  // Refresh on push notification events
  useEffect(() => {
    return subscribeNotificationEvents(() => {
      void fetchNotifCount();
    });
  }, [fetchNotifCount]);

  return (
    <BadgeContext.Provider
      value={{
        unreadNotifCount,
        unreadMessageCount,
        refreshBadges,
        markMessagesRead,
        markNotifsRead,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadge() {
  return useContext(BadgeContext);
}

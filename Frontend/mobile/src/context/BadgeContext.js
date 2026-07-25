import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { getMyNotifications } from "../api/notificationsApi";
import { getMyAlerts } from "../api/alertApi";
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
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [unreadRemindersCount, setUnreadRemindersCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const pollingRef = useRef(null);

  const fetchNotifCount = useCallback(async () => {
    if (!user) return;
    try {
      const [alertsRes, notifsRes] = await Promise.all([
        getMyAlerts(),
        getMyNotifications(),
      ]);

      let openAlertsCount = 0;
      if (alertsRes?.ok) {
        const alertList = alertsRes.body?.data || alertsRes.body || [];
        if (Array.isArray(alertList)) {
          openAlertsCount = alertList.filter((a) => a.status === "open").length;
        }
      }

      let unreadRemindersCount = 0;
      if (notifsRes?.ok) {
        const notifList = notifsRes.body?.data || notifsRes.body || [];
        if (Array.isArray(notifList)) {
          unreadRemindersCount = notifList.filter(
            (n) => n.type !== "alert" && !n.isRead && n.readAt == null
          ).length;
        }
      }

      setUnreadAlertsCount(openAlertsCount);
      setUnreadRemindersCount(unreadRemindersCount);
      setUnreadNotifCount(openAlertsCount + unreadRemindersCount);
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
            : conv.lastMessage?.id
              ? String(conv.lastMessage.id)
              : conv.lastMessage?._id
                ? String(conv.lastMessage._id)
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

          // If the last message was sent by me, do not count as unread
          const lastMessageSenderId = conv.lastMessage?.senderId
            ? String(conv.lastMessage.senderId)
            : null;
          if (lastMessageSenderId && lastMessageSenderId === currentUserId) return;

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

  // Initial fetch + polling every 10s
  useEffect(() => {
    if (!user) {
      setUnreadNotifCount(0);
      setUnreadMessageCount(0);
      return;
    }

    refreshBadges();

    pollingRef.current = setInterval(() => {
      refreshBadges();
    }, 10000);

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
      refreshBadges();
    });
  }, [refreshBadges]);

  return (
    <BadgeContext.Provider
      value={{
        unreadNotifCount,
        unreadAlertsCount,
        unreadRemindersCount,
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

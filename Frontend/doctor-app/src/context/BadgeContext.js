import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getAlerts } from "../api/patientApi";
import { getConversations } from "../api/chatApi";
import { useAuth } from "./AuthContext";

const BadgeContext = createContext(null);

export const useBadges = () => useContext(BadgeContext);

export function BadgeProvider({ children }) {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    if (!currentUserId) return;
    try {
      // 1. Fetch unread alerts
      const alertsRes = await getAlerts({ limit: 100 });
      if (alertsRes.ok) {
        const list = alertsRes.body?.data || [];
        const activeAlerts = list.filter((a) => a.status === "active");
        setUnreadAlertsCount(activeAlerts.length);
      }

      // 2. Fetch conversations
      const convsRes = await getConversations(50);
      if (convsRes.ok) {
        const convList = convsRes.body?.data?.conversations || [];
        let chatUnreadCount = 0;
        convList.forEach((conversation) => {
          const lastMessage = conversation.lastMessage;
          const myParticipant = conversation.participants?.find(
            (p) => p.userId === currentUserId
          );
          const lastReadId = myParticipant?.lastReadMessageId;
          if (lastMessage && lastMessage.senderId !== currentUserId) {
            if (!lastReadId || lastReadId !== lastMessage.id) {
              chatUnreadCount += 1;
            }
          }
        });
        setUnreadChatsCount(chatUnreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch badge counts in provider:", err);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setUnreadAlertsCount(0);
      setUnreadChatsCount(0);
      return;
    }

    // Initial fetch
    fetchCounts();

    // Poll every 6 seconds
    const interval = setInterval(fetchCounts, 6000);
    return () => clearInterval(interval);
  }, [currentUserId, fetchCounts]);

  return (
    <BadgeContext.Provider value={{ unreadAlertsCount, unreadChatsCount, refetchBadges: fetchCounts }}>
      {children}
    </BadgeContext.Provider>
  );
}

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import api from "../services/api";

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

interface RealtimeNotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType | undefined>(undefined);

function getRealtimeWebSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const wsUrl = apiUrl.replace(/^http/, "ws");
  return `${wsUrl}/realtime/ws`;
}

export const RealtimeNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const resp = await api.get("/notifications");
      if (resp.data?.data) {
        const list = resp.data.data as NotificationItem[];
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    const connect = () => {
      if (!isSubscribed) return;
      const url = getRealtimeWebSocketUrl();
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log("Admin Realtime WebSocket connected.");
      };

      ws.onmessage = (event) => {
        try {
          const lines = String(event.data || "").split("\n").map(l => l.trim()).filter(Boolean);
          for (const line of lines) {
            const data = JSON.parse(line);
            if (data?.type === "notification.created" && data?.data?.notification) {
              const notif = data.data.notification as NotificationItem;
              setNotifications((prev) => [notif, ...prev]);
              setUnreadCount((count) => count + 1);

              showToast(`${notif.title}: ${notif.body}`, {
                type: "info",
                title: "Thông báo mới",
                duration: 6000,
              });
            }
          }
        } catch (e) {
          console.error("Error parsing websocket message:", e);
        }
      };

      ws.onclose = () => {
        socketRef.current = null;
        if (isSubscribed) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user?.role, showToast]);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) {
      await markAsRead(id);
    }
  };

  return (
    <RealtimeNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
      <Toast toast={toast} onClose={hideToast} />
    </RealtimeNotificationContext.Provider>
  );
};

export const useRealtimeNotification = () => {
  const context = useContext(RealtimeNotificationContext);
  if (!context) {
    throw new Error("useRealtimeNotification must be used within a RealtimeNotificationProvider");
  }
  return context;
};

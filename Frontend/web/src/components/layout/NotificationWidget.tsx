import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeNotification } from "../../context/RealtimeNotificationContext";
import api from "../../services/api";

interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

const NotificationWidget = () => {
  const { user } = useAuth();
  const { lastNotificationEvent } = useRealtimeNotification();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.data.count || 0);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications?limit=20");
      
      const notifs = res.data?.data?.notifications;
      if (Array.isArray(notifs)) {
        setNotifications(notifs);
      } else if (Array.isArray(res.data?.data)) {
        setNotifications(res.data.data);
      } else {
        setNotifications([]);
      }
      // Also update unread count just in case
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (user?.id && user?.role === "doctor") {
      fetchUnreadCount();
    }
  }, [user?.id]);

  // Handle new real-time notification
  useEffect(() => {
    if (lastNotificationEvent) {
      // Refresh count or lists
      fetchUnreadCount();
      if (isOpen) {
        fetchNotifications();
      }
    }
  }, [lastNotificationEvent]);

  // Load list when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => 
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  // Do not render for non-doctors (if you want this widget only for doctors)
  if (!user || user.role !== "doctor") return null;

  const isChatRoute = location.pathname.startsWith("/patient/chat");
  const bottomClass = isChatRoute ? "bottom-6" : "bottom-[5.5rem]";

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed ${bottomClass} right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400`}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm border-2 border-white dark:border-slate-800">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className={`fixed ${bottomClass} right-24 z-50 flex h-[28rem] w-80 max-w-[calc(100vw-7rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Thông báo hệ thống
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Đang tải...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Không có thông báo nào.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {notifications.map((notif) => {
                  // check read status either directly or via deliveryStatus / readAt
                  // (our backend returns 'readAt' or 'isRead'?)
                  // Let's assume the backend sets readAt if it's read, but we use the locally mapped isRead if we update it.
                  // Wait, looking at the handler, the dto has ReadAt.
                  const isRead = notif.isRead !== undefined ? notif.isRead : !!notif.readAt;
                  
                  return (
                    <div 
                      key={notif.id}
                      className={`flex flex-col gap-1 px-4 py-3 transition cursor-pointer ${
                        !isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                      onClick={() => {
                        if (!isRead) handleMarkAsRead(notif.id);
                        setIsOpen(false);
                        
                        // Handle navigation based on type or title
                        if (notif.type === "assignment" || notif.title.includes("Phân công")) {
                          if (notif.data?.patientId) {
                            navigate(`/patient/${notif.data.patientId}`);
                          } else {
                            navigate("/patient");
                          }
                        } else if (notif.type === "alert" || notif.title.includes("Cảnh báo")) {
                          if (notif.data?.alertId) {
                            navigate(`/alert/${notif.data.alertId}`);
                          } else {
                            navigate("/threshold-alerts");
                          }
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className={`text-sm font-semibold ${!isRead ? "text-blue-700 dark:text-blue-400" : "text-slate-800 dark:text-slate-200"}`}>
                          {notif.title}
                        </div>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {notif.body}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationWidget;

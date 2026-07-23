import React, { useState, useRef, useEffect } from "react";
import { FaBell, FaCheckDouble } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useRealtimeNotification, type NotificationItem } from "../../context/RealtimeNotificationContext";

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotification();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.type === "account_registration" || notif.data?.targetScreen === "Patients" || notif.title.includes("xác minh")) {
      navigate("/patients", { state: { tab: "pending" } });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition focus:outline-none"
        title="Thông báo"
      >
        <FaBell className="text-base" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-medium rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/50">
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
              Thông báo ({unreadCount})
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <FaCheckDouble className="text-xs" /> Đã đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Không có thông báo nào
              </div>
            ) : (
              notifications.slice(0, 15).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 transition cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !item.isRead
                      ? "bg-blue-50/50 dark:bg-blue-900/10 font-medium"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${
                      !item.isRead ? "text-gray-900 dark:text-white font-semibold" : "text-gray-700 dark:text-gray-300"
                    }`}>
                      {item.title}
                    </p>
                    {!item.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                    {new Date(item.createdAt).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 text-center">
            <button
              onClick={() => { setIsOpen(false); navigate("/patients", { state: { tab: "pending" } }); }}
              className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition w-full"
            >
              Xem danh sách cần kiểm duyệt →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

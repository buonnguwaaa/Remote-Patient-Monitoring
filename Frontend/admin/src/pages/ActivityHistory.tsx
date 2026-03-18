import React, { useState } from "react";
import { FaHistory, FaFilter, FaUserMd, FaRegUser, FaUserNurse, FaCog } from "react-icons/fa";

interface Activity {
  id: string;
  type: "login" | "create" | "update" | "delete" | "system";
  user: string;
  action: string;
  timestamp: string;
  date: string;
}

const ActivityHistory: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [filterType, setFilterType] = useState<string>("all");

  const activities: Activity[] = [
    {
      id: "1",
      type: "login",
      user: "Bác sĩ Nguyễn Văn A",
      action: "Đăng nhập vào hệ thống",
      timestamp: "14:30",
      date: "2025-12-17",
    },
    {
      id: "2",
      type: "create",
      user: "Admin",
      action: "Thêm bệnh nhân mới: Trần Thị B",
      timestamp: "14:15",
      date: "2025-12-17",
    },
    {
      id: "3",
      type: "update",
      user: "Y tá Lê Thị C",
      action: "Cập nhật thông tin bệnh nhân",
      timestamp: "13:45",
      date: "2025-12-17",
    },
    {
      id: "4",
      type: "delete",
      user: "Admin",
      action: "Xóa tài khoản bác sĩ: Phạm Văn D",
      timestamp: "12:20",
      date: "2025-12-17",
    },
    {
      id: "5",
      type: "system",
      user: "System",
      action: "Cập nhật cấu hình hệ thống",
      timestamp: "11:00",
      date: "2025-12-17",
    },
    {
      id: "6",
      type: "login",
      user: "Bác sĩ Hoàng Văn E",
      action: "Đăng nhập vào hệ thống",
      timestamp: "10:30",
      date: "2025-12-17",
    },
    {
      id: "7",
      type: "update",
      user: "Admin",
      action: "Cập nhật thông tin y tá",
      timestamp: "09:15",
      date: "2025-12-17",
    },
    {
      id: "8",
      type: "create",
      user: "Bác sĩ Nguyễn Văn A",
      action: "Thêm bệnh nhân mới: Vũ Thị F",
      timestamp: "23:45",
      date: "2025-12-16",
    },
    {
      id: "9",
      type: "login",
      user: "Y tá Mai Thị G",
      action: "Đăng nhập vào hệ thống",
      timestamp: "22:30",
      date: "2025-12-16",
    },
    {
      id: "10",
      type: "system",
      user: "System",
      action: "Sao lưu dữ liệu định kỳ",
      timestamp: "20:00",
      date: "2025-12-16",
    },
  ];

  const filteredActivities = activities.filter((activity) => {
    const matchDate = activity.date === selectedDate;
    const matchType = filterType === "all" || activity.type === filterType;
    return matchDate && matchType;
  });

  const getActivityStyle = (type: string) => {
    switch (type) {
      case "login":
        return { color: "bg-green-500", icon: <FaUserMd /> };
      case "create":
        return { color: "bg-blue-500", icon: <FaRegUser /> };
      case "update":
        return { color: "bg-yellow-500", icon: <FaUserNurse /> };
      case "delete":
        return { color: "bg-red-500", icon: <FaRegUser /> };
      case "system":
        return { color: "bg-purple-500", icon: <FaCog /> };
      default:
        return { color: "bg-gray-500", icon: <FaHistory /> };
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case "login":
        return "Đăng nhập";
      case "create":
        return "Tạo mới";
      case "update":
        return "Cập nhật";
      case "delete":
        return "Xóa";
      case "system":
        return "Hệ thống";
      default:
        return "Khác";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
          <FaHistory className="mr-3 text-indigo-600" />
          Lịch sử hoạt động
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Theo dõi tất cả hoạt động trong hệ thống
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FaFilter className="inline mr-2" />
              Chọn ngày
            </label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Loại hoạt động
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="login">Đăng nhập</option>
              <option value="create">Tạo mới</option>
              <option value="update">Cập nhật</option>
              <option value="delete">Xóa</option>
              <option value="system">Hệ thống</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tổng hoạt động</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {filteredActivities.length}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-md p-4">
          <div className="text-sm text-green-700 dark:text-green-400 mb-1">Đăng nhập</div>
          <div className="text-2xl font-bold text-green-800 dark:text-green-300">
            {filteredActivities.filter((a) => a.type === "login").length}
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-md p-4">
          <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">Tạo mới</div>
          <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">
            {filteredActivities.filter((a) => a.type === "create").length}
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-md p-4">
          <div className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">Cập nhật</div>
          <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
            {filteredActivities.filter((a) => a.type === "update").length}
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-md p-4">
          <div className="text-sm text-red-700 dark:text-red-400 mb-1">Xóa</div>
          <div className="text-2xl font-bold text-red-800 dark:text-red-300">
            {filteredActivities.filter((a) => a.type === "delete").length}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Danh sách hoạt động - {new Date(selectedDate).toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h2>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center">
            <FaHistory className="mx-auto text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              Không có hoạt động nào trong ngày này
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredActivities.map((activity) => {
              const style = getActivityStyle(activity.type);
              return (
                <div
                  key={activity.id}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div
                        className={`${style.color} rounded-full w-10 h-10 flex items-center justify-center text-white flex-shrink-0`}
                      >
                        {style.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {activity.user}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${activity.type === "login"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : activity.type === "create"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                  : activity.type === "update"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                    : activity.type === "delete"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                      : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                              }`}
                          >
                            {getActivityTypeLabel(activity.type)}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{activity.action}</p>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {activity.timestamp}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.date).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityHistory;

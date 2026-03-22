import React, { useState } from "react";
import { MdAdminPanelSettings } from "react-icons/md";
import { FaPowerOff, FaSave, FaHistory } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { useTheme } from "../context/ThemeContext";

const SystemSettings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [systemStatus, setSystemStatus] = useState<"online" | "offline" | "maintenance">("online");
  const [maintenanceMessage, setMaintenanceMessage] = useState("Hệ thống đang bảo trì, vui lòng quay lại sau.");
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [maxPatientsPerDoctor, setMaxPatientsPerDoctor] = useState(50);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Cài đặt hệ thống đã được lưu!");
  };

  const toggleSystemStatus = () => {
    const newStatus = systemStatus === "online" ? "offline" : "online";
    setSystemStatus(newStatus);
    alert(`Hệ thống đã chuyển sang trạng thái: ${newStatus === "online" ? "Trực tuyến" : "Ngoại tuyến"}`);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <MdAdminPanelSettings className="mr-3 text-orange-600" />
            Cài đặt hệ thống
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Quản lý cấu hình và trạng thái hệ thống
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/activity-history")}
          className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          <FaHistory className="mr-2" />
          Xem lịch sử hoạt động
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaPowerOff className="mr-2 text-orange-600" />
            Trạng thái hệ thống
          </h2>

          <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-700">Trạng thái hiện tại:</p>
              <span
                className={`inline-block mt-2 px-4 py-2 rounded-full text-sm font-semibold ${systemStatus === "online"
                  ? "bg-green-100 text-green-800"
                  : systemStatus === "offline"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                  }`}
              >
                {systemStatus === "online" ? "Trực tuyến" : systemStatus === "offline" ? "Ngoại tuyến" : "Bảo trì"}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSystemStatus}
              className={`px-6 py-3 rounded-lg font-semibold transition ${systemStatus === "online"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
                }`}
            >
              {systemStatus === "online" ? "Tắt hệ thống" : "Bật hệ thống"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trạng thái hệ thống
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={systemStatus}
                onChange={(e) => setSystemStatus(e.target.value as "online" | "offline" | "maintenance")}
              >
                <option value="online">Trực tuyến</option>
                <option value="offline">Ngoại tuyến</option>
                <option value="maintenance">Bảo trì</option>
              </select>
            </div>

            {systemStatus === "maintenance" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Thông báo bảo trì
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Cài đặt chung
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Cho phép đăng ký mới</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cho phép người dùng mới đăng ký tài khoản</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={allowRegistrations}
                  onChange={(e) => setAllowRegistrations(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 dark:bg-gray-600 dark:peer-focus:ring-orange-800"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Số bệnh nhân tối đa mỗi bác sĩ
              </label>
              <input
                type="number"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={maxPatientsPerDoctor}
                onChange={(e) => setMaxPatientsPerDoctor(parseInt(e.target.value))}
                min={1}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Cài đặt giao diện
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Tùy chỉnh giao diện và ngôn ngữ hiển thị của hệ thống
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chế độ hiển thị
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={theme}
                onChange={(e) => setTheme(e.target.value as "light" | "dark")}
              >
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ngôn ngữ
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "vi" | "en")}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Thông báo qua email</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gửi thông báo hệ thống qua email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 dark:bg-gray-600 dark:peer-focus:ring-orange-800"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition font-semibold"
          >
            <FaSave className="mr-2" />
            Lưu cài đặt
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemSettings;

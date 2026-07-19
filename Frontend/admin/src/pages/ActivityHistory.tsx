import React, { useState, useEffect } from "react";
import { FaHistory, FaFilter, FaUserMd, FaRegUser, FaUserNurse, FaCog } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";

interface Activity {
  id: string;
  userId?: string;
  type: "login" | "create" | "update" | "delete" | "system";
  userName: string;
  userRole?: string;
  action: string;
  timestamp: string;
  date: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  metadata?: {
    latitude?: string;
    longitude?: string;
    [key: string]: any;
  };
}

interface ActivityStats {
  total: number;
  byType: {
    login?: number;
    create?: number;
    update?: number;
    delete?: number;
    system?: number;
  };
}

const getShortUserAgent = (userAgent?: string) => {
  if (!userAgent) return "Không rõ thiết bị";
  if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
    if (userAgent.includes("Android")) return "Android Mobile";
    if (userAgent.includes("iPhone")) return "iOS Mobile";
    return "Mobile Device";
  }
  if (userAgent.includes("Windows")) return "Windows PC";
  if (userAgent.includes("Macintosh")) return "Mac PC";
  if (userAgent.includes("Linux")) return "Linux PC";
  return "Máy tính để bàn";
};

const formatIpAddress = (ip?: string) => {
  if (!ip) return "Không khả dụng";
  if (ip === "::1") return "127.0.0.1 (Localhost)";
  return ip;
};

const ActivityHistory: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast, showToast, hideToast } = useToast();
  const [dateMode, setDateMode] = useState<"all" | "range" | "single">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [singleDate, setSingleDate] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats>({ total: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const pageSize = 50;

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [dateMode, startDate, endDate, singleDate, filterType]);

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [dateMode, startDate, endDate, singleDate, filterType, currentPage]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params: any = {
        pageSize: pageSize,
        page: currentPage,
      };

      if (dateMode === "all") {
        params.startDate = "1970-01-01";
      } else if (dateMode === "range") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      } else if (dateMode === "single") {
        if (singleDate) {
          params.startDate = singleDate;
          params.endDate = singleDate;
        }
      }

      if (filterType !== "all") {
        params.type = filterType;
      }

      const response = await api.get("/activity-logs", { params });
      setActivities(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalCount(response.data.total || 0);
    } catch (error) {
      console.error("Error fetching activities:", error);
      showToast("Không thể tải lịch sử hoạt động", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params: any = {};
      if (dateMode === "all") {
        params.startDate = "1970-01-01";
      } else if (dateMode === "range") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      } else if (dateMode === "single") {
        if (singleDate) {
          params.startDate = singleDate;
          params.endDate = singleDate;
        }
      }
      const response = await api.get("/activity-logs/stats", {
        params,
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getHeaderDateRangeLabel = () => {
    const locale = i18n.language === "vi" ? "vi-VN" : "en-US";
    
    if (dateMode === "all") {
      return t("activityHistory.modes.allLogs") || (i18n.language === "vi" ? "Tất cả" : "All logs");
    }
    
    if (dateMode === "range") {
      if (startDate && endDate) {
        if (startDate === endDate) {
          return new Date(startDate).toLocaleDateString(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
        return `${new Date(startDate).toLocaleDateString(locale)} - ${new Date(endDate).toLocaleDateString(locale)}`;
      }
      if (startDate) {
        return i18n.language === "vi"
          ? `Từ ngày ${new Date(startDate).toLocaleDateString(locale)}`
          : `From ${new Date(startDate).toLocaleDateString(locale)}`;
      }
      if (endDate) {
        return i18n.language === "vi"
          ? `Đến ngày ${new Date(endDate).toLocaleDateString(locale)}`
          : `To ${new Date(endDate).toLocaleDateString(locale)}`;
      }
      return i18n.language === "vi" ? "Chưa chọn khoảng ngày" : "No date range selected";
    }
    
    if (dateMode === "single") {
      if (singleDate) {
        return new Date(singleDate).toLocaleDateString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      return i18n.language === "vi" ? "Chưa chọn ngày" : "No date selected";
    }
    
    return "";
  };

  const filteredActivities = activities;

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
    return t(`activityHistory.types.${type}`) || t("activityHistory.types.other");
  };

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
          <FaHistory className="mr-3 text-indigo-600" />
          {t("activityHistory.title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t("activityHistory.description")}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
          {/* Time Filter Mode */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FaFilter className="inline mr-2" />
              {t("activityHistory.timeFilter") || "Lọc theo thời gian"}
            </label>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setDateMode("all")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  dateMode === "all"
                    ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {t("activityHistory.modes.all") || "Tất cả"}
              </button>
              <button
                type="button"
                onClick={() => setDateMode("range")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  dateMode === "range"
                    ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {t("activityHistory.modes.range") || "Khoảng"}
              </button>
              <button
                type="button"
                onClick={() => setDateMode("single")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  dateMode === "single"
                    ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {t("activityHistory.modes.single") || "Ngày"}
              </button>
            </div>
          </div>

          {/* Date Inputs Dynamic Column */}
          <div className="lg:col-span-2">
            {dateMode === "all" && (
              <div className="py-2.5 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-600 text-center">
                {t("activityHistory.modes.allDesc") || "Hiển thị toàn bộ lịch sử hoạt động trong cơ sở dữ liệu"}
              </div>
            )}

            {dateMode === "range" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t("activityHistory.startDate")}
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t("activityHistory.endDate")}
                    </label>
                    {(startDate || endDate) && (
                      <button
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                      >
                        {t("common.clearFilter")}
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {dateMode === "single" && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("activityHistory.selectDate")}
                  </label>
                  {singleDate && (
                    <button
                      onClick={() => setSingleDate("")}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                    >
                      {t("common.clearFilter")}
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Activity Type */}
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("activityHistory.activityType")}
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">{t("activityHistory.types.all")}</option>
              <option value="login">{t("activityHistory.types.login")}</option>
              <option value="create">{t("activityHistory.types.create")}</option>
              <option value="update">{t("activityHistory.types.update")}</option>
              <option value="delete">{t("activityHistory.types.delete")}</option>
              <option value="system">{t("activityHistory.types.system")}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t("activityHistory.totalActivity")}</div>
          <div className="text-2xl font-bold text-gray-800 dark:text-white">
            {stats.total}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-md p-4">
          <div className="text-sm text-green-700 dark:text-green-400 mb-1">{t("activityHistory.types.login")}</div>
          <div className="text-2xl font-bold text-green-800 dark:text-green-300">
            {stats.byType.login || 0}
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-md p-4">
          <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">{t("activityHistory.types.create")}</div>
          <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">
            {stats.byType.create || 0}
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-md p-4">
          <div className="text-sm text-yellow-700 dark:text-yellow-400 mb-1">{t("activityHistory.types.update")}</div>
          <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
            {stats.byType.update || 0}
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-md p-4">
          <div className="text-sm text-red-700 dark:text-red-400 mb-1">{t("activityHistory.types.delete")}</div>
          <div className="text-2xl font-bold text-red-800 dark:text-red-300">
            {stats.byType.delete || 0}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {t("activityHistory.activityList")} - {getHeaderDateRangeLabel()}
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-500">{t("common.loading")}</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center">
            <FaHistory className="mx-auto text-6xl text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              {t("activityHistory.noActivity")}
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-[600px] overflow-y-auto overflow-x-visible">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredActivities.map((activity) => {
                  const style = getActivityStyle(activity.type);
                  return (
                    <div
                      key={activity.id}
                      onClick={() => setSelectedActivity(activity)}
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition relative cursor-pointer"
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
                                {activity.userName}
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
                        <div className="text-right">
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
            </div>

            {/* Pagination inside the same container */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {t("activityHistory.pagination.showing")} {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} {t("activityHistory.pagination.of")} {totalCount} {t("activityHistory.pagination.logs")}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("activityHistory.pagination.previous")}
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t("activityHistory.pagination.page")} {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("activityHistory.pagination.next")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{t("activityHistory.logDetails") || "Chi tiết nhật ký hoạt động"}</span>
              </h3>
              <button
                onClick={() => setSelectedActivity(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Header/Action Section */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b dark:border-gray-700 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t("activityHistory.action") || "Hành động thực hiện"}
                  </p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {selectedActivity.action}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    selectedActivity.type === "login"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : selectedActivity.type === "create"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      : selectedActivity.type === "update"
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                      : selectedActivity.type === "delete"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                  }`}
                >
                  {getActivityTypeLabel(selectedActivity.type)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Info */}
                <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-lg">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5 border-b dark:border-gray-600 pb-1.5">
                    <span>👤</span> {t("activityHistory.userInfo") || "Người thực hiện"}
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div>
                      <span className="font-medium text-gray-400 mr-1.5">Tài khoản:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedActivity.userName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-400 mr-1.5">Vai trò:</span>
                      <span className="capitalize">{selectedActivity.userRole}</span>
                    </div>
                  </div>
                </div>

                {/* API Request Info */}
                <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-lg">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5 border-b dark:border-gray-600 pb-1.5">
                    <span>🌐</span> {t("activityHistory.requestInfo") || "Thông tin yêu cầu"}
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div>
                      <span className="font-medium text-gray-400 mr-1.5">Thời gian:</span>
                      <span>{selectedActivity.timestamp} - {new Date(selectedActivity.date).toLocaleDateString("vi-VN")}</span>
                    </div>
                    {selectedActivity.method && (
                      <div>
                        <span className="font-medium text-gray-400 mr-1.5">Phương thức:</span>
                        <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">{selectedActivity.method}</span>
                      </div>
                    )}
                    {selectedActivity.path && (
                      <div>
                        <span className="font-medium text-gray-400 mr-1.5">Đường dẫn:</span>
                        <span className="font-mono text-xs break-all">{selectedActivity.path}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Client & Device Details */}
              <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-lg">
                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5 border-b dark:border-gray-600 pb-1.5">
                  <span>💻</span> {t("activityHistory.deviceAndIp") || "Địa chỉ IP & Thiết bị"}
                </h4>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <span className="font-medium text-gray-400 mr-1.5">Địa chỉ IP:</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">{formatIpAddress(selectedActivity.ipAddress)}</span>
                  </div>
                   <div>
                    <span className="font-medium text-gray-400 mr-1.5">Loại máy:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{getShortUserAgent(selectedActivity.userAgent)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-400 mr-1.5">User Agent đầy đủ:</span>
                    <div className="mt-1.5 p-2.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 text-xs font-mono break-all text-gray-500 dark:text-gray-400">
                      {selectedActivity.userAgent || "Không khả dụng"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Details */}
              {selectedActivity.metadata?.latitude && selectedActivity.metadata?.longitude && (
                <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-lg">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5 border-b dark:border-gray-600 pb-1.5">
                    <span>📍</span> {t("activityHistory.locationInfo") || "Vị trí địa lý"}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <div>
                      <span className="font-medium text-gray-400 mr-1.5">Tọa độ:</span>
                      <span className="font-mono text-gray-900 dark:text-white">
                        {parseFloat(selectedActivity.metadata.latitude).toFixed(6)}, {parseFloat(selectedActivity.metadata.longitude).toFixed(6)}
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selectedActivity.metadata.latitude},${selectedActivity.metadata.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                    >
                      🗺️ Xem trên Google Maps
                    </a>
                  </div>
                </div>
              )}

              {/* Data payload / Metadata Section */}
              {selectedActivity.metadata && Object.keys(selectedActivity.metadata).filter(k => k !== "latitude" && k !== "longitude").length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-lg">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-1.5 border-b dark:border-gray-600 pb-1.5">
                    <span>📊</span> {t("activityHistory.payloadData") || "Dữ liệu thay đổi (Payload)"}
                  </h4>
                  <div className="max-h-48 overflow-y-auto p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                    <pre className="text-xs font-mono text-slate-800 dark:text-slate-300 whitespace-pre-wrap break-all">
                      {JSON.stringify(
                        Object.fromEntries(
                          Object.entries(selectedActivity.metadata).filter(([k]) => k !== "latitude" && k !== "longitude")
                        ),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityHistory;

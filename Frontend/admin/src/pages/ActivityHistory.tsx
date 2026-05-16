import React, { useState, useEffect } from "react";
import { FaHistory, FaFilter, FaUserMd, FaRegUser, FaUserNurse, FaCog } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";

interface Activity {
  id: string;
  type: "login" | "create" | "update" | "delete" | "system";
  userName: string;
  action: string;
  timestamp: string;
  date: string;
  createdAt: string;
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

const ActivityHistory: React.FC = () => {
  const { t } = useTranslation();
  const { toast, showToast, hideToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [filterType, setFilterType] = useState<string>("all");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats>({ total: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [selectedDate, filterType]);

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [selectedDate, filterType, currentPage]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params: any = {
        startDate: selectedDate,
        endDate: selectedDate,
        pageSize: pageSize,
        page: currentPage,
      };

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
      const response = await api.get("/activity-logs/stats", {
        params: {
          startDate: selectedDate,
          endDate: selectedDate,
        },
      });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FaFilter className="inline mr-2" />
              {t("activityHistory.selectDate")}
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
              {t("activityHistory.activityType")}
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            {t("activityHistory.activityList")} - {new Date(selectedDate).toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
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
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition relative"
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
    </div>
  );
};

export default ActivityHistory;

import React, { useEffect, useMemo, useState } from "react";
import { FaRegUser, FaUserMd, FaUserNurse } from "react-icons/fa";
import { MdAdminPanelSettings } from "react-icons/md";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import api from "../services/api";

interface DashboardCounts {
  doctors: number;
  patients: number;
  nurses: number;
}

interface RecentActivity {
  id: string;
  type: "login" | "create" | "update" | "delete" | "system";
  userName: string;
  action: string;
  timestamp: string;
  createdAt: string;
}

const refreshIntervalMs = 30000;

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { toast, showToast, hideToast } = useToast(4000);
  const [counts, setCounts] = useState<DashboardCounts>({
    doctors: 0,
    patients: 0,
    nurses: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const extractCount = (response: any) => {
    const data = response?.data?.data;
    return Array.isArray(data) ? data.length : 0;
  };

  const fetchDashboardCounts = async (options?: { showErrorToast?: boolean; isInitialLoad?: boolean }) => {
    const showErrorToast = options?.showErrorToast ?? false;
    const isInitialLoad = options?.isInitialLoad ?? false;

    try {
      if (isInitialLoad) {
        setLoadingStats(true);
      }

      const [doctorsResponse, patientsResponse, nursesResponse] = await Promise.all([
        api.get("/users/doctors?limit=1000&sortOrder=desc"),
        api.get("/users/patients?limit=1000&sortOrder=desc"),
        api.get("/users/nurses?limit=1000&sortOrder=desc"),
      ]);

      setCounts({
        doctors: extractCount(doctorsResponse),
        patients: extractCount(patientsResponse),
        nurses: extractCount(nursesResponse),
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching dashboard stats", error);
      if (showErrorToast) {
        showToast(t("dashboard.cannotLoadData"), "error", {
          title: t("dashboard.loadDataFailed"),
        });
      }
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      setLoadingActivities(true);
      const today = new Date().toISOString().split("T")[0];
      const response = await api.get("/activity-logs", {
        params: {
          startDate: today,
          endDate: today,
          pageSize: 5,
        },
      });
      setRecentActivities(response.data.data || []);
    } catch (error) {
      console.error("Error fetching recent activities", error);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    void fetchDashboardCounts({ showErrorToast: true, isInitialLoad: true });
    void fetchRecentActivities();

    const intervalId = window.setInterval(() => {
      void fetchDashboardCounts();
      void fetchRecentActivities();
    }, refreshIntervalMs);

    return () => window.clearInterval(intervalId);
  }, []);

  const getActivityColor = (type: string) => {
    switch (type) {
      case "login":
        return "bg-green-500";
      case "create":
        return "bg-blue-500";
      case "update":
        return "bg-yellow-500";
      case "delete":
        return "bg-red-500";
      case "system":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("dashboard.activities.timeAgo.justNow");
    if (diffMins < 60) return `${diffMins} ${t("dashboard.activities.timeAgo.minutes")}`;
    if (diffHours < 24) return `${diffHours} ${t("dashboard.activities.timeAgo.hours")}`;
    return `${diffDays} ${t("dashboard.activities.timeAgo.days")}`;
  };

  const stats = useMemo(
    () => [
      {
        icon: <FaUserMd className="text-4xl text-blue-600" />,
        label: t("dashboard.doctors"),
        count: counts.doctors,
        link: "/doctors",
        color: "bg-blue-50",
      },
      {
        icon: <FaRegUser className="text-4xl text-green-600" />,
        label: t("dashboard.patients"),
        count: counts.patients,
        link: "/patients",
        color: "bg-green-50",
      },
      {
        icon: <FaUserNurse className="text-4xl text-purple-600" />,
        label: t("dashboard.nurses"),
        count: counts.nurses,
        link: "/nurses",
        color: "bg-purple-50",
      },
      {
        icon: <MdAdminPanelSettings className="text-4xl text-orange-600" />,
        label: t("dashboard.system"),
        count: t("dashboard.online"),
        link: "/system-settings",
        color: "bg-orange-50",
      },
    ],
    [counts, t]
  );

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          {t("dashboard.title")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t("dashboard.description")}
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {loadingStats && !lastUpdated
            ? t("dashboard.loadingRealtime")
            : lastUpdated
              ? `${t("dashboard.lastUpdated")}: ${lastUpdated.toLocaleTimeString("vi-VN")}`
              : t("dashboard.noRealtimeData")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="block rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg dark:bg-gray-800"
          >
            <div className={`${stat.color} mb-4 flex h-16 w-16 items-center justify-center rounded-full`}>
              {stat.icon}
            </div>
            <h3 className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
              {stat.label}
            </h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {typeof stat.count === "number" && loadingStats && !lastUpdated ? "..." : stat.count}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {t("dashboard.recentActivity")}
          </h2>
          <Link
            to="/activity-history"
            className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            {t("common.viewAll")}
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {loadingActivities ? (
          <div className="py-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-500">{t("common.loading")}</p>
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">{t("dashboard.noRecentActivity")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between border-b py-3 dark:border-gray-700">
                <div className="flex items-center">
                  <div className={`mr-3 h-2 w-2 rounded-full ${getActivityColor(activity.type)}`} />
                  <span className="text-gray-700 dark:text-gray-300">
                    {activity.userName}: {activity.action}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {getTimeAgo(activity.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

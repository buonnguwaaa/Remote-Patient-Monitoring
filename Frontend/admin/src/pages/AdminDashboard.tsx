import React, { useEffect, useMemo, useState } from "react";
import { FaRegUser, FaUserMd, FaUserNurse } from "react-icons/fa";
import { MdAdminPanelSettings } from "react-icons/md";
import { Link } from "react-router-dom";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import api from "../services/api";

interface DashboardCounts {
  doctors: number;
  patients: number;
  nurses: number;
}

const refreshIntervalMs = 30000;

const AdminDashboard: React.FC = () => {
  const { toast, showToast, hideToast } = useToast(4000);
  const [counts, setCounts] = useState<DashboardCounts>({
    doctors: 0,
    patients: 0,
    nurses: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
        showToast("Không thể tải số liệu realtime cho bảng quản trị.", "error", {
          title: "Tải dữ liệu thất bại",
        });
      }
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    void fetchDashboardCounts({ showErrorToast: true, isInitialLoad: true });

    const intervalId = window.setInterval(() => {
      void fetchDashboardCounts();
    }, refreshIntervalMs);

    return () => window.clearInterval(intervalId);
  }, []);

  const stats = useMemo(
    () => [
      {
        icon: <FaUserMd className="text-4xl text-blue-600" />,
        label: "Bác sĩ",
        count: counts.doctors,
        link: "/doctors",
        color: "bg-blue-50",
      },
      {
        icon: <FaRegUser className="text-4xl text-green-600" />,
        label: "Bệnh nhân",
        count: counts.patients,
        link: "/patients",
        color: "bg-green-50",
      },
      {
        icon: <FaUserNurse className="text-4xl text-purple-600" />,
        label: "Y tá",
        count: counts.nurses,
        link: "/nurses",
        color: "bg-purple-50",
      },
      {
        icon: <MdAdminPanelSettings className="text-4xl text-orange-600" />,
        label: "Hệ thống",
        count: "Online",
        link: "/system-settings",
        color: "bg-orange-50",
      },
    ],
    [counts]
  );

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Bảng điều khiển quản trị
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Quản lý hệ thống giám sát bệnh nhân từ xa
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {loadingStats && !lastUpdated
            ? "Đang tải số liệu realtime..."
            : lastUpdated
              ? `Cập nhật gần nhất: ${lastUpdated.toLocaleTimeString("vi-VN")}`
              : "Chưa có dữ liệu realtime"}
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
            Hoạt động gần đây
          </h2>
          <Link
            to="/activity-history"
            className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Xem tất cả
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b py-3 dark:border-gray-700">
            <div className="flex items-center">
              <div className="mr-3 h-2 w-2 rounded-full bg-green-500" />
              <span className="text-gray-700 dark:text-gray-300">Bác sĩ Nguyễn Văn A đã đăng nhập</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">5 phút trước</span>
          </div>
          <div className="flex items-center justify-between border-b py-3 dark:border-gray-700">
            <div className="flex items-center">
              <div className="mr-3 h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-gray-700 dark:text-gray-300">Thêm bệnh nhân mới: Trần Thị B</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">15 phút trước</span>
          </div>
          <div className="flex items-center justify-between border-b py-3 dark:border-gray-700">
            <div className="flex items-center">
              <div className="mr-3 h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-gray-700 dark:text-gray-300">Cập nhật thông tin y tá</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">1 giờ trước</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

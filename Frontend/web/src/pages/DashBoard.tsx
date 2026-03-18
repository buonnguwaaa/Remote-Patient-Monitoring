import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaUserInjured,
  FaUserShield,
  FaArrowTrendUp,
  FaArrowTrendDown,
} from "react-icons/fa6";
import { FaExclamationTriangle, FaInfoCircle } from "react-icons/fa";

import Chart from "../components/ui/Chart";
import { mockAlerts } from "../data/mockData";

interface StatItem {
  id: number;
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "amber";
  isIncreased: boolean;
  changeValue: number;
  description?: string;
}

const statsData: StatItem[] = [
  {
    id: 1,
    title: "Tổng bệnh nhân",
    value: "1,200",
    icon: <FaUsers size={24} />,
    color: "blue",
    isIncreased: true,
    changeValue: 5.4,
    description: "So với tháng trước",
  },
  {
    id: 2,
    title: "Bệnh nhân bình thường",
    value: "850",
    icon: <FaUserShield size={24} />,
    color: "emerald",
    isIncreased: true,
    changeValue: 2.1,
    description: "So với tháng trước",
  },
  {
    id: 3,
    title: "Bệnh nhân cảnh báo",
    value: "300",
    icon: <FaUserInjured size={24} />,
    color: "amber",
    isIncreased: false,
    changeValue: 1.2,
    description: "So với tháng trước",
  },
];
const StatCard: React.FC<{ item: StatItem }> = ({ item }) => {
  const colorMap = {
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
  };

  const trendColor = item.isIncreased ? "text-emerald-600" : "text-red-500";
  const TrendIcon: React.ComponentType<any> = item.isIncreased
    ? FaArrowTrendUp
    : FaArrowTrendDown;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{item.title}</p>
          <h3 className="text-3xl font-bold text-gray-800">{item.value}</h3>
        </div>
        <div
          className={`p-3 rounded-lg ${colorMap[item.color] || "bg-gray-100"}`}
        >
          {item.icon}
        </div>
      </div>

      <div className="flex items-center mt-4">
        <span className={`flex items-center text-sm font-medium ${trendColor}`}>
          <TrendIcon className="mr-1" />
          {item.changeValue}%
        </span>
        <span className="text-sm text-gray-400 ml-2">{item.description}</span>
      </div>
    </div>
  );
};

const DashBoard = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Tổng quan</h1>
        <p className="text-gray-500">Thống kê dữ liệu bệnh nhân hôm nay</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsData.map((item) => (
          <StatCard key={item.id} item={item} />
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-6 md:flex-row">
        <Chart />
        <RecentAlerts />
      </div>
    </div>
  );
};

const RecentAlerts: React.FC = () => {
  const navigate = useNavigate();

  const recentAlerts = mockAlerts
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm flex-1 font-sans">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Cảnh báo gần đây</h2>
        <button
          onClick={() => navigate("/threshold-alerts")}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Xem tất cả →
        </button>
      </div>

      <div className="space-y-3">
        {recentAlerts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Không có cảnh báo gần đây
          </p>
        ) : (
          recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate("/threshold-alerts")}
            >
              <div
                className={`shrink-0 mt-1 ${alert.severity === "high" ? "text-red-500" : "text-yellow-500"
                  }`}
              >
                {alert.severity === "high" ? (
                  <FaExclamationTriangle size={20} />
                ) : (
                  <FaInfoCircle size={20} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-medium text-gray-800 truncate">
                    {alert.patientName}
                  </p>
                  <span className="text-xs text-gray-500 shrink-0">
                    {formatDate(alert.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {alert.violations.map((v, idx) => (
                    <span key={idx}>
                      {idx > 0 && ", "}
                      <span className="font-medium">
                        {v.type === "systolic" && "Huyết áp tâm thu"}
                        {v.type === "diastolic" && "Huyết áp tâm trương"}
                        {v.type === "pulse" && "Nhịp tim"}
                        {v.type === "glucose" && "Đường huyết"}
                        {v.type === "temperature" && "Nhiệt độ"}
                        {v.type === "spo2" && "SpO2"}
                        {v.type === "respiratoryRate" && "Nhịp thở"}
                      </span>
                      : {v.observed}
                    </span>
                  ))}
                </p>

                {alert.status === "ack" && (
                  <span className="inline-block mt-1 text-xs text-green-600 font-medium">
                    ✓ Đã xác nhận
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DashBoard;

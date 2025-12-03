import React from "react";
import {
  FaUsers,
  FaUserInjured,
  FaUserShield,
  FaArrowTrendUp,
  FaArrowTrendDown,
} from "react-icons/fa6";

import Chart from "../components/ui/Chart";

// 1. Separate Data Configuration
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
    color: "blue", // Helper for dynamic styling
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
    isIncreased: false, // For this metric, a decrease might actually be "good", but visually we show the trend
    changeValue: 1.2,
    description: "So với tháng trước",
  },
];

// 2. Reusable Card Component
const StatCard: React.FC<{ item: StatItem }> = ({ item }) => {
  // Dynamic color classes based on the 'color' prop in data
  const colorMap = {
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
  };

  // Determine trend color: Green if up, Red if down
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

// 3. Main Dashboard Layout
const DashBoard = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
        <p className="text-gray-500">Thống kê dữ liệu bệnh nhân hôm nay</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsData.map((item) => (
          <StatCard key={item.id} item={item} />
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-6 md:flex-row">
        <Chart />
        <div className="p-6 bg-white rounded-xl shadow-sm w-6/10 font-sans">
          {/* Placeholder for another widget, e.g., Recent Activities */}
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Cảnh báo gần đây
          </h2>
          <p className="text-gray-500">
            Nội dung cảnh báo sẽ được hiển thị ở đây.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashBoard;

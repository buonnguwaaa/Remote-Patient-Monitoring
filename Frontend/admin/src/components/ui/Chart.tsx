import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  period: string;
  normalPatients: number;
  warningPatients: number;
}

interface StatItem {
  id: string;
  label: string;
  value: number;
  type: "primary" | "warning" | "neutral";
}

interface StatsHeaderProps {
  stats: StatItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({
  stats,
  activeTabId,
  onTabChange,
}) => {
  return (
    <div className="flex space-x-8 mb-8 overflow-x-auto pb-2" role="tablist">
      {stats.map((stat) => {
        const isActive = activeTabId === stat.id;
        return (
          <button
            key={stat.id}
            onClick={() => onTabChange(stat.id)}
            className="group flex flex-col items-start rounded-lg px-2 py-1 min-w-max"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${stat.id}`}
          >
            {/* Label with active indicator */}
            <div className="relative pb-2">
              <span
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-gray-900"
                    : "text-gray-500 group-hover:text-gray-700"
                }`}
              >
                {stat.label}
              </span>
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute -top-1 left-0 w-full h-1 bg-blue-500 rounded-full transition-all duration-300" />
              )}
            </div>

            {/* Value */}
            <span
              className={`text-xl font-semibold transition-colors ${
                isActive ? "text-gray-900" : "text-gray-600"
              }`}
            >
              {stat.value.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Custom Tooltip Component for Recharts
 */
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        <div className="space-y-1">
          <p className="text-sm text-emerald-600">
            <span className="font-medium">Bệnh nhân bình thường:</span>{" "}
            {payload[0].value.toLocaleString()}
          </p>
          <p className="text-sm text-amber-600">
            <span className="font-medium">Bệnh nhân cảnh báo:</span>{" "}
            {payload[1].value.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1 pt-1 border-t border-gray-100">
            <span className="font-medium">Tổng:</span>{" "}
            {(payload[0].value + payload[1].value).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Custom Legend Component
 */
const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex justify-center space-x-6 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={`item-${index}`} className="flex items-center">
          <div
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// --- Main Widget Container ---

export const Chart: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("all");

  // Mock stats data
  const stats: StatItem[] = [
    { id: "all", label: "Tất cả", value: 1240, type: "primary" },
    { id: "month", label: "Tháng", value: 320, type: "neutral" },
    { id: "week", label: "Tuần", value: 80, type: "warning" },
  ];

  // Chart Data for last 4 months
  const monthlyChartData: ChartDataPoint[] = [
    { period: "T3", normalPatients: 220, warningPatients: 45 },
    { period: "T4", normalPatients: 180, warningPatients: 60 },
    { period: "T5", normalPatients: 250, warningPatients: 70 },
    { period: "T6", normalPatients: 280, warningPatients: 40 },
  ];

  // Chart Data for last 4 weeks
  const weeklyChartData: ChartDataPoint[] = [
    { period: "Tuần 1", normalPatients: 65, warningPatients: 15 },
    { period: "Tuần 2", normalPatients: 70, warningPatients: 10 },
    { period: "Tuần 3", normalPatients: 85, warningPatients: 20 },
    { period: "Tuần 4", normalPatients: 60, warningPatients: 20 },
  ];

  // Select data based on active tab
  const getChartData = () => {
    switch (activeTab) {
      case "month":
        return weeklyChartData; // Show last 4 weeks
      case "week":
        return weeklyChartData; // Show last 4 weeks (you can create daily data if needed)
      case "all":
      default:
        return monthlyChartData; // Show last 4 months
    }
  };

  const chartData = getChartData();

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm md:w-4/10 font-sans">
      {/* Top Section */}
      <StatsHeader
        stats={stats}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Chart Section */}
      <div className="mt-8 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f3f4f6"
            />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickMargin={10}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
            <Bar
              dataKey="normalPatients"
              name="Bệnh nhân bình thường"
              fill="#10b981" // emerald-500
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
            <Bar
              dataKey="warningPatients"
              name="Bệnh nhân cảnh báo"
              fill="#f59e0b" // amber-500
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary Section */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Hiển thị{" "}
              {activeTab === "all" ? "4 tháng gần đây" : "4 tuần gần đây"}
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                <span className="text-sm text-gray-600">
                  Tổng bình thường:{" "}
                  {chartData
                    .reduce((sum, item) => sum + item.normalPatients, 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                <span className="text-sm text-gray-600">
                  Tổng cảnh báo:{" "}
                  {chartData
                    .reduce((sum, item) => sum + item.warningPatients, 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chart;

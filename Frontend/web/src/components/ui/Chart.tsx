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

import { useTheme } from "../../context/ThemeContext";

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
  isDark: boolean;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({
  stats,
  activeTabId,
  onTabChange,
  isDark,
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
            <div className="relative pb-2">
              <span
                style={{ color: isActive ? (isDark ? "#f1f5f9" : "#111827") : (isDark ? "#94a3b8" : "#6b7280") }}
                className="text-sm font-medium transition-colors"
              >
                {stat.label}
              </span>
              {isActive && (
                <div className="absolute -top-1 left-0 w-full h-1 bg-blue-500 rounded-full transition-all duration-300" />
              )}
            </div>
            <span
              style={{ color: isActive ? (isDark ? "#f1f5f9" : "#111827") : (isDark ? "#94a3b8" : "#4b5563") }}
              className="text-xl font-semibold transition-colors"
            >
              {stat.value.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// CustomTooltip receives isDark via a closure — we create it inside the Chart component
const makeCustomTooltip = (isDark: boolean) => {
  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={`p-3 rounded-lg shadow-lg border text-sm ${
            isDark
              ? "bg-slate-800 border-slate-600 text-slate-100"
              : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          <p className={`font-semibold mb-1 ${isDark ? "text-slate-100" : "text-gray-800"}`}>
            {label}
          </p>
          <div className="space-y-1">
            <p className="text-emerald-500">
              <span className="font-medium">Bệnh nhân bình thường:</span>{" "}
              {payload[0]?.value?.toLocaleString()}
            </p>
            <p className="text-amber-500">
              <span className="font-medium">Bệnh nhân cảnh báo:</span>{" "}
              {payload[1]?.value?.toLocaleString()}
            </p>
            <p
              className={`mt-1 pt-1 border-t ${
                isDark ? "border-slate-600 text-slate-300" : "border-gray-100 text-gray-600"
              }`}
            >
              <span className="font-medium">Tổng:</span>{" "}
              {((payload[0]?.value ?? 0) + (payload[1]?.value ?? 0)).toLocaleString()}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };
  return CustomTooltip;
};

const makeRenderLegend = (isDark: boolean) => {
  return (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center space-x-6 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };
};

export const Chart: React.FC = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<string>("all");

  const stats: StatItem[] = [
    { id: "all", label: "Tất cả", value: 1240, type: "primary" },
    { id: "month", label: "Tháng", value: 320, type: "neutral" },
    { id: "week", label: "Tuần", value: 80, type: "warning" },
  ];

  const monthlyChartData: ChartDataPoint[] = [
    { period: "T3", normalPatients: 220, warningPatients: 45 },
    { period: "T4", normalPatients: 180, warningPatients: 60 },
    { period: "T5", normalPatients: 250, warningPatients: 70 },
    { period: "T6", normalPatients: 280, warningPatients: 40 },
  ];

  const weeklyChartData: ChartDataPoint[] = [
    { period: "Tuần 1", normalPatients: 65, warningPatients: 15 },
    { period: "Tuần 2", normalPatients: 70, warningPatients: 10 },
    { period: "Tuần 3", normalPatients: 85, warningPatients: 20 },
    { period: "Tuần 4", normalPatients: 60, warningPatients: 20 },
  ];

  const getChartData = () => {
    switch (activeTab) {
      case "month":
        return weeklyChartData;
      case "week":
        return weeklyChartData;
      case "all":
      default:
        return monthlyChartData;
    }
  };

  const chartData = getChartData();

  // Color tokens
  const footerBorder = isDark ? "#334155" : "#e5e7eb";
  const footerText   = isDark ? "#94a3b8" : "#6b7280";
  const summaryText  = isDark ? "#cbd5e1" : "#4b5563";
  const gridColor    = isDark ? "#334155" : "#f3f4f6";
  const tickColor    = isDark ? "#94a3b8" : "#6b7280";
  const CustomTooltip = makeCustomTooltip(isDark);
  const renderLegend  = makeRenderLegend(isDark);

  return (
    <div className="font-sans transition-colors w-full">
      <StatsHeader
        stats={stats}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
      />

      <div className="mt-8 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={gridColor}
            />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: tickColor, fontSize: 12 }}
              tickMargin={10}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "rgba(148,163,184,0.08)" : "rgba(0,0,0,0.04)" }} />
            <Legend content={renderLegend} />
            <Bar
              dataKey="normalPatients"
              name="Bệnh nhân bình thường"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              barSize={36}
            />
            <Bar
              dataKey="warningPatients"
              name="Bệnh nhân cảnh báo"
              fill="#14b8a6"
              radius={[4, 4, 0, 0]}
              barSize={36}
            />
          </BarChart>
        </ResponsiveContainer>

        <div style={{ borderTopColor: footerBorder, borderTopWidth: 1, borderTopStyle: "solid" }} className="mt-4 pt-3 flex justify-between items-center gap-4">
            <div style={{ color: footerText }} className="text-xs">
              Hiển thị {activeTab === "all" ? "4 tháng gần đây" : "4 tuần gần đây"}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6366f1" }} />
                <span style={{ color: summaryText }} className="text-xs">
                  Bình thường:{" "}
                  {chartData.reduce((s, d) => s + d.normalPatients, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#14b8a6" }} />
                <span style={{ color: summaryText }} className="text-xs">
                  Cảnh báo:{" "}
                  {chartData.reduce((s, d) => s + d.warningPatients, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Chart;

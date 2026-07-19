import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";

export interface ChartDataPoint {
  period: string;
  stablePatients: number;
  needsMonitoringPatients: number;
  highPriorityPatients: number;
}

export interface ChartStatItem {
  id: string;
  label: string;
  value: number | string;
}

interface StatsHeaderProps {
  stats: ChartStatItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  isDark: boolean;
}

interface ChartProps {
  stats: ChartStatItem[];
  monthlyChartData: ChartDataPoint[];
  weeklyChartData: ChartDataPoint[];
  loading?: boolean;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({
  stats,
  activeTabId,
  onTabChange,
  isDark,
}) => {
  return (
    <div className="mb-8 flex space-x-8 overflow-x-auto pb-2" role="tablist">
      {stats.map((stat) => {
        const isActive = activeTabId === stat.id;
        return (
          <button
            key={stat.id}
            onClick={() => onTabChange(stat.id)}
            className="group flex min-w-max flex-col items-start rounded-lg px-2 py-1"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${stat.id}`}
          >
            <div className="relative pb-2">
              <span
                style={{
                  color: isActive
                    ? isDark
                      ? "#f1f5f9"
                      : "#111827"
                    : isDark
                      ? "#94a3b8"
                      : "#6b7280",
                }}
                className="text-sm font-medium transition-colors"
              >
                {stat.label}
              </span>
              {isActive ? (
                <div className="absolute -top-1 left-0 h-1 w-full rounded-full bg-blue-500 transition-all duration-300" />
              ) : null}
            </div>
            <span
              style={{
                color: isActive
                  ? isDark
                    ? "#f1f5f9"
                    : "#111827"
                  : isDark
                    ? "#94a3b8"
                    : "#4b5563",
              }}
              className="text-xl font-semibold transition-colors"
            >
              {typeof stat.value === "number"
                ? stat.value.toLocaleString()
                : stat.value}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const makeCustomTooltip = (isDark: boolean, t: any) => {
  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div
        className={`rounded-lg border p-3 text-sm shadow-lg ${
          isDark
            ? "border-slate-600 bg-slate-800 text-slate-100"
            : "border-gray-200 bg-white text-gray-800"
        }`}
      >
        <p
          className={`mb-1 font-semibold ${
            isDark ? "text-slate-100" : "text-gray-800"
          }`}
        >
          {label}
        </p>
        <div className="space-y-1">
          <p className="text-emerald-500">
            <span className="font-medium">
              {t("dashboard.stablePatients") || "Ổn định"}:
            </span>{" "}
            {payload
              .find((p: any) => p.dataKey === "stablePatients")
              ?.value?.toLocaleString() || 0}
          </p>
          <p className="text-amber-500">
            <span className="font-medium">
              {t("dashboard.needAttention") || "Cần theo dõi"}:
            </span>{" "}
            {payload
              .find((p: any) => p.dataKey === "needsMonitoringPatients")
              ?.value?.toLocaleString() || 0}
          </p>
          <p className="text-red-500">
            <span className="font-medium">
              {t("dashboard.highPriority") || "Ưu tiên cao"}:
            </span>{" "}
            {payload
              .find((p: any) => p.dataKey === "highPriorityPatients")
              ?.value?.toLocaleString() || 0}
          </p>
          <p
            className={`mt-1 border-t pt-1 ${
              isDark
                ? "border-slate-600 text-slate-300"
                : "border-gray-100 text-gray-600"
            }`}
          >
            <span className="font-medium">
              {t("dashboard.total") || "Tổng:"}
            </span>{" "}
            {(
              (payload.find((p: any) => p.dataKey === "stablePatients")
                ?.value ?? 0) +
              (payload.find((p: any) => p.dataKey === "needsMonitoringPatients")
                ?.value ?? 0) +
              (payload.find((p: any) => p.dataKey === "highPriorityPatients")
                ?.value ?? 0)
            ).toLocaleString()}
          </p>
        </div>
      </div>
    );
  };

  return CustomTooltip;
};

export const Chart: React.FC<ChartProps> = ({
  stats,
  monthlyChartData,
  weeklyChartData,
  loading = false,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("month");

  const chartData = activeTab === "week" ? weeklyChartData : monthlyChartData;
  const footerBorder = isDark ? "#334155" : "#e5e7eb";
  const footerText = isDark ? "#94a3b8" : "#6b7280";
  const summaryText = isDark ? "#cbd5e1" : "#4b5563";
  const gridColor = isDark ? "#334155" : "#f3f4f6";
  const tickColor = isDark ? "#94a3b8" : "#6b7280";
  const CustomTooltip = makeCustomTooltip(isDark, t);
  const latestPoint = chartData[chartData.length - 1] || {
    stablePatients: 0,
    needsMonitoringPatients: 0,
    highPriorityPatients: 0,
  };

  return (
    <div className="w-full transition-colors">
      <StatsHeader
        stats={stats}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
      />

      <div className="mt-8 h-80">
        {loading ? (
          <div className="flex h-[256px] flex-col justify-end space-y-4 px-4 pb-4 animate-pulse">
            <div className="flex h-full items-end justify-between space-x-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-1 items-end space-x-2 h-full pt-4"
                >
                  <div
                    className="w-full bg-slate-200 dark:bg-slate-700 rounded-t"
                    style={{ height: `${25 + (i % 3) * 20}%` }}
                  />
                  <div
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-t"
                    style={{ height: `${15 + (i % 2) * 15}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-700 w-full" />
            <div className="flex justify-between px-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded"
                />
              ))}
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400 dark:border-slate-700 dark:text-slate-500">
            {t("dashboard.noChartData") ||
              "Chưa có dữ liệu để hiển thị biểu đồ."}
          </div>
        ) : (
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
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill: isDark ? "rgba(148,163,184,0.08)" : "rgba(0,0,0,0.04)",
                }}
              />
              <Bar
                dataKey="stablePatients"
                name={t("dashboard.stablePatients") || "Ổn định"}
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Bar
                dataKey="needsMonitoringPatients"
                name={t("dashboard.needAttention") || "Cần theo dõi"}
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Bar
                dataKey="highPriorityPatients"
                name={t("dashboard.highPriority") || "Ưu tiên cao"}
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        <div
          style={{
            borderTopColor: footerBorder,
            borderTopWidth: 1,
            borderTopStyle: "solid",
          }}
          className="mt-4 flex items-center justify-between gap-4 pt-3"
        >
          <div style={{ color: footerText }} className="text-xs">
            {t("dashboard.showing") || "Hiển thị"}{" "}
            {activeTab === "week"
              ? t("dashboard.last4Weeks") || "4 tuần gần đây"
              : t("dashboard.last4Months") || "4 tháng gần đây"}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "#10b981" }}
              />
              <span style={{ color: summaryText }} className="text-xs">
                {t("dashboard.stablePatients")}:{" "}
                {(latestPoint.stablePatients ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "#f59e0b" }}
              />
              <span style={{ color: summaryText }} className="text-xs">
                {t("dashboard.needAttention")}:{" "}
                {(latestPoint.needsMonitoringPatients ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "#ef4444" }}
              />
              <span style={{ color: summaryText }} className="text-xs">
                {t("dashboard.highPriority")}:{" "}
                {(latestPoint.highPriorityPatients ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chart;

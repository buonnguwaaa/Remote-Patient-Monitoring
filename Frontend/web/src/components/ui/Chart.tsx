import React, { useState } from "react";

// --- Types ---
interface ChartDataPoint {
  label: string;
  value: number;
}

interface StatItem {
  id: string;
  label: string;
  value: number;
  type: "primary" | "warning" | "neutral";
}

// --- Components ---

/**
 * 1. Stats Header Component - Improved with better accessibility and styling
 */
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
            className="group flex flex-col items-start f rounded-lg px-2 py-1 min-w-max"
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
 * 2. Enhanced Custom Bar Chart Component
 */
interface CustomBarChartProps {
  data: ChartDataPoint[];
  maxValue?: number;
}

const CustomBarChart: React.FC<CustomBarChartProps> = ({ data, maxValue }) => {
  // Calculate max value from data if not provided
  const calculatedMaxValue =
    maxValue || Math.max(...data.map((item) => item.value)) * 1.1; // 10% headroom

  // Generate Y-axis ticks dynamically
  const generateTicks = () => {
    const tickCount = 5;
    const ticks = [];
    for (let i = tickCount; i >= 0; i--) {
      ticks.push(Math.round((i / tickCount) * calculatedMaxValue));
    }
    return ticks;
  };

  const ticks = generateTicks();

  return (
    <div className="w-full h-64 flex">
      {/* Y-Axis Labels */}
      <div className="flex flex-col justify-between text-gray-500 text-xs pr-3 pb-6 h-full">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>

      {/* Chart Area */}
      <div className="relative flex-1 h-full flex items-end pb-6">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {ticks.map((tick, index) => (
            <div
              key={tick}
              className="w-full border-t border-gray-200 h-0"
              style={{
                bottom: `${(index / (ticks.length - 1)) * 100}%`,
                position: "absolute",
              }}
            />
          ))}
        </div>

        {/* Bars Container */}
        <div className="relative z-10 flex justify-between items-end w-full h-full px-2">
          {data.map((point, index) => {
            // Calculate height percentage with minimum height for visibility
            const heightPct = Math.max(
              (point.value / calculatedMaxValue) * 100,
              2
            );

            return (
              <div
                key={index}
                className="flex flex-col items-center justify-end flex-1 mx-1 group relative"
                style={{ height: "100%" }}
              >
                {/* The Bar */}
                <div
                  className="w-1/2 bg-blue-400 rounded-t-lg rounded-b-sm transition-all duration-500 hover:bg-blue-500 hover:shadow-md relative min-h-2"
                  style={{ height: `${heightPct}%` }}
                >
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap">
                    <div className="font-semibold">{point.value}</div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                </div>

                {/* X-Axis Label */}
                <div className="absolute -bottom-6 text-xs text-gray-600 whitespace-nowrap font-medium">
                  {point.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Main Widget Container ---

export const Chart: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("all");

  // Mock Data
  const stats: StatItem[] = [
    { id: "all", label: "Tất cả", value: 123, type: "neutral" },
    { id: "new", label: "Mới", value: 12, type: "neutral" },
    { id: "warning", label: "Cảnh báo", value: 23, type: "warning" },
    { id: "normal", label: "Bình thường", value: 14, type: "neutral" },
  ];

  // Chart Data (T3 - T8 2025)
  const chartData: ChartDataPoint[] = [
    { label: "T5/2025", value: 75 },
    { label: "T6/2025", value: 60 },
    { label: "T7/2025", value: 88 },
    { label: "T8/2025", value: 92 },
  ];

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm w-4/10 font-sans">
      {/* Top Section */}
      <StatsHeader
        stats={stats}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Chart Section */}
      <div className="mt-8">
        <CustomBarChart data={chartData} />
      </div>
    </div>
  );
};

export default Chart;

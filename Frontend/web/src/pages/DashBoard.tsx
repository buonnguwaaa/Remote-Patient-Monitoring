import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowTrendUp,
  FaArrowTrendDown,
} from "react-icons/fa6";
import {
  FaExclamationTriangle,
  FaInfoCircle,
  FaEye,
  FaHeartbeat,
  FaUserFriends,
  FaFilter,
  FaDownload,
} from "react-icons/fa";
import { BsCalendar3 } from "react-icons/bs";
import Chart from "../components/ui/Chart";
import { mockAlerts } from "../data/mockData";

// ─── Types ────────────────────────────────────────────────────────────────────
interface KpiDef {
  label: string;
  value: string;
  change: number;
  up: boolean;
  Icon: React.ElementType;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const kpis: KpiDef[] = [
  { label: "Tổng bệnh nhân", value: "1,200", change: 15.8, up: true,  Icon: FaUserFriends },
  { label: "Đang ổn định",   value: "850",   change: 34.0, up: true,  Icon: FaHeartbeat },
  { label: "Cần chú ý",      value: "300",   change: 24.2, up: false, Icon: FaEye },
];

const violationLabel: Record<string, string> = {
  systolic:       "HA tâm thu",
  diastolic:      "HA tâm trương",
  pulse:          "Nhịp tim",
  glucose:        "Đường huyết",
  temperature:    "Nhiệt độ",
  spo2:           "SpO2",
  respiratoryRate:"Nhịp thở",
};

// ─── Badge pill ───────────────────────────────────────────────────────────────
const Badge: React.FC<{ value: number; up: boolean }> = ({ value, up }) => (
  <span
    className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
      up
        ? "bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
        : "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400"
    }`}
  >
    {up ? <FaArrowTrendUp size={9} /> : <FaArrowTrendDown size={9} />}
    {value}%
  </span>
);

// ─── KPI card (top row) ───────────────────────────────────────────────────────
const KpiCard: React.FC<KpiDef> = ({ label, value, change, up, Icon }) => (
  <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-2xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
        <Icon size={14} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      {/* info dot */}
      <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-slate-600" />
    </div>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
        {value}
      </span>
      <Badge value={change} up={up} />
    </div>
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  aside?: React.ReactNode;
}> = ({ title, icon, aside }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
      <span className="text-gray-400 dark:text-slate-400">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
    {aside}
  </div>
);

// ─── Recent Alerts list ───────────────────────────────────────────────────────
const RecentAlerts: React.FC = () => {
  const navigate = useNavigate();

  const alerts = [...mockAlerts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const ago = (ds: string) => {
    const mins = Math.floor((Date.now() - new Date(ds).getTime()) / 60000);
    const hrs  = Math.floor(mins / 60);
    if (mins < 60) return `${mins}p trước`;
    if (hrs  < 24) return `${hrs}h trước`;
    return new Date(ds).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="px-5 pt-5 pb-3">
        <SectionHeader
          icon={<FaExclamationTriangle size={13} />}
          title="Cảnh báo gần đây"
          aside={
            <button
              onClick={() => navigate("/threshold-alerts")}
              className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 hover:opacity-75 transition-opacity"
            >
              Xem tất cả
            </button>
          }
        />
      </div>

      <div className="border-t border-gray-50 dark:border-slate-700/40 flex-1 overflow-auto">
        {alerts.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8">Không có cảnh báo</p>
        ) : (
          alerts.map((alert, i) => {
            const isHigh = alert.severity === "high";
            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors ${
                  i > 0 ? "border-t border-gray-50 dark:border-slate-700/30" : ""
                }`}
                onClick={() => navigate("/threshold-alerts")}
              >
                <div
                  className={`mt-0.5 shrink-0 p-1.5 rounded-lg ${
                    isHigh
                      ? "bg-red-50 dark:bg-red-900/30 text-red-400"
                      : "bg-amber-50 dark:bg-amber-900/30 text-amber-400"
                  }`}
                >
                  {isHigh
                    ? <FaExclamationTriangle size={10} />
                    : <FaInfoCircle size={10} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">
                      {alert.patientName}
                    </p>
                    <span className="shrink-0 text-[10px] tabular-nums text-gray-400 dark:text-slate-500">
                      {ago(alert.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-500 truncate">
                    {alert.violations
                      .map(v => `${violationLabel[v.type] ?? v.type}: ${v.observed}`)
                      .join(" · ")}
                  </p>
                </div>

                <div className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${
                  alert.status === "ack" ? "bg-teal-400" : "bg-red-400"
                }`} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const DashBoard = () => {
  const now = new Date();
  const dateRange = `${now.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" })}`;

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-slate-900 font-sans">
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-4">

        {/* ── Page header ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Tổng quan
          </h1>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-xs font-medium px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <BsCalendar3 size={11} />
              {dateRange}
            </button>
            <button className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-xs font-medium px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <FaFilter size={10} />
              Lọc
            </button>
            <button className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-300 text-xs font-medium px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <FaDownload size={10} />
              Xuất
            </button>
          </div>
        </div>

        {/* ── KPI row ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* ── Main row: Chart + Alerts ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

          {/* Chart card */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700/60 rounded-2xl p-5">
            <SectionHeader
              icon={<span className="text-[13px]">📊</span>}
              title="Tổng quan bệnh nhân"
              aside={
                <div className="flex items-center gap-1.5">
                  <button className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-600 rounded-lg px-2 py-1 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <FaFilter size={9} /> Lọc
                  </button>
                  <button className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-600 rounded-lg px-2 py-1 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    ↕ Sắp xếp
                  </button>
                </div>
              }
            />
            <Chart />
          </div>

          {/* Alerts card */}
          <div className="lg:col-span-2">
            <RecentAlerts />
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashBoard;

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowTrendDown, FaArrowTrendUp } from "react-icons/fa6";
import {
  FaDownload,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaHeartbeat,
  FaInfoCircle,
  FaUserFriends,
} from "react-icons/fa";
import { BsCalendar3 } from "react-icons/bs";
import * as XLSX from 'xlsx';

import Chart, {
  type ChartDataPoint,
  type ChartStatItem,
} from "../components/ui/Chart";
import { getAlerts, getMyPatients } from "../services/patientService";
import type { AlertResponse, AssignmentResponse } from "../types/patient";

interface KpiDef {
  label: string;
  value: string;
  change?: number;
  up?: boolean;
  Icon: React.ElementType;
}

const CHART_BUCKETS = 4;
const MAX_ALERT_FETCH = 1000;

const violationLabel: Record<string, string> = {
  systolic: "HA tâm thu",
  diastolic: "HA tâm trương",
  pulse: "Nhịp tim",
  glucose: "Đường huyết",
  temperature: "Nhiệt độ",
  spo2: "SpO2",
  respiratoryRate: "Nhịp thở",
  heart_rate: "Nhịp tim",
  respiratory_rate: "Nhịp thở",
  blood_pressure_systolic: "Huyết áp tâm thu",
  blood_pressure_diastolic: "Huyết áp tâm trương",
};

const Badge: React.FC<{ value: number; up: boolean }> = ({ value, up }) => (
  <span
    className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
      up
        ? "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
        : "bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400"
    }`}
  >
    {up ? <FaArrowTrendUp size={9} /> : <FaArrowTrendDown size={9} />}
    {value}%
  </span>
);

const KpiCard: React.FC<KpiDef> = ({ label, value, change, up, Icon }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-800">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
        <Icon size={14} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="h-1.5 w-1.5 rounded-full bg-gray-200 dark:bg-slate-600" />
    </div>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-bold leading-none text-gray-900 dark:text-white">
        {value}
      </span>
      {typeof change === "number" && typeof up === "boolean" ? (
        <Badge value={change} up={up} />
      ) : null}
    </div>
  </div>
);

const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  aside?: React.ReactNode;
}> = ({ title, icon, aside }) => (
  <div className="mb-4 flex items-center justify-between">
    <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
      <span className="text-gray-400 dark:text-slate-400">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
    {aside}
  </div>
);

function formatKpiValue(value: number | null | undefined) {
  if (value === undefined) return "...";
  if (value === null) return "--";
  return new Intl.NumberFormat("vi-VN").format(value);
}

function ago(ds: string) {
  const mins = Math.floor((Date.now() - new Date(ds).getTime()) / 60000);
  const hrs = Math.floor(mins / 60);
  if (mins < 60) return `${mins}p trước`;
  if (hrs < 24) return `${hrs}h trước`;
  return new Date(ds).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

function isAttentionAlert(alert: AlertResponse) {
  return alert.severity === "high" && alert.status === "open";
}

function endOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(date: Date) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function buildAlertsByPatient(
  alerts: AlertResponse[],
  assignedPatientIds: Set<string>,
) {
  const grouped = new Map<string, AlertResponse[]>();

  alerts
    .filter((alert) => assignedPatientIds.has(alert.patientId))
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .forEach((alert) => {
      const current = grouped.get(alert.patientId) || [];
      current.push(alert);
      grouped.set(alert.patientId, current);
    });

  return grouped;
}

function getPatientCountsAtDate(
  assignments: AssignmentResponse[],
  alertsByPatient: Map<string, AlertResponse[]>,
  snapshotAt: Date,
) {
  let normalPatients = 0;
  let warningPatients = 0;
  const snapshotTime = snapshotAt.getTime();

  assignments.forEach((assignment) => {
    const assignmentTime = new Date(assignment.createdAt).getTime();
    if (!Number.isNaN(assignmentTime) && assignmentTime > snapshotTime) {
      return;
    }

    const latestAlert = (alertsByPatient.get(assignment.patientId) || []).find(
      (alert) => new Date(alert.createdAt).getTime() <= snapshotTime,
    );

    if (latestAlert && isAttentionAlert(latestAlert)) {
      warningPatients += 1;
      return;
    }

    normalPatients += 1;
  });

  return { normalPatients, warningPatients };
}

function buildDashboardChartData(
  assignments: AssignmentResponse[],
  alerts: AlertResponse[],
) {
  const assignedPatientIds = new Set(assignments.map((item) => item.patientId));
  const alertsByPatient = buildAlertsByPatient(alerts, assignedPatientIds);
  const now = new Date();

  const monthlyChartData: ChartDataPoint[] = Array.from(
    { length: CHART_BUCKETS },
    (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (CHART_BUCKETS - 1 - index), 1);
      const monthEnd = endOfMonth(monthDate);
      const snapshotAt = monthEnd.getTime() > now.getTime() ? now : monthEnd;
      const counts = getPatientCountsAtDate(assignments, alertsByPatient, snapshotAt);

      return {
        period: `T${monthDate.getMonth() + 1}`,
        ...counts,
      };
    },
  );

  const weeklyChartData: ChartDataPoint[] = Array.from(
    { length: CHART_BUCKETS },
    (_, index) => {
      const weekSeed = new Date(now);
      weekSeed.setDate(now.getDate() - (CHART_BUCKETS - 1 - index) * 7);
      const weekEnd = endOfWeek(weekSeed);
      const snapshotAt = weekEnd.getTime() > now.getTime() ? now : weekEnd;
      const counts = getPatientCountsAtDate(assignments, alertsByPatient, snapshotAt);

      return {
        period: `Tuần ${index + 1}`,
        ...counts,
      };
    },
  );

  const chartStats: ChartStatItem[] = [
    {
      id: "all",
      label: "Hiện tại",
      value: assignments.length,
    },
    {
      id: "month",
      label: "Tháng này",
      value:
        (monthlyChartData[monthlyChartData.length - 1]?.normalPatients ?? 0) +
        (monthlyChartData[monthlyChartData.length - 1]?.warningPatients ?? 0),
    },
    {
      id: "week",
      label: "Tuần này",
      value:
        (weeklyChartData[weeklyChartData.length - 1]?.normalPatients ?? 0) +
        (weeklyChartData[weeklyChartData.length - 1]?.warningPatients ?? 0),
    },
  ];

  return {
    monthlyChartData,
    weeklyChartData,
    chartStats,
  };
}

const RecentAlerts: React.FC<{
  alerts: AlertResponse[];
  loading: boolean;
}> = ({ alerts, loading }) => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700/60 dark:bg-slate-800">
      <div className="px-5 pb-3 pt-5">
        <SectionHeader
          icon={<FaExclamationTriangle size={13} />}
          title="Cảnh báo gần đây"
          aside={
            <button
              onClick={() => navigate("/threshold-alerts")}
              className="text-[11px] font-semibold text-indigo-500 transition-opacity hover:opacity-75 dark:text-indigo-400"
            >
              Xem tất cả
            </button>
          }
        />
      </div>

      <div className="flex-1 overflow-auto border-t border-gray-50 dark:border-slate-700/40">
        {loading ? (
          <p className="py-8 text-center text-xs text-gray-400">
            Đang tải cảnh báo...
          </p>
        ) : alerts.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            Không có cảnh báo
          </p>
        ) : (
          alerts.map((alert, index) => {
            const isHigh = alert.severity === "high";

            return (
              <div
                key={alert.id}
                className={`flex cursor-pointer items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40 ${
                  index > 0
                    ? "border-t border-gray-50 dark:border-slate-700/30"
                    : ""
                }`}
                onClick={() => navigate("/threshold-alerts")}
              >
                <div
                  className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${
                    isHigh
                      ? "bg-red-50 text-red-400 dark:bg-red-900/30"
                      : "bg-amber-50 text-amber-400 dark:bg-amber-900/30"
                  }`}
                >
                  {isHigh ? (
                    <FaExclamationTriangle size={10} />
                  ) : (
                    <FaInfoCircle size={10} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-gray-800 dark:text-slate-100">
                      {alert.patientName || "Không rõ bệnh nhân"}
                    </p>
                    <span className="shrink-0 text-[10px] tabular-nums text-gray-400 dark:text-slate-500">
                      {ago(alert.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-slate-500">
                    {alert.violations
                      .map(
                        (violation) =>
                          `${violationLabel[violation.type] ?? violation.type}: ${violation.observed}`,
                      )
                      .join(" · ")}
                  </p>
                </div>

                <div
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    alert.status === "ack" ? "bg-teal-400" : "bg-red-400"
                  }`}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const DashBoard = () => {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date filter state
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Filter state
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'stable' | 'attention'>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium'>('all');
  
  const dateRange = `${new Date(startDate).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
  })} - ${new Date(endDate).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
  })}`;

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [assignmentList, alertList] = await Promise.all([
          getMyPatients(),
          getAlerts({
            limit: MAX_ALERT_FETCH,
            page: 1,
            sortOrder: "desc",
          }),
        ]);

        setAssignments(assignmentList);
        setAlerts(alertList);
      } catch (loadError: any) {
        console.error("Failed to load doctor dashboard", loadError);
        setError(
          loadError?.response?.data?.error ||
            loadError?.message ||
            "Không thể tải dữ liệu dashboard.",
        );
        setAssignments([]);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  const assignedPatientIds = useMemo(
    () => new Set(assignments.map((item) => item.patientId)),
    [assignments],
  );

  const filteredAlerts = useMemo(
    () => {
      let filtered = alerts.filter((alert) => assignedPatientIds.has(alert.patientId));
      
      // Filter by date range
      filtered = filtered.filter((alert) => {
        const alertDate = new Date(alert.createdAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return alertDate >= start && alertDate <= end;
      });
      
      // Filter by severity
      if (filterSeverity !== 'all') {
        filtered = filtered.filter((alert) => alert.severity === filterSeverity);
      }
      
      return filtered;
    },
    [alerts, assignedPatientIds, startDate, endDate, filterSeverity],
  );

  const latestAlertsByPatient = useMemo(() => {
    const sortedAlerts = [...filteredAlerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latestByPatient = new Map<string, AlertResponse>();

    sortedAlerts.forEach((alert) => {
      if (!latestByPatient.has(alert.patientId)) {
        latestByPatient.set(alert.patientId, alert);
      }
    });

    return latestByPatient;
  }, [filteredAlerts]);

  const dashboardStats = useMemo(() => {
    if (loading) {
      return {
        total: undefined,
        stable: undefined,
        attention: undefined,
      };
    }

    if (error) {
      return {
        total: null,
        stable: null,
        attention: null,
      };
    }

    const total = assignments.length;
    const attention = Array.from(latestAlertsByPatient.values()).filter(isAttentionAlert)
      .length;

    return {
      total,
      stable: Math.max(total - attention, 0),
      attention,
    };
  }, [assignments, error, latestAlertsByPatient, loading]);

  const recentAlerts = useMemo(
    () =>
      [...filteredAlerts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [filteredAlerts],
  );

  const chartPayload = useMemo(
    () => buildDashboardChartData(assignments, filteredAlerts),
    [assignments, filteredAlerts],
  );

  const chartStats = useMemo<ChartStatItem[]>(
    () =>
      loading
        ? [
            { id: "all", label: "Tất cả", value: "..." },
            { id: "month", label: "Tháng", value: "..." },
            { id: "week", label: "Tuần", value: "..." },
          ]
        : chartPayload.chartStats,
    [chartPayload.chartStats, loading],
  );

  const kpis = useMemo<KpiDef[]>(
    () => [
      {
        label: "Tổng bệnh nhân",
        value: formatKpiValue(dashboardStats.total),
        Icon: FaUserFriends,
      },
      {
        label: "Đang ổn định",
        value: formatKpiValue(dashboardStats.stable),
        Icon: FaHeartbeat,
      },
      {
        label: "Cần chú ý",
        value: formatKpiValue(dashboardStats.attention),
        Icon: FaEye,
      },
    ],
    [dashboardStats],
  );

  // Export to Excel function
  const handleExport = () => {
    // Prepare data for Excel
    const excelData = assignments.map((assignment) => {
      const latestAlert = latestAlertsByPatient.get(assignment.patientId);
      const status = latestAlert && isAttentionAlert(latestAlert) ? 'Cần chú ý' : 'Ổn định';
      const alertInfo = latestAlert 
        ? latestAlert.violations.map(v => `${violationLabel[v.type] ?? v.type}: ${v.observed}`).join('; ')
        : 'Không có';
      const severity = latestAlert ? (latestAlert.severity === 'high' ? 'Cao' : 'Trung bình') : '-';
      const time = latestAlert ? new Date(latestAlert.createdAt).toLocaleString('vi-VN') : '-';
      
      return {
        'Bệnh nhân': assignment.patientName || 'Không rõ',
        'Mã BN': assignment.patientCode || assignment.patientPublicId || '-',
        'Trạng thái': status,
        'Cảnh báo gần nhất': alertInfo,
        'Mức độ': severity,
        'Thời gian': time,
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 25 }, // Bệnh nhân
      { wch: 15 }, // Mã BN
      { wch: 15 }, // Trạng thái
      { wch: 50 }, // Cảnh báo gần nhất
      { wch: 12 }, // Mức độ
      { wch: 20 }, // Thời gian
    ];
    ws['!cols'] = colWidths;

    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F46E5" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');

    // Add summary sheet
    const summaryData = [
      { 'Chỉ số': 'Tổng bệnh nhân', 'Giá trị': dashboardStats.total || 0 },
      { 'Chỉ số': 'Đang ổn định', 'Giá trị': dashboardStats.stable || 0 },
      { 'Chỉ số': 'Cần chú ý', 'Giá trị': dashboardStats.attention || 0 },
      { 'Chỉ số': '', 'Giá trị': '' },
      { 'Chỉ số': 'Khoảng thời gian', 'Giá trị': dateRange },
      { 'Chỉ số': 'Ngày xuất', 'Giá trị': new Date().toLocaleString('vi-VN') },
    ];
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng quan');

    // Generate filename
    const filename = `dashboard_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Write and download file
    XLSX.writeFile(wb, filename);
  };

  // Apply date filter
  const handleApplyDateFilter = () => {
    setShowDatePicker(false);
    // Data will be automatically filtered by useMemo
  };

  // Reset filters
  const handleResetFilters = () => {
    const date = new Date();
    date.setDate(1);
    setStartDate(date.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setFilterStatus('all');
    setFilterSeverity('all');
    setShowFilterMenu(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] font-sans dark:bg-slate-900">
      <div className="mx-auto max-w-screen-2xl space-y-4 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Tổng quan
          </h1>
          <div className="flex items-center gap-2">
            {/* Date Picker Button */}
            <div className="relative">
              <button 
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <BsCalendar3 size={11} />
                {dateRange}
              </button>
              
              {showDatePicker && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Chọn khoảng thời gian
                    </h3>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                        Từ ngày
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                        Đến ngày
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleApplyDateFilter}
                        className="flex-1 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600"
                      >
                        Áp dụng
                      </button>
                      <button
                        onClick={() => {
                          const date = new Date();
                          date.setDate(1);
                          setStartDate(date.toISOString().split('T')[0]);
                          setEndDate(new Date().toISOString().split('T')[0]);
                        }}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Đặt lại
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative">
              <button 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FaFilter size={10} />
                Lọc
                {(filterStatus !== 'all' || filterSeverity !== 'all') && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] text-white">
                    {(filterStatus !== 'all' ? 1 : 0) + (filterSeverity !== 'all' ? 1 : 0)}
                  </span>
                )}
              </button>
              
              {showFilterMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Bộ lọc
                    </h3>
                    <button
                      onClick={() => setShowFilterMenu(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-slate-400">
                        Mức độ cảnh báo
                      </label>
                      <div className="space-y-1">
                        {[
                          { value: 'all', label: 'Tất cả' },
                          { value: 'high', label: 'Cao' },
                          { value: 'medium', label: 'Trung bình' },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700"
                          >
                            <input
                              type="radio"
                              name="severity"
                              value={option.value}
                              checked={filterSeverity === option.value}
                              onChange={(e) => setFilterSeverity(e.target.value as any)}
                              className="h-3 w-3"
                            />
                            <span className="text-xs text-gray-700 dark:text-slate-300">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 border-t border-gray-100 pt-3 dark:border-slate-700">
                      <button
                        onClick={() => setShowFilterMenu(false)}
                        className="flex-1 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600"
                      >
                        Áp dụng
                      </button>
                      <button
                        onClick={handleResetFilters}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export Button */}
            <button 
              onClick={handleExport}
              disabled={loading || assignments.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FaDownload size={10} />
              Xuất
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-800 lg:col-span-3">
            <SectionHeader
              icon={<span className="text-[13px]">📊</span>}
              title="Tổng quan bệnh nhân"
            />
            <Chart
              stats={chartStats}
              monthlyChartData={chartPayload.monthlyChartData}
              weeklyChartData={chartPayload.weeklyChartData}
              loading={loading}
            />
          </div>

          <div className="lg:col-span-2">
            <RecentAlerts alerts={recentAlerts} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashBoard;

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowTrendDown, FaArrowTrendUp } from "react-icons/fa6";
import {
  FaDownload,
  FaExclamationTriangle,
  FaEye,
  FaHeartbeat,
  FaInfoCircle,
  FaUserFriends,
} from "react-icons/fa";
import { BsCalendar3 } from "react-icons/bs";

import Chart, {
  type ChartDataPoint,
  type ChartStatItem,
} from "../components/ui/Chart";
import { getAlerts, getMyPatients, getMeasurements } from "../services/patientService";
import { getThresholds } from "../services/thresholdService";
import { getMyAppointments, type FollowUpAppointment } from "../services/appointmentService";
import type { AlertResponse, AssignmentResponse } from "../types/patient";
import { exportAlertsToExcel } from "../utils/export/alertExporter";
import {
  exportHealthReportToExcel,
  calculateHealthStatistics,
  type PatientReportData,
} from "../utils/export/healthReportExporter";
import { exportComplianceToExcel } from "../utils/export/complianceExporter";
import { getAdherence } from "../services/patientService";
import { useTranslation } from "react-i18next";

interface KpiDef {
  label: string;
  value: string;
  change?: number;
  up?: boolean;
  Icon: React.ElementType;
  variant?: "danger" | "warning" | "success" | "info" | "default";
}

const CHART_BUCKETS = 4;
const MAX_ALERT_FETCH = 1000;



const Badge: React.FC<{ value: number; up: boolean }> = ({ value, up }) => (
  <span
    className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${up
      ? "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
      : "bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400"
      }`}
  >
    {up ? <FaArrowTrendUp size={9} /> : <FaArrowTrendDown size={9} />}
    {value}%
  </span>
);

const KpiCard: React.FC<KpiDef> = ({ label, value, change, up, Icon, variant = "default" }) => {
  const bgClass =
    variant === "danger" ? "bg-red-50 dark:bg-red-900/10" :
    variant === "warning" ? "bg-amber-50 dark:bg-amber-900/10" :
    variant === "success" ? "bg-emerald-50 dark:bg-emerald-900/10" :
    variant === "info" ? "bg-blue-50 dark:bg-blue-900/10" :
    "bg-white dark:bg-slate-800";

  const iconClass =
    variant === "danger" ? "text-red-500" :
    variant === "warning" ? "text-amber-500" :
    variant === "success" ? "text-emerald-500" :
    variant === "info" ? "text-blue-500" :
    "text-gray-400 dark:text-slate-500";
    
  return (
    <div className={`rounded-2xl border border-gray-100 p-5 dark:border-slate-700/60 ${bgClass}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex items-center gap-2 ${iconClass}`}>
          <Icon size={14} />
          <span className="text-xs font-medium">{label}</span>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold leading-none ${variant === "default" ? "text-gray-900 dark:text-white" : iconClass}`}>
          {value}
        </span>
        {typeof change === "number" && typeof up === "boolean" ? (
          <Badge value={change} up={up} />
        ) : null}
      </div>
    </div>
  );
};

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

function ago(ds: string, t: any) {
  const mins = Math.floor((Date.now() - new Date(ds).getTime()) / 60000);
  const hrs = Math.floor(mins / 60);
  if (mins < 60) return `${mins}${t("dashboard.minsAgo") || "p trước"}`;
  if (hrs < 24) return `${hrs}${t("dashboard.hoursAgo") || "h trước"}`;
  return new Date(ds).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
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
  let criticalPatients = 0;
  let lowPatients = 0;
  const snapshotTime = snapshotAt.getTime();

  assignments.forEach((assignment) => {
    const assignmentTime = new Date(assignment.createdAt).getTime();
    if (!Number.isNaN(assignmentTime) && assignmentTime > snapshotTime) {
      return;
    }

    const latestAlert = (alertsByPatient.get(assignment.patientId) || []).find(
      (alert) => new Date(alert.createdAt).getTime() <= snapshotTime,
    );

    if (latestAlert && latestAlert.status === "open") {
      if (latestAlert.severity === "high") {
        criticalPatients += 1;
        return;
      } else if (latestAlert.severity === "medium") {
        warningPatients += 1;
        return;
      } else if (latestAlert.severity === "low") {
        lowPatients += 1;
        return;
      }
    }

    normalPatients += 1;
  });

  return { normalPatients, warningPatients, criticalPatients, lowPatients };
}

function buildDashboardChartData(
  assignments: AssignmentResponse[],
  alerts: AlertResponse[],
  t: (key: string) => string
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
      id: "month",
      label: t("dashboard.chartThisMonth"),
      value:
        (monthlyChartData[monthlyChartData.length - 1]?.warningPatients ?? 0) +
        (monthlyChartData[monthlyChartData.length - 1]?.criticalPatients ?? 0) +
        (monthlyChartData[monthlyChartData.length - 1]?.lowPatients ?? 0),
    },
    {
      id: "week",
      label: t("dashboard.chartThisWeek"),
      value:
        (weeklyChartData[weeklyChartData.length - 1]?.warningPatients ?? 0) +
        (weeklyChartData[weeklyChartData.length - 1]?.criticalPatients ?? 0) +
        (weeklyChartData[weeklyChartData.length - 1]?.lowPatients ?? 0),
    },
  ];

  return {
    monthlyChartData,
    weeklyChartData,
    chartStats,
  };
}

const TodoList: React.FC<{
  alerts: AlertResponse[];
  appointments: FollowUpAppointment[];
  loading: boolean;
}> = ({ alerts, appointments, loading }) => {
  const navigate = useNavigate();

  const pendingAlerts = useMemo(() => alerts.filter(a => a.status === "open").slice(0, 5), [alerts]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700/60 dark:bg-slate-800">
      <div className="px-5 pb-3 pt-5">
        <SectionHeader
          icon={<span className="text-[13px]">✅</span>}
          title="Việc cần làm hôm nay"
        />
      </div>

      <div className="flex-1 overflow-auto border-t border-gray-50 dark:border-slate-700/40">
        {loading ? (
          <p className="py-8 text-center text-xs text-gray-400">Đang tải...</p>
        ) : pendingAlerts.length === 0 && appointments.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">Không có việc cần xử lý hôm nay.</p>
        ) : (
          <div className="space-y-4 p-4">
            {pendingAlerts.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-slate-400">Cảnh báo chưa xử lý</h4>
                <div className="space-y-2">
                  {pendingAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between rounded-lg bg-red-50 p-3 dark:bg-red-900/10">
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{alert.patientName || "Chưa rõ"}</p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">Mức độ: {alert.severity === 'high' ? 'Nguy hiểm' : alert.severity === 'medium' ? 'Cảnh báo' : 'Thấp'}</p>
                      </div>
                      <button onClick={() => navigate("/threshold-alerts")} className="rounded bg-red-100 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30">
                        Xử lý
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {appointments.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-slate-400">Lịch khám hôm nay</h4>
                <div className="space-y-2">
                  {appointments.map((appt) => (
                    <div key={appt.id} className="flex items-center justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                          {new Date(appt.scheduledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {assignments.find(a => a.patientId === appt.patientId)?.patientName || "Bệnh nhân không rõ"}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{appt.notes || "Khám định kỳ"}</p>
                      </div>
                      <div className="rounded bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                        Sắp diễn ra
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RecentAlerts: React.FC<{
  alerts: AlertResponse[];
  loading: boolean;
}> = ({ alerts, loading }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Violation labels for displaying in UI
  const violationLabel: Record<string, string> = {
    systolic: "HA tâm thu",
    diastolic: "HA tâm trương",
    sys: "HA tâm thu",
    bp_diastolic: "HA tâm trương",
    pulse: t("patientDetail.heartRate"),
    glucose: t("patientDetail.glucose"),
    temperature: t("patientDetail.temperature"),
    spo2: "SpO2",
    respiratoryRate: t("patientDetail.respiratoryRate"),
    heart_rate: t("patientDetail.heartRate"),
    respiratory_rate: t("patientDetail.respiratoryRate"),
    blood_pressure_systolic: t("patientDetail.systolic"),
    blood_pressure_diastolic: t("patientDetail.diastolic"),
  };
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700/60 dark:bg-slate-800">
      <div className="px-5 pb-3 pt-5">
        <SectionHeader
          icon={<FaExclamationTriangle size={13} />}
          title={t("dashboard.recentAlerts")}
          aside={
            <button
              onClick={() => navigate("/threshold-alerts")}
              className="text-[11px] font-semibold text-indigo-500 transition-opacity hover:opacity-75 dark:text-indigo-400"
            >
              {t("dashboard.viewAll")}
            </button>
          }
        />
      </div>

      <div className="flex-1 overflow-auto border-t border-gray-50 dark:border-slate-700/40">
        {loading ? (
          <p className="py-8 text-center text-xs text-gray-400">
            {t("dashboard.loadingAlerts")}
          </p>
        ) : alerts.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            {t("dashboard.noAlerts")}
          </p>
        ) : (
          alerts.map((alert, index) => {
            return (
              <div
                key={alert.id}
                className={`flex cursor-pointer items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40 ${index > 0
                  ? "border-t border-gray-50 dark:border-slate-700/30"
                  : ""
                  }`}
                onClick={() => navigate("/threshold-alerts")}
              >
                <div
                  className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${alert.severity === "high"
                    ? "bg-red-50 text-red-400 dark:bg-red-900/30"
                    : alert.severity === "medium"
                    ? "bg-amber-50 text-amber-400 dark:bg-amber-900/30"
                    : "bg-slate-50 text-slate-400 dark:bg-slate-900/30"
                    }`}
                >
                  {alert.severity === "high" ? (
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
                      {ago(alert.createdAt, t)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-gray-400 dark:text-slate-500">
                    {alert.violations
                      .map(
                        (violation) => {
                          const cleanType = violation.type.replace(/_(max|min|high|low)$/, "");
                          const label = violationLabel[cleanType] || violationLabel[violation.type] || violation.type;
                          return `${label}: ${violation.observed}`;
                        }
                      )
                      .join(" · ")}
                  </p>
                </div>

                <div
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${alert.status === "ack" ? "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                >
                  {alert.status === "ack" ? "Đã xử lý" : "Chờ xử lý"}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const DashBoard = () => {
  const { t } = useTranslation();

  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [appointments, setAppointments] = useState<FollowUpAppointment[]>([]);
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

  // Export menu and health report modal state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHealthReportModal, setShowHealthReportModal] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState({ current: 0, total: 0 });

  // Compliance report modal state
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [compliancePatientId, setCompliancePatientId] = useState<string>("");
  const [complianceDays, setComplianceDays] = useState<number>(30);
  const [isGeneratingCompliance, setIsGeneratingCompliance] = useState(false);

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

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.toISOString();
        today.setHours(23, 59, 59, 999);
        const todayEnd = today.toISOString();

        const [assignmentList, alertList, appointmentList] = await Promise.all([
          getMyPatients(),
          getAlerts({
            limit: MAX_ALERT_FETCH,
            page: 1,
            sortOrder: "desc",
          }),
          getMyAppointments({
            from: todayStart,
            to: todayEnd,
          }),
        ]);

        setAssignments(assignmentList);
        setAlerts(alertList);
        setAppointments(appointmentList);
      } catch (loadError: any) {
        console.error("Failed to load doctor dashboard", loadError);
        setError(
          loadError?.response?.data?.error ||
          loadError?.message ||
          "Không thể tải dữ liệu dashboard.",
        );
        setAssignments([]);
        setAlerts([]);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  const assignedPatientIds = useMemo(
    () => new Set(assignments.map((item) => item.patientId)),
    [assignments],
  );

  const filteredAlerts = useMemo(
    () => {
      let filtered = alerts.filter((alert) => assignedPatientIds.has(alert.patientId));

      filtered = filtered.filter((alert) => {
        const alertDate = new Date(alert.createdAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return alertDate >= start && alertDate <= end;
      });

      return filtered;
    },
    [alerts, assignedPatientIds, startDate, endDate],
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
        warning: undefined,
        critical: undefined,
        low: undefined,
      };
    }

    if (error) {
      return {
        total: null,
        stable: null,
        warning: null,
        critical: null,
        low: null,
      };
    }

    const total = assignments.length;

    let warning = 0;
    let critical = 0;
    let low = 0;

    const patientSeverity = new Map<string, string>();

    const allAssignedAlerts = alerts.filter(a => assignedPatientIds.has(a.patientId));

    allAssignedAlerts.forEach((alert) => {
      if (alert.status === "open") {
        const curr = patientSeverity.get(alert.patientId);
        if (
          !curr ||
          (curr !== "high" && alert.severity === "high") ||
          (curr === "low" && alert.severity === "medium")
        ) {
          patientSeverity.set(alert.patientId, alert.severity);
        }
      }
    });

    Array.from(patientSeverity.values()).forEach((severity) => {
      if (severity === "high") critical++;
      else if (severity === "medium") warning++;
      else if (severity === "low") low++;
    });

    return {
      total,
      stable: Math.max(total - warning - critical - low, 0),
      warning,
      critical,
      low,
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
    () => buildDashboardChartData(assignments, filteredAlerts, t),
    [assignments, filteredAlerts],
  );

  const chartStats = useMemo<ChartStatItem[]>(
    () =>
      loading
        ? [
          { id: "month", label: t("patientDetail.month"), value: "..." },
          { id: "week", label: t("patientDetail.week"), value: "..." },
        ]
        : chartPayload.chartStats,
    [chartPayload.chartStats, loading],
  );

  const kpis = useMemo<KpiDef[]>(
    () => [
      {
        label: t("dashboard.totalPatients"),
        value: formatKpiValue(dashboardStats.total),
        Icon: FaUserFriends,
        variant: "default",
      },
      {
        label: t("dashboard.criticalPatients", "Bệnh nhân nguy hiểm"),
        value: formatKpiValue(dashboardStats.critical),
        Icon: FaExclamationTriangle,
        variant: "danger",
      },
      {
        label: t("dashboard.warningPatients", "Bệnh nhân cảnh báo"),
        value: formatKpiValue(dashboardStats.warning),
        Icon: FaInfoCircle,
        variant: "warning",
      },
      {
        label: t("dashboard.lowPatients", "Bệnh nhân cần lưu ý"),
        value: formatKpiValue(dashboardStats.low),
        Icon: FaEye,
        variant: "info",
      },
      {
        label: t("dashboard.stablePatients", "Bệnh nhân ổn định"),
        value: formatKpiValue(dashboardStats.stable),
        Icon: FaHeartbeat,
        variant: "success",
      },
    ],
    [dashboardStats],
  );

  // Export alerts to Excel
  const handleExportAlerts = () => {
    setShowExportMenu(false);

    exportAlertsToExcel({
      allAlerts: filteredAlerts,
      assignments,
      dashboardStats: { total: dashboardStats.total, stable: dashboardStats.stable, attention: (dashboardStats.warning || 0) + (dashboardStats.critical || 0) + (dashboardStats.low || 0) },
      dateRange,
    });
  };

  // Open health report modal
  const handleOpenHealthReportModal = () => {
    setShowExportMenu(false);
    setShowHealthReportModal(true);
    setSelectedPatients(new Set());
  };

  // Toggle patient selection
  const handleTogglePatient = (patientId: string) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
  };

  // Select all patients
  const handleSelectAllPatients = () => {
    if (selectedPatients.size === assignments.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(assignments.map(a => a.patientId)));
    }
  };

  // Generate health report
  const handleGenerateHealthReport = async () => {
    if (selectedPatients.size === 0) {
      alert(t("dashboard.selectAtLeastOne"));
      return;
    }

    setIsGeneratingReport(true);
    setReportProgress({ current: 0, total: selectedPatients.size });

    try {
      const selectedAssignments = assignments.filter(a => selectedPatients.has(a.patientId));
      const reportData: PatientReportData[] = [];
      let current = 0;

      // Fetch data for each selected patient
      for (const assignment of selectedAssignments) {
        try {
          const [measurements, thresholds] = await Promise.all([
            getMeasurements({
              patientId: assignment.patientId,
            }),
            getThresholds({ patientId: assignment.patientId, latest: true }),
          ]);

          // Filter measurements by date range
          const filteredMeasurements = measurements.filter((m: any) => {
            const measurementDate = new Date(m.createdAt);
            const start = new Date(reportStartDate);
            const end = new Date(reportEndDate);
            end.setHours(23, 59, 59, 999);
            return measurementDate >= start && measurementDate <= end;
          });

          const threshold = thresholds.length > 0 ? thresholds[0] : null;

          // Calculate statistics
          const stats = calculateHealthStatistics(filteredMeasurements, threshold);

          reportData.push({
            assignment,
            measurements: filteredMeasurements,
            threshold,
            stats,
          });

          current++;
          setReportProgress({ current, total: selectedPatients.size });
        } catch (error) {
          console.error(`Error fetching data for patient ${assignment.patientId}:`, error);
        }
      }

      // Generate Excel file
      exportHealthReportToExcel(reportData, reportStartDate, reportEndDate);

      setShowHealthReportModal(false);
      setIsGeneratingReport(false);
    } catch (error) {
      console.error('Error generating health report:', error);
      alert('Có lỗi xảy ra khi tạo báo cáo. Vui lòng thử lại.');
      setIsGeneratingReport(false);
    }
  };

  // Apply date filter
  const handleApplyDateFilter = () => {
    setShowDatePicker(false);
    // Data will be automatically filtered by useMemo
  };

  // Open compliance report modal
  const handleOpenComplianceModal = () => {
    setShowExportMenu(false);
    setCompliancePatientId(assignments.length > 0 ? assignments[0].patientId : "");
    setComplianceDays(30);
    setShowComplianceModal(true);
  };

  // Generate compliance report for a single patient
  const handleGenerateComplianceReport = async () => {
    if (!compliancePatientId) return;
    const patient = assignments.find(a => a.patientId === compliancePatientId);
    setIsGeneratingCompliance(true);
    try {
      const adherence = await getAdherence({ patientId: compliancePatientId, days: complianceDays });
      await exportComplianceToExcel({
        adherence,
        patientName: patient?.patientName || "Bệnh nhân",
        patientCode: patient?.patientCode || patient?.patientPublicId || "-",
        daysCount: complianceDays,
      });
      setShowComplianceModal(false);
    } catch (err) {
      console.error("Compliance export failed", err);
      alert("Có lỗi xảy ra khi tạo báo cáo. Vui lòng thử lại.");
    } finally {
      setIsGeneratingCompliance(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] font-sans dark:bg-slate-900">
      <div className="w-full space-y-4 px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
            {t("dashboard.title")}
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
                        {t("dashboard.from")}
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          const newStartDate = e.target.value;
                          setStartDate(newStartDate);
                          // Auto-adjust endDate if it's before startDate
                          if (endDate && newStartDate > endDate) {
                            setEndDate(newStartDate);
                          }
                        }}
                        max={endDate || undefined}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                        {t("dashboard.to")}
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          const newEndDate = e.target.value;
                          setEndDate(newEndDate);
                          // Auto-adjust startDate if it's after endDate
                          if (startDate && newEndDate < startDate) {
                            setStartDate(newEndDate);
                          }
                        }}
                        min={startDate || undefined}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleApplyDateFilter}
                        className="flex-1 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600"
                      >
                        {t("common.apply")}
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
                        {t("common.reset")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export Button with Dropdown */}
            <div className="relative export-menu-container">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={loading || assignments.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <FaDownload size={10} />
                {t("common.export")}
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-100 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  <button
                    onClick={handleExportAlerts}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700 rounded-t-xl"
                  >
                    <FaDownload size={12} className="text-gray-400" />
                    <span>{t("dashboard.exportAlerts")}</span>
                  </button>
                  <button
                    onClick={handleOpenHealthReportModal}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700 border-t border-gray-100 dark:border-slate-700"
                  >
                    <FaDownload size={12} className="text-blue-500" />
                    <span>{t("dashboard.exportHealthReport")}</span>
                  </button>
                  <button
                    onClick={handleOpenComplianceModal}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700 rounded-b-xl border-t border-gray-100 dark:border-slate-700"
                  >
                    <FaDownload size={12} className="text-emerald-500" />
                    <span>{t("dashboard.exportComplianceReport")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-800 lg:col-span-3">
            <SectionHeader
              icon={<span className="text-[13px]">📊</span>}
              title={t("dashboard.patientOverview")}
            />
            <Chart
              stats={chartStats}
              monthlyChartData={chartPayload.monthlyChartData}
              weeklyChartData={chartPayload.weeklyChartData}
              loading={loading}
            />
          </div>

          <div className="flex flex-col gap-3 lg:col-span-2 h-full">
            <div className="h-[300px]">
              <TodoList alerts={alerts} appointments={appointments} loading={loading} />
            </div>
            <div className="flex-1 min-h-[300px]">
              <RecentAlerts alerts={recentAlerts} loading={loading} />
            </div>
          </div>
        </div>
      </div>

      {/* Health Report Modal */}
      {showHealthReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("dashboard.exportHealthReport")}
              </h2>
              <button
                onClick={() => setShowHealthReportModal(false)}
                disabled={isGeneratingReport}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {/* Date Range */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  {t("dashboard.dateRange")}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                      {t("dashboard.from")}
                    </label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        setReportStartDate(newStartDate);
                        // Auto-adjust reportEndDate if it's before reportStartDate
                        if (reportEndDate && newStartDate > reportEndDate) {
                          setReportEndDate(newStartDate);
                        }
                      }}
                      max={reportEndDate || undefined}
                      disabled={isGeneratingReport}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                      {t("dashboard.to")}
                    </label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => {
                        const newEndDate = e.target.value;
                        setReportEndDate(newEndDate);
                        // Auto-adjust reportStartDate if it's after reportEndDate
                        if (reportStartDate && newEndDate < reportStartDate) {
                          setReportStartDate(newEndDate);
                        }
                      }}
                      min={reportStartDate || undefined}
                      disabled={isGeneratingReport}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Patient Selection */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Chọn bệnh nhân ({selectedPatients.size}/{assignments.length})
                  </h3>
                  <button
                    onClick={handleSelectAllPatients}
                    disabled={isGeneratingReport}
                    className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
                  >
                    {selectedPatients.size === assignments.length ? t("dashboard.deselectAll") : t("dashboard.selectAll")}
                  </button>
                </div>

                <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 p-3 max-h-64 overflow-y-auto">
                  {assignments.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">
                      Không có bệnh nhân
                    </p>
                  ) : (
                    assignments.map((assignment) => (
                      <label
                        key={assignment.patientId}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPatients.has(assignment.patientId)}
                          onChange={() => handleTogglePatient(assignment.patientId)}
                          disabled={isGeneratingReport}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {assignment.patientName || 'Không rõ'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {assignment.patientCode || assignment.patientPublicId || 'Không có mã'}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {isGeneratingReport && (
                <div className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/30">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-indigo-700 dark:text-indigo-300">
                      Đang tạo báo cáo...
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {reportProgress.current}/{reportProgress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-800">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{
                        width: `${reportProgress.total > 0 ? (reportProgress.current / reportProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                    {t("dashboard.pleaseWait")}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-700 px-6 py-4">
              <button
                onClick={() => setShowHealthReportModal(false)}
                disabled={isGeneratingReport}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleGenerateHealthReport}
                disabled={isGeneratingReport || selectedPatients.size === 0}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingReport ? t("dashboard.generating") : `Xuất báo cáo (${selectedPatients.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Report Modal */}
      {showComplianceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {t("dashboard.exportComplianceReport")}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Xuất file xlsx báo cáo chi tiết tuân thủ dùng thuốc
                </p>
              </div>
              <button
                onClick={() => setShowComplianceModal(false)}
                disabled={isGeneratingCompliance}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Patient selector */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                  Chọn bệnh nhân
                </label>
                <select
                  value={compliancePatientId}
                  onChange={e => setCompliancePatientId(e.target.value)}
                  disabled={isGeneratingCompliance}
                  className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {assignments.length === 0 ? (
                    <option value="">Không có bệnh nhân</option>
                  ) : (
                    assignments.map(a => (
                      <option key={a.patientId} value={a.patientId}>
                        {a.patientName || "Không rõ"} {a.patientCode ? `— ${a.patientCode}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Days range */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                  Khoảng thời gian
                </label>
                <div className="flex gap-2">
                  {[7, 14, 30, 60].map(d => (
                    <button
                      key={d}
                      onClick={() => setComplianceDays(d)}
                      disabled={isGeneratingCompliance}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
                        complianceDays === d
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {d} ngày
                    </button>
                  ))}
                </div>
              </div>

              {/* Info box */}
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  File xlsx gồm 4 sheet:
                </p>
                <ul className="mt-1 text-xs text-emerald-600 dark:text-emerald-500 space-y-0.5 list-disc list-inside">
                  <li>Tổng quan — tỷ lệ tuân thủ từng ngày</li>
                  <li>Chi tiết — từng liều thuốc đã uống/bỏ lỡ</li>
                  <li>Thống kê theo thuốc — tổng hợp từng loại</li>
                  <li>Thông tin báo cáo</li>
                </ul>
              </div>

              {/* Progress */}
              {isGeneratingCompliance && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30 p-3 flex items-center gap-3">
                  <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Đang tạo báo cáo, vui lòng đợi...
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-slate-700 px-6 py-4">
              <button
                onClick={() => setShowComplianceModal(false)}
                disabled={isGeneratingCompliance}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleGenerateComplianceReport}
                disabled={isGeneratingCompliance || !compliancePatientId}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingCompliance ? "Đang xuất..." : "Xuất báo cáo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashBoard;

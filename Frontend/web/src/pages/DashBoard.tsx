import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FaArrowTrendDown, FaArrowTrendUp } from "react-icons/fa6";
import {
  FaDownload,
  FaExclamationTriangle,
  FaHeartbeat,
  FaInfoCircle,
  FaUserFriends,
  FaTasks,
  FaChartBar,
} from "react-icons/fa";
import { BsCalendar3 } from "react-icons/bs";
import StatCard from "../components/ui/StatCard";

import Chart, { type ChartStatItem } from "../components/ui/Chart";
import {
  getAlerts,
  getMyPatients,
  getMeasurements,
} from "../services/patientService";
import { getThresholds } from "../services/thresholdService";
import {
  getMyAppointments,
  type FollowUpAppointment,
} from "../services/appointmentService";
import type { AlertResponse, AssignmentResponse } from "../types/patient";
import { exportAlertsToExcel } from "../utils/export/alertExporter";
import { normalizeAlertSeverity } from "../utils/alertSeverity";
import {
  exportHealthReportToExcel,
  calculateHealthStatistics,
  type PatientReportData,
} from "../utils/export/healthReportExporter";
import {
  exportComplianceToExcel,
  exportMultiComplianceToExcel,
} from "../utils/export/complianceExporter";
import type { MultiCompliancePatientData } from "../utils/export/complianceExporter";
import { getAdherence } from "../services/patientService";
import { useTranslation } from "react-i18next";

interface KpiDef {
  label: string;
  value: string;
  change?: number;
  up?: boolean;
  Icon: React.ElementType;
  variant?: "danger" | "warning" | "success" | "info" | "default";
  loading?: boolean;
}

const CHART_BUCKETS = 4;

const TrendBadge: React.FC<{ value: number; up: boolean }> = ({
  value,
  up,
}) => (
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
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
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
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
  let stablePatients = 0;
  let highPriorityPatients = 0;
  let needsMonitoringPatients = 0;
  const snapshotTime = snapshotAt.getTime();

  assignments.forEach((assignment) => {
    const assignmentTime = new Date(assignment.createdAt).getTime();
    if (!Number.isNaN(assignmentTime) && assignmentTime > snapshotTime) {
      return;
    }

    // Xét toàn bộ alert open tại thời điểm snapshot, không chỉ alert mới nhất
    const patientAlerts = (
      alertsByPatient.get(assignment.patientId) || []
    ).filter((alert) => new Date(alert.createdAt).getTime() <= snapshotTime);

    const hasHighOpen = patientAlerts.some(
      (a) =>
        a.status === "open" && normalizeAlertSeverity(a.severity) === "high",
    );
    const hasInfoOpen = patientAlerts.some(
      (a) =>
        a.status === "open" && normalizeAlertSeverity(a.severity) === "info",
    );

    if (hasHighOpen) {
      highPriorityPatients += 1;
    } else if (hasInfoOpen) {
      needsMonitoringPatients += 1;
    } else {
      stablePatients += 1;
    }
  });

  return { stablePatients, highPriorityPatients, needsMonitoringPatients };
}

function buildDashboardChartData(
  assignments: AssignmentResponse[],
  alerts: AlertResponse[],
  t: (key: string) => string,
) {
  const assignedPatientIds = new Set(assignments.map((item) => item.patientId));
  const alertsByPatient = buildAlertsByPatient(alerts, assignedPatientIds);
  const now = new Date();

  const monthlyChartData: any[] = Array.from(
    { length: CHART_BUCKETS },
    (_, index) => {
      const monthDate = new Date(
        now.getFullYear(),
        now.getMonth() - (CHART_BUCKETS - 1 - index),
        1,
      );
      const monthEnd = endOfMonth(monthDate);
      const snapshotAt = monthEnd.getTime() > now.getTime() ? now : monthEnd;
      const counts = getPatientCountsAtDate(
        assignments,
        alertsByPatient,
        snapshotAt,
      );

      return {
        period: `T${monthDate.getMonth() + 1}`,
        ...counts,
      };
    },
  );

  const weeklyChartData: any[] = Array.from(
    { length: CHART_BUCKETS },
    (_, index) => {
      const weekSeed = new Date(now);
      weekSeed.setDate(now.getDate() - (CHART_BUCKETS - 1 - index) * 7);
      const weekEnd = endOfWeek(weekSeed);
      const snapshotAt = weekEnd.getTime() > now.getTime() ? now : weekEnd;
      const counts = getPatientCountsAtDate(
        assignments,
        alertsByPatient,
        snapshotAt,
      );

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
        (monthlyChartData[monthlyChartData.length - 1]
          ?.needsMonitoringPatients ?? 0) +
        (monthlyChartData[monthlyChartData.length - 1]?.highPriorityPatients ??
          0),
    },
    {
      id: "week",
      label: t("dashboard.chartThisWeek"),
      value:
        (weeklyChartData[weeklyChartData.length - 1]?.needsMonitoringPatients ??
          0) +
        (weeklyChartData[weeklyChartData.length - 1]?.highPriorityPatients ??
          0),
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
  assignments: AssignmentResponse[];
  loading: boolean;
}> = ({ alerts, appointments, assignments, loading }) => {
  const navigate = useNavigate();

  const pendingAlerts = useMemo(
    () => alerts.filter((a) => a.status === "open").slice(0, 5),
    [alerts],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-slate-700/60 dark:bg-slate-800">
      <div className="px-5 pb-3 pt-5">
        <SectionHeader
          icon={<FaTasks size={14} className="text-indigo-500" />}
          title="Cần xử lý hôm nay"
        />
      </div>

      <div className="flex-1 overflow-auto border-t border-gray-50 dark:border-slate-700/40">
        {loading ? (
          <div className="space-y-4 p-4 animate-pulse">
            <div>
              <div className="mb-2 h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-50 bg-gray-50/50 p-3 dark:border-slate-700/30 dark:bg-slate-700/20"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="h-6 w-14 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : pendingAlerts.length === 0 && appointments.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            Không có việc cần xử lý hôm nay.
          </p>
        ) : (
          <div className="space-y-4 p-4">
            {pendingAlerts.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-slate-400">
                  Cảnh báo chưa xử lý
                </h4>
                <div className="space-y-2">
                  {pendingAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between rounded-lg bg-red-50 p-3 dark:bg-red-900/10"
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                          {alert.patientName || "Chưa rõ"}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                          Mức độ:{" "}
                          {normalizeAlertSeverity(alert.severity) === "high"
                            ? "Ưu tiên cao"
                            : "Cần theo dõi"}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate("/threshold-alerts")}
                        className="rounded bg-red-100 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                      >
                        Xử lý
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {appointments.length > 0 && (
              <div>
                <h4 className="mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider dark:text-slate-400">
                  Lịch khám hôm nay
                </h4>
                <div className="space-y-2">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10"
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                          {new Date(appt.scheduledAt).toLocaleTimeString(
                            "vi-VN",
                            { hour: "2-digit", minute: "2-digit" },
                          )}{" "}
                          -{" "}
                          {assignments.find(
                            (a) => a.patientId === appt.patientId,
                          )?.patientName || "Bệnh nhân không rõ"}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                          {appt.notes || "Khám định kỳ"}
                        </p>
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
    spO2: "SpO2",
    respiratoryRate: t("patientDetail.respiratoryRate"),
    heart_rate: t("patientDetail.heartRate"),
    heartRate: t("patientDetail.heartRate"),
    respiratory_rate: t("patientDetail.respiratoryRate"),
    blood_pressure_systolic: t("patientDetail.systolic"),
    bloodPressureSystolic: t("patientDetail.systolic"),
    blood_pressure_diastolic: t("patientDetail.diastolic"),
    bloodPressureDiastolic: t("patientDetail.diastolic"),
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
          <div className="divide-y divide-gray-50 dark:divide-slate-700/30 p-4 space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 pt-3 first:pt-0">
                <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-10 rounded bg-slate-100 dark:bg-slate-800 shrink-0" />
                  </div>
                  <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-400">
            {t("dashboard.noAlerts")}
          </p>
        ) : (
          alerts.map((alert, index) => {
            return (
              <div
                key={alert.id}
                className={`flex cursor-pointer items-start gap-3 px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/40 ${
                  index > 0
                    ? "border-t border-gray-50 dark:border-slate-700/30"
                    : ""
                }`}
                onClick={() => navigate(`/alert/${alert.id}`)}
              >
                <div
                  className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${
                    normalizeAlertSeverity(alert.severity) === "high"
                      ? "bg-red-50 text-red-400 dark:bg-red-900/30"
                      : "bg-blue-50 text-blue-400 dark:bg-blue-900/30"
                  }`}
                >
                  {normalizeAlertSeverity(alert.severity) === "high" ? (
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
                      .map((violation) => {
                        const cleanType = violation.type.replace(
                          /_(max|min|high|low)$/,
                          "",
                        );
                        const label =
                          violationLabel[cleanType] ||
                          violationLabel[violation.type] ||
                          violation.type;
                        const val =
                          typeof violation.observed === "number"
                            ? Number(violation.observed.toFixed(1))
                            : violation.observed;
                        return `${label}: ${val}`;
                      })
                      .join(" · ")}
                  </p>
                </div>

                <div
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${
                    alert.status === "ack"
                      ? "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
                      : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
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
  const { data: openAlertsResult } = useQuery({
    queryKey: ["alerts", "open"],
    queryFn: () => getAlerts({ status: "open", limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });
  const openAlerts = openAlertsResult?.alerts || [];

  const { data: recentAlertsResult } = useQuery({
    queryKey: [
      "alerts",
      { page: 1, limit: 10, status: "", severity: "", patientId: "" },
    ],
    queryFn: () => getAlerts({ page: 1, limit: 10, sortOrder: "desc" }),
    staleTime: 5 * 60 * 1000,
  });
  const recentAlertsData = recentAlertsResult?.alerts || [];

  useEffect(() => {
    if (openAlerts) {
      setAlerts(openAlerts);
    }
  }, [openAlerts]);

  const [appointments, setAppointments] = useState<FollowUpAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date filter state
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Export menu and health report modal state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHealthReportModal, setShowHealthReportModal] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(
    new Set(),
  );
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportProgress, setReportProgress] = useState({
    current: 0,
    total: 0,
  });

  // Compliance report modal state
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceSelectedPatients, setComplianceSelectedPatients] = useState<
    Set<string>
  >(new Set());
  const [complianceDays, setComplianceDays] = useState<number>(30);
  const [isGeneratingCompliance, setIsGeneratingCompliance] = useState(false);
  const [complianceProgress, setComplianceProgress] = useState({
    current: 0,
    total: 0,
  });
  const [complianceSearch, setComplianceSearch] = useState("");

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

        const [assignmentList, appointmentList] = await Promise.all([
          getMyPatients(),
          getMyAppointments({
            from: todayStart,
            to: todayEnd,
          }),
        ]);

        setAssignments(assignmentList);
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
      if (showExportMenu && !target.closest(".export-menu-container")) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showExportMenu]);

  const assignedPatientIds = useMemo(
    () => new Set(assignments.map((item) => item.patientId)),
    [assignments],
  );

  const filteredAlerts = useMemo(() => {
    let filtered = alerts.filter((alert) =>
      assignedPatientIds.has(alert.patientId),
    );

    filtered = filtered.filter((alert) => {
      const alertDate = new Date(alert.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return alertDate >= start && alertDate <= end;
    });

    return filtered;
  }, [alerts, assignedPatientIds, startDate, endDate]);

  const dashboardStats = useMemo(() => {
    if (loading) {
      return {
        total: undefined,
        stable: undefined,
        highPriority: undefined,
        needsMonitoring: undefined,
      };
    }

    if (error) {
      return {
        total: null,
        stable: null,
        highPriority: null,
        needsMonitoring: null,
      };
    }

    const total = assignments.length;

    // Tính theo toàn bộ alert open, không chỉ alert mới nhất
    const patientHighestSeverity = new Map<string, "high" | "info">();
    const allAssignedAlerts = alerts.filter((a) =>
      assignedPatientIds.has(a.patientId),
    );

    allAssignedAlerts.forEach((alert) => {
      if (alert.status === "open") {
        const sev = normalizeAlertSeverity(alert.severity);
        const curr = patientHighestSeverity.get(alert.patientId);
        if (!curr || (curr !== "high" && sev === "high")) {
          patientHighestSeverity.set(alert.patientId, sev);
        }
      }
    });

    let highPriority = 0;
    let needsMonitoring = 0;

    Array.from(patientHighestSeverity.values()).forEach((sev) => {
      if (sev === "high") highPriority++;
      else needsMonitoring++;
    });

    return {
      total,
      stable: Math.max(total - highPriority - needsMonitoring, 0),
      highPriority,
      needsMonitoring,
    };
  }, [assignments, error, alerts, assignedPatientIds, loading]);

  const recentAlerts = useMemo(
    () => recentAlertsData.slice(0, 5),
    [recentAlertsData],
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
        label: t("dashboard.highPriorityPatients", "Cần ưu tiên"),
        value: formatKpiValue(dashboardStats.highPriority),
        Icon: FaExclamationTriangle,
        variant: "danger",
      },
      {
        label: t("dashboard.needsMonitoringPatients", "Cần theo dõi"),
        value: formatKpiValue(dashboardStats.needsMonitoring),
        Icon: FaInfoCircle,
        variant: "warning",
      },
      {
        label: t("dashboard.stablePatients", "Ổn định"),
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
      dashboardStats: {
        total: dashboardStats.total,
        stable: dashboardStats.stable,
        attention: (dashboardStats.highPriority || 0) + (dashboardStats.needsMonitoring || 0)
      },
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
      setSelectedPatients(new Set(assignments.map((a) => a.patientId)));
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
      const selectedAssignments = assignments.filter((a) =>
        selectedPatients.has(a.patientId),
      );
      let current = 0;

      // Fetch data for each selected patient in parallel
      const reportPromises = selectedAssignments.map(async (assignment) => {
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
          const stats = calculateHealthStatistics(
            filteredMeasurements,
            threshold,
          );

          current++;
          setReportProgress({ current, total: selectedPatients.size });

          return {
            assignment,
            measurements: filteredMeasurements,
            threshold,
            stats,
          };
        } catch (error) {
          console.error(
            `Error fetching data for patient ${assignment.patientId}:`,
            error,
          );
          current++;
          setReportProgress({ current, total: selectedPatients.size });
          return null;
        }
      });

      const results = await Promise.all(reportPromises);
      const reportData = results.filter(
        (item): item is PatientReportData => item !== null,
      );

      // Generate Excel file
      exportHealthReportToExcel(reportData, reportStartDate, reportEndDate);

      setShowHealthReportModal(false);
      setIsGeneratingReport(false);
    } catch (error) {
      console.error("Error generating health report:", error);
      alert("Có lỗi xảy ra khi tạo báo cáo. Vui lòng thử lại.");
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
    setComplianceSelectedPatients(new Set());
    setComplianceDays(30);
    setComplianceSearch("");
    setShowComplianceModal(true);
  };

  // Toggle compliance patient selection
  const handleToggleCompliancePatient = (patientId: string) => {
    const next = new Set(complianceSelectedPatients);
    if (next.has(patientId)) next.delete(patientId);
    else next.add(patientId);
    setComplianceSelectedPatients(next);
  };

  // Select all / deselect all for compliance
  const handleSelectAllCompliancePatients = () => {
    if (complianceSelectedPatients.size === assignments.length) {
      setComplianceSelectedPatients(new Set());
    } else {
      setComplianceSelectedPatients(
        new Set(assignments.map((a) => a.patientId)),
      );
    }
  };

  // Filtered assignments for compliance search
  const complianceFilteredAssignments = useMemo(() => {
    if (!complianceSearch.trim()) return assignments;
    const q = complianceSearch.toLowerCase();
    return assignments.filter(
      (a) =>
        (a.patientName || "").toLowerCase().includes(q) ||
        (a.patientCode || a.patientPublicId || "").toLowerCase().includes(q),
    );
  }, [assignments, complianceSearch]);

  // Generate compliance report for selected patients
  const handleGenerateComplianceReport = async () => {
    if (complianceSelectedPatients.size === 0) return;

    setIsGeneratingCompliance(true);
    setComplianceProgress({
      current: 0,
      total: complianceSelectedPatients.size,
    });

    try {
      const selectedAssignments = assignments.filter((a) =>
        complianceSelectedPatients.has(a.patientId),
      );

      // Single patient → use original single-file export
      if (selectedAssignments.length === 1) {
        const patient = selectedAssignments[0];
        const adherence = await getAdherence({
          patientId: patient.patientId,
          days: complianceDays,
        });
        setComplianceProgress({ current: 1, total: 1 });
        await exportComplianceToExcel({
          adherence,
          patientName: patient.patientName || "Bệnh nhân",
          patientCode: patient.patientCode || patient.patientPublicId || "-",
          daysCount: complianceDays,
        });
      } else {
        // Multiple patients → fetch all adherence data in parallel then export combined
        let current = 0;
        const compliancePromises = selectedAssignments.map(async (patient) => {
          try {
            const adherence = await getAdherence({
              patientId: patient.patientId,
              days: complianceDays,
            });
            current++;
            setComplianceProgress({
              current,
              total: selectedAssignments.length,
            });
            return {
              adherence,
              patientName: patient.patientName || "Bệnh nhân",
              patientCode:
                patient.patientCode || patient.patientPublicId || "-",
              daysCount: complianceDays,
            };
          } catch (err) {
            console.error(
              `Compliance fetch failed for ${patient.patientId}`,
              err,
            );
            current++;
            setComplianceProgress({
              current,
              total: selectedAssignments.length,
            });
            return null;
          }
        });

        const results = await Promise.all(compliancePromises);
        const patientsData = results.filter(
          (item): item is MultiCompliancePatientData => item !== null,
        );

        if (patientsData.length > 0) {
          await exportMultiComplianceToExcel({ patients: patientsData });
        }
      }

      setShowComplianceModal(false);
    } catch (err) {
      console.error("Compliance export failed", err);
      alert("Có lỗi xảy ra khi tạo báo cáo. Vui lòng thử lại.");
    } finally {
      setIsGeneratingCompliance(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-slate-900">
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
                          setStartDate(date.toISOString().split("T")[0]);
                          setEndDate(new Date().toISOString().split("T")[0]);
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.Icon}
              variant={kpi.variant}
              loading={loading}
              badge={
                typeof kpi.change === "number" &&
                typeof kpi.up === "boolean" ? (
                  <TrendBadge value={kpi.change} up={kpi.up} />
                ) : undefined
              }
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-800 lg:col-span-2">
            <SectionHeader
              icon={<FaChartBar size={14} className="text-blue-500" />}
              title={t("dashboard.patientOverview")}
            />
            <Chart
              stats={chartStats}
              monthlyChartData={chartPayload.monthlyChartData}
              weeklyChartData={chartPayload.weeklyChartData}
              loading={loading}
            />
          </div>

          <div className="flex flex-col gap-3 lg:col-span-1 h-full">
            <div className="h-[300px]">
              <TodoList
                alerts={alerts}
                appointments={appointments}
                assignments={assignments}
                loading={loading}
              />
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
            <div
              className="overflow-y-auto p-6"
              style={{ maxHeight: "calc(90vh - 140px)" }}
            >
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
                    Chọn bệnh nhân ({selectedPatients.size}/{assignments.length}
                    )
                  </h3>
                  <button
                    onClick={handleSelectAllPatients}
                    disabled={isGeneratingReport}
                    className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
                  >
                    {selectedPatients.size === assignments.length
                      ? t("dashboard.deselectAll")
                      : t("dashboard.selectAll")}
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
                          onChange={() =>
                            handleTogglePatient(assignment.patientId)
                          }
                          disabled={isGeneratingReport}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {assignment.patientName || "Không rõ"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {assignment.patientCode ||
                              assignment.patientPublicId ||
                              "Không có mã"}
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
                {isGeneratingReport
                  ? t("dashboard.generating")
                  : `Xuất báo cáo (${selectedPatients.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Report Modal */}
      {showComplianceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t("dashboard.exportComplianceReport")}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Chọn một hoặc nhiều bệnh nhân để xuất báo cáo tuân thủ dùng
                  thuốc
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
            <div
              className="overflow-y-auto p-6 space-y-5"
              style={{ maxHeight: "calc(90vh - 140px)" }}
            >
              {/* Days range */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                  Khoảng thời gian
                </label>
                <div className="flex gap-2">
                  {[7, 14, 30, 60].map((d) => (
                    <button
                      key={d}
                      onClick={() => setComplianceDays(d)}
                      disabled={isGeneratingCompliance}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all disabled:opacity-50 ${complianceDays === d
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                        }`}
                    >
                      {d} ngày
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Selection */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Chọn bệnh nhân ({complianceSelectedPatients.size}/
                    {assignments.length})
                  </h3>
                  <button
                    onClick={handleSelectAllCompliancePatients}
                    disabled={isGeneratingCompliance}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 disabled:opacity-50"
                  >
                    {complianceSelectedPatients.size === assignments.length
                      ? "Bỏ chọn tất cả"
                      : "Chọn tất cả"}
                  </button>
                </div>

                {/* Search */}
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Tìm bệnh nhân..."
                    value={complianceSearch}
                    onChange={(e) => setComplianceSearch(e.target.value)}
                    disabled={isGeneratingCompliance}
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1 rounded-lg border border-gray-200 dark:border-slate-700 p-3 max-h-64 overflow-y-auto">
                  {complianceFilteredAssignments.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">
                      {assignments.length === 0
                        ? "Không có bệnh nhân"
                        : "Không tìm thấy bệnh nhân"}
                    </p>
                  ) : (
                    complianceFilteredAssignments.map((a) => (
                      <label
                        key={a.patientId}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={complianceSelectedPatients.has(a.patientId)}
                          onChange={() =>
                            handleToggleCompliancePatient(a.patientId)
                          }
                          disabled={isGeneratingCompliance}
                          className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {a.patientName || "Không rõ"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {a.patientCode ||
                              a.patientPublicId ||
                              "Không có mã"}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Info box */}
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {complianceSelectedPatients.size <= 1
                    ? "File xlsx gồm 3 sheet:"
                    : `File xlsx gồm 1 sheet tổng hợp + ${complianceSelectedPatients.size} sheet chi tiết:`}
                </p>
                <ul className="mt-1 text-xs text-emerald-600 dark:text-emerald-500 space-y-0.5 list-disc list-inside">
                  {complianceSelectedPatients.size <= 1 ? (
                    <>
                      <li>
                        Tổng quan — tỷ lệ tuân thủ từng ngày + thông tin báo cáo
                      </li>
                      <li>Chi tiết — từng liều thuốc đã uống/bỏ lỡ</li>
                      <li>Thống kê theo thuốc — tổng hợp từng loại</li>
                    </>
                  ) : (
                    <>
                      <li>Tổng hợp — so sánh tỷ lệ tuân thủ tất cả BN</li>
                      <li>Mỗi BN một sheet chi tiết từng liều thuốc</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Progress */}
              {isGeneratingCompliance && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      Đang tạo báo cáo...
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {complianceProgress.current}/{complianceProgress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${complianceProgress.total > 0 ? (complianceProgress.current / complianceProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                    Vui lòng chờ trong giây lát...
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
                disabled={
                  isGeneratingCompliance ||
                  complianceSelectedPatients.size === 0
                }
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingCompliance
                  ? "Đang xuất..."
                  : complianceSelectedPatients.size === 0
                    ? "Chọn bệnh nhân"
                    : `Xuất báo cáo (${complianceSelectedPatients.size} BN)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashBoard;

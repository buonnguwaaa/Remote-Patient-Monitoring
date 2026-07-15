import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FaCheckCircle,
  FaCommentDots,
  FaExclamationTriangle,
  FaInfoCircle,
  FaRegClock,
  FaSyncAlt,
  FaUserInjured,
  FaSearch,
  FaFileMedical,
  FaTable,
  FaThLarge,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import Pagination from "../components/ui/Pagination";
import { useToast } from "../hooks/useToast";
import {
  acknowledgeAlert,
  getAlerts,
} from "../services/patientService";
import type { AlertResponse } from "../types/patient";
import type { AlertSeverity } from "../types/index";
import { normalizeAlertSeverity } from "../utils/alertSeverity";

export const getSeverityLabel = (value: unknown): string => {
  return normalizeAlertSeverity(value) === "high" ? "Ưu tiên cao" : "Cần theo dõi";
};

export const getSeverityBadge = (value: unknown): string => {
  const severity = normalizeAlertSeverity(value);
  if (severity === "high") {
    return "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-red-500/25";
  }
  return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/25";
};

export const getSeverityIcon = (value: unknown) => {
  const severity = normalizeAlertSeverity(value);
  if (severity === "high") {
    return <FaExclamationTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
  }
  return <FaInfoCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
};

type TabType = "PENDING" | "ALL" | "RESOLVED";

const ThresholdAlert = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterPatientId = searchParams.get("patientId");
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<TabType>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"card" | "table">(
    () => (localStorage.getItem("alert_view_mode") as "card" | "table") || "card"
  );

  const handleSetViewMode = (mode: "card" | "table") => {
    setViewMode(mode);
    localStorage.setItem("alert_view_mode", mode);
  };
  
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  
  // Resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [currentAlertsToResolve, setCurrentAlertsToResolve] = useState<AlertResponse[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const { toast, showToast, hideToast } = useToast();

  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, severityFilter, searchQuery]);

  const activeStatus = activeTab === "PENDING" ? "open" : activeTab === "RESOLVED" ? "ack" : "";

  // Query 1: Fetch all open alerts (lightweight) to compute statistics
  const { data: openAlertsResult } = useQuery({
    queryKey: ["alerts", "open"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return getAlerts({ status: "open", limit: 1000 });
    },
    staleTime: 5 * 60 * 1000,
  });
  const openAlertsData = openAlertsResult?.alerts || [];

  // Query 2: Fetch paginated alerts
  const { data: alertsResult, isLoading: loading, isFetching: refreshing, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["alerts", { 
      page: currentPage, 
      limit: 10, 
      status: activeStatus,
      severity: severityFilter === "ALL" ? "" : severityFilter.toLowerCase(),
      patientId: filterPatientId || ""
    }],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      // normalize severity filter: ALL → undefined, other → AlertSeverity
      const severityParam =
        severityFilter === "ALL"
          ? undefined
          : (severityFilter.toLowerCase() as AlertSeverity);
      return getAlerts({ 
        page: currentPage, 
        limit: 10, 
        status: activeStatus || undefined,
        severity: severityParam,
        patientId: filterPatientId || undefined,
        sortOrder: "desc"
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const alertsData = alertsResult?.alerts || [];
  const totalItems = alertsResult?.total || 0;
  const totalPages = Math.ceil(totalItems / 10);

  const alerts = useMemo(() => {
    return alertsData;
  }, [alertsData]);

  const lastUpdated = useMemo(() => {
    return dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;
  }, [dataUpdatedAt]);

  const togglePatientExpanded = (patientId: string) => {
    setExpandedPatients((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const handleResolveConfirm = async () => {
    if (currentAlertsToResolve.length === 0) return;
    
    setIsResolving(true);
    try {
      for (const alert of currentAlertsToResolve) {
        await acknowledgeAlert(alert.id);
      }
      showToast(`Đã xử lý thành công ${currentAlertsToResolve.length} cảnh báo`, "success");
      setShowResolveModal(false);
      setCurrentAlertsToResolve([]);
      void queryClient.invalidateQueries({ queryKey: ["alerts", "open"] });
      void refetch();
    } catch (error: any) {
      showToast(error.message || "Lỗi khi xử lý cảnh báo", "error");
    } finally {
      setIsResolving(false);
    }
  };

  const openResolveModal = (alertsToResolve: AlertResponse | AlertResponse[]) => {
    if (Array.isArray(alertsToResolve)) {
      setCurrentAlertsToResolve(alertsToResolve);
    } else {
      setCurrentAlertsToResolve([alertsToResolve]);
    }
    setShowResolveModal(true);
  };

  // Helper to format violation
  // Helper to format violation as text for modal / logging
  const formatViolationText = (v: any) => {
    const viNames: Record<string, string> = {
      temperature: "Nhiệt độ",
      blood_pressure_systolic: "Huyết áp tâm thu",
      bloodPressureSystolic: "Huyết áp tâm thu",
      blood_pressure_diastolic: "Huyết áp tâm trương",
      bloodPressureDiastolic: "Huyết áp tâm trương",
      blood_pressure: "Huyết áp",
      heart_rate: "Nhịp tim",
      heartRate: "Nhịp tim",
      respiratory_rate: "Nhịp thở",
      respiratoryRate: "Nhịp thở",
      glucose: "Đường huyết",
      spo2: "SpO2",
      spO2: "SpO2",
      weight: "Cân nặng"
    };

    const typeName = (viNames[v.type] || t(`measurements.types.${v.type}`, v.type)) as string;
    let unit = "";
    
    if (v.type === "glucose") {
      unit = "mg/dL";
    } else if (v.type === "temperature") {
      unit = "°C";
    } else if (v.type === "blood_pressure" || v.type === "bloodPressureSystolic" || v.type === "bloodPressureDiastolic") {
      unit = "mmHg";
    } else if (v.type === "spo2" || v.type === "spO2") {
      unit = "%";
    } else if (v.type === "heart_rate" || v.type === "heartRate") {
      unit = "bpm";
    } else if (v.type === "respiratory_rate" || v.type === "respiratoryRate") {
      unit = "lần/phút";
    } else if (v.type === "weight") {
      unit = "kg";
    }

    const value = typeof v.observed === 'number' ? v.observed.toFixed(1) : v.observed;
    const threshold = typeof v.threshold === 'number' ? v.threshold.toFixed(1) : v.threshold;

    if (v.rule.includes("max")) {
      return `${typeName} cao: ${value} ${unit} (ngưỡng: >${threshold})`;
    } else if (v.rule.includes("min")) {
      return `${typeName} thấp: ${value} ${unit} (ngưỡng: <${threshold})`;
    }
    return `${typeName}: ${value} ${unit} (ngưỡng: ${threshold})`;
  };

  // Helper to format violation with red highlights for UI
  const formatViolation = (v: any) => {
    const viNames: Record<string, string> = {
      temperature: "Nhiệt độ",
      blood_pressure_systolic: "Huyết áp tâm thu",
      bloodPressureSystolic: "Huyết áp tâm thu",
      blood_pressure_diastolic: "Huyết áp tâm trương",
      bloodPressureDiastolic: "Huyết áp tâm trương",
      blood_pressure: "Huyết áp",
      heart_rate: "Nhịp tim",
      heartRate: "Nhịp tim",
      respiratory_rate: "Nhịp thở",
      respiratoryRate: "Nhịp thở",
      glucose: "Đường huyết",
      spo2: "SpO2",
      spO2: "SpO2",
      weight: "Cân nặng"
    };

    const typeName = (viNames[v.type] || t(`measurements.types.${v.type}`, v.type)) as string;
    let unit = "";
    
    if (v.type === "glucose") {
      unit = "mg/dL";
    } else if (v.type === "temperature") {
      unit = "°C";
    } else if (v.type === "blood_pressure" || v.type === "bloodPressureSystolic" || v.type === "bloodPressureDiastolic") {
      unit = "mmHg";
    } else if (v.type === "spo2" || v.type === "spO2") {
      unit = "%";
    } else if (v.type === "heart_rate" || v.type === "heartRate") {
      unit = "bpm";
    } else if (v.type === "respiratory_rate" || v.type === "respiratoryRate") {
      unit = "lần/phút";
    } else if (v.type === "weight") {
      unit = "kg";
    }

    const value = typeof v.observed === 'number' ? v.observed.toFixed(1) : v.observed;
    const threshold = typeof v.threshold === 'number' ? v.threshold.toFixed(1) : v.threshold;
    const ruleLabel = v.rule.includes("max") ? "cao" : v.rule.includes("min") ? "thấp" : "";

    return (
      <span className="text-slate-900 dark:text-slate-100">
        {typeName} {ruleLabel && `${ruleLabel}: `}
        <span className="text-red-600 dark:text-red-400 font-bold">{value} {unit}</span>
        <span className="text-slate-500 dark:text-slate-400 font-normal"> (ngưỡng: {v.rule.includes("max") ? ">" : v.rule.includes("min") ? "<" : ""}{threshold} {unit})</span>
      </span>
    );
  };

  // derived state
  const filteredAlerts = useMemo(() => {
    let result = alerts;

    // Search query (filtered locally on current page results)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a: AlertResponse) => 
        (a.patientName && a.patientName.toLowerCase().includes(q)) ||
        a.patientId.toLowerCase().includes(q)
      );
    }

    return result;
  }, [alerts, searchQuery]);

  // Group alerts for the active tab
  const groupedAlerts = useMemo(() => {
    const groups = new Map<string, {
      patientId: string;
      patientName: string;
      patientCode: string;
      alerts: AlertResponse[];
      openCount: number;
      resolvedCount: number;
      highCount: number;
      infoCount: number;
      latestAlert: AlertResponse | null;
    }>();

    filteredAlerts.forEach((alert: AlertResponse) => {
      const pId = alert.patientId;
      if (!groups.has(pId)) {
        groups.set(pId, {
          patientId: pId,
          patientName: alert.patientName || "Chưa cập nhật tên",
          patientCode: `PAT-${pId.substring(0, 6).toUpperCase()}`,
          alerts: [],
          openCount: 0,
          resolvedCount: 0,
          highCount: 0,
          infoCount: 0,
          latestAlert: null
        });
      }
      const group = groups.get(pId)!;
      group.alerts.push(alert);
      
      if (alert.status === "open") {
        group.openCount++;
      } else {
        group.resolvedCount++;
      }

      // Normalize severity then count
      const sev = normalizeAlertSeverity(alert.severity);
      if (sev === "high") group.highCount++;
      else group.infoCount++;

      if (!group.latestAlert || new Date(alert.createdAt) > new Date(group.latestAlert.createdAt)) {
        group.latestAlert = alert;
      }
    });

    // Sắp xếp: openCount giảm dần -> highCount giảm dần -> thời gian mới nhất
    return Array.from(groups.values()).sort((a, b) => {
      if (a.openCount !== b.openCount) return b.openCount - a.openCount;
      if (a.highCount !== b.highCount) return b.highCount - a.highCount;
      const aTime = a.latestAlert ? new Date(a.latestAlert.createdAt).getTime() : 0;
      const bTime = b.latestAlert ? new Date(b.latestAlert.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [filteredAlerts]);

  const stats = useMemo(() => {
    const pending = filterPatientId 
      ? openAlertsData.filter((a: AlertResponse) => a.patientId === filterPatientId)
      : openAlertsData;
    return {
      pendingTotal: pending.length,
      pendingHigh: pending.filter((a: AlertResponse) => a.severity === "high").length,
    };
  }, [openAlertsData, filterPatientId]);

  // Pagination for ALL / RESOLVED tabs
  // const itemsPerPage = 10;
  // const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  // const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderStats = () => {
    const isStatsLoading = loading && openAlertsData.length === 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng cảnh báo chờ xử lý</p>
            {isStatsLoading ? (
              <div className="h-9 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1" />
            ) : (
              <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.pendingTotal}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
            <FaRegClock className="text-xl text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-red-200 dark:border-red-900/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Cảnh báo ưu tiên cao (Chờ xử lý)</p>
            {isStatsLoading ? (
              <div className="h-9 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse mt-1" />
            ) : (
              <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">{stats.pendingHigh}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <FaExclamationTriangle className="text-xl text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>
    );
  };

  const renderFilters = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
          {(["PENDING", "ALL", "RESOLVED"] as TabType[]).map(tab => {
            const labels = {
              PENDING: "Cần xử lý",
              ALL: "Tất cả cảnh báo",
              RESOLVED: "Đã xử lý"
            };
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab);  }}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {labels[tab]}
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tên BN, Mã BN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Filter chỉ còn: Tất cả | Ưu tiên cao | Cần theo dõi */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Mức độ (Tất cả)</option>
            <option value="high">Ưu tiên cao</option>
            <option value="info">Cần theo dõi</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderPendingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse"
        >
          <div className="flex items-start gap-4 w-full md:w-auto">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
            <div className="space-y-2 flex-1 md:w-64">
              <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="flex flex-wrap gap-2 mt-1">
                <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="h-9 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderGroupedTab = () => {
    if (loading && groupedAlerts.length === 0) {
      return renderPendingSkeleton();
    }
    if (groupedAlerts.length === 0) {
      return (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <FaCheckCircle className="mx-auto h-12 w-12 text-green-500 opacity-50 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {activeTab === "PENDING"
              ? "Không có cảnh báo nào cần xử lý"
              : activeTab === "RESOLVED"
              ? "Chưa có cảnh báo nào được xử lý"
              : "Không tìm thấy cảnh báo nào"}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {groupedAlerts.map(group => {
          const isExpanded = expandedPatients.has(group.patientId);
          
          return (
            <div 
              key={group.patientId} 
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all"
            >
              <div 
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                onClick={() => togglePatientExpanded(group.patientId)}
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <FaUserInjured className="text-blue-600 dark:blue-400 text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-600 dark:blue-400">
                      {group.patientName} <span className="text-sm font-normal text-slate-500 ml-2">({group.patientCode})</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {group.alerts.length} cảnh báo:
                      </span>
                      {group.openCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400 font-semibold">
                          {group.openCount} Chưa xử lý
                        </span>
                      )}
                      {group.resolvedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400 font-semibold">
                          {group.resolvedCount} Đã xử lý
                        </span>
                      )}
                    </div>
                    {group.latestAlert && (
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <FaRegClock /> Mới nhất: {new Date(group.latestAlert.createdAt).toLocaleString("vi-VN")}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {group.openCount > 0 ? (
                    <button 
                      onClick={() => openResolveModal(group.alerts.filter(a => a.status === "open"))}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Xử lý tất cả
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400 text-sm font-semibold">
                      <FaCheckCircle className="text-green-500" /> Đã xử lý xong
                    </span>
                  )}
                  <button 
                    onClick={() => navigate(`/patient/chat/${group.patientId}`)}
                    className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Nhắn tin"
                  >
                    <FaCommentDots className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => navigate(`/patient/${group.patientId}`)}
                    className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Hồ sơ bệnh nhân"
                  >
                    <FaFileMedical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                  <div className="space-y-3">
                    {group.alerts.map(alert => (
                      <div 
                        key={alert.id} 
                        className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        onClick={() => navigate(`/alert/${alert.id}`)}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getSeverityBadge(alert.severity)}`} aria-label={getSeverityLabel(alert.severity)}>
                              {getSeverityIcon(alert.severity)}
                              {getSeverityLabel(alert.severity)}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <FaRegClock /> {new Date(alert.createdAt).toLocaleString("vi-VN")}
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {alert.violations.map((v, i) => (
                              <li key={i} className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                • {formatViolation(v)}
                              </li>
                            ))}
                          </ul>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-3 inline-block">
                            Xem chi tiết cảnh báo →
                          </span>
                        </div>
                        {alert.status === "open" ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openResolveModal(alert);
                            }}
                            className="whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Xác nhận xử lý
                          </button>
                        ) : (
                          <div className="text-sm text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                            <FaCheckCircle className="text-green-500" /> Đã xử lý {alert.acknowledgedByName && `• ${alert.acknowledgedByName}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTableTab = () => {
    if (loading && filteredAlerts.length === 0) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {["STT", "Bệnh nhân", "Chỉ số vi phạm", "Mức độ", "Trạng thái", "Thời gian", "Hành động"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (filteredAlerts.length === 0) {
      return (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <FaCheckCircle className="mx-auto h-12 w-12 text-green-500 opacity-50 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {activeTab === "PENDING" ? "Không có cảnh báo nào cần xử lý" : "Không tìm thấy cảnh báo nào"}
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">STT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bệnh nhân</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chỉ số vi phạm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mức độ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredAlerts.map((alert: AlertResponse, idx: number) => {
                const isOpen = alert.status === "open";
                const sev = normalizeAlertSeverity(alert.severity);
                const patientCode = `PAT-${alert.patientId.substring(0, 6).toUpperCase()}`;
                return (
                  <tr
                    key={alert.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${
                      !isOpen ? "opacity-70" : ""
                    }`}
                    onClick={() => navigate(`/alert/${alert.id}`)}
                  >
                    {/* STT */}
                    <td className="px-4 py-3">
                      <div className={`w-1 h-full absolute left-0 top-0 rounded-l ${ sev === "high" ? "bg-red-400" : "bg-amber-400" }`} />
                      <span className="font-medium text-slate-500 dark:text-slate-400">{(currentPage - 1) * 10 + idx + 1}</span>
                    </td>
                    {/* Bệnh nhân */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <FaUserInjured className="text-sm text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{alert.patientName || "Bệnh nhân"}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{patientCode}</p>
                        </div>
                      </div>
                    </td>
                    {/* Vi phạm */}
                    <td className="px-4 py-3 max-w-xs">
                      <ul className="space-y-0.5">
                        {alert.violations.slice(0, 2).map((v, i) => (
                          <li key={i} className="text-xs text-slate-700 dark:text-slate-300">
                            • {formatViolation(v)}
                          </li>
                        ))}
                        {alert.violations.length > 2 && (
                          <li className="text-xs text-slate-500 italic">+{alert.violations.length - 2} chỉ số khác...</li>
                        )}
                      </ul>
                    </td>
                    {/* Mức độ */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getSeverityBadge(alert.severity)}`}>
                        {getSeverityIcon(alert.severity)}
                        {getSeverityLabel(alert.severity)}
                      </span>
                    </td>
                    {/* Trạng thái */}
                    <td className="px-4 py-3">
                      {isOpen ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                          Chưa xử lý
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                          <FaCheckCircle className="w-3 h-3" /> Đã xử lý
                        </span>
                      )}
                    </td>
                    {/* Thời gian */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap">
                        <FaRegClock className="flex-shrink-0" />
                        {new Date(alert.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </td>
                    {/* Hành động */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {isOpen ? (
                          <button
                            onClick={() => openResolveModal(alert)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                          >
                            Xác nhận
                          </button>
                        ) : (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                            {alert.acknowledgedByName ? `• ${alert.acknowledgedByName}` : "Đã xử lý"}
                          </span>
                        )}
                        <button
                          onClick={() => navigate(`/patient/chat/${alert.patientId}`)}
                          title="Nhắn tin"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <FaCommentDots className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/patient/${alert.patientId}`)}
                          title="Hồ sơ"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <FaFileMedical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] font-sans dark:bg-slate-900">
      <div className="w-full space-y-4 px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-3">
              Quản Lý Cảnh Báo
              {loading && <FaSyncAlt className="w-5 h-5 text-blue-500 animate-spin" />}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Theo dõi và xử lý các chỉ số sinh tồn vượt ngưỡng của bệnh nhân.
              {lastUpdated && ` Cập nhật lúc: ${lastUpdated}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              <button
                onClick={() => handleSetViewMode("card")}
                title="Chế độ nhóm thẻ"
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "card"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <FaThLarge className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode("table")}
                title="Chế độ bảng"
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <FaTable className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => void refetch()}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <FaSyncAlt className={(loading || refreshing) ? "animate-spin" : ""} />
              Làm mới
            </button>
          </div>
        </div>

        {toast && <Toast toast={toast} onClose={hideToast} />}

        {renderStats()}
        {renderFilters()}

        {viewMode === "card" ? renderGroupedTab() : renderTableTab()}

        {/* Pagination */}
        {(totalPages > 1 || loading) && (
          <div className={`mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row ${loading ? "opacity-60 pointer-events-none" : ""}`}>
            {loading && totalItems === 0 ? (
              <>
                <div className="h-4 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="flex h-8 items-center gap-1">
                  <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                  <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                  <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("common.showing")}{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, totalItems)}
                  </span>{" "}
                  {t("common.of")}{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {totalItems}
                  </span>
                </p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => !loading && setCurrentPage(page)}
                />
              </>
            )}
          </div>
        )}

        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Xác nhận xử lý cảnh báo</h3>
                <button 
                  onClick={() => !isResolving && setShowResolveModal(false)}
                  className="text-slate-400 hover:text-slate-500 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Bạn đang xác nhận xử lý <strong>{currentAlertsToResolve.length}</strong> cảnh báo. Hệ thống sẽ ghi nhận bạn là người xử lý các cảnh báo này.
                </p>
                
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700">
                  <ul className="space-y-2">
                    {currentAlertsToResolve.map(a => (
                      <li key={a.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>{a.patientName || "PAT-"+a.patientId.substring(0,6)}:</strong>{" "}
                          {a.violations.map(v => formatViolationText(v)).join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                    onClick={() => setShowResolveModal(false)}
                    disabled={isResolving}
                  >
                    Hủy
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center gap-2"
                    onClick={handleResolveConfirm}
                    disabled={isResolving}
                  >
                    {isResolving && <FaSyncAlt className="animate-spin" />}
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThresholdAlert;

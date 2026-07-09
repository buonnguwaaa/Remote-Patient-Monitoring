import { useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  FaCheckCircle,
  FaCommentDots,
  FaExclamationTriangle,
  FaInfoCircle,
  FaRegClock,
  FaSyncAlt,
  FaUserInjured,
  FaSearch,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import Table from "../components/ui/Table";
import type { Column } from "../components/ui/Table";
import { useToast } from "../hooks/useToast";
import {
  acknowledgeAlert,
  getAlerts,
} from "../services/patientService";
import type { AlertResponse } from "../types/patient";

export const AlertSeverity = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

// Map english severity to vietnamese per user request
export const getSeverityLabel = (level: string) => {
  switch (level) {
    case AlertSeverity.HIGH:
      return "Nghiêm trọng";
    case AlertSeverity.MEDIUM:
      return "Cảnh báo";
    case AlertSeverity.LOW:
      return "Cần theo dõi";
    default:
      return "Không rõ";
  }
};

export const getSeverityBadge = (level: string) => {
  switch (level) {
    case AlertSeverity.HIGH:
      return "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-red-500/25";
    case AlertSeverity.MEDIUM:
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-500/25";
    case AlertSeverity.LOW:
      return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/25";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-200 dark:ring-1 dark:ring-slate-500/25";
  }
};

export const getSeverityIcon = (level: string) => {
  switch (level) {
    case AlertSeverity.HIGH:
      return <FaExclamationTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case AlertSeverity.MEDIUM:
      return <FaExclamationTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case AlertSeverity.LOW:
      return <FaInfoCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <FaInfoCircle className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
  }
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
  
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  
  // Resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [currentAlertsToResolve, setCurrentAlertsToResolve] = useState<AlertResponse[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const { toast, showToast, hideToast } = useToast();

  const { data: alertsData = [], isLoading: loading, isFetching: refreshing, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => getAlerts({ limit: 1000, page: 1, sortOrder: "desc" }),
    staleTime: 5 * 60 * 1000,
  });

  const alerts = useMemo(() => {
    if (filterPatientId) {
      return alertsData.filter((a) => a.patientId === filterPatientId);
    }
    return alertsData;
  }, [alertsData, filterPatientId]);

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

    let typeName = viNames[v.type] || t(`measurements.types.${v.type}`, v.type);
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

  // derived state
  const filteredAlerts = useMemo(() => {
    let result = alerts;

    // Filter by tab
    if (activeTab === "PENDING") {
      result = result.filter(a => a.status === "open");
    } else if (activeTab === "RESOLVED") {
      result = result.filter(a => a.status === "ack");
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => 
        (a.patientName && a.patientName.toLowerCase().includes(q)) ||
        a.patientId.toLowerCase().includes(q)
      );
    }

    // Severity
    if (severityFilter !== "ALL") {
      result = result.filter(a => a.severity === severityFilter.toLowerCase());
    }

    // Sort: High severity first, then newest
    result.sort((a, b) => {
      const severityMap: Record<string, number> = { "high": 3, "medium": 2, "low": 1 };
      const sevA = severityMap[a.severity] || 0;
      const sevB = severityMap[b.severity] || 0;
      if (sevA !== sevB) return sevB - sevA; // DESC
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // DESC
    });

    return result;
  }, [alerts, activeTab, searchQuery, severityFilter]);

  // Group alerts for pending tab
  const groupedPendingAlerts = useMemo(() => {
    if (activeTab !== "PENDING") return [];
    
    const groups = new Map<string, {
      patientId: string;
      patientName: string;
      patientCode: string;
      alerts: AlertResponse[];
      highCount: number;
      mediumCount: number;
      lowCount: number;
      latestAlert: AlertResponse | null;
    }>();

    filteredAlerts.forEach(alert => {
      const pId = alert.patientId;
      if (!groups.has(pId)) {
        groups.set(pId, {
          patientId: pId,
          patientName: alert.patientName || "Chưa cập nhật tên",
          patientCode: `PAT-${pId.substring(0, 6).toUpperCase()}`,
          alerts: [],
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          latestAlert: null
        });
      }
      const group = groups.get(pId)!;
      group.alerts.push(alert);
      
      if (alert.severity === "high") group.highCount++;
      else if (alert.severity === "medium") group.mediumCount++;
      else if (alert.severity === "low") group.lowCount++;

      if (!group.latestAlert || new Date(alert.createdAt) > new Date(group.latestAlert.createdAt)) {
        group.latestAlert = alert;
      }
    });

    // Convert to array and sort by severity (patients with high alerts first)
    return Array.from(groups.values()).sort((a, b) => {
      if (a.highCount !== b.highCount) return b.highCount - a.highCount;
      if (a.mediumCount !== b.mediumCount) return b.mediumCount - a.mediumCount;
      if (a.lowCount !== b.lowCount) return b.lowCount - a.lowCount;
      return 0;
    });
  }, [filteredAlerts, activeTab]);

  const stats = useMemo(() => {
    const pending = alerts.filter(a => a.status === "open");
    return {
      pendingTotal: pending.length,
      pendingHigh: pending.filter(a => a.severity === "high").length,
    };
  }, [alerts]);

  // Pagination for ALL / RESOLVED tabs
  // const itemsPerPage = 10;
  // const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  // const paginatedAlerts = filteredAlerts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Chờ xử lý</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.pendingTotal}</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
          <FaRegClock className="text-xl text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-red-200 dark:border-red-900/50 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Nghiêm trọng (Chờ xử lý)</p>
          <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">{stats.pendingHigh}</p>
        </div>
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
          <FaExclamationTriangle className="text-xl text-red-600 dark:text-red-400" />
        </div>
      </div>
    </div>
  );

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
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Mức độ (Tất cả)</option>
            <option value="HIGH">Nghiêm trọng</option>
            <option value="MEDIUM">Cảnh báo</option>
            <option value="LOW">Cần theo dõi</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderPendingTab = () => {
    if (groupedPendingAlerts.length === 0) {
      return (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <FaCheckCircle className="mx-auto h-12 w-12 text-green-500 opacity-50 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Không có cảnh báo nào cần xử lý</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {groupedPendingAlerts.map(group => {
          const isExpanded = expandedPatients.has(group.patientId);
          
          return (
            <div 
              key={group.patientId} 
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all"
            >
              {/* Header / Summary Card */}
              <div 
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                onClick={() => togglePatientExpanded(group.patientId)}
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <FaUserInjured className="text-blue-600 dark:text-blue-400 text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {group.patientName} <span className="text-sm font-normal text-slate-500 ml-2">({group.patientCode})</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {group.alerts.length} cảnh báo chờ xử lý:
                      </span>
                      {group.highCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400">
                          <FaExclamationTriangle /> {group.highCount} Nghiêm trọng
                        </span>
                      )}
                      {group.mediumCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                          <FaExclamationTriangle /> {group.mediumCount} Cảnh báo
                        </span>
                      )}
                      {group.lowCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400">
                          <FaInfoCircle /> {group.lowCount} Cần theo dõi
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
                  <button 
                    onClick={() => openResolveModal(group.alerts)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Xử lý tất cả
                  </button>
                  <button 
                    onClick={() => navigate(`/patient/chat/${group.patientId}`)}
                    className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Nhắn tin"
                  >
                    <FaCommentDots className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                  <div className="space-y-3">
                    {group.alerts.map(alert => (
                      <div 
                        key={alert.id} 
                        className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        onClick={() => navigate(`/patient/${alert.patientId}`)}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getSeverityBadge(alert.severity)}`}>
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
                            Xem chi tiết hồ sơ →
                          </span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openResolveModal(alert);
                          }}
                          className="whitespace-nowrap px-3 py-1.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium rounded-lg transition-colors dark:text-white"
                        >
                          Xác nhận xử lý
                        </button>
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
    const columns: Column<AlertResponse>[] = [
      {
        header: "Bệnh nhân",
        render: (row: AlertResponse) => (
          <div className="flex items-center gap-3">
            {row.patientAvatarUrl ? (
              <img src={row.patientAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <FaUserInjured className="text-blue-500" />
              </div>
            )}
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{row.patientName || "Không tên"}</p>
              <p className="text-xs text-slate-500">PAT-{row.patientId.substring(0,6).toUpperCase()}</p>
            </div>
          </div>
        )
      },
      {
        header: "Mức độ",
        render: (row: AlertResponse) => (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getSeverityBadge(row.severity)}`}>
            {getSeverityIcon(row.severity)}
            {getSeverityLabel(row.severity)}
          </span>
        )
      },
      {
        header: "Chi tiết bất thường",
        render: (row: AlertResponse) => (
          <div className="max-w-xs space-y-1">
            {row.violations.map((v, i) => (
              <div key={i} className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                {formatViolation(v)}
              </div>
            ))}
          </div>
        )
      },
      {
        header: "Thời gian",
        render: (row: AlertResponse) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {new Date(row.createdAt).toLocaleString("vi-VN")}
          </span>
        )
      },
      {
        header: "Trạng thái",
        render: (row: AlertResponse) => (
          row.status === "open" ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium text-sm">Chờ xử lý</span>
          ) : (
            <div className="text-sm">
              <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <FaCheckCircle /> Đã xử lý
              </span>
              {row.acknowledgedByName && (
                <span className="text-xs text-slate-500 block mt-0.5">Bởi: {row.acknowledgedByName}</span>
              )}
            </div>
          )
        )
      },
      {
        header: "Thao tác",
        render: (row: AlertResponse) => (
          <div className="flex gap-2">
            <Link 
              to={`/patient/${row.patientId}`} 
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
            >
              Hồ sơ
            </Link>
          </div>
        )
      }
    ];

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <Table columns={columns} data={filteredAlerts} />
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
        
        <button
          onClick={() => void refetch()}
          disabled={loading || refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <FaSyncAlt className={(loading || refreshing) ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {toast && <Toast toast={toast} onClose={hideToast} />}

      {renderStats()}
      {renderFilters()}

      {activeTab === "PENDING" ? renderPendingTab() : renderTableTab()}

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
                        {a.violations.map(v => formatViolation(v)).join(", ")}
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

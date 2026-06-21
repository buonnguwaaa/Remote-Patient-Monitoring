import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaCheckCircle,
  FaChevronUp,
  FaCommentDots,
  FaExclamationTriangle,
  FaInfoCircle,
  FaRegClock,
  FaSyncAlt,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import Table from "../components/ui/Table";
import type { Column } from "../components/ui/Table";
import { useToast } from "../hooks/useToast";
import {
  acknowledgeAlert,
  getAlerts,
  getMyPatients,
} from "../services/patientService";
import type { AlertResponse, AssignmentResponse } from "../types/patient";

const ThresholdAlert = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterPatientId = searchParams.get("patientId");
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AlertResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const { toast, showToast, hideToast } = useToast();

  const toggleExpanded = (alertId: string) => {
    setExpandedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) next.delete(alertId);
      else next.add(alertId);
      return next;
    });
  };

  const stats = useMemo(() => {
    return {
      total: alerts.length,
      open: alerts.filter((item) => item.status === "open").length,
      ack: alerts.filter((item) => item.status === "ack").length,
      high: alerts.filter((item) => item.severity === "high").length,
    };
  }, [alerts]);

  const loadAlerts = async (showErrorToast = false) => {
    try {
      setRefreshing(true);
      const [patientAssignments, alertList] = await Promise.all([
        getMyPatients(),
        getAlerts(),
      ]);

      const assignmentMap = new Map<string, AssignmentResponse>();
      patientAssignments.forEach((item) => {
        assignmentMap.set(item.patientId, item);
      });

      const scopedAlerts = alertList.map((item) => {
        const assignment = assignmentMap.get(item.patientId);
        return {
          ...item,
          patientName:
            item.patientName || assignment?.patientName || t("alerts.patient"),
        };
      });

      let finalAlerts = scopedAlerts;
      if (filterPatientId) {
        finalAlerts = finalAlerts.filter(a => a.patientId === filterPatientId);
      }

      setAlerts(finalAlerts);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error("Failed to load alerts", error);
      if (showErrorToast) {
        showToast(t("alerts.cannotLoadAlerts"), "error", {
          title: t("alerts.loadDataFailed"),
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAlerts(true);
  }, []);

  const navigateToChat = (alert: AlertResponse) => {
    const query = new URLSearchParams({ alertId: alert.id });
    navigate(`/patient/chat/${alert.patientId}?${query.toString()}`, {
      state: { alertSnapshot: alert },
    });
  };

  const handleOpenResolveModal = (alert: AlertResponse) => {
    setCurrentAlert(alert);
    setShowResolveModal(true);
  };

  const closeResolveModal = () => {
    setShowResolveModal(false);
    setCurrentAlert(null);
  };

  const handleConfirmAcknowledge = async () => {
    if (!currentAlert) return;
    try {
      const updated =
        currentAlert.status === "ack"
          ? currentAlert
          : await acknowledgeAlert(currentAlert.id);

      setAlerts((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                ...updated,
                patientName: updated.patientName || item.patientName,
                patientAvatarUrl:
                  updated.patientAvatarUrl || item.patientAvatarUrl,
              }
            : item,
        ),
      );

      setLastUpdated(new Date().toISOString());
      closeResolveModal();
      showToast(t("alerts.acknowledgeSuccess"), "success", {
        title: t("alerts.processSuccess"),
      });
    } catch (error: any) {
      console.error("Failed to acknowledge alert", error);
      showToast(
        error?.response?.data?.error || t("alerts.acknowledgeError"),
        "error",
        { title: t("alerts.processFailed") },
      );
    }
  };

  const getViolationLabel = (type: string) => {
    const labels: Record<string, string> = {
      temperature: t("alerts.temperature"),
      heart_rate: t("alerts.heartRate"),
      respiratory_rate: t("alerts.respiratoryRate"),
      spo2: "SpO2",
      blood_pressure_systolic: t("alerts.systolic"),
      blood_pressure_diastolic: t("alerts.diastolic"),
      glucose: t("alerts.glucose"),
    };
    return labels[type] || type;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ─── Mobile card renderer ──────────────────────────────────────────────────
  const renderAlertCard = (alert: AlertResponse) => {
    const primaryViolations = alert.violations.slice(0, 2);
    return (
      <div
        key={alert.id}
        className="rounded-lg border border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900 dark:text-slate-100">
              {alert.patientName || t("alerts.patient")}
            </h3>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatDate(alert.createdAt)}
            </div>
            {alert.acknowledgedAt && (
              <div className="mt-1 text-xs text-green-600 dark:text-emerald-300">
                {t("alerts.acknowledgedAt")} {formatDate(alert.acknowledgedAt)}
              </div>
            )}
          </div>
          <div className="shrink-0">{renderStatusBadge(alert)}</div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span
            className={`inline-flex whitespace-nowrap items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${
              alert.severity === "high"
                ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
            }`}
          >
            {alert.severity === "high" ? <FaExclamationTriangle /> : <FaInfoCircle />}
            {alert.severity === "high" ? t("alerts.severe") : t("alerts.info")}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {alert.status === "ack" ? t("alerts.processed") : t("alerts.pending")}
          </span>
        </div>

        <div className="mt-4 space-y-2 rounded-md bg-slate-50 p-3 dark:bg-slate-950/70">
          {primaryViolations.map((violation, index) => (
            <div key={`${alert.id}-mobile-${index}`} className="text-sm leading-6 text-gray-700 dark:text-slate-300">
              <span className="font-medium text-gray-800 dark:text-slate-100">
                {getViolationLabel(violation.type)}:
              </span>{" "}
              <span className="font-semibold text-red-600 dark:text-red-300">{violation.observed}</span>
              <span className="ml-1 text-xs text-gray-500 dark:text-slate-400">
                ({t("alerts.threshold")} {violation.threshold})
              </span>
            </div>
          ))}
          {alert.violations.length > 2 && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("alerts.moreViolations").replace("{{count}}", String(alert.violations.length - 2))}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {alert.status === "open" ? (
            <button
              type="button"
              onClick={() => handleOpenResolveModal(alert)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              <FaCheckCircle />{t("alerts.process")}
            </button>
          ) : (
            <button type="button" disabled className="inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-200 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <FaCheckCircle />{t("alerts.processed")}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigateToChat(alert)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-blue-200"
          >
            <FaCommentDots />{t("alerts.message")}
          </button>
        </div>
      </div>
    );
  };

  const renderStatusBadge = (alert: AlertResponse) => {
    if (alert.status === "ack") {
      return (
        <div className="inline-flex flex-col items-center">
          <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/25">
            <FaCheckCircle />{t("alerts.acknowledged")}
          </span>
          <div className="mt-1 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
            {alert.acknowledgedByName || alert.acknowledgedBy || t("alerts.processed")}
          </div>
        </div>
      );
    }
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-slate-700/80 dark:text-slate-200 dark:ring-1 dark:ring-slate-600">
        <FaRegClock />{t("alerts.pending")}
      </span>
    );
  };

  // ─── Desktop table columns ─────────────────────────────────────────────────
  const columns: Column<AlertResponse>[] = [
    {
      header: <div className="flex justify-center pl-8 pr-3">{t("alerts.patient")}</div>,
      className: "min-w-[180px] pl-8 pr-3",
      cellClassName: "text-center",
      render: (alert) => (
        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
          {alert.patientName || t("alerts.patient")}
        </div>
      ),
    },
    {
      header: "Chỉ số vượt ngưỡng",
      render: (alert) => {
        // Sắp xếp theo độ ưu tiên lâm sàng
        const PRIORITY: Record<string, number> = {
          blood_pressure_systolic: 0,
          blood_pressure_diastolic: 1,
          glucose: 2,
          heart_rate: 3,
          spo2: 4,
          temperature: 5,
          respiratory_rate: 6,
        };
        const sorted = [...alert.violations].sort(
          (a, b) => (PRIORITY[a.type] ?? 99) - (PRIORITY[b.type] ?? 99),
        );
        const isExpanded = expandedAlerts.has(alert.id);
        const shown = isExpanded ? sorted : sorted.slice(0, 3);
        const hasMore = sorted.length > 3;
        return (
          <div className="space-y-1">
            {shown.map((violation, index) => (
              <div key={`${alert.id}-${index}`} className="text-sm">
                <span className="font-medium text-gray-700 dark:text-slate-200">
                  {getViolationLabel(violation.type)}:
                </span>{" "}
                <span className="font-semibold text-red-600 dark:text-red-300">
                  {violation.observed}
                </span>
                <span className="ml-1 text-xs text-gray-400 dark:text-slate-500">
                  ({violation.threshold})
                </span>
              </div>
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={() => toggleExpanded(alert.id)}
                title={isExpanded ? "Thu gọn" : `+${sorted.length - 3} chỉ số khác`}
                className="mt-0.5 inline-flex h-5 w-8 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-200"
              >
                {isExpanded ? <FaChevronUp className="h-2.5 w-2.5" /> : "..."}
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: <div className="flex justify-center">{t("alerts.severity")}</div>,
      className: "min-w-[110px]",
      cellClassName: "text-center",
      render: (alert) =>
        alert.severity === "high" ? (
          <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-sm font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-red-500/25">
            <FaExclamationTriangle className="h-3 w-3" />
            {t("alerts.severe")}
          </span>
        ) : (
          <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-500/25">
            <FaInfoCircle className="h-3 w-3" />
            {t("alerts.info")}
          </span>
        ),
    },
    {
      header: <div className="flex justify-center">{t("alerts.status")}</div>,
      className: "min-w-[130px]",
      cellClassName: "text-center",
      render: (alert) => renderStatusBadge(alert),
    },
    {
      header: <div className="flex justify-center">{t("alerts.time")}</div>,
      className: "min-w-[160px] whitespace-nowrap",
      cellClassName: "text-center text-sm text-gray-600 dark:text-slate-300",
      render: (alert) => (
        <>
          <div>{formatDate(alert.createdAt)}</div>
          {alert.acknowledgedAt && (
            <div className="mt-0.5 text-xs text-green-600 dark:text-emerald-300">
              {t("alerts.acknowledgedAt")} {formatDate(alert.acknowledgedAt)}
            </div>
          )}
        </>
      ),
    },
    {
      header: <div className="flex justify-center">{t("alerts.actions")}</div>,
      className: "min-w-[160px]",
      cellClassName: "text-center",
      render: (alert) => (
        <div className="flex items-center justify-center gap-1.5">
          {alert.status === "open" ? (
            <button
              type="button"
              onClick={() => handleOpenResolveModal(alert)}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <FaCheckCircle className="h-3 w-3" />
              {t("alerts.process")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigateToChat(alert)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-blue-200"
            >
              <FaCommentDots className="h-3 w-3" />
              {t("alerts.message")}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 pb-24 dark:bg-slate-950 sm:p-6 sm:pb-24">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 sm:text-3xl">
              {t("alerts.title")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-slate-400 sm:text-base">
              {t("alerts.description")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAlerts(true)}
            disabled={refreshing}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FaSyncAlt className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {t("common.refreshData")}
          </button>
        </div>

        {/* Stats cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm text-slate-500 dark:text-slate-400">{t("alerts.totalAlerts")}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              {lastUpdated ? `${t("alerts.lastUpdated")} ${formatDate(lastUpdated)}` : t("alerts.notSynced")}
            </div>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50/70 p-5 dark:border-red-900/60 dark:bg-slate-900">
            <div className="text-sm text-red-600 dark:text-red-400">{t("alerts.highSeverity")}</div>
            <div className="mt-2 text-3xl font-bold text-red-700 dark:text-red-300">{stats.high}</div>
            <div className="mt-4 text-xs text-red-500 dark:text-red-400">{t("alerts.prioritize")}</div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-slate-900">
            <div className="text-sm text-amber-700 dark:text-amber-300">{t("alerts.pending")}</div>
            <div className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-200">{stats.open}</div>
            <div className="mt-4 text-xs text-amber-600 dark:text-amber-400">{t("alerts.notAcknowledged")}</div>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50/70 p-5 dark:border-emerald-900/60 dark:bg-slate-900">
            <div className="text-sm text-green-700 dark:text-green-300">{t("alerts.acknowledged")}</div>
            <div className="mt-2 text-3xl font-bold text-green-800 dark:text-green-200">{stats.ack}</div>
            <div className="mt-4 text-xs text-green-600 dark:text-green-400">{t("alerts.acknowledgedBy")}</div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {t("alerts.loadingAlerts")}
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {t("alerts.noAlerts")}
            </div>
          ) : (
            alerts.map((alert) => renderAlertCard(alert))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table<AlertResponse>
            data={alerts}
            columns={columns}
            rowKey={(alert) => alert.id}
            loading={loading}
            paginated={true}
            itemsPerPage={8}
            emptyText={t("alerts.noAlerts")}
          />
        </div>

        {showResolveModal && currentAlert && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-10 sm:pt-14">
            <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {t("alerts.confirmAcknowledge")}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {t("alerts.confirmAcknowledgeDesc").replace(
                  "{{patientName}}",
                  currentAlert.patientName || t("alerts.patient"),
                )}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeResolveModal}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmAcknowledge()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                >
                  {t("common.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Toast toast={toast} onClose={hideToast} />
    </>
  );
};

export default ThresholdAlert;

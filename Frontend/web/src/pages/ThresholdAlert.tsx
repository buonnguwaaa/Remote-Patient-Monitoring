import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaCheckCircle,
  FaCommentDots,
  FaExclamationTriangle,
  FaInfoCircle,
  FaRegClock,
  FaSyncAlt,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { toast, showToast, hideToast } = useToast();

  // Pagination calculations
  const totalPages = Math.ceil(alerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const filteredAlerts = alerts.slice(startIndex, endIndex);

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
      state: {
        alertSnapshot: alert,
      },
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
        {
          title: t("alerts.processFailed"),
        },
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

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPrimaryViolations = (alert: AlertResponse) =>
    alert.violations.slice(0, 2);

  const renderAlertCard = (alert: AlertResponse) => {
    const primaryViolations = getPrimaryViolations(alert);

    return (
      <div
        key={alert.id}
        className="rounded-lg border border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-gray-900 dark:text-slate-100">
                {alert.patientName || t("alerts.patient")}
              </h3>
            </div>

            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatDate(alert.createdAt)}
            </div>

            {alert.acknowledgedAt ? (
              <div className="mt-1 text-xs text-green-600 dark:text-emerald-300">
                {t("alerts.acknowledgedAt")} {formatDate(alert.acknowledgedAt)}
              </div>
            ) : null}
          </div>

          <div className="shrink-0">{renderStatusBadge(alert)}</div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span
            className={`inline-flex whitespace-nowrap items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${
              alert.severity === "high"
                ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-red-500/25"
                : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-500/25"
            }`}
          >
            {alert.severity === "high" ? (
              <FaExclamationTriangle />
            ) : (
              <FaInfoCircle />
            )}
            {alert.severity === "high" ? t("alerts.severe") : t("alerts.info")}
          </span>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            {alert.status === "ack" ? t("alerts.processed") : t("alerts.pending")}
          </span>
        </div>

        <div className="mt-4 space-y-2 rounded-md bg-slate-50 p-3 dark:bg-slate-950/70">
          {primaryViolations.map((violation, index) => (
            <div
              key={`${alert.id}-mobile-${index}`}
              className="text-sm leading-6 text-gray-700 dark:text-slate-300"
            >
              <span className="font-medium text-gray-800 dark:text-slate-100">
                {getViolationLabel(violation.type)}:
              </span>{" "}
              <span className="font-semibold text-red-600 dark:text-red-300">
                {violation.observed}
              </span>
              <span className="ml-1 text-xs text-gray-500 dark:text-slate-400">
                ({t("alerts.threshold")} {violation.threshold})
              </span>
            </div>
          ))}

          {alert.violations.length > 2 ? (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("alerts.moreViolations").replace("{{count}}", String(alert.violations.length - 2))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {alert.status === "open" ? (
            <button
              type="button"
              onClick={() => handleOpenResolveModal(alert)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              <FaCheckCircle />{t("alerts.process")}</button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-200 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              <FaCheckCircle />{t("alerts.processed")}</button>
          )}

          <button
            type="button"
            onClick={() => navigateToChat(alert)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:border-blue-400/40 dark:hover:bg-slate-700 dark:hover:text-blue-200"
          >
            <FaCommentDots />{t("alerts.message")}</button>
        </div>
      </div>
    );
  };

  const renderStatusBadge = (alert: AlertResponse) => {
    if (alert.status === "ack") {
      return (
        <div className="inline-flex min-w-[140px] flex-col items-center">
          <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/25">
            <FaCheckCircle />{t("alerts.acknowledged")}</span>
          <div className="mt-1 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
            {alert.acknowledgedByName || alert.acknowledgedBy || t("alerts.processed")}
          </div>
        </div>
      );
    }

    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-slate-700/80 dark:text-slate-200 dark:ring-1 dark:ring-slate-600">
        <FaRegClock />{t("alerts.pending")}</span>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 pb-24 dark:bg-slate-950 sm:p-6 sm:pb-24">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 sm:text-3xl">{t("alerts.title")}</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-slate-400 sm:text-base">{t("alerts.description")}</p>
          </div>

          <button
            type="button"
            onClick={() => void loadAlerts(true)}
            disabled={refreshing}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FaSyncAlt className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />{t("common.refreshData")}</button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm text-slate-500 dark:text-slate-400">{t("alerts.totalAlerts")}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.total}
            </div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              {lastUpdated
                ? `${t("alerts.lastUpdated")} ${formatDate(lastUpdated)}`
                : t("alerts.notSynced")}
            </div>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50/70 p-5 dark:border-red-900/60 dark:bg-slate-900">
            <div className="text-sm text-red-600 dark:text-red-400">{t("alerts.highSeverity")}</div>
            <div className="mt-2 text-3xl font-bold text-red-700 dark:text-red-300">
              {stats.high}
            </div>
            <div className="mt-4 text-xs text-red-500 dark:text-red-400">{t("alerts.prioritize")}</div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-slate-900">
            <div className="text-sm text-amber-700 dark:text-amber-300">{t("alerts.pending")}</div>
            <div className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-200">
              {stats.open}
            </div>
            <div className="mt-4 text-xs text-amber-600 dark:text-amber-400">{t("alerts.notAcknowledged")}</div>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50/70 p-5 dark:border-emerald-900/60 dark:bg-slate-900">
            <div className="text-sm text-green-700 dark:text-green-300">{t("alerts.acknowledged")}</div>
            <div className="mt-2 text-3xl font-bold text-green-800 dark:text-green-200">
              {stats.ack}
            </div>
            <div className="mt-4 text-xs text-green-600 dark:text-green-400">{t("alerts.acknowledgedBy")}</div>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">{t("alerts.loadingAlerts")}</div>
          ) : alerts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">{t("alerts.noAlerts")}</div>
          ) : (
            filteredAlerts.map((alert) => renderAlertCard(alert))
          )}
        </div>

        <div className="hidden md:block">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="overflow-x-scroll">
              <table className="w-full min-w-[1450px] divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">{t("alerts.patient")}</th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">{t("alerts.violations")}</th>
                    <th className="min-w-[150px] whitespace-nowrap px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">{t("alerts.severity")}</th>
                    <th className="min-w-[170px] whitespace-nowrap px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">{t("alerts.status")}</th>
                    <th className="min-w-[210px] whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">{t("alerts.time")}</th>
                    <th className="min-w-[220px] whitespace-nowrap px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">{t("alerts.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">{t("alerts.loadingAlerts")}</td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">{t("alerts.noAlerts")}</td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <div className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                              {alert.patientAvatarUrl ? (
                                <img
                                  src={alert.patientAvatarUrl}
                                  alt={alert.patientName || alert.patientId}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                (alert.patientName || "P").slice(0, 1).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                {alert.patientName || alert.patientId}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">ID: {alert.patientId}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            {alert.violations.map((violation, index) => (
                              <div key={`${alert.id}-${index}`} className="text-sm">
                                <span className="font-medium text-gray-700 dark:text-slate-200">
                                  {getViolationLabel(violation.type)}:
                                </span>{" "}
                                <span className="font-semibold text-red-600 dark:text-red-300">{violation.observed}</span>
                                <span className="ml-1 text-xs text-gray-500 dark:text-slate-400">
                                  ({t("alerts.threshold")} {violation.threshold})
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          {alert.severity === "high" ? (
                            <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-red-500/25">
                              <FaExclamationTriangle />{t("alerts.severe")}</span>
                          ) : (
                            <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-500/25">
                              <FaInfoCircle />{t("alerts.info")}</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">{renderStatusBadge(alert)}</td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                          <div>{formatDate(alert.createdAt)}</div>
                          {alert.acknowledgedAt && (
                            <div className="mt-1 text-xs text-green-600 dark:text-emerald-300">
                              {t("alerts.acknowledgedAt")} {formatDate(alert.acknowledgedAt)}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex min-w-[180px] flex-col items-center gap-2">
                            {alert.status === "open" ? (
                              <button
                                type="button"
                                onClick={() => handleOpenResolveModal(alert)}
                                className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                              >{t("alerts.process")}</button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => navigateToChat(alert)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:border-blue-400/40 dark:hover:bg-slate-700 dark:hover:text-blue-200"
                              >
                                <FaCommentDots />{t("alerts.message")}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredAlerts.length > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:flex-row">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {t("common.showing") + " " + (startIndex + 1) + "-" + Math.min(endIndex, alerts.length) + " " + t("common.of") + " " + alerts.length + " " + t("nav.alerts").toLowerCase()}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >{t("common.previous")}</button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1);

                  if (!showPage) {
                    // Show ellipsis
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span
                          key={page}
                          className="px-2 text-slate-400 dark:text-slate-500"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[40px] rounded-xl px-3 py-2 text-sm font-medium transition ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Sau
              </button>
            </div>
          </div>
        )}

        {showResolveModal && currentAlert && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-10 sm:pt-14">
            <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("alerts.confirmAcknowledge")}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t("alerts.confirmAcknowledgeDesc").replace("{{patientName}}", currentAlert.patientName || t("alerts.patient"))}</p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeResolveModal}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >{t("common.cancel")}</button>
                <button
                  type="button"
                  onClick={() => void handleConfirmAcknowledge()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                >{t("common.confirm")}</button>
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

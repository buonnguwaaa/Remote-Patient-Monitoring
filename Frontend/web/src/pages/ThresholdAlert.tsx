import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaCommentDots,
  FaExclamationTriangle,
  FaInfoCircle,
  FaRegClock,
  FaSort,
  FaSortDown,
  FaSortUp,
  FaSyncAlt,
} from "react-icons/fa";

import Table, { type Column } from "../components/ui/Table";
import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import {
  acknowledgeAlert,
  getAlerts,
  getMyPatients,
} from "../services/patientService";
import type { AlertResponse, AssignmentResponse } from "../types/patient";

type SortField = "severity" | "status";
type SortDirection = "asc" | "desc";

const ThresholdAlert = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [myPatients, setMyPatients] = useState<AssignmentResponse[]>([]);
  const [sortState, setSortState] = useState<{
    field: SortField;
    direction: SortDirection;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AlertResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const sortedAlerts = useMemo(() => {
    if (!sortState) return alerts;

    const direction = sortState.direction === "asc" ? 1 : -1;
    return [...alerts].sort((a, b) => {
      const getSortValue = (alert: AlertResponse, field: SortField) => {
        if (field === "severity") return alert.severity === "high" ? 1 : 0;
        return alert.status === "open" ? 1 : 0;
      };
      const diff =
        getSortValue(a, sortState.field) - getSortValue(b, sortState.field);
      return diff * direction;
    });
  }, [alerts, sortState]);

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
            item.patientName || assignment?.patientName || "Bệnh nhân",
        };
      });

      setMyPatients(patientAssignments);
      setAlerts(scopedAlerts);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error("Failed to load alerts", error);
      if (showErrorToast) {
        showToast("Không thể tải dữ liệu cảnh báo thực tế.", "error", {
          title: "Tải dữ liệu thất bại",
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

  const handleSort = (field: SortField) => {
    setSortState((prev) => {
      if (!prev || prev.field !== field) {
        return { field, direction: "asc" };
      }

      return {
        field,
        direction: prev.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const getSortIcon = (field: SortField) => {
    if (!sortState || sortState.field !== field) {
      return (
        <FaSort className="text-[11px] text-gray-400 dark:text-slate-400" />
      );
    }

    return sortState.direction === "asc" ? (
      <FaSortUp className="text-[11px] text-gray-700 dark:text-slate-100" />
    ) : (
      <FaSortDown className="text-[11px] text-gray-700 dark:text-slate-100" />
    );
  };

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

      showToast("Đã xác nhận cảnh báo thành công.", "success", {
        title: "Xử lý thành công",
      });
    } catch (error: any) {
      console.error("Failed to acknowledge alert", error);
      showToast(
        error?.response?.data?.error || "Không thể xác nhận cảnh báo này.",
        "error",
        {
          title: "Xử lý thất bại",
        },
      );
    }
  };

  const getViolationLabel = (type: string) => {
    const labels: Record<string, string> = {
      temperature: "Nhiệt độ",
      heart_rate: "Nhịp tim",
      respiratory_rate: "Nhịp thở",
      spo2: "SpO2",
      blood_pressure_systolic: "Huyết áp tâm thu",
      blood_pressure_diastolic: "Huyết áp tâm trương",
      glucose: "Đường huyết",
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
                {alert.patientName || "Bệnh nhân"}
              </h3>
            </div>

            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {formatDate(alert.createdAt)}
            </div>

            {alert.acknowledgedAt ? (
              <div className="mt-1 text-xs text-green-600 dark:text-emerald-300">
                Đã xác nhận lúc: {formatDate(alert.acknowledgedAt)}
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
            {alert.severity === "high" ? "Nghiêm trọng" : "Thông tin"}
          </span>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            {alert.status === "ack" ? "Đã xử lý" : "Chờ xử lý"}
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
                (Ngưỡng: {violation.threshold})
              </span>
            </div>
          ))}

          {alert.violations.length > 2 ? (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Còn {alert.violations.length - 2} chỉ số khác đang vượt ngưỡng.
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
              <FaCheckCircle />
              Xử lý
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-slate-200 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >
              <FaCheckCircle />
              Đã xử lý
            </button>
          )}

          <button
            type="button"
            onClick={() => navigateToChat(alert)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:border-blue-400/40 dark:hover:bg-slate-700 dark:hover:text-blue-200"
          >
            <FaCommentDots />
            Tin nhắn
          </button>
        </div>
      </div>
    );
  };

  const renderStatusBadge = (alert: AlertResponse) => {
    if (alert.status === "ack") {
      return (
        <div className="inline-flex min-w-[140px] flex-col items-center">
          <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-md bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/25">
            <FaCheckCircle />
            Đã xác nhận
          </span>
          <div className="mt-1 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400">
            {alert.acknowledgedByName || alert.acknowledgedBy || "Đã xử lý"}
          </div>
        </div>
      );
    }

    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-slate-700/80 dark:text-slate-200 dark:ring-1 dark:ring-slate-600">
        <FaRegClock />
        Chờ xử lý
      </span>
    );
  };

  const tableColumns: Column<AlertResponse>[] = [
    {
      header: "Bệnh nhân",
      className: "whitespace-nowrap",
      render: (alert) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
            {alert.patientName || "Bệnh nhân"}
          </div>
        </div>
      ),
    },
    {
      header: "Vi phạm",
      className: "min-w-[320px]",
      render: (alert) => (
        <div className="space-y-1.5">
          {alert.violations.map((violation, index) => (
            <div key={`${alert.id}-${index}`} className="text-sm">
              <span className="font-medium text-gray-700 dark:text-slate-200">
                {getViolationLabel(violation.type)}:
              </span>{" "}
              <span className="font-semibold text-red-600 dark:text-red-300">
                {violation.observed}
              </span>
              <span className="ml-1 text-xs text-gray-500 dark:text-slate-400">
                (Ngưỡng: {violation.threshold})
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      header: (
        <button
          type="button"
          onClick={() => handleSort("severity")}
          className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <span>Mức độ</span>
          {getSortIcon("severity")}
        </button>
      ),
      className: "min-w-[150px] text-center",
      render: (alert) =>
        alert.severity === "high" ? (
          <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-red-500/25">
            <FaExclamationTriangle />
            Nghiêm trọng
          </span>
        ) : (
          <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-500/25">
            <FaInfoCircle />
            Thông tin
          </span>
        ),
    },
    {
      header: (
        <button
          type="button"
          onClick={() => handleSort("status")}
          className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 transition hover:text-gray-700 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <span>Trạng thái</span>
          {getSortIcon("status")}
        </button>
      ),
      className: "min-w-[170px] text-center",
      render: (alert) => renderStatusBadge(alert),
    },
    {
      header: "Thời gian",
      className: "min-w-[210px]",
      render: (alert) => (
        <div className="text-sm text-gray-600 dark:text-slate-300">
          <div>{formatDate(alert.createdAt)}</div>
          {alert.acknowledgedAt && (
            <div className="mt-1 text-xs text-green-600 dark:text-emerald-300">
              Đã xác nhận lúc: {formatDate(alert.acknowledgedAt)}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Hành động",
      className: "min-w-[200px] text-center",
      render: (alert) => (
        <div className="flex min-w-[160px] flex-col items-center gap-2">
          {alert.status === "open" ? (
            <>
              <button
                type="button"
                onClick={() => handleOpenResolveModal(alert)}
                className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                Xử lý
              </button>
              <button
                type="button"
                onClick={() => navigateToChat(alert)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:border-blue-400/40 dark:hover:bg-slate-700 dark:hover:text-blue-200"
              >
                <FaCommentDots />
                Tin nhắn
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigateToChat(alert)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:border-blue-400/40 dark:hover:bg-slate-700 dark:hover:text-blue-200"
            >
              <FaCommentDots />
              Tin nhắn
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-slate-950 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 sm:text-3xl">
              Quản Lý Cảnh Báo
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-slate-400 sm:text-base">
              Theo dõi alert thật được sinh ra từ measurement vượt ngưỡng, lọc
              theo mức độ, và chuyển thẳng sang chat bệnh nhân khi cần trao đổi
              theo từng cảnh báo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAlerts(true)}
            disabled={refreshing}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FaSyncAlt className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới dữ liệu
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Tổng cảnh báo
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.total}
            </div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              {lastUpdated
                ? `Cập nhật lúc ${formatDate(lastUpdated)}`
                : "Chưa đồng bộ"}
            </div>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50/70 p-5 dark:border-red-900/60 dark:bg-slate-900">
            <div className="text-sm text-red-600 dark:text-red-400">
              Mức cao
            </div>
            <div className="mt-2 text-3xl font-bold text-red-700 dark:text-red-300">
              {stats.high}
            </div>
            <div className="mt-4 text-xs text-red-500 dark:text-red-400">
              Cần ưu tiên xử lý sớm
            </div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-slate-900">
            <div className="text-sm text-amber-700 dark:text-amber-300">
              Chờ xử lý
            </div>
            <div className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-200">
              {stats.open}
            </div>
            <div className="mt-4 text-xs text-amber-600 dark:text-amber-400">
              Chưa được acknowledge
            </div>
          </div>
          <div className="rounded-lg border border-green-100 bg-green-50/70 p-5 dark:border-emerald-900/60 dark:bg-slate-900">
            <div className="text-sm text-green-700 dark:text-green-300">
              Đã xác nhận
            </div>
            <div className="mt-2 text-3xl font-bold text-green-800 dark:text-green-200">
              {stats.ack}
            </div>
            <div className="mt-4 text-xs text-green-600 dark:text-green-400">
              Đã có người xử lý
            </div>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Đang tải cảnh báo thật từ hệ thống...
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Không có cảnh báo nào trong scope hiện tại.
            </div>
          ) : (
            sortedAlerts.map((alert) => renderAlertCard(alert))
          )}
        </div>

        <div className="hidden md:block">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Đang tải cảnh báo thật từ hệ thống...
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Không có cảnh báo nào trong scope hiện tại.
            </div>
          ) : (
            <Table
              data={sortedAlerts}
              columns={tableColumns}
              itemsPerPage={Math.max(sortedAlerts.length, 1)}
              className="min-h-0 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          )}
        </div>

        {showResolveModal && currentAlert && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-10 sm:pt-14">
            <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Xác nhận xử lý
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Xác nhận đánh dấu cảnh báo của{" "}
                {currentAlert.patientName || "bệnh nhân"} là đã xử lý?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeResolveModal}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmAcknowledge()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                >
                  Xác nhận
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

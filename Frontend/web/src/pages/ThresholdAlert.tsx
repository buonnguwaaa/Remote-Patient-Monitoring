import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaCommentDots,
  FaExclamationTriangle,
  FaInfoCircle,
  FaRegClock,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { acknowledgeAlert, getAlerts, getMyPatients } from "../services/patientService";
import type { AlertResponse, AssignmentResponse } from "../types/patient";

type FilterStatus = "all" | "open" | "ack";
type FilterSeverity = "all" | "high" | "info";

interface ChatNavigationOptions {
  prefilledMessage?: string;
  autoSendMessage?: boolean;
}

const quickMessageTemplates = [
  "Anh/chị vui lòng đo lại sau 30 phút và cập nhật lại chỉ số cho bác sĩ.",
  "Nếu chỉ số vẫn bất thường, anh/chị liên hệ lại bác sĩ hoặc cơ sở y tế gần nhất.",
  "Tạm thời theo dõi thêm trong ngày, hạn chế gắng sức và uống đủ nước.",
];

const ThresholdAlert = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [myPatients, setMyPatients] = useState<AssignmentResponse[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AlertResponse | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [sendToPatient, setSendToPatient] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const patientIds = useMemo(() => myPatients.map((item) => item.patientId), [myPatients]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filterStatus !== "all" && alert.status !== filterStatus) return false;
      if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterStatus]);

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
      const [patientAssignments, alertList] = await Promise.all([getMyPatients(), getAlerts()]);

      const assignmentMap = new Map<string, AssignmentResponse>();
      patientAssignments.forEach((item) => {
        assignmentMap.set(item.patientId, item);
      });

      const scopedAlerts = alertList.map((item) => {
        const assignment = assignmentMap.get(item.patientId);
        return {
          ...item,
          patientName: item.patientName || assignment?.patientName || item.patientId,
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

  const navigateToChat = (alert: AlertResponse, options?: ChatNavigationOptions) => {
    const query = new URLSearchParams({ alertId: alert.id });

    navigate(`/patient/chat/${alert.patientId}?${query.toString()}`, {
      state: {
        alertSnapshot: alert,
        prefilledMessage: options?.prefilledMessage,
        autoSendMessage: options?.autoSendMessage ?? false,
      },
    });
  };

  const handleOpenResolveModal = (alert: AlertResponse) => {
    setCurrentAlert(alert);
    setDraftMessage("");
    setSendToPatient(true);
    setShowResolveModal(true);
  };

  const closeResolveModal = () => {
    setShowResolveModal(false);
    setDraftMessage("");
    setSendToPatient(true);
    setCurrentAlert(null);
  };

  const handleConfirmAcknowledge = async (shouldSendMessage: boolean) => {
    if (!currentAlert) return;

    const trimmedMessage = draftMessage.trim();
    const shouldOpenChat = shouldSendMessage && sendToPatient && Boolean(trimmedMessage);

    try {
      const updated =
        currentAlert.status === "ack" ? currentAlert : await acknowledgeAlert(currentAlert.id);

      setAlerts((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                ...updated,
                patientName: updated.patientName || item.patientName,
                patientAvatarUrl: updated.patientAvatarUrl || item.patientAvatarUrl,
              }
            : item
        )
      );

      setLastUpdated(new Date().toISOString());

      const alertForChat = {
        ...currentAlert,
        ...updated,
        patientName: updated.patientName || currentAlert.patientName,
        patientAvatarUrl: updated.patientAvatarUrl || currentAlert.patientAvatarUrl,
      };
      const alertChatMessage = shouldOpenChat
        ? buildAlertChatMessage(alertForChat, trimmedMessage)
        : "";

      closeResolveModal();

      if (shouldOpenChat) {
        navigateToChat(alertForChat, {
          prefilledMessage: alertChatMessage,
          autoSendMessage: true,
        });
        return;
      }

      showToast("Đã xác nhận cảnh báo thành công.", "success", {
        title: "Xử lý thành công",
      });
    } catch (error: any) {
      console.error("Failed to acknowledge alert", error);
      showToast(error?.response?.data?.error || "Không thể xác nhận cảnh báo này.", "error", {
        title: "Xử lý thất bại",
      });
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

  const buildAlertSummary = (alert: AlertResponse) => {
    const primaryViolations = getPrimaryViolations(alert)
      .map(
        (violation) =>
          `${getViolationLabel(violation.type)} ${violation.observed} (ngưỡng ${violation.threshold})`
      )
      .join(", ");

    const remainingCount = Math.max(alert.violations.length - 2, 0);
    return remainingCount > 0
      ? `${primaryViolations} và ${remainingCount} chỉ số khác đang vượt ngưỡng`
      : primaryViolations;
  };

  const buildAlertChatMessage = (alert: AlertResponse, doctorMessage: string) => {
    const summary = buildAlertSummary(alert);
    return [`Cảnh báo chỉ số: ${summary}.`, doctorMessage.trim()].filter(Boolean).join("\n");
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

  const getPrimaryViolations = (alert: AlertResponse) => alert.violations.slice(0, 2);

  const renderStatusBadge = (alert: AlertResponse) => {
    if (alert.status === "ack") {
      return (
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-500/25">
            <FaCheckCircle />
            Đã xác nhận
          </span>
          <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            {alert.acknowledgedByName || alert.acknowledgedBy || "Đã xử lý"}
          </div>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-slate-700/80 dark:text-slate-200 dark:ring-1 dark:ring-slate-600">
        <FaRegClock />
        Chờ xử lý
      </span>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-slate-950">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Quản Lý Cảnh Báo</h1>
            <p className="mt-2 max-w-3xl text-gray-600 dark:text-slate-400">
              Theo dõi alert thật được sinh ra từ measurement vượt ngưỡng, lọc theo mức độ, và
              chuyển thẳng sang chat bệnh nhân khi cần trao đổi theo từng cảnh báo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAlerts(true)}
            disabled={refreshing}
            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FaSyncAlt className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới dữ liệu
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="text-sm text-slate-500 dark:text-slate-400">Tổng cảnh báo</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              {lastUpdated ? `Cập nhật lúc ${formatDate(lastUpdated)}` : "Chưa đồng bộ"}
            </div>
          </div>
          <div className="rounded-3xl border border-red-100 bg-red-50/70 p-5 shadow-sm dark:border-red-900/60 dark:bg-slate-900 dark:shadow-none">
            <div className="text-sm text-red-600 dark:text-red-400">Mức cao</div>
            <div className="mt-2 text-3xl font-bold text-red-700 dark:text-red-300">{stats.high}</div>
            <div className="mt-4 text-xs text-red-500 dark:text-red-400">Cần ưu tiên xử lý sớm</div>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm dark:border-amber-900/60 dark:bg-slate-900 dark:shadow-none">
            <div className="text-sm text-amber-700 dark:text-amber-300">Chờ xử lý</div>
            <div className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-200">{stats.open}</div>
            <div className="mt-4 text-xs text-amber-600 dark:text-amber-400">Chưa được acknowledge</div>
          </div>
          <div className="rounded-3xl border border-green-100 bg-green-50/70 p-5 shadow-sm dark:border-emerald-900/60 dark:bg-slate-900 dark:shadow-none">
            <div className="text-sm text-green-700 dark:text-green-300">Đã xác nhận</div>
            <div className="mt-2 text-3xl font-bold text-green-800 dark:text-green-200">{stats.ack}</div>
            <div className="mt-4 text-xs text-green-600 dark:text-green-400">Đã có người xử lý</div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Trạng thái:</label>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="all">Tất cả</option>
              <option value="open">Chưa xử lý</option>
              <option value="ack">Đã xác nhận</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Mức độ:</label>
            <select
              value={filterSeverity}
              onChange={(event) => setFilterSeverity(event.target.value as FilterSeverity)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <option value="all">Tất cả</option>
              <option value="high">Nghiêm trọng</option>
              <option value="info">Thông tin</option>
            </select>
          </div>

          <div className="ml-auto flex items-center text-sm text-gray-500 dark:text-slate-400">
            Bệnh nhân quản lý:{" "}
            <span className="ml-1 font-semibold text-gray-800 dark:text-slate-200">{patientIds.length}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">
                    Bệnh nhân
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">
                    Vi phạm
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">
                    Mức độ
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-300">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">
                      Đang tải cảnh báo thật từ hệ thống...
                    </td>
                  </tr>
                ) : filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 dark:text-slate-400">
                      Không có cảnh báo nào trong scope hiện tại.
                    </td>
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
                                (Ngưỡng: {violation.threshold})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {alert.severity === "high" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-red-500/25">
                            <FaExclamationTriangle />
                            Nghiêm trọng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-500/25">
                            <FaInfoCircle />
                            Thông tin
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">{renderStatusBadge(alert)}</td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                        <div>{formatDate(alert.createdAt)}</div>
                        {alert.acknowledgedAt && (
                          <div className="mt-1 text-xs text-green-600 dark:text-emerald-300">
                            Đã xác nhận lúc: {formatDate(alert.acknowledgedAt)}
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
                            >
                              Xử lý
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => navigateToChat(alert)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-700/70 dark:text-slate-100 dark:hover:border-blue-400/40 dark:hover:bg-slate-700 dark:hover:text-blue-200"
                          >
                            <FaCommentDots />
                            Tin nhắn
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showResolveModal && currentAlert && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center py-4">
              <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700/80">
              <div className="flex items-start justify-between border-b border-slate-200 p-6 dark:border-slate-700">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Xác nhận & nhắn bệnh nhân</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Xử lý cảnh báo của {currentAlert.patientName || currentAlert.patientId}. Nếu có
                    lời nhắn, hệ thống sẽ gửi thẳng vào cuộc trò chuyện hiện có với bệnh nhân.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeResolveModal}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto p-6">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Bệnh nhân</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {currentAlert.patientName || currentAlert.patientId}
                      </div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Alert ID: {currentAlert.id}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                          currentAlert.severity === "high"
                            ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-red-500/25"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-1 dark:ring-amber-500/25"
                        }`}
                      >
                        {currentAlert.severity === "high" ? <FaExclamationTriangle /> : <FaInfoCircle />}
                        {currentAlert.severity === "high" ? "Nghiêm trọng" : "Thông tin"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700/80 dark:text-slate-200 dark:ring-1 dark:ring-slate-600">
                        Đo lúc {formatDate(currentAlert.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {getPrimaryViolations(currentAlert).map((violation, index) => (
                      <div
                        key={`${currentAlert.id}-summary-${index}`}
                        className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800 dark:shadow-none"
                      >
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {getViolationLabel(violation.type)}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-red-600 dark:text-red-300">{violation.observed}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Ngưỡng tham chiếu: {violation.threshold}</div>
                      </div>
                    ))}
                  </div>

                  {currentAlert.violations.length > 2 && (
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Còn {currentAlert.violations.length - 2} vi phạm khác sẽ tiếp tục hiển thị trong danh sách
                      chính.
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Lời nhắn gửi bệnh nhân</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Nếu bác sĩ nhập nội dung, hệ thống sẽ gửi một tin nhắn vào cuộc trò chuyện
                        kèm tóm tắt ngắn gọn các chỉ số vi phạm của cảnh báo này.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickMessageTemplates.map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => setDraftMessage(template)}
                        className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:border-blue-400/40 dark:hover:bg-blue-500/20"
                      >
                        {template}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    rows={5}
                    placeholder="Nhập hướng dẫn cho bệnh nhân..."
                    className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-500/20"
                  />

                  <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100 whitespace-pre-wrap">
                    <span className="font-medium">Tin nhắn sẽ gửi:</span>{" "}
                    {draftMessage.trim()
                      ? buildAlertChatMessage(currentAlert, draftMessage)
                      : `Cảnh báo chỉ số: ${buildAlertSummary(currentAlert)}.`}
                  </div>

                  <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={sendToPatient}
                      onChange={(event) => setSendToPatient(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-500 dark:bg-slate-900"
                    />
                    Gửi lời nhắn này vào cuộc trò chuyện ngay sau khi xác nhận
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-b-[28px] border-t border-slate-200 bg-slate-50 p-5 sm:flex-row dark:border-slate-700 dark:bg-slate-900/80">
                <button
                  type="button"
                  onClick={closeResolveModal}
                  className="flex-1 rounded-2xl bg-white px-4 py-3 font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmAcknowledge(false)}
                  className="flex-1 rounded-2xl bg-slate-700 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmAcknowledge(true)}
                  disabled={!sendToPatient || !draftMessage.trim()}
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  Xác nhận và gửi
                </button>
              </div>
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

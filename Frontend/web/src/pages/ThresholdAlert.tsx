import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaCommentDots,
  FaEdit,
  FaExclamationTriangle,
  FaInfoCircle,
  FaPaperPlane,
  FaRegClock,
  FaSyncAlt,
  FaTimes,
  FaUser,
  FaUserMd,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { acknowledgeAlert, getAlerts, getMyPatients } from "../services/patientService";
import type { AlertResponse, AssignmentResponse } from "../types/patient";

type FilterStatus = "all" | "open" | "ack";
type FilterSeverity = "all" | "high" | "info";
type MessageSenderRole = "doctor" | "patient";

interface AlertMessage {
  id: string;
  alertId: string;
  senderRole: MessageSenderRole;
  senderName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  sentToPatient?: boolean;
}

interface EditingMessageState {
  alertId: string;
  message: AlertMessage;
}

const quickMessageTemplates = [
  "Anh/chị vui lòng đo lại sau 30 phút và cập nhật lại chỉ số cho bác sĩ.",
  "Nếu chỉ số vẫn bất thường, anh/chị liên hệ lại bác sĩ hoặc cơ sở y tế gần nhất.",
  "Tạm thời theo dõi thêm trong ngày, hạn chế gắng sức và uống đủ nước.",
];

const createMockMessages = (alert: AlertResponse): AlertMessage[] => {
  const baseTime = new Date(alert.createdAt).getTime();
  const patientName = alert.patientName || "Bệnh nhân";

  return [
    {
      id: `${alert.id}-msg-1`,
      alertId: alert.id,
      senderRole: "doctor",
      senderName: "BS. Minh Anh",
      content: `Tôi đã xem cảnh báo của ${patientName}. Anh/chị giữ bình tĩnh và theo dõi thêm nhé.`,
      createdAt: new Date(baseTime + 8 * 60 * 1000).toISOString(),
      sentToPatient: true,
    },
    {
      id: `${alert.id}-msg-2`,
      alertId: alert.id,
      senderRole: "patient",
      senderName: patientName,
      content: "Dạ bác sĩ, tôi đã nhận được thông tin và sẽ đo lại theo hướng dẫn.",
      createdAt: new Date(baseTime + 16 * 60 * 1000).toISOString(),
    },
  ];
};

const ThresholdAlert = () => {
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [myPatients, setMyPatients] = useState<AssignmentResponse[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showMessageDrawer, setShowMessageDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AlertResponse | null>(null);
  const [messageThreads, setMessageThreads] = useState<Record<string, AlertMessage[]>>({});
  const [editingMessage, setEditingMessage] = useState<EditingMessageState | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [editedMessageContent, setEditedMessageContent] = useState("");
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

  useEffect(() => {
    setMessageThreads((prev) => {
      let changed = false;
      const next = { ...prev };

      alerts.forEach((alert) => {
        if (!next[alert.id]) {
          next[alert.id] = createMockMessages(alert);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
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

  const handleOpenResolveModal = (alert: AlertResponse) => {
    setCurrentAlert(alert);
    setDraftMessage("");
    setSendToPatient(true);
    setShowResolveModal(true);
  };

  const handleOpenMessageDrawer = (alert: AlertResponse) => {
    setCurrentAlert(alert);
    setShowResolveModal(false);
    setShowMessageDrawer(true);
  };

  const closeResolveModal = () => {
    setShowResolveModal(false);
    setDraftMessage("");
    setSendToPatient(true);
    setCurrentAlert(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingMessage(null);
    setEditedMessageContent("");
  };

  const appendDoctorMessage = (alertId: string, content: string, sent: boolean) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const now = new Date().toISOString();
    const nextMessage: AlertMessage = {
      id: `${alertId}-msg-${Date.now()}`,
      alertId,
      senderRole: "doctor",
      senderName: "BS. Minh Anh",
      content: trimmed,
      createdAt: now,
      sentToPatient: sent,
    };

    setMessageThreads((prev) => ({
      ...prev,
      [alertId]: [...(prev[alertId] || []), nextMessage],
    }));
  };

  const handleConfirmAcknowledge = async (shouldSendMessage: boolean) => {
    if (!currentAlert) return;

    try {
      const updated = await acknowledgeAlert(currentAlert.id);

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

      if (shouldSendMessage && sendToPatient && draftMessage.trim()) {
        appendDoctorMessage(currentAlert.id, draftMessage, true);
      }

      setLastUpdated(new Date().toISOString());
      showToast(
        shouldSendMessage && sendToPatient && draftMessage.trim()
          ? "Đã xác nhận cảnh báo và gửi lời nhắn cho bệnh nhân."
          : "Đã xác nhận cảnh báo thành công.",
        "success",
        {
          title: "Xử lý thành công",
        }
      );

      const alertForDrawer = {
        ...currentAlert,
        ...updated,
        patientName: updated.patientName || currentAlert.patientName,
        patientAvatarUrl: updated.patientAvatarUrl || currentAlert.patientAvatarUrl,
      };

      setCurrentAlert(alertForDrawer);
      setShowResolveModal(false);
      setDraftMessage("");

      if (shouldSendMessage && sendToPatient && draftMessage.trim()) {
        setShowMessageDrawer(true);
      }
    } catch (error: any) {
      console.error("Failed to acknowledge alert", error);
      showToast(error?.response?.data?.error || "Không thể xác nhận cảnh báo này.", "error", {
        title: "Xử lý thất bại",
      });
    }
  };

  const handleStartEditMessage = (alertId: string, message: AlertMessage) => {
    setEditingMessage({ alertId, message });
    setEditedMessageContent(message.content);
    setShowEditModal(true);
  };

  const handleSaveEditedMessage = () => {
    if (!editingMessage || !editedMessageContent.trim()) return;

    setMessageThreads((prev) => ({
      ...prev,
      [editingMessage.alertId]: (prev[editingMessage.alertId] || []).map((item) =>
        item.id === editingMessage.message.id
          ? {
              ...item,
              content: editedMessageContent.trim(),
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
    }));

    showToast("Đã cập nhật lời nhắn thành công.", "success", {
      title: "Cập nhật tin nhắn",
    });
    closeEditModal();
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

  const getPrimaryViolations = (alert: AlertResponse) => alert.violations.slice(0, 2);

  const renderStatusBadge = (alert: AlertResponse) => {
    if (alert.status === "ack") {
      return (
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            <FaCheckCircle />
            Đã xác nhận
          </span>
          <div className="mt-1 text-xs text-gray-500">
            {alert.acknowledgedByName || alert.acknowledgedBy || "Đã xử lý"}
          </div>
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
        <FaRegClock />
        Chờ xử lý
      </span>
    );
  };

  const currentMessages = currentAlert ? messageThreads[currentAlert.id] || [] : [];
  const latestMessage = currentMessages[currentMessages.length - 1] || null;

  return (
    <>
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Quản Lý Cảnh Báo</h1>
            <p className="mt-2 max-w-3xl text-gray-600">
              Theo dõi alert thật được sinh ra từ measurement vượt ngưỡng, xử lý nhanh từng ca và
              lưu lại trao đổi với bệnh nhân ngay trên cùng một màn hình.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAlerts(true)}
            disabled={refreshing}
            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSyncAlt className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới dữ liệu
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Tổng cảnh báo</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</div>
            <div className="mt-4 text-xs text-slate-500">
              {lastUpdated ? `Cập nhật lúc ${formatDate(lastUpdated)}` : "Chưa đồng bộ"}
            </div>
          </div>
          <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
            <div className="text-sm text-red-600">Mức cao</div>
            <div className="mt-2 text-3xl font-bold text-red-700">{stats.high}</div>
            <div className="mt-4 text-xs text-red-500">Cần ưu tiên xử lý sớm</div>
          </div>
          <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <div className="text-sm text-amber-700">Chờ xử lý</div>
            <div className="mt-2 text-3xl font-bold text-amber-800">{stats.open}</div>
            <div className="mt-4 text-xs text-amber-600">Chưa được acknowledge</div>
          </div>
          <div className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-5 shadow-sm">
            <div className="text-sm text-green-700">Đã xác nhận</div>
            <div className="mt-2 text-3xl font-bold text-green-800">{stats.ack}</div>
            <div className="mt-4 text-xs text-green-600">Đã có người xử lý</div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Trạng thái:</label>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
              className="rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="open">Chưa xử lý</option>
              <option value="ack">Đã xác nhận</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Mức độ:</label>
            <select
              value={filterSeverity}
              onChange={(event) => setFilterSeverity(event.target.value as FilterSeverity)}
              className="rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="high">Nghiêm trọng</option>
              <option value="info">Thông tin</option>
            </select>
          </div>

          <div className="ml-auto flex items-center text-sm text-gray-500">
            Bệnh nhân quản lý: <span className="ml-1 font-semibold text-gray-800">{patientIds.length}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Bệnh nhân
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Vi phạm
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Mức độ
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Đang tải cảnh báo thật từ hệ thống...
                    </td>
                  </tr>
                ) : filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Không có cảnh báo nào trong scope hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alert) => {
                    const messageCount = messageThreads[alert.id]?.length || 0;
                    return (
                      <tr key={alert.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
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
                              <div className="text-sm font-medium text-gray-900">
                                {alert.patientName || alert.patientId}
                              </div>
                              <div className="text-xs text-gray-500">ID: {alert.patientId}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            {alert.violations.map((violation, index) => (
                              <div key={`${alert.id}-${index}`} className="text-sm">
                                <span className="font-medium text-gray-700">
                                  {getViolationLabel(violation.type)}:
                                </span>{" "}
                                <span className="font-semibold text-red-600">{violation.observed}</span>
                                <span className="ml-1 text-xs text-gray-500">
                                  (Ngưỡng: {violation.threshold})
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          {alert.severity === "high" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                              <FaExclamationTriangle />
                              Nghiêm trọng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                              <FaInfoCircle />
                              Thông tin
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">{renderStatusBadge(alert)}</td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div>{formatDate(alert.createdAt)}</div>
                          {alert.acknowledgedAt && (
                            <div className="mt-1 text-xs text-green-600">
                              Đã xác nhận lúc: {formatDate(alert.acknowledgedAt)}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex min-w-[180px] flex-col items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenResolveModal(alert)}
                              className={`w-full rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors ${
                                alert.status === "open"
                                  ? "bg-blue-600 hover:bg-blue-700"
                                  : "bg-slate-600 hover:bg-slate-700"
                              }`}
                            >
                              {alert.status === "open" ? "Xử lý" : "Cập nhật nhắn"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenMessageDrawer(alert)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <FaCommentDots />
                              Tin nhắn
                              {messageCount > 0 && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                  {messageCount}
                                </span>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showResolveModal && currentAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 p-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Xác nhận & nhắn bệnh nhân</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Xử lý cảnh báo của {currentAlert.patientName || currentAlert.patientId} và gửi hướng dẫn
                    ngay nếu cần.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeResolveModal}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Bệnh nhân</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {currentAlert.patientName || currentAlert.patientId}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">Alert ID: {currentAlert.id}</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                          currentAlert.severity === "high"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {currentAlert.severity === "high" ? <FaExclamationTriangle /> : <FaInfoCircle />}
                        {currentAlert.severity === "high" ? "Nghiêm trọng" : "Thông tin"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Đo lúc {formatDate(currentAlert.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {getPrimaryViolations(currentAlert).map((violation, index) => (
                      <div key={`${currentAlert.id}-summary-${index}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                        <div className="text-sm font-medium text-slate-700">{getViolationLabel(violation.type)}</div>
                        <div className="mt-2 text-lg font-semibold text-red-600">{violation.observed}</div>
                        <div className="text-xs text-slate-500">Ngưỡng tham chiếu: {violation.threshold}</div>
                      </div>
                    ))}
                  </div>

                  {currentAlert.violations.length > 2 && (
                    <div className="mt-3 text-xs text-slate-500">
                      Còn {currentAlert.violations.length - 2} vi phạm khác sẽ tiếp tục hiển thị trong danh sách
                      chính.
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Lời nhắn gửi bệnh nhân</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Có thể dùng mẫu nhanh rồi chỉnh lại cho phù hợp từng ca.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenMessageDrawer(currentAlert)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <FaCommentDots />
                      Xem lịch sử
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickMessageTemplates.map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => setDraftMessage(template)}
                        className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
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
                    className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />

                  <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={sendToPatient}
                      onChange={(event) => setSendToPatient(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Gửi cho bệnh nhân ngay sau khi xác nhận
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-b-[28px] border-t border-slate-200 bg-slate-50 p-5 sm:flex-row">
                <button
                  type="button"
                  onClick={closeResolveModal}
                  className="flex-1 rounded-2xl bg-white px-4 py-3 font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
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
        )}
        {showMessageDrawer && currentAlert && (
          <div className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm">
            <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 p-6">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Lịch sử nhắn</div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">
                    {currentAlert.patientName || currentAlert.patientId}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Xem lại trao đổi quanh cảnh báo này và chỉnh sửa lời nhắn bác sĩ khi cần.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMessageDrawer(false)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Alert đang xem</div>
                      <div className="mt-1 text-xs text-slate-500">Đo lúc {formatDate(currentAlert.createdAt)}</div>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      {currentMessages.length} tin nhắn
                    </span>
                  </div>

                  {latestMessage && (
                    <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                      <span className="font-medium text-slate-800">Tin gần nhất:</span> {latestMessage.content}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {currentMessages.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    Chưa có lời nhắn nào cho cảnh báo này.
                  </div>
                ) : (
                  currentMessages.map((message) => {
                    const isDoctor = message.senderRole === "doctor";
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isDoctor ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-3xl px-4 py-4 shadow-sm ring-1 ${
                            isDoctor
                              ? "bg-blue-600 text-white ring-blue-500/20"
                              : "bg-white text-slate-700 ring-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <span
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                                isDoctor ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {isDoctor ? <FaUserMd /> : <FaUser />}
                            </span>
                            <span>{message.senderName}</span>
                            {isDoctor && message.sentToPatient && (
                              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
                                Đã gửi bệnh nhân
                              </span>
                            )}
                          </div>

                          <div className={`mt-3 text-sm leading-6 ${isDoctor ? "text-white" : "text-slate-700"}`}>
                            {message.content}
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className={`text-xs ${isDoctor ? "text-blue-100" : "text-slate-400"}`}>
                              {formatDate(message.createdAt)}
                              {message.updatedAt && ` • Sửa ${formatDate(message.updatedAt)}`}
                            </div>

                            {isDoctor && (
                              <button
                                type="button"
                                onClick={() => handleStartEditMessage(currentAlert.id, message)}
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition ${
                                  isDoctor
                                    ? "bg-white/15 text-white hover:bg-white/20"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                <FaEdit />
                                Sửa
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMessageDrawer(false);
                    setShowResolveModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  <FaPaperPlane />
                  Soạn thêm lời nhắn
                </button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && editingMessage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Chỉnh sửa lời nhắn</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Nội dung mới sẽ cập nhật trong lịch sử trao đổi của cảnh báo này.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Nội dung cũ</div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">{editingMessage.message.content}</div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Nội dung chỉnh sửa</label>
                  <textarea
                    value={editedMessageContent}
                    onChange={(event) => setEditedMessageContent(event.target.value)}
                    rows={5}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex gap-3 rounded-b-[28px] border-t border-slate-200 bg-slate-50 p-5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 rounded-2xl bg-white px-4 py-3 font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedMessage}
                  disabled={!editedMessageContent.trim()}
                  className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  Lưu
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

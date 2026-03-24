import { useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
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

const ThresholdAlert = () => {
  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [myPatients, setMyPatients] = useState<AssignmentResponse[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AlertResponse | null>(null);
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

  const handleAcknowledge = (alert: AlertResponse) => {
    setCurrentAlert(alert);
    setShowModal(true);
  };

  const handleConfirmAcknowledge = async () => {
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
      setLastUpdated(new Date().toISOString());
      showToast("Đã xác nhận cảnh báo thành công.", "success", {
        title: "Xử lý thành công",
      });
      setShowModal(false);
      setCurrentAlert(null);
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

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  return (
    <>
      <div className="p-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Quản Lý Cảnh Báo</h1>
            <p className="mt-2 max-w-3xl text-gray-600 dark:text-slate-400">
              Theo dõi alert thật được sinh ra từ measurement vượt ngưỡng, lọc theo mức độ, và
              acknowledge ngay trên màn hình này.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAlerts(true)}
            disabled={refreshing}
            className="inline-flex items-center rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 transition hover:bg-gray-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSyncAlt className={`mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Làm mới dữ liệu
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="text-sm text-slate-500 dark:text-slate-400">Tổng cảnh báo</div>
            <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              {lastUpdated ? `Cập nhật lúc ${formatDate(lastUpdated)}` : "Chưa đồng bộ"}
            </div>
          </div>
          <div className="rounded-3xl border border-red-100 dark:border-red-800 bg-gradient-to-br from-red-50 dark:from-red-900/30 to-white dark:to-slate-800 p-5 shadow-sm">
            <div className="text-sm text-red-600 dark:text-red-400">Mức cao</div>
            <div className="mt-2 text-3xl font-bold text-red-700 dark:text-red-300">{stats.high}</div>
            <div className="mt-4 text-xs text-red-500 dark:text-red-400">Cần ưu tiên xử lý sớm</div>
          </div>
          <div className="rounded-3xl border border-amber-100 dark:border-amber-800 bg-gradient-to-br from-amber-50 dark:from-amber-900/30 to-white dark:to-slate-800 p-5 shadow-sm">
            <div className="text-sm text-amber-700 dark:text-amber-300">Chờ xử lý</div>
            <div className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-200">{stats.open}</div>
            <div className="mt-4 text-xs text-amber-600 dark:text-amber-400">Chưa được acknowledge</div>
          </div>
          <div className="rounded-3xl border border-green-100 dark:border-green-800 bg-gradient-to-br from-green-50 dark:from-green-900/30 to-white dark:to-slate-800 p-5 shadow-sm">
            <div className="text-sm text-green-700 dark:text-green-300">Đã xác nhận</div>
            <div className="mt-2 text-3xl font-bold text-green-800 dark:text-green-200">{stats.ack}</div>
            <div className="mt-4 text-xs text-green-600 dark:text-green-400">Đã có người xử lý</div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Trạng thái:</label>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}
              className="rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="high">Nghiêm trọng</option>
              <option value="info">Thông tin</option>
            </select>
          </div>

          <div className="ml-auto flex items-center text-sm text-gray-500 dark:text-slate-400">
            Bệnh nhân quản lý: <span className="ml-1 font-semibold text-gray-800 dark:text-slate-200">{patientIds.length}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
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
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
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
                    <tr key={alert.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/40 text-sm font-semibold text-blue-700 dark:text-blue-300">
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
                              <span className="font-medium text-gray-700 dark:text-slate-300">
                                {getViolationLabel(violation.type)}:
                              </span>{" "}
                              <span className="font-semibold text-red-600 dark:text-red-400">{violation.observed}</span>
                              <span className="ml-1 text-xs text-gray-500 dark:text-slate-400">
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

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                        <div>{formatDate(alert.createdAt)}</div>
                        {alert.acknowledgedAt && (
                          <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                            Đã xác nhận lúc: {formatDate(alert.acknowledgedAt)}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {alert.status === "open" ? (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(alert)}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                          >
                            Xác nhận
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-500">Đã xử lý</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && currentAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 shadow-xl">
              <div className="flex items-center justify-between border-b dark:border-slate-700 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Xác nhận cảnh báo</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    Bạn sắp đánh dấu cảnh báo của {currentAlert.patientName || currentAlert.patientId} là
                    đã xử lý.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setCurrentAlert(null);
                  }}
                  className="text-gray-400 dark:text-slate-500 transition-colors hover:text-gray-600 dark:hover:text-slate-200"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              <div className="p-5">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-700 p-4">
                  <div className="text-sm font-medium text-gray-700 dark:text-slate-200">Vi phạm hiện tại</div>
                  <div className="mt-3 space-y-2">
                    {currentAlert.violations.map((violation, index) => (
                      <div key={`${currentAlert.id}-modal-${index}`} className="text-sm text-gray-600 dark:text-slate-300">
                        {getViolationLabel(violation.type)}:{" "}
                        <span className="font-semibold text-red-600 dark:text-red-400">{violation.observed}</span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-slate-400">
                          (Ngưỡng: {violation.threshold})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
                  Backend hiện tại mới support acknowledge. Nếu cần ghi chú xử lý của bác sĩ, mình sẽ
                  bổ sung field note riêng ở backend sau.
                </p>
              </div>

              <div className="flex gap-3 rounded-b-3xl border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 p-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setCurrentAlert(null);
                  }}
                  className="flex-1 rounded-xl bg-gray-200 dark:bg-slate-600 px-4 py-2 font-medium text-gray-700 dark:text-slate-200 transition-colors hover:bg-gray-300 dark:hover:bg-slate-500"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmAcknowledge()}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
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

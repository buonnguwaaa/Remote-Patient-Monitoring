import { useState } from "react";
import { mockAlerts } from "../data/mockData";
import type { Alert } from "../types";
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from "react-icons/fa";

const ThresholdAlert = () => {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "ack">("all");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "high" | "info">("all");
  const [showModal, setShowModal] = useState(false);
  const [currentAlertId, setCurrentAlertId] = useState<string | null>(null);
  const [doctorNote, setDoctorNote] = useState("");

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    if (filterStatus !== "all" && alert.status !== filterStatus) return false;
    if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
    return true;
  });

  // Handle acknowledge
  const handleAcknowledge = (alertId: string) => {
    setCurrentAlertId(alertId);
    setDoctorNote("");
    setShowModal(true);
  };

  const handleConfirmAcknowledge = () => {
    if (!currentAlertId) return;

    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === currentAlertId
          ? {
            ...alert,
            status: "ack" as const,
            acknowledgedBy: "Dr. Current",
            acknowledgedAt: new Date().toISOString(),
            doctorNote: doctorNote.trim() || undefined,
          }
          : alert
      )
    );

    setShowModal(false);
    setCurrentAlertId(null);
    setDoctorNote("");
  };

  // Get violation type label
  const getViolationLabel = (type: string) => {
    const labels: Record<string, string> = {
      temperature: "Nhiệt độ",
      systolic: "Huyết áp tâm thu",
      diastolic: "Huyết áp tâm trương",
      pulse: "Nhịp tim",
      glucose: "Đường huyết",
      spo2: "SpO2",
      respiratoryRate: "Nhịp thở",
    };
    return labels[type] || type;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Quản Lý Cảnh Báo</h1>
        <p className="text-gray-600 mt-2">
          Danh sách các cảnh báo về ngưỡng chỉ số sức khỏe
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Trạng thái:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả</option>
            <option value="high">Nghiêm trọng</option>
            <option value="info">Thông tin</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-600 flex items-center">
          Tổng: <span className="font-bold ml-1">{filteredAlerts.length}</span> <span className="ml-1">cảnh báo</span>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bệnh nhân
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vi phạm
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mức độ
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Không có cảnh báo nào
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                    {/* Patient */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={alert.patientAvatar}
                          alt={alert.patientName}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {alert.patientName}
                          </div>
                          <div className="text-xs text-gray-500">ID: {alert.patientId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Violations */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {alert.violations.map((v, idx) => (
                          <div key={idx} className="text-sm">
                            <span className="font-medium text-gray-700">
                              {getViolationLabel(v.type)}:
                            </span>{" "}
                            <span className="text-red-600 font-semibold">{v.observed}</span>
                            <span className="text-gray-500 text-xs ml-1">
                              (Ngưỡng: {v.threshold})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="px-6 py-4 text-center">
                      {alert.severity === "high" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <FaExclamationTriangle />
                          Nghiêm trọng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <FaInfoCircle />
                          Thông tin
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      {alert.status === "ack" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FaCheckCircle />
                            Đã xác nhận
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {alert.acknowledgedBy}
                          </div>
                          {(alert as any).doctorNote && (
                            <div className="text-xs text-blue-600 mt-1 italic">
                              💬 {(alert as any).doctorNote}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Chờ xử lý
                        </span>
                      )}
                    </td>

                    {/* Time */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(alert.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      {alert.status === "open" && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Xác nhận
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Doctor Note */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Lời nhắc của bác sĩ</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nhập ghi chú/lời nhắc (tùy chọn)
              </label>
              <textarea
                value={doctorNote}
                onChange={(e) => setDoctorNote(e.target.value)}
                placeholder="Ví dụ: Theo dõi thêm 2 ngày, tư vấn điều chỉnh thuốc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmAcknowledge}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThresholdAlert;

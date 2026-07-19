import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCommentDots,
  FaExclamationTriangle,
  FaFolder,
  FaRegClock,
  FaUser,
  FaHeartbeat,
  FaThermometerHalf,
  FaLungs,
  FaTint,
} from "react-icons/fa";

import { getAlertById, acknowledgeAlert, getPatientById } from "../services/patientService";
import { normalizeAlertSeverity } from "../utils/alertSeverity";

export default function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAckSuccess, setIsAckSuccess] = useState(false);

  // Fetch alert detail
  const { data: alert, isLoading: loadingAlert, error: alertError } = useQuery({
    queryKey: ["alertDetail", id],
    queryFn: () => getAlertById(id || ""),
    enabled: !!id,
  });

  // Fetch patient detail when alert is loaded
  const { data: patient, isLoading: loadingPatient } = useQuery({
    queryKey: ["patientDetail", alert?.patientId],
    queryFn: () => getPatientById(alert?.patientId || ""),
    enabled: !!alert?.patientId,
  });

  // Acknowledge alert mutation
  const ackMutation = useMutation({
    mutationFn: () => acknowledgeAlert(id || ""),
    onSuccess: () => {
      setIsAckSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["alertDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const isLoading = loadingAlert || loadingPatient;

  const getSeverityBadge = (severity: unknown) => {
    const sev = normalizeAlertSeverity(severity);
    if (sev === "high") {
      return "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/50";
    }
    return "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50";
  };

  const getSeverityIcon = (severity: unknown) => {
    const sev = normalizeAlertSeverity(severity);
    if (sev === "high") {
      return <FaExclamationTriangle className="w-5 h-5 text-red-500" />;
    }
    return <FaExclamationTriangle className="w-5 h-5 text-amber-500" />;
  };

  const getSeverityLabel = (severity: unknown) => {
    return normalizeAlertSeverity(severity) === "high" ? "Ưu tiên cao" : "Cần theo dõi";
  };

  const getViolationIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("temp")) return <FaThermometerHalf className="w-5 h-5 text-orange-500" />;
    if (t.includes("pulse") || t.includes("heart")) return <FaHeartbeat className="w-5 h-5 text-red-500" />;
    if (t.includes("respir")) return <FaLungs className="w-5 h-5 text-green-500" />;
    if (t.includes("glucose")) return <FaTint className="w-5 h-5 text-purple-500" />;
    return <FaHeartbeat className="w-5 h-5 text-blue-500" />;
  };

  // Map vital type to Vietnamese label
  const getVitalTypeLabel = (type: string): string => {
    const t = type.toLowerCase();
    if (t === "temperature") return "Nhiệt độ";
    if (t === "heart_rate") return "Nhịp tim";
    if (t === "respiratory_rate") return "Nhịp thở";
    if (t === "spo2") return "SpO2";
    if (t === "blood_pressure_systolic") return "Huyết áp tâm thu";
    if (t === "blood_pressure_diastolic") return "Huyết áp tâm trương";
    if (t === "glucose") return "Đường huyết";
    return type;
  };

  // Determine violation direction from rule field (e.g. "temperature_max" → Vượt ngưỡng tối đa)
  const getViolationDirection = (rule: string): { label: string; isHigh: boolean } => {
    if (rule.endsWith("_max")) return { label: "↑ Vượt ngưỡng tối đa", isHigh: true };
    if (rule.endsWith("_min")) return { label: "↓ Dưới ngưỡng tối thiểu", isHigh: false };
    return { label: "Vi phạm ngưỡng", isHigh: true };
  };

  const formatViolationValue = (type: string, rawVal: number) => {
    const val = typeof rawVal === 'number' ? Number(rawVal.toFixed(1)) : rawVal;
    if (type.toLowerCase().includes("temp")) {
      return `${val}°C`;
    }
    if (type.toLowerCase().includes("spo2")) {
      return `${val}%`;
    }
    if (type.toLowerCase().includes("glucose")) {
      return `${val} mg/dL`;
    }
    if (type.toLowerCase().includes("systolic") || type.toLowerCase().includes("diastolic")) {
      return `${val} mmHg`;
    }
    if (type.toLowerCase().includes("pulse") || type.toLowerCase().includes("heart")) {
      return `${val} bpm`;
    }
    if (type.toLowerCase().includes("respir")) {
      return `${val} lần/phút`;
    }
    return val.toString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Đang tải thông tin chi tiết cảnh báo...</p>
        </div>
      </div>
    );
  }

  if (alertError || !alert) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <FaExclamationTriangle className="mx-auto w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">Không tìm thấy cảnh báo</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Cảnh báo này có thể đã bị xóa hoặc bạn không có quyền truy cập.</p>
          <button
            onClick={() => navigate("/threshold-alerts")}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FaArrowLeft /> Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans pb-24">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        
        {/* Back Button */}
        <button
          onClick={() => navigate("/threshold-alerts")}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors"
        >
          <FaArrowLeft /> Quay lại danh sách cảnh báo
        </button>

        {/* Alert Overview Header */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl flex-shrink-0">
              {getSeverityIcon(alert.severity)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityBadge(alert.severity)}`}>
                  {getSeverityLabel(alert.severity)}
                </span>
                {alert.status === "ack" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400 text-xs font-semibold">
                    <FaCheckCircle className="text-green-500 w-3.5 h-3.5" /> Đã xử lý
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400 text-xs font-semibold">
                    Chưa xử lý
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white mt-2">
                Cảnh báo vượt ngưỡng chỉ số sinh tồn
              </h1>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                <FaRegClock /> Phát hiện lúc: {new Date(alert.createdAt).toLocaleString("vi-VN")}
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-3 justify-end">
            {alert.status === "open" && (
              <button
                onClick={() => ackMutation.mutate()}
                disabled={ackMutation.isPending || isAckSuccess}
                className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {ackMutation.isPending && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Xác nhận xử lý
              </button>
            )}
            <button
              onClick={() => navigate(`/patient/chat/${alert.patientId}`)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FaCommentDots /> Nhắn tin
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Patient Card */}
          <div className="md:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FaUser />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 dark:text-white leading-tight">
                    {patient?.name || "Bệnh nhân"}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Mã: {patient?.patientCode || patient?.id?.substring(0, 8)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-xs">Ngày sinh</span>
                  <span className="font-medium">{patient?.dob ? new Date(patient.dob).toLocaleDateString("vi-VN") : "Chưa có"}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-xs">Giới tính</span>
                  <span className="font-medium">{patient?.gender || "Chưa có"}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-xs">Số điện thoại</span>
                  <span className="font-medium">{patient?.phone || "Chưa có"}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/patient/${alert.patientId}`)}
              className="mt-6 w-full py-2 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FaFolder /> Xem hồ sơ chi tiết
            </button>
          </div>

          {/* Violations Detail Card */}
          <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">
              Chi tiết các chỉ số vượt ngưỡng
            </h3>

            <div className="space-y-4">
              {alert.violations.map((v, i) => {
                const direction = getViolationDirection(v.rule);
                const isAbove = direction.isHigh;
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border flex items-start gap-4 ${
                      isAbove
                        ? "bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-950/30"
                        : "bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-950/30"
                    }`}
                  >
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm flex-shrink-0">
                      {getViolationIcon(v.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Header: vital name + direction badge + severity */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {getVitalTypeLabel(v.type)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          isAbove
                            ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                            : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                        }`}>
                          {direction.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          v.severity === "high"
                            ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        }`}>
                          {v.severity === "high" ? "⚠ Nghiêm trọng" : "ℹ Cần theo dõi"}
                        </span>
                      </div>
                      {/* Values */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-600">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Chỉ số đo được</span>
                          <span className={`text-lg font-bold ${isAbove ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                            {formatViolationValue(v.type, v.observed)}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-600">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Ngưỡng giới hạn</span>
                          <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                            {formatViolationValue(v.type, v.threshold)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Resolution details */}
        {alert.status === "ack" && (
          <div className="bg-green-50 dark:bg-green-950/10 border border-green-200 dark:border-green-950/20 p-6 rounded-2xl shadow-sm flex items-start gap-4">
            <FaCheckCircle className="text-green-500 w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-950 dark:text-green-400">
                Đã xử lý thành công
              </h3>
              <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                Cảnh báo này đã được ghi nhận và xử lý bởi{" "}
                <strong>{alert.acknowledgedByName || "Bác sĩ phụ trách"}</strong> vào{" "}
                {new Date(alert.updatedAt).toLocaleString("vi-VN")}.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

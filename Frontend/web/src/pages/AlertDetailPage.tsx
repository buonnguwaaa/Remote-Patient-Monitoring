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
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  Tooltip,
  ReferenceLine,
  LabelList,
} from "recharts";

import {
  getAlertById,
  acknowledgeAlert,
  getPatientById,
  getMeasurements,
  type MeasurementResponse,
} from "../services/patientService";
import { normalizeAlertSeverity } from "../utils/alertSeverity";
import { getAlertTypeBadge, getAlertSourceType, filterRedundantViolations } from "./ThresholdAlert";

export default function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAckSuccess, setIsAckSuccess] = useState(false);

  // Fetch alert detail
  const {
    data: alert,
    isLoading: loadingAlert,
    error: alertError,
  } = useQuery({
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

  // Fetch patient measurements to show trend history
  const { data: measurements } = useQuery({
    queryKey: ["patientMeasurements", alert?.patientId],
    queryFn: () => getMeasurements({ patientId: alert?.patientId }),
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
    return normalizeAlertSeverity(severity) === "high"
      ? "Ưu tiên cao"
      : "Cần theo dõi";
  };

  const getViolationIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("temp"))
      return <FaThermometerHalf className="w-5 h-5 text-orange-500" />;
    if (t.includes("pulse") || t.includes("heart"))
      return <FaHeartbeat className="w-5 h-5 text-red-500" />;
    if (t.includes("respir"))
      return <FaLungs className="w-5 h-5 text-green-500" />;
    if (t.includes("glucose"))
      return <FaTint className="w-5 h-5 text-purple-500" />;
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

  // Determine violation direction from rule field
  const getViolationDirection = (
    rule: string,
    source?: "threshold" | "trend",
  ): { label: string; isHigh: boolean; isTrend: boolean } => {
    const isTrend = source === "trend" ||
      ["trend_rising_watch", "trend_rising_high", "trend_falling_watch", "trend_falling_high"].includes(rule);

    if (isTrend) {
      const isRising = rule.includes("rising");
      return {
        label: isRising ? "↗ Xu hướng tăng dần" : "↘ Xu hướng giảm dần",
        isHigh: isRising,
        isTrend: true,
      };
    }

    if (rule.endsWith("_max"))
      return { label: "↑ Vượt ngưỡng tối đa", isHigh: true, isTrend: false };
    if (rule.endsWith("_min"))
      return { label: "↓ Dưới ngưỡng tối thiểu", isHigh: false, isTrend: false };
    return { label: "Vi phạm ngưỡng", isHigh: true, isTrend: false };
  };

  const formatViolationValue = (type: string, rawVal: number) => {
    const val = typeof rawVal === "number" ? Number(rawVal.toFixed(1)) : rawVal;
    if (type.toLowerCase().includes("temp")) {
      return `${val}°C`;
    }
    if (type.toLowerCase().includes("spo2")) {
      return `${val}%`;
    }
    if (type.toLowerCase().includes("glucose")) {
      return `${val} mg/dL`;
    }
    if (
      type.toLowerCase().includes("systolic") ||
      type.toLowerCase().includes("diastolic")
    ) {
      return `${val} mmHg`;
    }
    if (
      type.toLowerCase().includes("pulse") ||
      type.toLowerCase().includes("heart")
    ) {
      return `${val} bpm`;
    }
    if (type.toLowerCase().includes("respir")) {
      return `${val} lần/phút`;
    }
    return val.toString();
  };

  const extractVitalValue = (m: MeasurementResponse, type: string): number | null => {
    const t = type.toLowerCase();
    if (t.includes("temp")) return m.temperature ?? null;
    if (t.includes("heart") || t.includes("pulse")) return m.heartRate ?? null;
    if (t.includes("respir")) return m.respiratoryRate ?? null;
    if (t.includes("spo2")) return m.spo2 ?? null;
    if (t.includes("systolic")) return m.bloodPressure?.systolic ?? null;
    if (t.includes("diastolic")) return m.bloodPressure?.diastolic ?? null;
    if (t.includes("glucose")) {
      if (typeof m.glucose === "number") return m.glucose;
      return m.glucose?.bloodGlucose ?? null;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Đang tải thông tin chi tiết cảnh báo...
          </p>
        </div>
      </div>
    );
  }

  if (alertError || !alert) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">
          <FaExclamationTriangle className="mx-auto w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            Không tìm thấy cảnh báo
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Cảnh báo này có thể đã bị xóa hoặc bạn không có quyền truy cập.
          </p>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-24">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/threshold-alerts")}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors"
        >
          <FaArrowLeft /> Quay lại danh sách cảnh báo
        </button>

        {/* Unified Header Card: Alert Info + Patient Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
          {/* Top half: Alert Overview */}
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl flex-shrink-0">
              {getSeverityIcon(alert.severity)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityBadge(alert.severity)}`}
                >
                  {getSeverityLabel(alert.severity)}
                </span>
                {/* Alert type badge */}
                {getAlertTypeBadge(alert)}
                {alert.status === "ack" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400 text-xs font-semibold">
                    <FaCheckCircle className="text-green-500 w-3.5 h-3.5" /> Đã
                    xử lý
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400 text-xs font-semibold">
                    Chưa xử lý
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white mt-2">
                {(() => {
                  const sourceType = getAlertSourceType(alert);
                  return sourceType === "trend"
                    ? "⚠️ Cảnh báo xu hướng bất thường"
                    : "Cảnh báo vượt ngưỡng chỉ số sinh hiệu";
                })()}
              </h1>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                <FaRegClock /> Phát hiện lúc:{" "}
                {new Date(alert.createdAt).toLocaleString("vi-VN")}
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
                {ackMutation.isPending && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
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

          {/* Divider */}
          <hr className="border-slate-100 dark:border-slate-700 mx-6" />

          {/* Bottom half: Patient Header Info */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 p-5 px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg">
                <FaUser />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-950 dark:text-white leading-tight">
                  {patient?.name || "Bệnh nhân"}
                </h3>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Mã: {patient?.patientCode || patient?.id?.substring(0, 8)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-8 text-sm flex-1 md:justify-center">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-xs mb-0.5">
                  Ngày sinh
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {patient?.dob
                    ? new Date(patient.dob).toLocaleDateString("vi-VN")
                    : "Chưa có"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-xs mb-0.5">
                  Giới tính
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {patient?.gender || "Chưa có"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-xs mb-0.5">
                  Số điện thoại
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {patient?.phone || "Chưa có"}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/patient/${alert.patientId}`)}
              className="w-full md:w-auto px-5 py-2.5 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <FaFolder /> Xem hồ sơ chi tiết
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Violations Detail Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">
              {getAlertSourceType(alert) === "trend"
                ? "Chi tiết các chỉ số xu hướng bất thường"
                : "Chi tiết các chỉ số vượt ngưỡng"}
            </h3>

            <div className="space-y-4">
              {filterRedundantViolations(alert.violations).map((v, i) => {
                const direction = getViolationDirection(v.rule, v.source);
                const isAbove = direction.isHigh;
                const isTrend = direction.isTrend;
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border flex items-start gap-4 ${
                      isTrend
                        ? "bg-amber-50/60 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/30"
                        : isAbove
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
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            isTrend
                              ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                              : isAbove
                                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                                : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                          }`}
                        >
                          {direction.label}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            v.severity === "high"
                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {v.severity === "high"
                            ? "⚠ Ưu tiên cao"
                            : "ℹ Cần theo dõi"}
                        </span>
                      </div>
                      {/* Values */}
                      {isTrend ? (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-2">
                            Lịch sử biến động gần nhất
                          </span>
                          {(() => {
                            if (!measurements) return <span className="text-sm">Đang tải dữ liệu...</span>;
                            // backend measurements usually return sorted by createdAt desc
                            const historyVals = measurements
                              .filter((m) => new Date(m.createdAt) <= new Date(alert.createdAt))
                              .map((m) => extractVitalValue(m, v.type))
                              .filter((val) => val !== null)
                              .slice(0, 5)
                              .reverse(); // oldest to newest among the 5

                            if (historyVals.length === 0) {
                              return <span className="text-sm font-semibold">{formatViolationValue(v.type, v.observed)}</span>;
                            }

                            const chartData = historyVals.map((val, idx) => ({ name: `Lần ${idx + 1}`, value: val }));
                            
                            // Calculate min/max for YAxis domain to include both history values and threshold
                            const chartValues = [...historyVals, v.threshold];
                            const minVal = Math.min(...chartValues);
                            const maxVal = Math.max(...chartValues);
                            // add a little padding
                            const padding = (maxVal - minVal) * 0.2 || minVal * 0.05;
                            const yMin = minVal - padding;
                            const yMax = maxVal + padding;
                            
                            const formattedFirst = formatViolationValue(v.type, historyVals[0]!);
                            const unit = formattedFirst.replace(/[0-9.]/g, '').trim();

                            return (
                              <div className="flex flex-col gap-1">
                                {/* Sparkline Chart */}
                                <div className="h-28 w-full mt-2 -ml-2">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 25, right: 35, left: 35, bottom: 5 }}>
                                      <defs>
                                        <linearGradient id={`colorValue-${i}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <YAxis domain={[yMin, yMax]} hide />
                                      <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                        formatter={(value: any) => [`${value} ${unit}`, 'Giá trị']}
                                        labelStyle={{ fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}
                                      />
                                      <ReferenceLine 
                                        y={v.threshold} 
                                        stroke={isAbove ? "#ef4444" : "#3b82f6"} 
                                        strokeDasharray="4 4" 
                                        strokeOpacity={0.6}
                                        label={{ 
                                          position: isAbove ? 'insideBottomLeft' : 'insideTopLeft', 
                                          value: `Ngưỡng: ${formatViolationValue(v.type, v.threshold)}`, 
                                          fill: isAbove ? '#ef4444' : '#3b82f6', 
                                          fontSize: 11,
                                          fontWeight: 600,
                                          offset: 5
                                        }} 
                                      />
                                      <Area 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke="#d97706" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill={`url(#colorValue-${i})`} 
                                        isAnimationActive={true}
                                        activeDot={{ r: 5, fill: '#b45309', stroke: '#fff', strokeWidth: 2 }}
                                      >
                                        <LabelList 
                                          dataKey="value" 
                                          position="top" 
                                          offset={10}
                                          formatter={(value: any) => formatViolationValue(v.type, value)}
                                          style={{ fontSize: '12px', fontWeight: 'bold', fill: '#b45309' }}
                                        />
                                      </Area>
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-600">
                            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
                              Chỉ số đo được
                            </span>
                            <span
                              className={`text-lg font-bold ${
                                isAbove
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-blue-600 dark:text-blue-400"
                              }`}
                            >
                              {formatViolationValue(v.type, v.observed)}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 border border-slate-200 dark:border-slate-600">
                            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
                              {isAbove ? "Ngưỡng tối đa" : "Ngưỡng tối thiểu"}
                            </span>
                            <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                              {formatViolationValue(v.type, v.threshold)}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Trend extra note */}
                      {isTrend && getAlertSourceType(alert) === "trend" && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 italic">
                          Theo dõi sát xu hướng để can thiệp kịp thời.
                        </p>
                      )}
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
                <strong>
                  {alert.acknowledgedByName || "Bác sĩ phụ trách"}
                </strong>{" "}
                vào {new Date(alert.updatedAt).toLocaleString("vi-VN")}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

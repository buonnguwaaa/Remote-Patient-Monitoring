// pages/PatientDetailPage.tsx

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MdOutlineKeyboardBackspace,
  MdNotificationsActive,
  MdShowChart,
  MdFullscreen,
  MdFullscreenExit,
  MdExpandMore,
  MdExpandLess,
  MdFilterList,
} from "react-icons/md";
import { FaRegMessage } from "react-icons/fa6";
import {
  FaNotesMedical,
  FaCalendarAlt,
  FaIdCard,
  FaBirthdayCake,
  FaVenusMars,
  FaPhone,
  FaVideo
} from "react-icons/fa";
import { GiHeartBeats } from "react-icons/gi";
import VideoCallModal from "../components/video/VideoCallModal";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import Table, { type Column } from "../components/ui/Table";
import {
  getPatientById,
  getMeasurements,
  getAlerts,
  type PatientDetailResponse,
  type MeasurementResponse,
} from "../services/patientService";
import { getThresholds, type ThresholdRecord } from "../services/thresholdService";
import type { AlertResponse } from "../types/patient";

// ---- Types ----
interface ChartRow {
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  glucose: number | null;
  spo2: number | null;
  temperature: number | null;
  respiratoryRate: number | null;
  bmi: number | null;
  height: number | null;
  weight: number | null;
  measuredAt: string;
}

// ---- Normalise ----
const normalizeMeasurements = (data: MeasurementResponse[]): ChartRow[] =>
  data.map((m) => ({
    systolic: m.bloodPressure?.systolic ?? (m as any).systolic ?? null,
    diastolic: m.bloodPressure?.diastolic ?? (m as any).diastolic ?? null,
    pulse: m.heartRate ?? null,
    glucose: m.glucose
      ? typeof m.glucose === "object"
        ? (m.glucose as any).bloodGlucose ?? null
        : m.glucose
      : null,
    spo2: m.spo2 ?? null,
    temperature: m.temperature ?? null,
    respiratoryRate: m.respiratoryRate ?? null,
    bmi: m.bmi ?? null,
    height: m.height ?? null,
    weight: m.weight ?? null,
    measuredAt: (m as any).measuredAt ?? m.updatedAt ?? m.createdAt,
  }));

// ---- Helpers ----
const mapStatusLabel = (status: string, t: (k: string) => string) =>
  status === "active" ? t("patients.monitoring") : status === "inactive" ? t("patients.stopped") : status;

const getStatusColor = (status: string) =>
  status === "active"
    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
    : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-600";

const formatRelativeTime = (iso: string): string => {
  if (!iso) return "—";
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "vừa đo";
  if (diff < 60) return `${diff} phút trước`;
  if (diff < 1440) return `${Math.round(diff / 60)} giờ trước`;
  return `${Math.round(diff / 1440)} ngày trước`;
};

const formatDateTime = (iso: string): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtVal = (v: number | null, decimals = 0) =>
  v != null && v > 0 ? (decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()) : "—";

const mapViolationType = (type: string) => {
  const cleanType = type.replace(/_(max|min|high|low)$/, "");
  const map: Record<string, string> = {
    systolic: "Huyết áp tâm thu",
    diastolic: "Huyết áp tâm trương",
    blood_pressure_systolic: "Huyết áp tâm thu",
    bloodPressureSystolic: "Huyết áp tâm thu",
    blood_pressure_diastolic: "Huyết áp tâm trương",
    bloodPressureDiastolic: "Huyết áp tâm trương",
    sys: "Huyết áp tâm thu",
    bp_diastolic: "Huyết áp tâm trương",
    bloodPressure: "Huyết áp",
    heart_rate: "Nhịp tim",
    heartRate: "Nhịp tim",
    temperature: "Nhiệt độ",
    spo2: "SpO2",
    spO2: "SpO2",
    glucose: "Đường huyết",
    respiratory_rate: "Nhịp thở",
    respiratoryRate: "Nhịp thở",
  };
  return map[cleanType] || map[type] || type;
};

const mapRule = (rule: string) => {
  if (rule.includes("max")) return "vượt quá";
  if (rule.includes("min")) return "thấp hơn";
  if (rule === ">") return "vượt quá";
  if (rule === "<") return "thấp hơn";
  return rule;
};

const isRowAbnormal = (row: ChartRow, thr: ThresholdRecord | null) => {
  if (!thr) return false;
  return (
    (row.systolic != null && row.systolic > 0 && (row.systolic < thr.sysMin || row.systolic > thr.sysMax)) ||
    (row.diastolic != null && row.diastolic > 0 && (row.diastolic < thr.diaMin || row.diastolic > thr.diaMax)) ||
    (row.pulse != null && row.pulse > 0 && (row.pulse < thr.heartRateMin || row.pulse > thr.heartRateMax)) ||
    (row.temperature != null && row.temperature > 0 && (row.temperature < thr.temperatureMin || row.temperature > thr.temperatureMax)) ||
    (row.spo2 != null && row.spo2 > 0 && row.spo2 < thr.spo2Min) ||
    (row.respiratoryRate != null && row.respiratoryRate > 0 && thr.respiratoryRateMin != null &&
      (row.respiratoryRate < thr.respiratoryRateMin || row.respiratoryRate > (thr.respiratoryRateMax ?? 999))) ||
    (row.glucose != null && row.glucose > 0 && thr.glucoseMin != null &&
      (row.glucose < thr.glucoseMin || row.glucose > (thr.glucoseMax ?? 999)))
  );
};

const getBpTags = (sys: number | null, dia: number | null, thr: ThresholdRecord | null) => {
  if (!thr) return null;
  const tags: string[] = [];
  if (sys != null && sys > 0) {
    if (sys > thr.sysMax) tags.push("Tâm thu ↑");
    else if (sys < thr.sysMin) tags.push("Tâm thu ↓");
  }
  if (dia != null && dia > 0) {
    if (dia > thr.diaMax) tags.push("Tâm trương ↑");
    else if (dia < thr.diaMin) tags.push("Tâm trương ↓");
  }
  return tags.length > 0 ? tags.join(", ") : null;
};

const getChartConfig = (type: string, data: ChartRow[], thr: ThresholdRecord | null) => {
  let minVal = Infinity, maxVal = -Infinity;
  let step = 10;

  data.forEach((d) => {
    if (type === "bp") {
      if (d.systolic != null && d.systolic > 0) { minVal = Math.min(minVal, d.systolic); maxVal = Math.max(maxVal, d.systolic); }
      if (d.diastolic != null && d.diastolic > 0) { minVal = Math.min(minVal, d.diastolic); maxVal = Math.max(maxVal, d.diastolic); }
    } else {
      const val = d[type as keyof ChartRow] as number | null;
      if (val != null && val > 0) { minVal = Math.min(minVal, val); maxVal = Math.max(maxVal, val); }
    }
  });

  if (thr) {
    if (type === "bp") {
      if (thr.sysMin != null) minVal = Math.min(minVal, thr.sysMin);
      if (thr.sysMax != null) maxVal = Math.max(maxVal, thr.sysMax);
      if (thr.diaMin != null) minVal = Math.min(minVal, thr.diaMin);
      if (thr.diaMax != null) maxVal = Math.max(maxVal, thr.diaMax);
    } else if (type === "pulse") {
      if (thr.heartRateMin != null) minVal = Math.min(minVal, thr.heartRateMin);
      if (thr.heartRateMax != null) maxVal = Math.max(maxVal, thr.heartRateMax);
    } else if (type === "temperature") {
      if (thr.temperatureMin != null) minVal = Math.min(minVal, thr.temperatureMin);
      if (thr.temperatureMax != null) maxVal = Math.max(maxVal, thr.temperatureMax);
    } else if (type === "spo2") {
      if (thr.spo2Min != null) minVal = Math.min(minVal, thr.spo2Min);
      maxVal = Math.max(maxVal, 100);
    } else if (type === "glucose" && thr.glucoseMin != null && thr.glucoseMax != null) {
      minVal = Math.min(minVal, thr.glucoseMin);
      maxVal = Math.max(maxVal, thr.glucoseMax);
    } else if (type === "respiratory" && thr.respiratoryRateMin != null && thr.respiratoryRateMax != null) {
      minVal = Math.min(minVal, thr.respiratoryRateMin);
      maxVal = Math.max(maxVal, thr.respiratoryRateMax);
    }
  }

  if (minVal === Infinity) { minVal = 0; maxVal = 100; }

  if (type === "bp") { step = 20; minVal -= 20; maxVal += 20; }
  else if (type === "pulse") { step = 20; minVal -= 20; maxVal += 20; }
  else if (type === "temperature") { step = 0.5; minVal -= 1; maxVal += 1; }
  else if (type === "spo2") { step = 5; minVal = Math.max(0, minVal - 5); maxVal = 100; }
  else if (type === "glucose") { step = 50; minVal -= 50; maxVal += 50; }
  else if (type === "respiratory") { step = 5; minVal -= 5; maxVal += 5; }

  if (minVal >= maxVal) { minVal -= step; maxVal += step; }
  minVal = Math.floor(minVal / step) * step;
  maxVal = Math.ceil(maxVal / step) * step;

  const ticks: number[] = [];
  for (let i = minVal; i <= maxVal; i += step) {
    ticks.push(Number(i.toFixed(1)));
  }

  return { domain: [minVal, maxVal] as [number, number], ticks };
};

// ---- Custom Chart Sub-components ----
const CustomDot = (props: any) => {
  const { cx, cy, payload, dataKey, threshold } = props;
  
  // Recharts might pass value as an array for AreaCharts. Extract the actual value safely.
  const actualValue = payload && dataKey ? payload[dataKey] : (Array.isArray(props.value) ? props.value[1] : props.value);
  
  if (cx == null || cy == null || actualValue == null || actualValue === 0) return null;

  let isOut = false;
  if (threshold && dataKey) {
    if (dataKey === "systolic" && (actualValue < threshold.sysMin || actualValue > threshold.sysMax)) isOut = true;
    if (dataKey === "diastolic" && (actualValue < threshold.diaMin || actualValue > threshold.diaMax)) isOut = true;
    if (dataKey === "pulse" && (actualValue < threshold.heartRateMin || actualValue > threshold.heartRateMax)) isOut = true;
    if (dataKey === "temperature" && (actualValue < threshold.temperatureMin || actualValue > threshold.temperatureMax)) isOut = true;
    if (dataKey === "spo2" && actualValue < threshold.spo2Min) isOut = true;
    if (dataKey === "respiratoryRate" && threshold.respiratoryRateMin != null &&
      (actualValue < threshold.respiratoryRateMin || actualValue > (threshold.respiratoryRateMax ?? 999))) isOut = true;
    if (dataKey === "glucose" && threshold.glucoseMin != null &&
      (actualValue < threshold.glucoseMin || actualValue > (threshold.glucoseMax ?? 999))) isOut = true;
  }

  if (isOut) {
    return (
      <circle cx={cx} cy={cy} r={3.5} fill="#ef4444" stroke="#fca5a5" strokeWidth={1.5} opacity={0.9} />
    );
  }
  return <circle cx={cx} cy={cy} r={2.5} fill="currentColor" stroke="white" strokeWidth={1} opacity={0.7} />;
};

const CustomTooltip = ({ active, payload, label, threshold }: any) => {
  if (!active || !payload || !payload.length) return null;

  const validPayload = payload.filter((p: any) => p.value != null && p.value !== 0);
  if (validPayload.length === 0) return null;

  return (
    <div className="bg-slate-900/95 border border-slate-700/60 rounded-xl p-3 text-slate-100 shadow-2xl min-w-[190px] backdrop-blur-sm">
      <p className="text-[11px] font-medium text-slate-400 mb-2 pb-1.5 border-b border-slate-700/60">
        {formatDateTime(label)}
      </p>
      {validPayload.map((p: any, i: number) => {
        const val = p.value;
        const dk = p.dataKey;
        let min: number | null = null, max: number | null = null;
        if (threshold) {
          if (dk === "systolic") { min = threshold.sysMin; max = threshold.sysMax; }
          else if (dk === "diastolic") { min = threshold.diaMin; max = threshold.diaMax; }
          else if (dk === "pulse") { min = threshold.heartRateMin; max = threshold.heartRateMax; }
          else if (dk === "temperature") { min = threshold.temperatureMin; max = threshold.temperatureMax; }
          else if (dk === "spo2") { min = threshold.spo2Min; max = 100; }
          else if (dk === "respiratoryRate") { min = threshold.respiratoryRateMin; max = threshold.respiratoryRateMax; }
          else if (dk === "glucose") { min = threshold.glucoseMin; max = threshold.glucoseMax; }
        }
        const isOut = min != null && max != null && (val < min || val > max);
        return (
          <div key={i} className="flex items-center justify-between gap-3 mb-1 last:mb-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-xs text-slate-400">{p.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-bold ${isOut ? "text-red-400" : "text-white"}`}>
                {typeof val === "number" ? (Number.isInteger(val) ? val : val.toFixed(1)) : val}
              </span>
              {isOut && (
                <span className="text-[9px] bg-red-500/30 text-red-300 px-1 py-px rounded font-bold">!</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---- Main Component ----
const PatientDetailPage = () => {
  const navigate = useNavigate();
  const { id: patientId } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [patient, setPatient] = useState<PatientDetailResponse | null>(null);
  const [measurements, setMeasurements] = useState<ChartRow[]>([]);
  const [threshold, setThreshold] = useState<ThresholdRecord | null>(null);
  const [rawOpenAlerts, setOpenAlerts] = useState<AlertResponse[]>([]);
  const openAlerts = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return rawOpenAlerts.filter((a) => new Date(a.createdAt).getTime() >= sevenDaysAgo);
  }, [rawOpenAlerts]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurementsLoading, setMeasurementsLoading] = useState(true);
  const [measurementsError, setMeasurementsError] = useState<string | null>(null);
  const [thresholdLoading, setThresholdLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [chartType, setChartType] = useState<"bp" | "pulse" | "glucose" | "temperature" | "spo2" | "respiratory">("bp");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [showOnlyAbnormal, setShowOnlyAbnormal] = useState(false);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [thresholdExpanded, setThresholdExpanded] = useState(false);
  const [tableItemsPerPage, setTableItemsPerPage] = useState(5);
  // const [showAllAlerts, setShowAllAlerts] = useState(false);

  const loadMeasurements = useCallback(async (isPolling = false) => {
    if (!patientId) return;
    if (!isPolling) {
      setMeasurementsLoading(true);
      setMeasurementsError(null);
    }
    try {
      const raw = await getMeasurements({ patientId });
      setMeasurements(normalizeMeasurements(raw));
    } catch (err: any) {
      if (!isPolling) {
        setMeasurements([]);
        setMeasurementsError(err?.response?.data?.error ?? err?.message ?? t("patientDetail.historyError"));
      }
    } finally {
      if (!isPolling) setMeasurementsLoading(false);
    }
  }, [patientId, t]);

  useEffect(() => {
    void loadMeasurements();
    const interval = setInterval(() => {
      void loadMeasurements(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadMeasurements]);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null); setThresholdLoading(true); setAlertsLoading(true);

      getThresholds({ patientId, latest: true })
        .then((ts) => { if (!cancelled) setThreshold(ts[0] ?? null); })
        .catch(() => { if (!cancelled) setThreshold(null); })
        .finally(() => { if (!cancelled) setThresholdLoading(false); });

      getAlerts({ patientId, status: "open" })
        .then((data) => {
          if (!cancelled) {
            setOpenAlerts(data.alerts.filter((a) => a.patientId === patientId));
          }
        })
        .catch(() => { if (!cancelled) setOpenAlerts([]); })
        .finally(() => { if (!cancelled) setAlertsLoading(false); });

      try {
        const p = await getPatientById(patientId);
        if (!cancelled) setPatient(p);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error ?? err?.message ?? t("common.error"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [patientId]);

  // Sort Descending (Newest First)
  const sortedMeasurementsDesc = useMemo(() =>
    [...measurements].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()),
    [measurements]
  );

  // Sort Ascending (Oldest First) for chart
  const sortedMeasurementsAsc = useMemo(() =>
    [...measurements].sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()),
    [measurements]
  );


  // Chart data: filtered + ascending
  const chartData = useMemo(() => {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const s = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const e = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    return sortedMeasurementsAsc.filter((m) => {
      const d = new Date(m.measuredAt); return d >= s && d <= e;
    });
  }, [sortedMeasurementsAsc, startDate, endDate]);

  // Table data: filtered + descending
  const tableData = useMemo(() => {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const s = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const e = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    const filteredDesc = sortedMeasurementsDesc.filter((m) => {
      const d = new Date(m.measuredAt); return d >= s && d <= e;
    });
    return showOnlyAbnormal ? filteredDesc.filter((r) => isRowAbnormal(r, threshold)) : filteredDesc;
  }, [sortedMeasurementsDesc, startDate, endDate, showOnlyAbnormal, threshold]);

  const latestMeasurement = sortedMeasurementsDesc[0] ?? null;

  const chartThresholdLines = useMemo(() => {
    if (!threshold) return [];
    type ThresholdLine = { value: number; label: string; color: string; position: "insideTopRight" | "insideBottomRight" };
    let lines: ThresholdLine[] = [];
    if (chartType === "bp") lines = [
      { value: threshold.sysMax, label: `Tâm thu ${threshold.sysMax}`, color: "#6366f1", position: "insideTopRight" },
      { value: threshold.sysMin, label: `Tâm thu ${threshold.sysMin}`, color: "#6366f1", position: "insideBottomRight" },
      { value: threshold.diaMax, label: `Tâm trương ${threshold.diaMax}`, color: "#10b981", position: "insideTopRight" },
      { value: threshold.diaMin, label: `Tâm trương ${threshold.diaMin}`, color: "#10b981", position: "insideBottomRight" },
    ];
    else if (chartType === "pulse") lines = [
      { value: threshold.heartRateMax, label: `Cao ${threshold.heartRateMax}`, color: "#f43f5e", position: "insideTopRight" },
      { value: threshold.heartRateMin, label: `Thấp ${threshold.heartRateMin}`, color: "#f43f5e", position: "insideBottomRight" },
    ];
    else if (chartType === "temperature") lines = [
      { value: threshold.temperatureMax, label: `${threshold.temperatureMax}°C`, color: "#f97316", position: "insideTopRight" },
      { value: threshold.temperatureMin, label: `${threshold.temperatureMin}°C`, color: "#f97316", position: "insideBottomRight" },
    ];
    else if (chartType === "spo2") lines = [
      { value: threshold.spo2Min, label: `Min ${threshold.spo2Min}%`, color: "#06b6d4", position: "insideBottomRight" },
    ];
    else if (chartType === "glucose" && threshold.glucoseMin && threshold.glucoseMax) lines = [
      { value: threshold.glucoseMax, label: `Cao ${threshold.glucoseMax}`, color: "#3b82f6", position: "insideTopRight" },
      { value: threshold.glucoseMin, label: `Thấp ${threshold.glucoseMin}`, color: "#3b82f6", position: "insideBottomRight" },
    ];
    else if (chartType === "respiratory" && threshold.respiratoryRateMin && threshold.respiratoryRateMax) lines = [
      { value: threshold.respiratoryRateMax, label: `Cao ${threshold.respiratoryRateMax}`, color: "#8b5cf6", position: "insideTopRight" },
      { value: threshold.respiratoryRateMin, label: `Thấp ${threshold.respiratoryRateMin}`, color: "#8b5cf6", position: "insideBottomRight" },
    ];

    // Deduplicate lines with same value
    const seen = new Map<number, ThresholdLine>();
    for (const line of lines) {
      if (line.value == null) continue;
      if (!seen.has(line.value)) seen.set(line.value, line);
    }
    return Array.from(seen.values());
  }, [threshold, chartType]);

  const yAxisConfig = useMemo(
    () => getChartConfig(chartType, chartData, threshold),
    [chartType, chartData, threshold]
  );

  // Smart X-axis: show time if same day, else show date without year
  const formatXAxis = (v: string) => {
    try {
      const d = new Date(v);
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (s.toDateString() === e.toDateString()) {
        return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      }
      // Also check if all data within chartData are same day
      if (chartData.length > 0) {
        const first = new Date(chartData[0].measuredAt);
        const last = new Date(chartData[chartData.length - 1].measuredAt);
        if (first.toDateString() === last.toDateString()) {
          return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        }
      }
      // Format as day/month without year to avoid crowding
      return `${d.getDate()}/${d.getMonth() + 1}`;
    } catch { return v; }
  };

  // ---- Table columns ----
  const columns = useMemo<Column<ChartRow>[]>(() => {
    const abnormalColor = "#c0392b";
    const tag = (label: string) => (
      <span
        className="ml-1 text-[10px] font-medium px-1.5 py-px rounded-sm"
        style={{ backgroundColor: "#c0392b18", color: abnormalColor }}
      >
        {label}
      </span>
    );
    const cell = (isOut: boolean, content: React.ReactNode, tagLabel?: string) => (
      <span style={isOut ? { color: abnormalColor, fontWeight: 600 } : {}} className={isOut ? "" : "text-gray-600 dark:text-slate-300"}>
        {content}
        {isOut && tagLabel && tag(tagLabel)}
      </span>
    );
    const thrTag = (v: number | null, _min: number, max: number) =>
      v != null && v > max ? "↑ Cao" : "↓ Thấp";

    return [
      {
        header: t("patientDetail.time"),
        render: (item) => (
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-slate-200">{formatDateTime(item.measuredAt)}</div>
            <div className="text-xs text-gray-400 dark:text-slate-500">{formatRelativeTime(item.measuredAt)}</div>
          </div>
        ),
      },
      {
        header: `${t("patientDetail.bloodPressure")} (mmHg)`,
        render: (item) => {
          const bpTags = getBpTags(item.systolic, item.diastolic, threshold);
          const isOut = bpTags != null;
          return (
            <span>
              <span style={isOut ? { color: abnormalColor, fontWeight: 600 } : {}} className={isOut ? "" : "text-gray-600 dark:text-slate-300"}>
                {item.systolic != null && item.systolic > 0 ? `${item.systolic}/${item.diastolic}` : "—"}
              </span>
              {bpTags && (
                <span className="ml-1 text-[10px] font-medium px-1.5 py-px rounded-sm" style={{ backgroundColor: "#c0392b18", color: abnormalColor }}>
                  {bpTags}
                </span>
              )}
            </span>
          );
        },
      },
      {
        header: `${t("patientDetail.heartRate")} (bpm)`,
        render: (item) => {
          const isOut = !!(threshold && item.pulse != null && item.pulse > 0 &&
            (item.pulse < threshold.heartRateMin || item.pulse > threshold.heartRateMax));
          return cell(isOut, item.pulse != null && item.pulse > 0 ? item.pulse : "—",
            thrTag(item.pulse, threshold?.heartRateMin ?? 60, threshold?.heartRateMax ?? 100));
        },
      },
      {
        header: `${t("patientDetail.temperature")} (°C)`,
        render: (item) => {
          const isOut = !!(threshold && item.temperature != null && item.temperature > 0 &&
            (item.temperature < threshold.temperatureMin || item.temperature > threshold.temperatureMax));
          return cell(isOut, item.temperature != null && item.temperature > 0 ? item.temperature.toFixed(1) : "—",
            thrTag(item.temperature, threshold?.temperatureMin ?? 36.1, threshold?.temperatureMax ?? 37.5));
        },
      },
      {
        header: `${t("patientDetail.spo2")} (%)`,
        render: (item) => {
          const isOut = !!(threshold && item.spo2 != null && item.spo2 > 0 && item.spo2 < threshold.spo2Min);
          return cell(isOut, item.spo2 != null && item.spo2 > 0 ? item.spo2 : "—", "↓ Thấp");
        },
      },
      {
        header: `${t("patientDetail.respiratoryRate")} (lần/phút)`,
        render: (item) => {
          const min = threshold?.respiratoryRateMin ?? 0;
          const max = threshold?.respiratoryRateMax ?? 999;
          const isOut = !!(threshold && item.respiratoryRate != null && item.respiratoryRate > 0 &&
            (item.respiratoryRate < min || item.respiratoryRate > max));
          return cell(isOut, item.respiratoryRate != null && item.respiratoryRate > 0 ? item.respiratoryRate : "—",
            thrTag(item.respiratoryRate, min, max));
        },
      },
      {
        header: `${t("patientDetail.glucose")} (mg/dL)`,
        render: (item) => {
          const min = threshold?.glucoseMin ?? 0;
          const max = threshold?.glucoseMax ?? 999;
          const isOut = !!(threshold && item.glucose != null && item.glucose > 0 &&
            (item.glucose < min || item.glucose > max));
          return cell(isOut, item.glucose != null && item.glucose > 0 ? item.glucose : "—",
            thrTag(item.glucose, min, max));
        },
      },
      {
        header: `Chiều cao/Cân nặng`,
        render: (item) => {
          if (item.height && item.weight) return cell(false, `${item.height}cm / ${item.weight}kg`);
          return cell(false, "—");
        },
      },
      {
        header: `BMI`,
        render: (item) => {
          if (item.bmi == null || item.bmi <= 0) return cell(false, "—");
          const bmi = item.bmi;
          let tagText = "Bình thường";
          let colorStyle = { backgroundColor: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" };
          if (bmi < 18.5) {
            tagText = "Thiếu cân";
            colorStyle = { backgroundColor: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe" };
          } else if (bmi >= 25 && bmi < 30) {
            tagText = "Thừa cân";
            colorStyle = { backgroundColor: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" };
          } else if (bmi >= 30) {
            tagText = "Béo phì";
            colorStyle = { backgroundColor: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" };
          }
          return (
            <span>
              <span className="text-gray-600 dark:text-slate-300 mr-2">{bmi.toFixed(1)}</span>
              <span className="text-[10px] font-medium px-1.5 py-px rounded-sm" style={colorStyle}>
                {tagText}
              </span>
            </span>
          );
        },
      },
    ];
  }, [t, threshold]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-500 border-r-transparent" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-slate-900">
        <p className="text-red-500 font-medium">{error ?? t("patientDetail.patientNotFound")}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm bg-gray-200 dark:bg-slate-700 dark:text-slate-200 rounded hover:bg-gray-300 transition"
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  const hasCritical = openAlerts.some((a) => a.severity === "high" || a.severity === "medium");

  // Build the latest vitals array
  const thr = threshold;
  const bpTag = latestMeasurement ? getBpTags(latestMeasurement.systolic, latestMeasurement.diastolic, thr) : null;
  const vitals = latestMeasurement
    ? [
      {
        id: "bp",
        label: "Huyết áp",
        value: latestMeasurement.systolic != null && latestMeasurement.systolic > 0
          ? `${Math.round(latestMeasurement.systolic)}/${Math.round(latestMeasurement.diastolic ?? 0)}`
          : "—",
        unit: "mmHg",
        isOut: bpTag != null,
        subTag: bpTag,
        range: thr ? `${thr.sysMin}–${thr.sysMax} / ${thr.diaMin}–${thr.diaMax}` : null,
      },
      {
        id: "pulse",
        label: "Nhịp tim",
        value: fmtVal(latestMeasurement.pulse),
        unit: "bpm",
        isOut: !!(thr && latestMeasurement.pulse != null && latestMeasurement.pulse > 0 &&
          (latestMeasurement.pulse < thr.heartRateMin || latestMeasurement.pulse > thr.heartRateMax)),
        subTag: null,
        range: thr ? `${thr.heartRateMin}–${thr.heartRateMax}` : null,
      },
      {
        id: "temperature",
        label: "Nhiệt độ",
        value: latestMeasurement.temperature != null && latestMeasurement.temperature > 0
          ? latestMeasurement.temperature.toFixed(1)
          : "—",
        unit: "°C",
        isOut: !!(thr && latestMeasurement.temperature != null && latestMeasurement.temperature > 0 &&
          (latestMeasurement.temperature < thr.temperatureMin || latestMeasurement.temperature > thr.temperatureMax)),
        subTag: null,
        range: thr ? `${thr.temperatureMin}–${thr.temperatureMax}` : null,
      },
      {
        id: "spo2",
        label: "SpO₂",
        value: fmtVal(latestMeasurement.spo2),
        unit: "%",
        isOut: !!(thr && latestMeasurement.spo2 != null && latestMeasurement.spo2 > 0 &&
          latestMeasurement.spo2 < thr.spo2Min),
        subTag: null,
        range: thr ? `≥ ${thr.spo2Min}` : null,
      },
      {
        id: "respiratory",
        label: "Nhịp thở",
        value: fmtVal(latestMeasurement.respiratoryRate),
        unit: "lần/ph",
        isOut: !!(thr?.respiratoryRateMin && latestMeasurement.respiratoryRate != null &&
          latestMeasurement.respiratoryRate > 0 &&
          (latestMeasurement.respiratoryRate < thr.respiratoryRateMin ||
            latestMeasurement.respiratoryRate > (thr.respiratoryRateMax ?? 999))),
        subTag: null,
        range: thr && thr.respiratoryRateMin ? `${thr.respiratoryRateMin}–${thr.respiratoryRateMax}` : null,
      },
      {
        id: "glucose",
        label: "Đường huyết",
        value: fmtVal(latestMeasurement.glucose),
        unit: "mg/dL",
        isOut: !!(thr?.glucoseMin && latestMeasurement.glucose != null && latestMeasurement.glucose > 0 &&
          (latestMeasurement.glucose < thr.glucoseMin || latestMeasurement.glucose > (thr.glucoseMax ?? 999))),
        subTag: null,
        range: thr && thr.glucoseMin ? `${thr.glucoseMin}–${thr.glucoseMax}` : null,
      },
    ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* ── Full-width container ── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 space-y-4">

        {/* ── Back ── */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition"
        >
          <MdOutlineKeyboardBackspace size={18} />
          <span className="">{t("patientDetail.backToPrevious")}</span>
        </button>

        {/* ══════════════════════════════════════════════════════════════
            1. PATIENT HEADER
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4">
          <div className="flex items-center gap-4">
            <img
              src={
                patient.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=6366f1&color=fff&size=80`
              }
              alt={patient.name}
              className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-gray-100 dark:ring-slate-700"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-gray-900 dark:text-slate-100">{patient.name}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(patient.status)}`}>
                  {mapStatusLabel(patient.status, t)}
                </span>
                {/* Alert badge — shows count, not severity */}
                {openAlerts.length > 0 && (
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${hasCritical
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                      }`}
                  >
                    {openAlerts.length} cảnh báo tồn đọng
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                {patient.patientCode && (
                  <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-md font-semibold text-gray-700 dark:text-slate-300">
                    <FaIdCard className="text-gray-400 dark:text-slate-500" />
                    {patient.patientCode}
                  </span>
                )}
                {patient.dob && (
                  <span className="flex items-center gap-1.5">
                    <FaBirthdayCake className="text-gray-400 dark:text-slate-500" />
                    {new Date(patient.dob).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                )}
                {patient.gender && (
                  <span className="flex items-center gap-1.5">
                    <FaVenusMars className="text-gray-400 dark:text-slate-500" />
                    {patient.gender === "M" ? "Nam" : patient.gender === "F" ? "Nữ" : patient.gender}
                  </span>
                )}
                {patient.phone && (
                  <span className="flex items-center gap-1.5">
                    <FaPhone className="text-gray-400 dark:text-slate-500" />
                    {patient.phone}
                  </span>
                )}
                {patient.emergencyContactName && (
                  <span className="flex items-center gap-1.5 border-l border-gray-200 dark:border-slate-700 pl-3">
                    <span className="text-gray-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">Khẩn cấp:</span>
                    <span className="font-medium text-gray-700 dark:text-slate-300">{patient.emergencyContactName}</span>
                    {patient.emergencyContactPhone && <span>· {patient.emergencyContactPhone}</span>}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate(`/prescriptions?patientId=${patientId}`)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition font-medium"
              >
                <FaNotesMedical size={14} />
                {t("prescriptions.viewPrescriptions")}
              </button>
              <button
                onClick={() => navigate(`/reminders?patientId=${patientId}`)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition font-medium"
              >
                <MdNotificationsActive size={14} />
                {t("patientDetail.manageReminders")}
              </button>

              <button
                onClick={() => navigate(`/patient/chat/${patientId}`)}
                className="relative text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1.5 transition"
              >
                <FaRegMessage size={15} />
                {openAlerts.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setVideoCallOpen(true)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1.5 transition"
                title="Gọi video"
              >
                <FaVideo size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            2. ALERTS (UNRESOLVED) — with action buttons
        ══════════════════════════════════════════════════════════════ */}
        {!alertsLoading && openAlerts.length > 0 && (() => {
          const highCount = openAlerts.filter(a => a.severity === "high").length;
          const medCount = openAlerts.filter(a => a.severity === "medium").length;
          const lowCount = openAlerts.filter(a => a.severity === "low").length;
          const latestAlert = openAlerts[0];
          const latestViolation = latestAlert?.violations?.[0];

          return (
            <div
              className={`rounded-xl border px-4 py-3 flex items-center gap-4 cursor-pointer hover:shadow-sm transition ${
                hasCritical
                  ? "bg-red-50/60 dark:bg-red-900/10 border-red-200 dark:border-red-900/30"
                  : "bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30"
              }`}
              onClick={() => navigate(`/threshold-alerts?patientId=${patientId}`)}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                hasCritical ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              }`}>
                <MdNotificationsActive size={16} className={hasCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"} />
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                    {openAlerts.length} cảnh báo chưa xử lý
                  </span>
                  {highCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                      {highCount} Nghiêm trọng
                    </span>
                  )}
                  {medCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                      {medCount} Cảnh báo
                    </span>
                  )}
                  {lowCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      {lowCount} Cần theo dõi
                    </span>
                  )}
                </div>
                {latestViolation && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                    Gần nhất: <span className="font-medium text-gray-700 dark:text-slate-300">{mapViolationType(latestViolation.type)}</span>
                    {" "}{mapRule(latestViolation.rule)} ngưỡng — {formatRelativeTime(latestAlert.createdAt)}
                  </p>
                )}
              </div>

              {/* CTA */}
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0 hover:underline">
                Xem tất cả →
              </span>
            </div>
          );
        })()}


        {/* ══════════════════════════════════════════════════════════════
            3. LATEST VITALS — clinical summary card style
        ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 px-5 py-4">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Chỉ số đo gần nhất
              </span>
              {latestMeasurement && (
                <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">
                  {formatDateTime(latestMeasurement.measuredAt)} · {formatRelativeTime(latestMeasurement.measuredAt)}
                </span>
              )}
            </div>
          </div>

          {measurementsLoading ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 py-2">Đang tải...</p>
          ) : !latestMeasurement ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 py-2">Chưa có dữ liệu đo.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {vitals.map((v) => (
                <div
                  key={v.id}
                  className={`relative overflow-hidden rounded-xl p-4 flex flex-col transition-all duration-200 ${v.isOut
                      ? "bg-gradient-to-b from-red-50/50 to-white dark:from-red-900/20 dark:to-slate-800 border border-red-200 dark:border-red-800/40 shadow-sm"
                      : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700/60 shadow-sm hover:shadow-md"
                    }`}
                >
                  {v.isOut && <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />}

                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      {v.label}
                    </div>
                    {v.isOut && v.subTag && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                        {v.subTag}
                      </span>
                    )}
                    {v.isOut && !v.subTag && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </div>

                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span
                      className={`text-3xl font-bold tracking-tight ${v.isOut ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-slate-100"
                        }`}
                    >
                      {v.value}
                    </span>
                    <span className="text-xs font-medium text-gray-400 dark:text-slate-500">
                      {v.unit}
                    </span>
                  </div>

                  {v.range && (
                    <div className="mt-auto pt-3 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500">
                      <span>Ngưỡng:</span>
                      <span className="font-medium text-gray-500 dark:text-slate-400">{v.range}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            4. HEALTH CHART
        ══════════════════════════════════════════════════════════════ */}
        {isChartExpanded && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setIsChartExpanded(false)} />
        )}
        <section
          className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 transition-all ${isChartExpanded
              ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] h-[88vh] flex flex-col"
              : ""
            }`}
        >
          {/* Chart toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <MdShowChart size={15} className="text-indigo-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                {t("patientDetail.healthChart")}
              </span>
              <button
                onClick={() => setIsChartExpanded(!isChartExpanded)}
                className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition ml-0.5"
                title={isChartExpanded ? "Thu nhỏ" : "Phóng to"}
              >
                {isChartExpanded ? <MdFullscreenExit size={16} /> : <MdFullscreen size={16} />}
              </button>
            </div>

            {/* Chart type tabs */}
            <div className="inline-flex bg-gray-100 dark:bg-slate-700/80 rounded-xl p-1 gap-0.5">
              {([
                { key: "bp", label: "Huyết áp", color: "#6366f1" },
                { key: "pulse", label: "Nhịp tim", color: "#f43f5e" },
                { key: "temperature", label: "Nhiệt độ", color: "#f97316" },
                { key: "spo2", label: "SpO₂", color: "#06b6d4" },
                { key: "glucose", label: "Đường huyết", color: "#3b82f6" },
                { key: "respiratory", label: "Nhịp thở", color: "#8b5cf6" },
              ] as const).map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setChartType(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${chartType === key
                      ? "bg-white dark:bg-slate-600 shadow-sm text-gray-800 dark:text-slate-100"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                    }`}
                >
                  {chartType === key && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  )}
                  {label}
                </button>
              ))}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-slate-600">
              <FaCalendarAlt className="text-gray-400 dark:text-slate-500" size={11} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-medium bg-transparent text-gray-700 dark:text-slate-300 border-none outline-none cursor-pointer"
                style={{ width: "115px" }}
              />
              <span className="text-gray-300 dark:text-slate-500 text-xs">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-medium bg-transparent text-gray-700 dark:text-slate-300 border-none outline-none cursor-pointer"
                style={{ width: "115px" }}
              />
            </div>
          </div>

          {/* Chart area */}
          <div className={isChartExpanded ? "flex-1 w-full min-h-0" : "h-[300px] w-full"}>
            {measurementsLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                  <p className="text-xs text-gray-400 dark:text-slate-500">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400 dark:text-slate-500">
                <MdShowChart size={32} className="opacity-30" />
                <p className="text-sm">Không có dữ liệu trong khoảng thời gian này.</p>
                <p className="text-xs opacity-70">Thử mở rộng khoảng ngày hoặc chọn chỉ số khác.</p>
              </div>
            ) : (() => {
              // Per-chart color config
              const chartCfg: Record<string, { color: string; gradientId: string; unit: string }> = {
                bp: { color: "#6366f1", gradientId: "gradBp", unit: "mmHg" },
                pulse: { color: "#f43f5e", gradientId: "gradPulse", unit: "bpm" },
                temperature: { color: "#f97316", gradientId: "gradTemp", unit: "°C" },
                spo2: { color: "#06b6d4", gradientId: "gradSpo2", unit: "%" },
                glucose: { color: "#3b82f6", gradientId: "gradGluc", unit: "mg/dL" },
                respiratory: { color: "#8b5cf6", gradientId: "gradResp", unit: "lần/ph" },
              };
              const cfg = chartCfg[chartType] ?? chartCfg["bp"];
              const diaColor = "#10b981";

              // filter null/zero data points by setting them to null (so connectNulls=true allows line continuity)
              const cleanData = chartData.map((d) => {
                const out: any = { measuredAt: d.measuredAt };
                if (chartType === "bp") {
                  out.systolic = d.systolic != null && d.systolic > 0 ? d.systolic : null;
                  out.diastolic = d.diastolic != null && d.diastolic > 0 ? d.diastolic : null;
                } else if (chartType === "pulse") {
                  out.pulse = d.pulse != null && d.pulse > 0 ? d.pulse : null;
                } else if (chartType === "temperature") {
                  out.temperature = d.temperature != null && d.temperature > 0 ? d.temperature : null;
                } else if (chartType === "spo2") {
                  out.spo2 = d.spo2 != null && d.spo2 > 0 ? d.spo2 : null;
                } else if (chartType === "glucose") {
                  out.glucose = d.glucose != null && d.glucose > 0 ? d.glucose : null;
                } else {
                  out.respiratoryRate = d.respiratoryRate != null && d.respiratoryRate > 0 ? d.respiratoryRate : null;
                }
                return out;
              });

              return (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cleanData} margin={{ top: 12, right: 90, left: -4, bottom: 8 }}>
                    <defs>
                      <linearGradient id={cfg.gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={cfg.color} stopOpacity={0.18} />
                        <stop offset="95%" stopColor={cfg.color} stopOpacity={0.01} />
                      </linearGradient>
                      {chartType === "bp" && (
                        <linearGradient id="gradDia" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={diaColor} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={diaColor} stopOpacity={0.01} />
                        </linearGradient>
                      )}
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="currentColor"
                      className="text-gray-100 dark:text-slate-700/60"
                      strokeOpacity={1}
                    />

                    <XAxis
                      dataKey="measuredAt"
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      dy={10}
                      height={40}
                    />
                    <YAxis
                      domain={yAxisConfig.domain}
                      ticks={yAxisConfig.ticks}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      width={34}
                      tickFormatter={(v) => typeof v === "number" && !Number.isInteger(v) ? v.toFixed(1) : v}
                    />

                    <Tooltip
                      content={<CustomTooltip threshold={threshold} />}
                      cursor={{ stroke: cfg.color, strokeWidth: 1, strokeOpacity: 0.4, strokeDasharray: "4 3" }}
                    />

                    {/* Threshold reference lines */}
                    {chartThresholdLines.map((line, i) => (
                      <ReferenceLine
                        key={i}
                        y={line.value}
                        stroke={line.color}
                        strokeDasharray="6 4"
                        strokeWidth={1.5}
                        strokeOpacity={0.65}
                      />
                    ))}

                    {chartType === "bp" ? (
                      <>
                        <Area
                          name="Tâm thu"
                          type="monotone"
                          dataKey="systolic"
                          stroke={cfg.color}
                          strokeWidth={2}
                          fill={`url(#${cfg.gradientId})`}
                          dot={<CustomDot threshold={threshold} dataKey="systolic" />}
                          activeDot={{ r: 5, strokeWidth: 0, fill: cfg.color }}
                          connectNulls={true}
                        />
                        <Area
                          name="Tâm trương"
                          type="monotone"
                          dataKey="diastolic"
                          stroke={diaColor}
                          strokeWidth={2}
                          fill="url(#gradDia)"
                          dot={<CustomDot threshold={threshold} dataKey="diastolic" />}
                          activeDot={{ r: 5, strokeWidth: 0, fill: diaColor }}
                          connectNulls={true}
                        />
                      </>
                    ) : chartType === "pulse" ? (
                      <Area name="Nhịp tim" type="monotone" dataKey="pulse"
                        stroke={cfg.color} strokeWidth={2} fill={`url(#${cfg.gradientId})`}
                        dot={<CustomDot threshold={threshold} dataKey="pulse" />} activeDot={{ r: 5, strokeWidth: 0, fill: cfg.color }}
                        connectNulls={true} />
                    ) : chartType === "glucose" ? (
                      <Area name="Đường huyết" type="monotone" dataKey="glucose"
                        stroke={cfg.color} strokeWidth={2} fill={`url(#${cfg.gradientId})`}
                        dot={<CustomDot threshold={threshold} dataKey="glucose" />} activeDot={{ r: 5, strokeWidth: 0, fill: cfg.color }}
                        connectNulls={true} />
                    ) : chartType === "temperature" ? (
                      <Area name="Nhiệt độ" type="monotone" dataKey="temperature"
                        stroke={cfg.color} strokeWidth={2} fill={`url(#${cfg.gradientId})`}
                        dot={<CustomDot threshold={threshold} dataKey="temperature" />} activeDot={{ r: 5, strokeWidth: 0, fill: cfg.color }}
                        connectNulls={true} />
                    ) : chartType === "spo2" ? (
                      <Area name="SpO₂" type="monotone" dataKey="spo2"
                        stroke={cfg.color} strokeWidth={2} fill={`url(#${cfg.gradientId})`}
                        dot={<CustomDot threshold={threshold} dataKey="spo2" />} activeDot={{ r: 5, strokeWidth: 0, fill: cfg.color }}
                        connectNulls={true} />
                    ) : (
                      <Area name="Nhịp thở" type="monotone" dataKey="respiratoryRate"
                        stroke={cfg.color} strokeWidth={2} fill={`url(#${cfg.gradientId})`}
                        dot={<CustomDot threshold={threshold} dataKey="respiratoryRate" />} activeDot={{ r: 5, strokeWidth: 0, fill: cfg.color }}
                        connectNulls={true} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              );
            })()}
          </div>

          {/* Bottom legend + threshold info */}
          <div className="flex flex-wrap items-center justify-between mt-3 gap-2 pt-3 border-t border-gray-100 dark:border-slate-700/60">
            {/* Color legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-slate-400">
              {chartType === "bp" && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#6366f1] inline-block rounded-full" /> Tâm thu
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#10b981] inline-block rounded-full" /> Tâm trương
                  </span>
                </>
              )}
              {chartType === "pulse" && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#f43f5e] inline-block rounded-full" /> Nhịp tim</span>}
              {chartType === "glucose" && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#3b82f6] inline-block rounded-full" /> Đường huyết</span>}
              {chartType === "temperature" && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#f97316] inline-block rounded-full" /> Nhiệt độ</span>}
              {chartType === "spo2" && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#06b6d4] inline-block rounded-full" /> SpO₂</span>}
              {chartType === "respiratory" && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#8b5cf6] inline-block rounded-full" /> Nhịp thở</span>}
              <span className="flex items-center gap-1.5">
                <span className="w-3 border-b border-dashed border-gray-400 inline-block" /> Ngưỡng an toàn
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-red-400 bg-red-400/20 inline-block" /> Vượt ngưỡng
              </span>
            </div>

            {/* Threshold chips */}
            {threshold && (
              <div className="flex flex-wrap gap-1.5">
                {chartType === "bp" && (
                  <>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40">
                      Tâm thu {threshold.sysMin}–{threshold.sysMax} mmHg
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
                      Tâm trương {threshold.diaMin}–{threshold.diaMax} mmHg
                    </span>
                  </>
                )}
                {chartType === "pulse" && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/40">
                    {threshold.heartRateMin}–{threshold.heartRateMax} bpm
                  </span>
                )}
                {chartType === "temperature" && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800/40">
                    {threshold.temperatureMin}–{threshold.temperatureMax} °C
                  </span>
                )}
                {chartType === "spo2" && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800/40">
                    ≥ {threshold.spo2Min}%
                  </span>
                )}
                {chartType === "glucose" && threshold.glucoseMin != null && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
                    {threshold.glucoseMin}–{threshold.glucoseMax} mg/dL
                  </span>
                )}
                {chartType === "respiratory" && threshold.respiratoryRateMin != null && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800/40">
                    {threshold.respiratoryRateMin}–{threshold.respiratoryRateMax} lần/ph
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            5. MEASUREMENT HISTORY TABLE
        ══════════════════════════════════════════════════════════════ */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              {t("patientDetail.recentHistory")}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={tableItemsPerPage}
                onChange={(e) => setTableItemsPerPage(Number(e.target.value))}
                className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 outline-none cursor-pointer"
              >
                <option value={5}>5 bản ghi</option>
                <option value={10}>10 bản ghi</option>
                <option value={20}>20 bản ghi</option>
                <option value={50}>50 bản ghi</option>
              </select>
              <button
                onClick={() => setShowOnlyAbnormal(!showOnlyAbnormal)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${showOnlyAbnormal
                    ? "border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
                    : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
              >
                <MdFilterList size={13} />
                {showOnlyAbnormal ? "Đang lọc: bất thường" : "Chỉ hiện bất thường"}
              </button>
            </div>
          </div>
          {measurementsLoading ? (
            <div className="p-6 text-sm text-center text-gray-400 dark:text-slate-500">
              {t("patientDetail.loadingHistory")}
            </div>
          ) : measurementsError ? (
            <div className="p-6 text-sm text-center text-red-500">{measurementsError}</div>
          ) : tableData.length === 0 ? (
            <div className="p-6 text-sm text-center text-gray-400 dark:text-slate-500">
              {showOnlyAbnormal
                ? "Không có dữ liệu bất thường trong khoảng thời gian này."
                : "Không có dữ liệu."}
            </div>
          ) : (
            <Table<ChartRow> 
              data={tableData} 
              columns={columns} 
              className="rounded-none shadow-none" 
              itemsPerPage={tableItemsPerPage}
              paginated={true}
            />
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════
            6. NGƯỠNG CÁ NHÂN — collapsible
        ══════════════════════════════════════════════════════════════ */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">
          <button
            onClick={() => setThresholdExpanded(!thresholdExpanded)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700/40 transition"
          >
            <div className="flex items-center gap-2">
              <GiHeartBeats size={15} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Ngưỡng theo dõi cá nhân hóa
              </span>
              {!thresholdLoading && threshold && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  · được thiết lập riêng cho bệnh nhân này
                </span>
              )}
            </div>
            {thresholdExpanded ? (
              <MdExpandLess size={18} className="text-gray-400" />
            ) : (
              <MdExpandMore size={18} className="text-gray-400" />
            )}
          </button>

          {thresholdExpanded && (
            <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-4">
              {thresholdLoading ? (
                <p className="text-sm text-gray-400 dark:text-slate-500">Đang tải...</p>
              ) : !threshold ? (
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-500 dark:text-slate-400">{t("patientDetail.noThresholds")}</p>
                  <button
                    onClick={() => navigate("/threshold-settings")}
                    className="text-xs px-3 py-1.5 rounded border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                  >
                    {t("patientDetail.setupThresholds")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-3">
                    {[
                      { label: "Nhiệt độ", min: threshold.temperatureMin, max: threshold.temperatureMax, unit: "°C" },
                      { label: "Nhịp tim", min: threshold.heartRateMin, max: threshold.heartRateMax, unit: "bpm" },
                      { label: "Tâm thu", min: threshold.sysMin, max: threshold.sysMax, unit: "mmHg" },
                      { label: "Tâm trương", min: threshold.diaMin, max: threshold.diaMax, unit: "mmHg" },
                      { label: "Nhịp thở", min: threshold.respiratoryRateMin ?? "—", max: threshold.respiratoryRateMax ?? "—", unit: "lần/ph" },
                      { label: "SpO₂", min: threshold.spo2Min, max: 100, unit: "%" },
                      { label: "Đường huyết", min: threshold.glucoseMin ?? "—", max: threshold.glucoseMax ?? "—", unit: "mg/dL" },
                    ].map((item, i) => (
                      <div key={i} className="rounded-lg bg-gray-50 dark:bg-slate-700/50 px-3 py-2.5 text-center">
                        <div className="text-[10px] text-gray-400 dark:text-slate-500 mb-1 font-medium uppercase tracking-wide">
                          {item.label}
                        </div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {item.min}–{item.max}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{item.unit}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate("/threshold-settings")}
                    className="text-xs border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
                    {t("patientDetail.updateThresholds")}
                  </button>
                </>
              )}
            </div>
          )}
        </section>

      </div>

      {/* ── Video Call Modal ── */}
      {videoCallOpen && patient && (
        <VideoCallModal
          patientId={patientId!}
          patientName={patient.name}
          onClose={() => setVideoCallOpen(false)}
        />
      )}
    </div>
  );
};

export default PatientDetailPage;

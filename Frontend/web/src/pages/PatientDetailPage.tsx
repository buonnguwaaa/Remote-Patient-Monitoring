// pages/PatientDetailPage.tsx

import { useState, useMemo, useEffect } from "react";
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
import { FaNotesMedical, FaCalendarAlt } from "react-icons/fa";
import { GiHeartBeats } from "react-icons/gi";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
  updateAt: string;
}

// ---- Normalise ----
const normalizeMeasurements = (data: MeasurementResponse[]): ChartRow[] =>
  data.map((m) => ({
    systolic: m.bloodPressure?.systolic ?? m.systolic ?? null,
    diastolic: m.bloodPressure?.diastolic ?? m.diastolic ?? null,
    pulse: m.heartRate ?? null,
    glucose: m.glucose
      ? typeof m.glucose === "object"
        ? (m.glucose as any).bloodGlucose ?? null
        : m.glucose
      : null,
    spo2: m.spo2 ?? null,
    temperature: m.temperature ?? null,
    respiratoryRate: m.respiratoryRate ?? null,
    updateAt: m.createdAt,
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
  const map: Record<string, string> = {
    systolic: "Huyết áp tâm thu",
    diastolic: "Huyết áp tâm trương",
    blood_pressure_systolic: "Huyết áp tâm thu",
    blood_pressure_diastolic: "Huyết áp tâm trương",
    bloodPressure: "Huyết áp",
    heart_rate: "Nhịp tim",
    temperature: "Nhiệt độ",
    spo2: "SpO2",
    glucose: "Đường huyết",
    respiratory_rate: "Nhịp thở",
  };
  return map[type] || type;
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
  const { cx, cy, value, dataKey, threshold, stroke } = props;
  if (!cx || !cy || value == null) return null;

  let isOut = false;
  if (threshold) {
    if (dataKey === "systolic" && (value < threshold.sysMin || value > threshold.sysMax)) isOut = true;
    if (dataKey === "diastolic" && (value < threshold.diaMin || value > threshold.diaMax)) isOut = true;
    if (dataKey === "pulse" && (value < threshold.heartRateMin || value > threshold.heartRateMax)) isOut = true;
    if (dataKey === "temperature" && (value < threshold.temperatureMin || value > threshold.temperatureMax)) isOut = true;
    if (dataKey === "spo2" && value < threshold.spo2Min) isOut = true;
    if (dataKey === "respiratoryRate" && threshold.respiratoryRateMin != null &&
      (value < threshold.respiratoryRateMin || value > (threshold.respiratoryRateMax ?? 999))) isOut = true;
    if (dataKey === "glucose" && threshold.glucoseMin != null &&
      (value < threshold.glucoseMin || value > (threshold.glucoseMax ?? 999))) isOut = true;
  }

  return (
    <circle
      cx={cx} cy={cy}
      r={isOut ? 5 : 3}
      fill={isOut ? "#ef4444" : stroke}
      stroke={isOut ? "#fca5a5" : "white"}
      strokeWidth={isOut ? 1.5 : 1}
    />
  );
};

const CustomTooltip = ({ active, payload, label, threshold }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-600/80 rounded-lg p-3 text-slate-100 shadow-2xl min-w-[180px]">
        <p className="text-xs font-semibold mb-2 text-slate-300 border-b border-slate-700 pb-1.5">
          {formatDateTime(label)}
        </p>
        {payload.map((p: any, i: number) => {
          const val = p.value;
          if (val == null) return null;
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
          const outOfBounds = min != null && max != null && (val < min || val > max);
          return (
            <div key={i} className="mb-1.5 last:mb-0">
              <div className="flex items-baseline gap-2">
                <span style={{ color: p.color }} className="text-xs font-medium shrink-0">{p.name}:</span>
                <span className={`font-bold text-sm ${outOfBounds ? "text-red-400" : "text-white"}`}>{val}</span>
                {outOfBounds && (
                  <span className="text-[9px] bg-red-500/25 text-red-300 px-1 py-px rounded font-semibold uppercase tracking-wide">
                    ngoài ngưỡng
                  </span>
                )}
              </div>
              {min != null && max != null && (
                <div className="text-[10px] text-slate-500 mt-0.5 pl-0">
                  Ngưỡng cá nhân: {min} – {max}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
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
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [showOnlyAbnormal, setShowOnlyAbnormal] = useState(false);
  const [thresholdExpanded, setThresholdExpanded] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    setMeasurementsLoading(true);
    setMeasurementsError(null);
    getMeasurements({ patientId })
      .then((raw) => { if (!cancelled) setMeasurements(normalizeMeasurements(raw)); })
      .catch((err: any) => {
        if (!cancelled) {
          setMeasurements([]);
          setMeasurementsError(err?.response?.data?.error ?? err?.message ?? t("patientDetail.historyError"));
        }
      })
      .finally(() => { if (!cancelled) setMeasurementsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

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
            setOpenAlerts(data.filter((a) => a.patientId === patientId));
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
    [...measurements].sort((a, b) => new Date(b.updateAt).getTime() - new Date(a.updateAt).getTime()),
    [measurements]
  );

  // Sort Ascending (Oldest First) for chart
  const sortedMeasurementsAsc = useMemo(() =>
    [...measurements].sort((a, b) => new Date(a.updateAt).getTime() - new Date(b.updateAt).getTime()),
    [measurements]
  );


  // Chart data: filtered + ascending
  const chartData = useMemo(() => {
    const s = new Date(startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(endDate); e.setHours(23, 59, 59, 999);
    return sortedMeasurementsAsc.filter((m) => {
      const d = new Date(m.updateAt); return d >= s && d <= e;
    });
  }, [sortedMeasurementsAsc, startDate, endDate]);

  // Table data: filtered + descending
  const tableData = useMemo(() => {
    const s = new Date(startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(endDate); e.setHours(23, 59, 59, 999);
    const filteredDesc = sortedMeasurementsDesc.filter((m) => {
      const d = new Date(m.updateAt); return d >= s && d <= e;
    });
    return showOnlyAbnormal ? filteredDesc.filter((r) => isRowAbnormal(r, threshold)) : filteredDesc;
  }, [sortedMeasurementsDesc, startDate, endDate, showOnlyAbnormal, threshold]);

  const latestMeasurement = tableData[0] ?? null;

  const chartThresholdLines = useMemo(() => {
    if (!threshold) return [];
    let lines: any[] = [];
    if (chartType === "bp") lines = [
      { value: threshold.sysMax, label: `Tâm thu Max ${threshold.sysMax}` },
      { value: threshold.sysMin, label: `Tâm thu Min ${threshold.sysMin}` },
      { value: threshold.diaMax, label: `Tâm trương Max ${threshold.diaMax}`, strokeDasharray: "2 4" },
      { value: threshold.diaMin, label: `Tâm trương Min ${threshold.diaMin}`, strokeDasharray: "2 4" },
    ];
    else if (chartType === "pulse") lines = [
      { value: threshold.heartRateMax, label: `Max ${threshold.heartRateMax}` },
      { value: threshold.heartRateMin, label: `Min ${threshold.heartRateMin}` },
    ];
    else if (chartType === "temperature") lines = [
      { value: threshold.temperatureMax, label: `${threshold.temperatureMax}°C` },
      { value: threshold.temperatureMin, label: `${threshold.temperatureMin}°C` },
    ];
    else if (chartType === "spo2") lines = [{ value: threshold.spo2Min, label: `Min ${threshold.spo2Min}%` }];
    else if (chartType === "glucose" && threshold.glucoseMin && threshold.glucoseMax) lines = [
      { value: threshold.glucoseMax, label: `Max ${threshold.glucoseMax}` },
      { value: threshold.glucoseMin, label: `Min ${threshold.glucoseMin}` },
    ];
    else if (chartType === "respiratory" && threshold.respiratoryRateMin && threshold.respiratoryRateMax) lines = [
      { value: threshold.respiratoryRateMax, label: `Max ${threshold.respiratoryRateMax}` },
      { value: threshold.respiratoryRateMin, label: `Min ${threshold.respiratoryRateMin}` },
    ];

    // Group lines by value to avoid overlapping text
    const grouped = lines.reduce((acc, curr) => {
      if (curr.value == null) return acc;
      if (!acc[curr.value]) acc[curr.value] = { ...curr };
      else acc[curr.value].label = `${acc[curr.value].label} | ${curr.label}`;
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(grouped);
  }, [threshold, chartType]);

  const yAxisConfig = useMemo(
    () => getChartConfig(chartType, chartData, threshold),
    [chartType, chartData, threshold]
  );

  // Smart X-axis: show time if same day, else date
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
        const first = new Date(chartData[0].updateAt);
        const last = new Date(chartData[chartData.length - 1].updateAt);
        if (first.toDateString() === last.toDateString()) {
          return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        }
      }
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
            <div className="text-sm font-medium text-gray-900 dark:text-slate-200">{formatDateTime(item.updateAt)}</div>
            <div className="text-xs text-gray-400 dark:text-slate-500">{formatRelativeTime(item.updateAt)}</div>
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

  const hasCritical = openAlerts.some((a) => a.severity === "high");

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
          <span className="group-hover:underline underline-offset-2">{t("patientDetail.backToPrevious")}</span>
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
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      hasCritical
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    {openAlerts.length} cảnh báo tồn đọng
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0 text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                {patient.patientCode && <span>{t("patientDetail.patientCode")}: <span className="text-gray-600 dark:text-slate-400">{patient.patientCode}</span></span>}
                {patient.dob && <span>{new Date(patient.dob).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>}
                {patient.gender && <span>{patient.gender === "M" ? "Nam" : patient.gender === "F" ? "Nữ" : patient.gender}</span>}
                {patient.phone && <span>{patient.phone}</span>}
                {patient.emergencyContactName && (
                  <span>
                    Khẩn cấp: {patient.emergencyContactName}
                    {patient.emergencyContactPhone ? ` · ${patient.emergencyContactPhone}` : ""}
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
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            2. ALERTS (UNRESOLVED) — with action buttons
        ══════════════════════════════════════════════════════════════ */}
        {!alertsLoading && openAlerts.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-orange-200 dark:border-slate-600 overflow-hidden">
            {/* Header */}
            <div
              className={`px-4 py-2.5 flex items-center gap-3 border-b ${
                hasCritical
                  ? "bg-red-50/70 dark:bg-red-900/10 border-red-200 dark:border-red-900/30"
                  : "bg-amber-50/70 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30"
              }`}
            >
              <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                Cảnh báo chưa xử lý
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  hasCritical
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                }`}
              >
                {openAlerts.length}
              </span>
            </div>

            {/* Alert list */}
            <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {openAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => navigate(`/threshold-alerts?patientId=${patientId}`)}
                  className="w-full text-left px-4 py-3 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-px rounded ${
                          alert.severity === "high"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {alert.severity === "high" ? "Nguy cấp" : "Cảnh báo"}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {formatRelativeTime(alert.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {alert.violations.map((v, i) => (
                        <span key={i} className="text-sm text-gray-700 dark:text-slate-300">
                          <span className="font-medium">{mapViolationType(v.type)}</span>
                          {" "}
                          <span className="font-bold" style={{ color: "#c0392b" }}>{v.observed}</span>
                          {" "}
                          <span className="text-gray-400 dark:text-slate-500 text-xs">
                            ({mapRule(v.rule)} {v.threshold})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
                  {formatDateTime(latestMeasurement.updateAt)} · {formatRelativeTime(latestMeasurement.updateAt)}
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
                  className={`relative overflow-hidden rounded-xl p-4 flex flex-col transition-all duration-200 ${
                    v.isOut
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
                      className={`text-3xl font-bold tracking-tight ${
                        v.isOut ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-slate-100"
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
          className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 transition-all ${
            isChartExpanded
              ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] h-[88vh] flex flex-col"
              : ""
          }`}
        >
          {/* Chart toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-700 pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <MdShowChart size={15} className="text-gray-400" />
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
            
            <div className="flex flex-wrap gap-2 items-center ml-auto">
              {/* Chart type tabs */}
              <div className="inline-flex bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5 gap-px">
                {(["bp", "pulse", "temperature", "spo2", "glucose", "respiratory"] as const).map((type) => {
                  const labels: Record<string, string> = {
                    bp: "Huyết áp", pulse: "Nhịp tim", temperature: "Nhiệt độ",
                    spo2: "SpO₂", glucose: "Đường huyết", respiratory: "Nhịp thở",
                  };
                  return (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                        chartType === type
                          ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg px-2.5 py-1 border border-gray-200 dark:border-slate-600 min-w-max">
                <FaCalendarAlt className="text-gray-400 dark:text-slate-500" size={12} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-medium bg-transparent text-gray-700 dark:text-slate-300 border-none outline-none cursor-pointer"
                  style={{ width: "95px" }}
                />
                <span className="text-gray-300 dark:text-slate-500 text-xs">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-medium bg-transparent text-gray-700 dark:text-slate-300 border-none outline-none cursor-pointer"
                  style={{ width: "95px" }}
                />
              </div>
            </div>
          </div>

          {/* Chart area — taller by default */}
          <div className={isChartExpanded ? "flex-1 w-full min-h-0" : "h-72 w-full"}>
            {measurementsLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-slate-500">
                {t("patientDetail.loadingMeasurements")}
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-slate-500">
                Không có dữ liệu trong khoảng thời gian này.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 32, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.8} className="dark:opacity-30" />
                  <XAxis
                    dataKey="updateAt"
                    tickFormatter={formatXAxis}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    dy={6}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    domain={yAxisConfig.domain}
                    ticks={yAxisConfig.ticks}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    content={<CustomTooltip threshold={threshold} />}
                    cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px", color: "#64748b" }}
                  />
                  {chartThresholdLines.map((line, i) => (
                    <ReferenceLine
                      key={i}
                      y={line.value}
                      stroke="#e2e8f0"
                      strokeDasharray={line.strokeDasharray || "5 5"}
                      strokeWidth={1}
                    />
                  ))}
                  {chartType === "bp" ? (
                    <>
                      <Line
                        name={t("patientDetail.lineSystolic")}
                        type="monotone"
                        dataKey="systolic"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={<CustomDot threshold={threshold} />}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        connectNulls={false}
                      />
                      <Line
                        name={t("patientDetail.lineDiastolic")}
                        type="monotone"
                        dataKey="diastolic"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={<CustomDot threshold={threshold} />}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        connectNulls={false}
                      />
                    </>
                  ) : chartType === "pulse" ? (
                    <Line name="Nhịp tim" type="monotone" dataKey="pulse" stroke="#f43f5e" strokeWidth={2}
                      dot={<CustomDot threshold={threshold} />} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={false} />
                  ) : chartType === "glucose" ? (
                    <Line name={t("patientDetail.lineGlucose")} type="monotone" dataKey="glucose" stroke="#3b82f6" strokeWidth={2}
                      dot={<CustomDot threshold={threshold} />} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={false} />
                  ) : chartType === "temperature" ? (
                    <Line name={t("patientDetail.lineTemperature")} type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2}
                      dot={<CustomDot threshold={threshold} />} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={false} />
                  ) : chartType === "spo2" ? (
                    <Line name="SpO₂" type="monotone" dataKey="spo2" stroke="#06b6d4" strokeWidth={2}
                      dot={<CustomDot threshold={threshold} />} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={false} />
                  ) : (
                    <Line name={t("patientDetail.lineRespiratory")} type="monotone" dataKey="respiratoryRate" stroke="#8b5cf6" strokeWidth={2}
                      dot={<CustomDot threshold={threshold} />} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between mt-3 gap-3">
            {/* Threshold Chips */}
            <div className="flex flex-wrap gap-2">
              {threshold && chartType === "bp" && (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 dark:bg-slate-700/50 text-[11px] text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-600">
                    <span>Tâm thu:</span>
                    <span className="font-medium text-gray-700 dark:text-slate-200">{threshold.sysMin}–{threshold.sysMax}</span>
                    <span>mmHg</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 dark:bg-slate-700/50 text-[11px] text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-600">
                    <span>Tâm trương:</span>
                    <span className="font-medium text-gray-700 dark:text-slate-200">{threshold.diaMin}–{threshold.diaMax}</span>
                    <span>mmHg</span>
                  </div>
                </>
              )}
              {threshold && chartType !== "bp" && chartThresholdLines.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 dark:bg-slate-700/50 text-[11px] text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-600">
                  <span>Ngưỡng:</span>
                  <span className="font-medium text-gray-700 dark:text-slate-200">
                    {chartThresholdLines.map(l => l.value).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Legend Indicators */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-slate-400">
              {chartType === "bp" && (
                <>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#6366f1] inline-block rounded-full"></span> Tâm thu</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#10b981] inline-block rounded-full"></span> Tâm trương</span>
                </>
              )}
              {chartType === "pulse" && <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#f43f5e] inline-block rounded-full"></span> Nhịp tim</span>}
              {chartType === "glucose" && <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#3b82f6] inline-block rounded-full"></span> Đường huyết</span>}
              {chartType === "temperature" && <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#f97316] inline-block rounded-full"></span> Nhiệt độ</span>}
              {chartType === "spo2" && <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#06b6d4] inline-block rounded-full"></span> SpO₂</span>}
              {chartType === "respiratory" && <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#8b5cf6] inline-block rounded-full"></span> Nhịp thở</span>}
              
              <span className="flex items-center gap-1.5"><span className="text-red-500 text-[10px]">●</span> Vượt ngưỡng</span>
              {chartThresholdLines.length > 0 && (
                <span className="flex items-center gap-1.5"><span className="border-b border-dashed border-gray-400 w-3 inline-block"></span> Ngưỡng cá nhân</span>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            5. MEASUREMENT HISTORY TABLE
        ══════════════════════════════════════════════════════════════ */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              {t("patientDetail.recentHistory")}
            </span>
            <button
              onClick={() => setShowOnlyAbnormal(!showOnlyAbnormal)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                showOnlyAbnormal
                  ? "border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
                  : "border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <MdFilterList size={13} />
              {showOnlyAbnormal ? "Đang lọc: bất thường" : "Chỉ hiện bất thường"}
            </button>
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
            <Table<ChartRow> data={tableData} columns={columns} className="rounded-none shadow-none" />
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
    </div>
  );
};

export default PatientDetailPage;

// pages/PatientDetailPage.tsx

import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MdOutlineKeyboardBackspace,
  MdOutlineCake,
  MdPerson,
  MdPhoneInTalk,
  MdContactEmergency,
  MdNotificationsActive,
  MdShowChart,
  MdDateRange,
  MdFullscreen,
  MdFullscreenExit,
  MdAdd,
  MdRemove,
} from "react-icons/md";
import { FaRegMessage } from "react-icons/fa6";
import { FaHeartbeat, FaTemperatureHigh, FaTint, FaLungs } from "react-icons/fa";
import { GiHeartBeats } from "react-icons/gi";
import { MdBloodtype } from "react-icons/md";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import Table, { type Column } from "../components/ui/Table";
import {
  getPatientById,
  getMeasurements,
  type PatientDetailResponse,
  type MeasurementResponse,
} from "../services/patientService";
import { getThresholds, type ThresholdRecord } from "../services/thresholdService";

// ---- Normalised measurement row for table & chart ----
interface ChartRow {
  systolic: number;
  diastolic: number;
  pulse: number;
  glucose: number;
  spo2: number;
  temperature: number;
  respiratoryRate: number;
  updateAt: string;
}

const normalizeMeasurements = (data: MeasurementResponse[]): ChartRow[] =>
  data.map((m) => ({
    systolic: m.bloodPressure?.systolic ?? m.systolic ?? 0,
    diastolic: m.bloodPressure?.diastolic ?? m.diastolic ?? 0,
    pulse: m.heartRate ?? 0,
    glucose: m.glucose ?? 0,
    spo2: m.spo2 ?? 0,
    temperature: m.temperature ?? 0,
    respiratoryRate: m.respiratoryRate ?? 0,
    updateAt: m.createdAt,
  }));

// ---- Sub-components ----
const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition text-sm">
    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-gray-500 dark:text-slate-400 text-xs font-medium">{label}</p>
      <p className="text-gray-900 dark:text-slate-100 font-semibold">{value || "—"}</p>
    </div>
  </div>
);

const ThresholdCard = ({ icon: Icon, label, data, unit, colorClass }: any) => (
  <div
    className={`p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border-l-4 ${colorClass} flex items-center`}
  >
    <div
      className={`p-3 rounded-full mr-4 bg-gray-50 dark:bg-slate-700 ${colorClass.replace(
        "border",
        "text"
      )}`}
    >
      <Icon size={24} />
    </div>
    <div>
      <h4 className="text-gray-500 dark:text-slate-400 text-sm font-medium mb-1">{label}</h4>
      <div className="flex items-baseline">
        <span className="font-bold text-xl text-gray-800 dark:text-slate-100">
          {data.min} - {data.max}
        </span>
        <span className="text-gray-500 dark:text-slate-400 ml-1 text-sm">{unit}</span>
      </div>
    </div>
  </div>
);

// ---- Helpers ----
/**
 * TODO [NO API]: Patient status is currently represented as 'active'/'inactive'
 * at the backend level. There is no backend field that maps to clinical display
 * labels "Bình thường / Cảnh báo / Nguy hiểm".
 */
const mapStatusLabel = (status: string, t: (key: string) => string) => {
  switch (status) {
    case "active": return t("patients.monitoring");
    case "inactive": return t("patients.stopped");
    default: return status;
  }
};

const getStatusColorObj = (status: string) => {
  switch (status) {
    case "active":
      return { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-400", border: "border-green-200 dark:border-green-800" };
    case "inactive":
      return { bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-800 dark:text-slate-300", border: "border-gray-200 dark:border-slate-600" };
    default:
      return { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-800 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" };
  }
};

// ---- Main Component ----
const PatientDetailPage = () => {
  const navigate = useNavigate();
  const { id: patientId } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [patient, setPatient] = useState<PatientDetailResponse | null>(null);
  const [measurements, setMeasurements] = useState<ChartRow[]>([]);
  const [threshold, setThreshold] = useState<ThresholdRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurementsLoading, setMeasurementsLoading] = useState(true);
  const [measurementsError, setMeasurementsError] = useState<string | null>(null);
  const [thresholdLoading, setThresholdLoading] = useState(true);
  const [thresholdError, setThresholdError] = useState<string | null>(null);

  const [chartType, setChartType] = useState<"bp" | "glucose" | "temperature" | "spo2" | "respiratory">("bp");

  /**
   * TODO [NO API]: The "Tuần / Tháng" time range selector has no matching query
   * param in GET /measurements. Filtering is currently done client-side.
   * Backend should add ?from=&to= params for proper server-side filtering.
   */
  const [timeRangeType, setTimeRangeType] = useState<"week" | "month">("week");
  const [timeRangeValue, setTimeRangeValue] = useState<number>(1);
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  // Re-fetch measurements whenever the time range changes
  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    setMeasurementsLoading(true);
    setMeasurementsError(null);

    getMeasurements({ patientId })
      .then((rawMeasurements) => {
        if (cancelled) return;
        setMeasurements(normalizeMeasurements(rawMeasurements));
      })
      .catch((err: any) => {
        if (cancelled) return;
        setMeasurements([]);
        setMeasurementsError(
          err?.response?.data?.error ?? err?.message ?? t("patientDetail.historyError")
        );
      })
      .finally(() => {
        if (!cancelled) setMeasurementsLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, timeRangeType, timeRangeValue]);

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setMeasurementsLoading(true);
      setMeasurementsError(null);
      setThresholdLoading(true);
      setThresholdError(null);

      const measurementsPromise = Promise.resolve(); // measurements fetched by timeRange effect above

      const thresholdsPromise = getThresholds({ patientId, latest: true })
        .then((thresholds) => {
          if (cancelled) return;
          setThreshold(thresholds.length > 0 ? thresholds[0] : null);
        })
        .catch((err: any) => {
          if (cancelled) return;
          setThreshold(null);
          setThresholdError(
            err?.response?.data?.error ?? err?.message ?? t("patientDetail.loadingThresholds")
          );
        })
        .finally(() => {
          if (cancelled) return;
          setThresholdLoading(false);
        });

      try {
        const patientData = await getPatientById(patientId);
        if (cancelled) return;
        setPatient(patientData);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.error ?? err?.message ?? t("common.error"));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      void measurementsPromise;
      void thresholdsPromise;
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const filteredMeasurements = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (timeRangeType === "week") {
      cutoff.setDate(now.getDate() - (timeRangeValue * 7));
    } else {
      cutoff.setMonth(now.getMonth() - timeRangeValue);
    }
    return measurements.filter((m) => new Date(m.updateAt) >= cutoff);
  }, [measurements, timeRangeType, timeRangeValue]);

  const columns = useMemo<Column<ChartRow>[]>(
    () => [
      {
        header: t("patientDetail.time"),
        accessor: "updateAt",
        className: "font-medium text-gray-900 dark:text-slate-100",
      },
      {
        header: `${t("patientDetail.bloodPressure")} (mmHg)`,
        render: (item) => (
          <span className="text-gray-700 dark:text-slate-300">
            {item.systolic} / {item.diastolic}
          </span>
        ),
      },
      {
        header: `${t("patientDetail.heartRate")} (bpm)`,
        render: (item) => (
          <span className="inline-flex items-center font-semibold text-gray-700 dark:text-slate-300">
            {item.pulse}
          </span>
        ),
      },
      {
        header: `${t("patientDetail.temperature")} (°C)`,
        render: (item) => (
          <span className="text-gray-700 dark:text-slate-300">
            {item.temperature > 0 ? item.temperature.toFixed(1) : "—"}
          </span>
        ),
      },
      {
        header: `${t("patientDetail.spo2")} (%)`,
        render: (item) => (
          <span className="text-gray-700 dark:text-slate-300">
            {item.spo2 > 0 ? item.spo2 : "—"}
          </span>
        ),
      },
      {
        header: `${t("patientDetail.respiratoryRate")} (bpm)`,
        render: (item) => (
          <span className="text-gray-700 dark:text-slate-300">
            {item.respiratoryRate > 0 ? item.respiratoryRate : "—"}
          </span>
        ),
      },
      {
        header: `${t("patientDetail.glucose")} (mg/dL)`,
        render: (item) => (
          <span className="text-gray-700 dark:text-slate-300">
            {item.glucose > 0 ? item.glucose : "—"}
          </span>
        ),
      },
    ],
    [t]
  );

  const tableData = useMemo(
    () => [...filteredMeasurements].reverse(),
    [filteredMeasurements]
  );

  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    } catch {
      return tickItem;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-slate-900">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center bg-gray-100 dark:bg-slate-900">
        <p className="text-red-500 font-medium">{error ?? t("patientDetail.patientNotFound")}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 dark:bg-slate-700 dark:text-slate-200 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition"
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  const statusColors = getStatusColorObj(patient.status);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center mb-4 rounded hover:bg-gray-200 dark:hover:bg-slate-800 p-2 transition-all text-gray-700 dark:text-slate-300"
        >
          <MdOutlineKeyboardBackspace size={24} />
          <span className="font-medium whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-500 ease-in-out">
            {t("patientDetail.backToPrevious")}
          </span>
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center relative z-10">
            <img
              src={patient.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=random`}
              alt={patient.name}
              className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-full border-4 border-white dark:border-slate-700 shadow-lg"
            />
            <div className="sm:ml-8 mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                {patient.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <span className="text-gray-500 dark:text-slate-400 text-sm">
                  {patient.patientCode ? `${t("patientDetail.patientCode")}: ${patient.patientCode}` : `ID: #${patient.id.slice(0, 8)}`}
                </span>
                {/* TODO [NO API]: status is 'active'/'inactive', not clinical severity. */}
                <span
                  className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                >
                  {mapStatusLabel(patient.status, t)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                <button
                  onClick={() => navigate(`/reminders?patientId=${patientId}`)}
                  className="inline-flex items-center rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                  <MdNotificationsActive className="mr-2" size={18} />
                  {t("patientDetail.manageReminders")}
                </button>
                <button
                  onClick={() => navigate(`/patient/chat/${patientId}`)}
                  className="relative group p-1"
                >
                  <FaRegMessage className="text-2xl text-gray-600 dark:text-slate-400" />
                  {/* TODO [NO API]: Unread message count badge — no API for unread count. */}
                  <span className="absolute -top-1 -right-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-[10px] font-bold items-center justify-center border-2 border-white">
                      !
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
                {t("patientDetail.personalInfo")}
              </h3>
              <div className="space-y-3">
                <InfoItem
                  icon={MdOutlineCake}
                  label={t("profile.dateOfBirth")}
                  value={patient.dob ? patient.dob.split("T")[0] : ""}
                />
                <InfoItem icon={MdPerson} label={t("profile.gender")} value={patient.gender} />
                {patient.phone && (
                  <InfoItem icon={MdPhoneInTalk} label={t("profile.phone")} value={patient.phone} />
                )}
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
                {t("patientDetail.emergencyContact")}
              </h3>
              <div className="space-y-3">
                <InfoItem
                  icon={MdContactEmergency}
                  label={t("patientDetail.contactPerson")}
                  value={patient.emergencyContactName ?? ""}
                />
                <InfoItem
                  icon={MdPhoneInTalk}
                  label={t("profile.phone")}
                  value={patient.emergencyContactPhone ?? ""}
                />
              </div>
            </section>
          </div>

          {/* Right column: Thresholds */}
          <div className="lg:col-span-2">
            <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 h-full">
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-6 pb-2 border-b border-gray-200 dark:border-slate-700 flex items-center">
                <GiHeartBeats className="mr-2 text-red-500" size={24} />
                {t("patientDetail.safetyThresholds")}
              </h3>
              {thresholdLoading ? (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400 dark:text-slate-500">
                  {t("patientDetail.loadingThresholds")}
                </div>
              ) : thresholdError ? (
                <div className="flex h-48 flex-col items-center justify-center gap-3 text-center text-sm text-red-500 dark:text-red-300">
                  <p>{thresholdError}</p>
                  <button
                    onClick={() => navigate(`/threshold-settings`)}
                    className="rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-primary-dark"
                  >
                    {t("patientDetail.openThresholdSettings")}
                  </button>
                </div>
              ) : threshold ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ThresholdCard icon={FaTemperatureHigh} label={t("patientDetail.temperature")} data={{ min: threshold.temperatureMin, max: threshold.temperatureMax }} unit="°C" colorClass="border-orange-400 text-orange-500" />
                  <ThresholdCard icon={GiHeartBeats} label={t("patientDetail.heartRate")} data={{ min: threshold.heartRateMin, max: threshold.heartRateMax }} unit="bpm" colorClass="border-red-400 text-red-500" />
                  <ThresholdCard icon={FaHeartbeat} label={t("patientDetail.systolic")} data={{ min: threshold.sysMin, max: threshold.sysMax }} unit="mmHg" colorClass="border-purple-400 text-purple-500" />
                  <ThresholdCard icon={FaHeartbeat} label={t("patientDetail.diastolic")} data={{ min: threshold.diaMin, max: threshold.diaMax }} unit="mmHg" colorClass="border-indigo-400 text-indigo-500" />
                  <ThresholdCard icon={FaLungs} label={t("patientDetail.respiratoryRate")} data={{ min: threshold.respiratoryRateMin ?? 0, max: threshold.respiratoryRateMax ?? 0 }} unit="bpm" colorClass="border-green-400 text-green-500" />
                  <ThresholdCard icon={MdBloodtype} label={t("patientDetail.spo2")} data={{ min: threshold.spo2Min, max: 100 }} unit="%" colorClass="border-cyan-400 text-cyan-500" />
                  <ThresholdCard icon={FaTint} label={t("patientDetail.glucose")} data={{ min: threshold.glucoseMin ?? 0, max: threshold.glucoseMax ?? 0 }} unit="mg/dL" colorClass="border-blue-400 text-blue-500" />

                  <div className="col-span-1 sm:col-span-2 flex justify-center items-center">
                    <button
                      onClick={() => navigate(`/threshold-settings`)}
                      className="mt-2 w-full bg-primary hover:bg-primary-dark text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-purple-200"
                    >
                      {t("patientDetail.updateThresholds")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-slate-500 gap-3">
                  <p>{t("patientDetail.noThresholds")}</p>
                  <button
                    onClick={() => navigate(`/threshold-settings`)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                  >
                    {t("patientDetail.setupThresholds")}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        {isChartExpanded && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsChartExpanded(false)}
          />
        )}
        <section
          className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 transition-all ${isChartExpanded
              ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] h-[90vh] flex flex-col m-0"
              : "mb-6"
            }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4 mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center mb-4 md:mb-0">
              <MdShowChart className="mr-2 text-blue-500" size={24} />
              {t("patientDetail.healthChart")}
              <button
                onClick={() => setIsChartExpanded(!isChartExpanded)}
                className="ml-3 p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition"
                title={isChartExpanded ? t("common.collapse") || "Thu nhỏ" : t("common.expand") || "Phóng to"}
              >
                {isChartExpanded ? <MdFullscreenExit size={24} /> : <MdFullscreen size={24} />}
              </button>
            </h3>

            <div className="flex flex-wrap gap-2 md:gap-4">
              <div className="inline-flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 flex-wrap">
                <button
                  onClick={() => setChartType("bp")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartType === "bp"
                      ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                >
                  {t("patientDetail.chartBP")}
                </button>
                <button
                  onClick={() => setChartType("glucose")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartType === "glucose"
                      ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                >
                  {t("patientDetail.chartGlucose")}
                </button>
                <button
                  onClick={() => setChartType("temperature")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartType === "temperature"
                      ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                >
                  {t("patientDetail.chartTemperature")}
                </button>
                <button
                  onClick={() => setChartType("spo2")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartType === "spo2"
                      ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                >
                  {t("patientDetail.chartSpo2")}
                </button>
                <button
                  onClick={() => setChartType("respiratory")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${chartType === "respiratory"
                      ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    }`}
                >
                  {t("patientDetail.chartRespiratory")}
                </button>
              </div>

              <div className="inline-flex items-center gap-3 bg-gray-100 dark:bg-slate-700 rounded-lg p-2">
                {/* Type selector */}
                <div className="inline-flex bg-white dark:bg-slate-600 rounded-md p-0.5 shadow-sm">
                  <button
                    onClick={() => setTimeRangeType("week")}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-all flex items-center ${timeRangeType === "week"
                        ? "bg-blue-500 text-white shadow-md"
                        : "text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100"
                      }`}
                  >
                    <MdDateRange className="mr-1.5" size={16} /> {t("patientDetail.week")}
                  </button>
                  <button
                    onClick={() => setTimeRangeType("month")}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-all flex items-center ${timeRangeType === "month"
                        ? "bg-blue-500 text-white shadow-md"
                        : "text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100"
                      }`}
                  >
                    <MdDateRange className="mr-1.5" size={16} /> {t("patientDetail.month")}
                  </button>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-300 dark:bg-slate-600"></div>

                {/* Number input with +/- buttons */}
                <div className="inline-flex items-center bg-white dark:bg-slate-600 rounded-md shadow-sm">
                  <button
                    onClick={() => setTimeRangeValue(Math.max(1, timeRangeValue - 1))}
                    disabled={timeRangeValue <= 1}
                    className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-500 rounded-l-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Giảm"
                  >
                    <MdRemove size={18} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={timeRangeType === "week" ? "52" : "12"}
                    value={timeRangeValue}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const max = timeRangeType === "week" ? 52 : 12;
                      setTimeRangeValue(Math.min(max, Math.max(1, val)));
                    }}
                    className="w-14 px-2 py-1.5 text-sm font-semibold text-center bg-transparent text-gray-800 dark:text-slate-100 border-x border-gray-200 dark:border-slate-500 focus:outline-none focus:bg-gray-50 dark:focus:bg-slate-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => {
                      const max = timeRangeType === "week" ? 52 : 12;
                      setTimeRangeValue(Math.min(max, timeRangeValue + 1));
                    }}
                    disabled={timeRangeValue >= (timeRangeType === "week" ? 52 : 12)}
                    className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-500 rounded-r-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Tăng"
                  >
                    <MdAdd size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={isChartExpanded ? "flex-1 w-full min-h-[400px]" : "h-80 w-full"}>
            {measurementsLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-slate-500">
                {t("patientDetail.loadingMeasurements")}
              </div>
            ) : measurementsError ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-red-500 dark:text-red-300">
                {measurementsError}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={filteredMeasurements}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="updateAt" tickFormatter={formatXAxis} stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-surface, #1e293b)",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                      color: "#f1f5f9",
                    }}
                    itemStyle={{ fontSize: "13px", fontWeight: 500 }}
                    labelStyle={{ marginBottom: "5px", color: "#94a3b8" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "10px" }} />

                  {chartType === "bp" ? (
                    <>
                      <Line name={t("patientDetail.lineSystolic")} type="monotone" dataKey="systolic" stroke="#8884d8" strokeWidth={3} activeDot={{ r: 6 }} />
                      <Line name={t("patientDetail.lineDiastolic")} type="monotone" dataKey="diastolic" stroke="#82ca9d" strokeWidth={3} activeDot={{ r: 6 }} />
                    </>
                  ) : chartType === "glucose" ? (
                    <Line name={t("patientDetail.lineGlucose")} type="monotone" dataKey="glucose" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} />
                  ) : chartType === "temperature" ? (
                    <Line name={t("patientDetail.lineTemperature")} type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={3} activeDot={{ r: 6 }} />
                  ) : chartType === "spo2" ? (
                    <Line name="SpO2" type="monotone" dataKey="spo2" stroke="#06b6d4" strokeWidth={3} activeDot={{ r: 6 }} />
                  ) : (
                    <Line name={t("patientDetail.lineRespiratory")} type="monotone" dataKey="respiratoryRate" stroke="#10b981" strokeWidth={3} activeDot={{ r: 6 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 text-center italic">
            {t("patientDetail.dataNote")}{" "}
            {timeRangeValue} {timeRangeType === "week" ? (timeRangeValue === 1 ? t("patientDetail.week") : "tuần") : (timeRangeValue === 1 ? t("patientDetail.month") : "tháng")} gần nhất.
          </p>
        </section>

        {/* History table */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-8">
          <div className="p-5 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">
              {t("patientDetail.recentHistory")}
            </h3>
          </div>

          {measurementsLoading ? (
            <div className="p-5 text-sm text-gray-400 dark:text-slate-500">
              {t("patientDetail.loadingHistory")}
            </div>
          ) : measurementsError ? (
            <div className="p-5 text-sm text-red-500 dark:text-red-300">
              {measurementsError}
            </div>
          ) : (
            <Table<ChartRow>
              data={tableData}
              columns={columns}
              className="rounded-none shadow-none"
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default PatientDetailPage;

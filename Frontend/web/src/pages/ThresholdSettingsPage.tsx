import {
  useState,
  useEffect,
  useMemo,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  FaPlus,
  FaSyncAlt,
  FaEdit,
  FaStopCircle,
  FaTimes,
  FaSave,
  FaSearch,
  FaUserFriends,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import StatCard from "../components/ui/StatCard";

import Toast from "../components/ui/Toast";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { getMyPatients } from "../services/patientService";
import {
  createThreshold,
  getThresholds,
  updateThreshold,
  type ThresholdPayload,
  type ThresholdRecord,
} from "../services/thresholdService";
import type { AssignmentResponse } from "../types/patient";
import PatientSearchSelect from "../components/common/PatientSearchSelect";
import PatientClinicalSummary from "../components/common/PatientClinicalSummary";
import Pagination from "../components/ui/Pagination";

interface ThresholdFormData {
  patientId: string;
  temperatureMin: string;
  temperatureMax: string;
  systolicMin: string;
  systolicMax: string;
  diastolicMin: string;
  diastolicMax: string;
  pulseMin: string;
  pulseMax: string;
  glucoseMin: string;
  glucoseMax: string;
  spo2Min: string;
  respiratoryRateMin: string;
  respiratoryRateMax: string;
  effectiveFrom: string;
  effectiveTo: string;
}

// const HISTORY_PAGE_SIZE = 10;

const createDefaultFormData = (patientId = ""): ThresholdFormData => ({
  patientId,
  temperatureMin: "36.0",
  temperatureMax: "37.5",
  systolicMin: "90",
  systolicMax: "140",
  diastolicMin: "60",
  diastolicMax: "90",
  pulseMin: "60",
  pulseMax: "100",
  glucoseMin: "70",
  glucoseMax: "125",
  spo2Min: "95",
  respiratoryRateMin: "12",
  respiratoryRateMax: "20",
  effectiveFrom: new Date().toISOString().slice(0, 16),
  effectiveTo: "",
});

const formatDateTime = (isoString: string | null) => {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${h}:${m} ${dd}/${mm}/${yyyy}`;
  } catch (e) {
    return isoString;
  }
};

const checkIsActive = (threshold: ThresholdRecord) => {
  const now = new Date().getTime();
  const start = new Date(threshold.effectiveFrom).getTime();
  if (start > now) return false;
  if (!threshold.effectiveTo) return true;
  const end = new Date(threshold.effectiveTo).getTime();
  return end > now;
};

const checkIsArchived = (threshold: ThresholdRecord) => {
  if (!threshold.effectiveTo) return false;
  const now = new Date().getTime();
  const end = new Date(threshold.effectiveTo).getTime();
  return end <= now;
};

export default function ThresholdSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [patients, setPatients] = useState<AssignmentResponse[]>([]);
  const [allThresholds, setAllThresholds] = useState<ThresholdRecord[]>([]);

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingThresholds, setLoadingThresholds] = useState(false);

  const [activeTab, setActiveTab] = useState<"MISSING" | "ACTIVE" | "HISTORY">(
    "MISSING",
  );

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState<ThresholdFormData>(
    createDefaultFormData(),
  );
  const [saving, setSaving] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

  // History filtering
  const [filterPatientId, setFilterPatientId] = useState("");
  const [missingSearchTerm, setMissingSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [activeCurrentPage, setActiveCurrentPage] = useState(1);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoadingPatients(true);
      setLoadingThresholds(true);
      const [patientsRes, thresholdsRes] = await Promise.all([
        getMyPatients(),
        getThresholds({ doctorId: user.id }),
      ]);
      setPatients(patientsRes);
      setAllThresholds(thresholdsRes);
    } catch (error) {
      console.error("Failed to load data", error);
      showToast(t("common.error", "Có lỗi xảy ra khi tải dữ liệu"), "error");
    } finally {
      setLoadingPatients(false);
      setLoadingThresholds(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const patientOptions = useMemo(() => {
    const patientMap = new Map<string, AssignmentResponse>();
    patients.forEach((item) => {
      if (!patientMap.has(item.patientId)) {
        patientMap.set(item.patientId, item);
      }
    });
    return Array.from(patientMap.values()).sort((a, b) =>
      (a.patientName || "").localeCompare(b.patientName || ""),
    );
  }, [patients]);

  const historyPatientOptions = useMemo(() => {
    return [
      {
        patientId: "",
        patientName: t("common.allPatients", "Tất cả bệnh nhân"),
      },
      ...patientOptions,
    ];
  }, [patientOptions, t]);

  // Coverage logic
  const { activeThresholds, missingPatients, activePatients } = useMemo(() => {
    const activeByPatient = new Map<string, ThresholdRecord>();
    const archivedByPatient: ThresholdRecord[] = [];
    const futureByPatient: ThresholdRecord[] = [];

    // Sort thresholds descending by effectiveFrom so we easily pick the latest active
    const sorted = [...allThresholds].sort(
      (a, b) =>
        new Date(b.effectiveFrom).getTime() -
        new Date(a.effectiveFrom).getTime(),
    );

    sorted.forEach((t) => {
      if (checkIsActive(t)) {
        if (!activeByPatient.has(t.patientId)) {
          activeByPatient.set(t.patientId, t);
        }
      } else if (checkIsArchived(t)) {
        archivedByPatient.push(t);
      } else {
        futureByPatient.push(t);
      }
    });

    const activeList = Array.from(activeByPatient.values());
    const activePatientIds = new Set(activeList.map((t) => t.patientId));

    const missingList = patientOptions.filter(
      (p) => !activePatientIds.has(p.patientId),
    );
    const activePtList = patientOptions.filter((p) =>
      activePatientIds.has(p.patientId),
    );

    return {
      activeThresholds: activeByPatient,
      missingPatients: missingList,
      activePatients: activePtList,
      archivedThresholds: archivedByPatient,
      futureThresholds: futureByPatient,
    };
  }, [allThresholds, patientOptions]);

  // Default tab logic
  useEffect(() => {
    if (!loadingPatients && !loadingThresholds) {
      if (missingPatients.length > 0) {
        setActiveTab("MISSING");
      } else {
        setActiveTab("ACTIVE");
      }
    }
  }, [loadingPatients, loadingThresholds]); // Only on initial load

  const handleOpenCreateForm = (patientId = "") => {
    setFormData(createDefaultFormData(patientId));
    setEditingPatientId(null);
    setIsFormVisible(true);
  };

  const handleEditActiveThreshold = (threshold: ThresholdRecord) => {
    setFormData({
      patientId: threshold.patientId,
      temperatureMin: threshold.temperatureMin?.toString() ?? "",
      temperatureMax: threshold.temperatureMax?.toString() ?? "",
      systolicMin: threshold.sysMin?.toString() ?? "",
      systolicMax: threshold.sysMax?.toString() ?? "",
      diastolicMin: threshold.diaMin?.toString() ?? "",
      diastolicMax: threshold.diaMax?.toString() ?? "",
      pulseMin: threshold.heartRateMin?.toString() ?? "",
      pulseMax: threshold.heartRateMax?.toString() ?? "",
      glucoseMin: threshold.glucoseMin?.toString() ?? "70",
      glucoseMax: threshold.glucoseMax?.toString() ?? "125",
      spo2Min: threshold.spo2Min?.toString() ?? "",
      respiratoryRateMin: threshold.respiratoryRateMin?.toString() ?? "",
      respiratoryRateMax: threshold.respiratoryRateMax?.toString() ?? "",
      effectiveFrom: new Date().toISOString().slice(0, 16),
      effectiveTo: "",
    });
    setEditingPatientId(threshold.patientId);
    setIsFormVisible(true);
  };

  // const handleCloneArchived = (threshold: ThresholdRecord) => {
  //   handleEditActiveThreshold(threshold);
  //   setEditingPatientId(null);
  // };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStopActive = async (threshold: ThresholdRecord) => {
    const confirmed = window.confirm(
      t(
        "thresholds.stopConfirm",
        "Bạn có chắc chắn muốn ngừng áp dụng cấu hình này?",
      ),
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      await updateThreshold(threshold.id, {
        patientId: threshold.patientId,
        doctorId: threshold.doctorId,
        temperatureMin: threshold.temperatureMin,
        temperatureMax: threshold.temperatureMax,
        heartRateMin: threshold.heartRateMin,
        heartRateMax: threshold.heartRateMax,
        respiratoryRateMin: threshold.respiratoryRateMin,
        respiratoryRateMax: threshold.respiratoryRateMax,
        spo2Min: threshold.spo2Min,
        sysMin: threshold.sysMin,
        sysMax: threshold.sysMax,
        diaMin: threshold.diaMin,
        diaMax: threshold.diaMax,
        glucoseMin: threshold.glucoseMin,
        glucoseMax: threshold.glucoseMax,
        effectiveFrom: threshold.effectiveFrom,
        effectiveTo: new Date().toISOString(),
      });
      showToast(
        t("thresholds.stopSuccess", "Ngừng áp dụng thành công"),
        "success",
      );
      await loadData();
    } catch (error: any) {
      console.error("Failed to stop threshold", error);
      showToast(
        error?.response?.data?.error ||
          t("thresholds.stopError", "Có lỗi xảy ra"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !user?.id) {
      showToast(
        t("thresholds.selectPatientFirst", "Vui lòng chọn bệnh nhân"),
        "error",
      );
      return;
    }

    try {
      setSaving(true);
      const payload: ThresholdPayload = {
        patientId: formData.patientId,
        doctorId: user.id,
        temperatureMin: parseFloat(formData.temperatureMin),
        temperatureMax: parseFloat(formData.temperatureMax),
        heartRateMin: parseInt(formData.pulseMin, 10),
        heartRateMax: parseInt(formData.pulseMax, 10),
        respiratoryRateMin: parseInt(formData.respiratoryRateMin, 10),
        respiratoryRateMax: parseInt(formData.respiratoryRateMax, 10),
        spo2Min: parseInt(formData.spo2Min, 10),
        sysMin: parseInt(formData.systolicMin, 10),
        sysMax: parseInt(formData.systolicMax, 10),
        diaMin: parseInt(formData.diastolicMin, 10),
        diaMax: parseInt(formData.diastolicMax, 10),
        glucoseMin: formData.glucoseMin
          ? parseFloat(formData.glucoseMin)
          : null,
        glucoseMax: formData.glucoseMax
          ? parseFloat(formData.glucoseMax)
          : null,
        effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
        effectiveTo: formData.effectiveTo
          ? new Date(formData.effectiveTo).toISOString()
          : null,
      };

      // If we are editing an active threshold, we should archive the current one first
      if (editingPatientId) {
        const active = activeThresholds.get(editingPatientId);
        if (active) {
          await updateThreshold(active.id, {
            patientId: active.patientId,
            doctorId: active.doctorId,
            temperatureMin: active.temperatureMin,
            temperatureMax: active.temperatureMax,
            heartRateMin: active.heartRateMin,
            heartRateMax: active.heartRateMax,
            respiratoryRateMin: active.respiratoryRateMin,
            respiratoryRateMax: active.respiratoryRateMax,
            spo2Min: active.spo2Min,
            sysMin: active.sysMin,
            sysMax: active.sysMax,
            diaMin: active.diaMin,
            diaMax: active.diaMax,
            glucoseMin: active.glucoseMin,
            glucoseMax: active.glucoseMax,
            effectiveFrom: active.effectiveFrom,
            effectiveTo: new Date().toISOString(), // Close it now
          });
        }
      }

      await createThreshold(payload);
      showToast(
        t("thresholds.saveSuccess", "Lưu cấu hình thành công"),
        "success",
      );
      setIsFormVisible(false);
      await loadData();
    } catch (error: any) {
      console.error("Failed to save threshold", error);
      showToast(
        error?.response?.data?.error ||
          t("thresholds.saveError", "Có lỗi xảy ra"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderActiveCard = (
    threshold: ThresholdRecord,
    ptName: string,
    ptCode?: string,
  ) => {
    return (
      <div
        key={threshold.id}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-5 border-l-4 border-l-emerald-500 transition-all"
      >
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {ptName}
              </h3>
              {ptCode && (
                <span className="text-sm text-slate-500">#{ptCode}</span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                {t("common.active", "Đang áp dụng")}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4">
              <span>Cập nhật: {formatDateTime(threshold.updatedAt)}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Huyết áp (mmHg)
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {threshold.sysMin}-{threshold.sysMax} / {threshold.diaMin}-
                  {threshold.diaMax}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Nhịp tim (bpm)
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {threshold.heartRateMin}-{threshold.heartRateMax}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  SpO2 (%)
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  &ge; {threshold.spo2Min}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Đường huyết (mg/dL)
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {threshold.glucoseMin != null
                    ? `${threshold.glucoseMin}-${threshold.glucoseMax}`
                    : "N/A"}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Nhiệt độ (°C)
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {threshold.temperatureMin}-{threshold.temperatureMax}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-600">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Nhịp thở (lần/ph)
                </div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {threshold.respiratoryRateMin}-{threshold.respiratoryRateMax}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row lg:flex-col gap-2 shrink-0 justify-end">
            <button
              onClick={() => handleEditActiveThreshold(threshold)}
              className="px-4 py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-sm font-medium transition flex items-center justify-center"
            >
              <FaEdit className="mr-2 h-3 w-3" /> Chỉnh sửa
            </button>
            <button
              onClick={() => handleStopActive(threshold)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition flex items-center justify-center"
            >
              <FaStopCircle className="mr-2 h-3 w-3" /> Ngừng hiệu lực
            </button>
            <button
              onClick={() => {
                setFilterPatientId(threshold.patientId);
                setActiveTab("HISTORY");
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition flex items-center justify-center"
            >
              Xem lịch sử
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderArchivedCard = (
    threshold: ThresholdRecord,
    ptName: string,
    ptCode?: string,
  ) => {
    return (
      <div
        key={threshold.id}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4 transition-all"
      >
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {ptName}
              </span>
              {ptCode && (
                <span className="text-xs text-slate-500">#{ptCode}</span>
              )}
              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Đã lưu trữ
              </span>
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-3 flex flex-wrap gap-x-4">
              <span>Từ: {formatDateTime(threshold.effectiveFrom)}</span>
              <span>Đến: {formatDateTime(threshold.effectiveTo)}</span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                HATT: {threshold.sysMin}-{threshold.sysMax}
              </span>
              <span>
                HATTr: {threshold.diaMin}-{threshold.diaMax}
              </span>
              <span>
                Tim: {threshold.heartRateMin}-{threshold.heartRateMax}
              </span>
              <span>SpO2: &ge;{threshold.spo2Min}</span>
              {threshold.glucoseMin != null && (
                <span>
                  Đường: {threshold.glucoseMin}-{threshold.glucoseMax}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const thresholdSections = [
    {
      title: t("thresholds.bloodPressure", "Huyết áp tâm thu (mmHg)"),
      minKey: "systolicMin",
      maxKey: "systolicMax",
      step: "1",
    },
    {
      title: t("thresholds.diastolic", "Huyết áp tâm trương (mmHg)"),
      minKey: "diastolicMin",
      maxKey: "diastolicMax",
      step: "1",
    },
    {
      title: t("thresholds.heartRate", "Nhịp tim (bpm)"),
      minKey: "pulseMin",
      maxKey: "pulseMax",
      step: "1",
    },
    {
      title: t("thresholds.respiratory", "Nhịp thở (lần/phút)"),
      minKey: "respiratoryRateMin",
      maxKey: "respiratoryRateMax",
      step: "1",
    },
    {
      title: t("thresholds.temperature", "Nhiệt độ (°C)"),
      minKey: "temperatureMin",
      maxKey: "temperatureMax",
      step: "0.1",
    },
    {
      title: t("thresholds.glucose", "Đường huyết (mg/dL)"),
      minKey: "glucoseMin",
      maxKey: "glucoseMax",
      step: "0.1",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-slate-900">
      <div className="w-full space-y-4 px-4 py-8 pb-24 sm:px-6 lg:px-8">
        {toast && <Toast toast={toast} onClose={hideToast} />}

        {/* Main Content Area */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
            Quản trị ngưỡng cảnh báo
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenCreateForm()}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <FaPlus className="mr-2 h-3.5 w-3.5" /> Tạo cấu hình
            </button>
            <button
              onClick={() => void loadData()}
              disabled={loadingThresholds || loadingPatients}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <FaSyncAlt
                className={`mr-2 h-3.5 w-3.5 ${loadingThresholds ? "animate-spin" : ""}`}
              />{" "}
              Làm mới
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mb-8 grid gap-4 grid-cols-3">
          <StatCard
            label="Bệnh nhân đang quản lý"
            value={patientOptions.length}
            icon={FaUserFriends}
            variant="default"
            loading={loadingPatients}
          />
          <StatCard
            label="Đã có ngưỡng"
            value={activePatients.length}
            icon={FaCheckCircle}
            variant="success"
            loading={loadingThresholds}
          />
          <StatCard
            label="Chưa có ngưỡng"
            value={missingPatients.length}
            icon={FaExclamationTriangle}
            variant={missingPatients.length > 0 ? "warning" : "default"}
            loading={loadingPatients || loadingThresholds}
          />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex space-x-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 p-1 backdrop-blur-sm w-fit border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("MISSING")}
            className={`relative flex items-center rounded-lg px-5 py-2 text-sm font-medium transition-all outline-none ${activeTab === "MISSING" ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
          >
            Cần cấu hình
            {missingPatients.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400 font-bold">
                {missingPatients.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`flex items-center rounded-lg px-5 py-2 text-sm font-medium transition-all outline-none ${activeTab === "ACTIVE" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
          >
            Đã có ngưỡng
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`flex items-center rounded-lg px-5 py-2 text-sm font-medium transition-all outline-none ${activeTab === "HISTORY" ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
          >
            Lịch sử thay đổi
          </button>
        </div>

        {/* Tab Contents */}
        <div className="w-full">
          {loadingPatients || loadingThresholds ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              {activeTab === "MISSING" && (
                <div className="space-y-4">
                  <div className="max-w-md mb-2">
                    <div className="relative">
                      <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc mã bệnh nhân..."
                        value={missingSearchTerm}
                        onChange={(e) => setMissingSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2.5 pl-9 pr-4 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {missingPatients.filter((pt) => {
                      const q = missingSearchTerm.toLowerCase();
                      if (!q) return true;
                      return (
                        (pt.patientName || "").toLowerCase().includes(q) ||
                        (pt.patientCode || "").toLowerCase().includes(q)
                      );
                    }).length === 0 && missingPatients.length > 0 ? (
                      <div className="col-span-full py-8 text-center text-slate-500 dark:text-slate-400">
                        Không tìm thấy bệnh nhân nào khớp với từ khóa "
                        {missingSearchTerm}"
                      </div>
                    ) : missingPatients.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        Tuyệt vời! Tất cả bệnh nhân đều đã được cấu hình ngưỡng.
                      </div>
                    ) : (
                      missingPatients
                        .filter((pt) => {
                          const q = missingSearchTerm.toLowerCase();
                          if (!q) return true;
                          return (
                            (pt.patientName || "").toLowerCase().includes(q) ||
                            (pt.patientCode || "").toLowerCase().includes(q)
                          );
                        })
                        .map((pt) => (
                          <div
                            key={pt.patientId}
                            className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-800 p-5 shadow-sm flex flex-col justify-between h-full"
                          >
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-lg">
                                {pt.patientName || pt.patientId}
                              </h3>
                              {pt.patientCode && (
                                <p className="text-sm text-slate-500 mb-3">
                                  Mã BN: {pt.patientCode}
                                </p>
                              )}
                              <span className="inline-block bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-2 py-1 rounded-md mb-4 font-medium">
                                Chưa có ngưỡng
                              </span>
                            </div>
                            <button
                              onClick={() => handleOpenCreateForm(pt.patientId)}
                              className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-medium transition"
                            >
                              Tạo ngưỡng ngay
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === "ACTIVE" &&
                (() => {
                  const filteredActive = activePatients.filter((pt) => {
                    const q = activeSearchTerm.toLowerCase();
                    if (!q) return true;
                    return (
                      (pt.patientName || "").toLowerCase().includes(q) ||
                      (pt.patientCode || "").toLowerCase().includes(q)
                    );
                  });

                  const ITEMS_PER_PAGE = 10;
                  const totalPages =
                    Math.ceil(filteredActive.length / ITEMS_PER_PAGE) || 1;
                  const paginatedActive = filteredActive.slice(
                    (activeCurrentPage - 1) * ITEMS_PER_PAGE,
                    activeCurrentPage * ITEMS_PER_PAGE,
                  );

                  return (
                    <div className="space-y-4">
                      {/* Search Bar */}
                      {activePatients.length > 0 && (
                        <div className="max-w-md mb-2">
                          <div className="relative">
                            <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Tìm kiếm theo tên hoặc mã bệnh nhân..."
                              value={activeSearchTerm}
                              onChange={(e) => {
                                setActiveSearchTerm(e.target.value);
                                setActiveCurrentPage(1);
                              }}
                              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2.5 pl-9 pr-4 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {activePatients.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                          Chưa có bệnh nhân nào có cấu hình ngưỡng.
                        </div>
                      ) : filteredActive.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                          Không tìm thấy bệnh nhân nào khớp với từ khóa "
                          {activeSearchTerm}"
                        </div>
                      ) : (
                        <>
                          {paginatedActive.map((pt) => {
                            const threshold = activeThresholds.get(
                              pt.patientId,
                            );
                            if (!threshold) return null;
                            return renderActiveCard(
                              threshold,
                              pt.patientName || pt.patientId,
                              pt.patientCode,
                            );
                          })}

                          {totalPages > 1 && (
                            <div className="mt-6 flex justify-center">
                              <Pagination
                                currentPage={activeCurrentPage}
                                totalPages={totalPages}
                                onPageChange={(page) =>
                                  setActiveCurrentPage(page)
                                }
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

              {activeTab === "HISTORY" && (
                <div className="space-y-4">
                  <div className="max-w-md mb-6">
                    <PatientSearchSelect
                      value={filterPatientId}
                      options={historyPatientOptions}
                      onChange={(patientId) => setFilterPatientId(patientId)}
                      placeholder="Lọc theo bệnh nhân..."
                    />
                  </div>

                  {allThresholds
                    .filter((t) => !checkIsActive(t))
                    .filter(
                      (t) =>
                        !filterPatientId || t.patientId === filterPatientId,
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.updatedAt).getTime() -
                        new Date(a.updatedAt).getTime(),
                    )
                    .map((threshold) => {
                      const pt = patientOptions.find(
                        (p) => p.patientId === threshold.patientId,
                      );
                      return renderArchivedCard(
                        threshold,
                        pt?.patientName || threshold.patientId,
                        pt?.patientCode,
                      );
                    })}

                  {allThresholds.filter(
                    (t) =>
                      !checkIsActive(t) &&
                      (!filterPatientId || t.patientId === filterPatientId),
                  ).length === 0 && (
                    <div className="py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      Không có dữ liệu lịch sử.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Form */}
        {isFormVisible && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-6 py-4 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {editingPatientId
                    ? "Chỉnh sửa cấu hình"
                    : "Tạo cấu hình ngưỡng mới"}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsFormVisible(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-8">
                  {/* Patient selection */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Bệnh nhân <span className="text-rose-500">*</span>
                    </label>
                    <PatientSearchSelect
                      value={formData.patientId}
                      options={patientOptions}
                      onChange={(patientId) => {
                        setFormData((current) => ({ ...current, patientId }));
                        setEditingPatientId(null);
                      }}
                      disabled={loadingPatients || Boolean(editingPatientId)}
                      placeholder="Chọn bệnh nhân..."
                    />
                    {editingPatientId && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                        Lưu ý: Bệnh nhân này đã có cấu hình đang áp dụng. Việc
                        lưu cấu hình mới sẽ tự động ngừng hiệu lực cấu hình hiện
                        tại.
                      </p>
                    )}
                    <PatientClinicalSummary patientId={formData.patientId} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {thresholdSections.map((section) => (
                      <div
                        key={section.title}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-5"
                      >
                        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {section.title}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                              Tối thiểu
                            </label>
                            <input
                              type="number"
                              step={section.step}
                              name={section.minKey}
                              value={
                                formData[
                                  section.minKey as keyof ThresholdFormData
                                ]
                              }
                              onChange={handleChange}
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                              Tối đa
                            </label>
                            <input
                              type="number"
                              step={section.step}
                              name={section.maxKey}
                              value={
                                formData[
                                  section.maxKey as keyof ThresholdFormData
                                ]
                              }
                              onChange={handleChange}
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* SpO2 - single value */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-5">
                      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        SpO2 (%)
                      </h3>
                      <div>
                        <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                          Tối thiểu
                        </label>
                        <input
                          type="number"
                          step="1"
                          name="spo2Min"
                          value={formData.spo2Min}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Effective Dates */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 p-5">
                      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Thời gian hiệu lực
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                            Bắt đầu từ
                          </label>
                          <input
                            type="datetime-local"
                            name="effectiveFrom"
                            value={formData.effectiveFrom}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                            Đến khi (Tùy chọn)
                          </label>
                          <input
                            type="datetime-local"
                            name="effectiveTo"
                            value={formData.effectiveTo}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setIsFormVisible(false)}
                      className="rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-600"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? (
                        "Đang lưu..."
                      ) : (
                        <>
                          <FaSave className="mr-2 h-4 w-4" /> Lưu cấu hình
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaChevronLeft, FaChevronRight, FaEdit, FaPlus, FaSave, FaSearch, FaStopCircle, FaTimes, FaUndo, FaSyncAlt } from "react-icons/fa";
import { useTranslation } from "react-i18next";

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

interface PatientSearchSelectProps {
  value: string;
  options: { patientId: string; patientName?: string; patientCode?: string }[];
  onChange: (patientId: string) => void;
  disabled?: boolean;
  loadingLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  className?: string;
}

const PatientSearchSelect = ({
  value,
  options,
  onChange,
  disabled,
  loadingLabel,
  placeholder,
  searchPlaceholder,
  noResultsLabel,
  className,
}: PatientSearchSelectProps) => {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.patientId === value);
  const selectedDisplayText = selected
    ? `${selected.patientName || selected.patientId}${selected.patientCode ? ` • ${selected.patientCode}` : ""}`
    : "";

  // Sync input display with selection when closed
  useEffect(() => {
    if (!open) setInputValue(selectedDisplayText);
  }, [open, selectedDisplayText]);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q || !open) return options;
    return options.filter(
      (o) =>
        (o.patientName || "").toLowerCase().includes(q) ||
        (o.patientCode || "").toLowerCase().includes(q),
    );
  }, [options, inputValue, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFocus = () => {
    setInputValue("");
    setOpen(true);
  };

  const handleSelect = (patientId: string) => {
    onChange(patientId);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <FaSearch className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={disabled ? (loadingLabel ?? placeholder ?? "") : inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          placeholder={open ? (searchPlaceholder ?? "Tìm kiếm...") : (placeholder ?? "")}
          disabled={disabled}
          className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2.5 pl-9 pr-9 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
        />
        <FaChevronDown
          onClick={() => !disabled && (open ? setOpen(false) : inputRef.current?.focus())}
          className={`absolute right-3.5 top-1/2 h-3 w-3 -translate-y-1/2 cursor-pointer text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                {noResultsLabel ?? "Không tìm thấy"}
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.patientId}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(o.patientId)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-blue-50 dark:hover:bg-slate-700 ${
                    o.patientId === value
                      ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "text-gray-700 dark:text-slate-200"
                  }`}
                >
                  <span className="flex-1 truncate">{o.patientName || o.patientId}</span>
                  {o.patientCode && (
                    <span className="shrink-0 text-xs text-slate-400">• {o.patientCode}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const createDefaultFormData = (patientId = ""): ThresholdFormData => ({
  patientId,
  temperatureMin: "36.5",
  temperatureMax: "37.2",
  systolicMin: "90",
  systolicMax: "120",
  diastolicMin: "60",
  diastolicMax: "80",
  pulseMin: "60",
  pulseMax: "90",
  glucoseMin: "70",
  glucoseMax: "125",
  spo2Min: "95",
  respiratoryRateMin: "12",
  respiratoryRateMax: "18",
  effectiveFrom: new Date().toISOString().split("T")[0],
  effectiveTo: "",
});

const toDateInputValue = (value?: string | null) => (value ? value.slice(0, 10) : "");
const toStartOfDayIso = (value: string) => new Date(`${value}T00:00:00`).toISOString();
const toEndOfDayIso = (value: string) => new Date(`${value}T23:59:59`).toISOString();
const toNumber = (value: string) => Number.parseFloat(value || "0");
const HISTORY_PAGE_SIZE = 5;

const ThresholdSettingsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

const formatDateTime = (value?: string | null) => {
  if (!value) return t("thresholds.unlimited");

  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const thresholdSections = [
  {
    title: t("thresholds.temperature"),
    minKey: "temperatureMin" as const,
    maxKey: "temperatureMax" as const,
    step: "0.1",
  },
  {
    title: t("thresholds.systolic"),
    minKey: "systolicMin" as const,
    maxKey: "systolicMax" as const,
    step: "1",
  },
  {
    title: t("thresholds.diastolic"),
    minKey: "diastolicMin" as const,
    maxKey: "diastolicMax" as const,
    step: "1",
  },
  {
    title: t("thresholds.heartRate"),
    minKey: "pulseMin" as const,
    maxKey: "pulseMax" as const,
    step: "1",
  },
  {
    title: t("thresholds.glucose"),
    minKey: "glucoseMin" as const,
    maxKey: "glucoseMax" as const,
    step: "1",
  },
  {
    title: t("thresholds.respiratoryRate"),
    minKey: "respiratoryRateMin" as const,
    maxKey: "respiratoryRateMax" as const,
    step: "1",
  },
];

const buildHistoryChips = (item: ThresholdRecord) => {
  const chips = [
    `HATT: ${item.sysMin}-${item.sysMax}`,
    `HATTr: ${item.diaMin}-${item.diaMax}`,
    `${t("alerts.heartRate")}: ${item.heartRateMin}-${item.heartRateMax}`,
    `${t("alerts.temperature")}: ${item.temperatureMin}-${item.temperatureMax}`,
    `${t("alerts.respiratoryRate")}: ${item.respiratoryRateMin}-${item.respiratoryRateMax}`,
    `SpO2 >= ${item.spo2Min}%`,
  ];

  if (item.glucoseMin != null || item.glucoseMax != null) {
    chips.push(`${t("alerts.glucose")}: ${item.glucoseMin ?? "-"}-${item.glucoseMax ?? "-"}`);
  }

  return chips;
};

  const { toast, showToast, hideToast } = useToast();

  const [patients, setPatients] = useState<AssignmentResponse[]>([]);
  const [formData, setFormData] = useState<ThresholdFormData>(createDefaultFormData());
  const [activeThreshold, setActiveThreshold] = useState<ThresholdRecord | null>(null);
  const [thresholdHistory, setThresholdHistory] = useState<ThresholdRecord[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingThresholds, setLoadingThresholds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const patientOptions = useMemo(() => {
    const patientMap = new Map<string, AssignmentResponse>();

    patients.forEach((item) => {
      if (!patientMap.has(item.patientId)) {
        patientMap.set(item.patientId, item);
      }
    });

    return Array.from(patientMap.values()).sort((left, right) =>
      (left.patientName || "").localeCompare(right.patientName || "")
    );
  }, [patients]);

  const selectedPatient = useMemo(
    () => patientOptions.find((item) => item.patientId === formData.patientId) || null,
    [formData.patientId, patientOptions]
  );

  const modeLabel = editingThresholdId ? t("thresholds.updateCurrent") : t("thresholds.createNew");
  const reusableHistoryCount = thresholdHistory.filter((item) => item.id !== activeThreshold?.id).length;
  const totalHistoryPages = Math.max(1, Math.ceil(thresholdHistory.length / HISTORY_PAGE_SIZE));
  const paginatedHistory = useMemo(() => {
    const startIndex = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return thresholdHistory.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);
  }, [historyPage, thresholdHistory]);

  const applyThresholdToForm = (threshold: ThresholdRecord, mode: "edit" | "clone" = "edit") => {
    setFormData({
      patientId: threshold.patientId,
      temperatureMin: String(threshold.temperatureMin),
      temperatureMax: String(threshold.temperatureMax),
      systolicMin: String(threshold.sysMin),
      systolicMax: String(threshold.sysMax),
      diastolicMin: String(threshold.diaMin),
      diastolicMax: String(threshold.diaMax),
      pulseMin: String(threshold.heartRateMin),
      pulseMax: String(threshold.heartRateMax),
      glucoseMin: threshold.glucoseMin != null ? String(threshold.glucoseMin) : "",
      glucoseMax: threshold.glucoseMax != null ? String(threshold.glucoseMax) : "",
      spo2Min: String(threshold.spo2Min),
      respiratoryRateMin: String(threshold.respiratoryRateMin),
      respiratoryRateMax: String(threshold.respiratoryRateMax),
      effectiveFrom:
        mode === "clone" ? new Date().toISOString().split("T")[0] : toDateInputValue(threshold.effectiveFrom),
      effectiveTo: mode === "clone" ? "" : toDateInputValue(threshold.effectiveTo),
    });
    setEditingThresholdId(mode === "edit" ? threshold.id : null);
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = (patientId = formData.patientId) => {
    setFormData(createDefaultFormData(patientId));
    setEditingThresholdId(null);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    resetForm();
  };

  const handleOpenCreateForm = () => {
    if (!formData.patientId) {
      showToast(t("thresholds.patientRequired"), "error");
      return;
    }
    // Force create new - clear editing mode
    setFormData(createDefaultFormData(formData.patientId));
    setEditingThresholdId(null);
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = (): ThresholdPayload | null => {
    if (!user?.id) {
      showToast(t("profile.loadingError"), "error");
      return null;
    }

    if (!formData.patientId) {
      showToast(t("thresholds.patientRequired"), "error");
      return null;
    }

    const startDate = new Date(`${formData.effectiveFrom}T00:00:00`);
    const now = new Date();

    if (startDate.getTime() > now.getTime() && !editingThresholdId) {
      showToast(
        t("thresholds.futureStartDate"),
        "error"
      );
      return null;
    }

    if (formData.effectiveTo) {
      const endDate = new Date(`${formData.effectiveTo}T23:59:59`);
      if (endDate.getTime() < startDate.getTime()) {
        showToast(t("thresholds.endDateBeforeStart"), "error");
        return null;
      }
    }

    // Validate min/max thresholds
    const temperatureMin = toNumber(formData.temperatureMin);
    const temperatureMax = toNumber(formData.temperatureMax);
    if (temperatureMin >= temperatureMax) {
      showToast(t("thresholds.temperatureMinMax"), "error");
      return null;
    }

    const systolicMin = toNumber(formData.systolicMin);
    const systolicMax = toNumber(formData.systolicMax);
    if (systolicMin >= systolicMax) {
      showToast(t("thresholds.systolicMinMax"), "error");
      return null;
    }

    const diastolicMin = toNumber(formData.diastolicMin);
    const diastolicMax = toNumber(formData.diastolicMax);
    if (diastolicMin >= diastolicMax) {
      showToast(t("thresholds.diastolicMinMax"), "error");
      return null;
    }

    const pulseMin = toNumber(formData.pulseMin);
    const pulseMax = toNumber(formData.pulseMax);
    if (pulseMin >= pulseMax) {
      showToast(t("thresholds.heartRateMinMax"), "error");
      return null;
    }

    const respiratoryRateMin = toNumber(formData.respiratoryRateMin);
    const respiratoryRateMax = toNumber(formData.respiratoryRateMax);
    if (respiratoryRateMin >= respiratoryRateMax) {
      showToast(t("thresholds.respiratoryRateMinMax"), "error");
      return null;
    }

    // Validate glucose if both values are provided
    if (formData.glucoseMin && formData.glucoseMax) {
      const glucoseMin = toNumber(formData.glucoseMin);
      const glucoseMax = toNumber(formData.glucoseMax);
      if (glucoseMin >= glucoseMax) {
        showToast(t("thresholds.glucoseMinMax"), "error");
        return null;
      }
    }

    return {
      patientId: formData.patientId,
      doctorId: user.id,
      temperatureMin,
      temperatureMax,
      heartRateMin: pulseMin,
      heartRateMax: pulseMax,
      respiratoryRateMin,
      respiratoryRateMax,
      spo2Min: toNumber(formData.spo2Min),
      sysMin: systolicMin,
      sysMax: systolicMax,
      diaMin: diastolicMin,
      diaMax: diastolicMax,
      glucoseMin: formData.glucoseMin ? toNumber(formData.glucoseMin) : null,
      glucoseMax: formData.glucoseMax ? toNumber(formData.glucoseMax) : null,
      effectiveFrom: toStartOfDayIso(formData.effectiveFrom),
      effectiveTo: formData.effectiveTo ? toEndOfDayIso(formData.effectiveTo) : null,
    };
  };

  const loadPatientThresholds = async (patientId: string) => {
    if (!patientId || !user?.id) {
      setActiveThreshold(null);
      setThresholdHistory([]);
      setEditingThresholdId(null);
      setHistoryPage(1);
      return;
    }

    try {
      setLoadingThresholds(true);
      const [latest, history] = await Promise.all([
        getThresholds({ patientId, doctorId: user.id, latest: true }),
        getThresholds({ patientId, doctorId: user.id }),
      ]);

      const latestThreshold = latest[0] || null;
      setActiveThreshold(latestThreshold);
      setThresholdHistory(history);
      setHistoryPage(1);

      // Don't auto-open modal or change form when loading thresholds
      // User needs to explicitly click "Edit" or "Create" button
    } catch (error) {
      console.error("Failed to load thresholds", error);
      showToast(t("common.error"), "error");
    } finally {
      setLoadingThresholds(false);
    }
  };

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoadingPatients(true);
        const response = await getMyPatients();
        setPatients(response);
      } catch (error) {
        console.error("Failed to load patients", error);
        showToast(t("profile.loadingError"), "error");
      } finally {
        setLoadingPatients(false);
      }
    };

    void loadPatients();
  }, []);

  useEffect(() => {
    if (!formData.patientId) {
      setActiveThreshold(null);
      setThresholdHistory([]);
      setEditingThresholdId(null);
      setHistoryPage(1);
      return;
    }

    void loadPatientThresholds(formData.patientId);
  }, [formData.patientId, user?.id]);

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload = buildPayload();
    if (!payload) return;

    try {
      setSaving(true);

      if (editingThresholdId) {
        await updateThreshold(editingThresholdId, payload);
        showToast(t("thresholds.updateSuccess"), "success");
      } else {
        await createThreshold(payload);
        showToast(t("thresholds.createSuccess"), "success");
      }

      await loadPatientThresholds(payload.patientId);
    } catch (error: any) {
      console.error("Failed to save threshold", error);
      showToast(error?.response?.data?.error || t("thresholds.saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveActiveThreshold = async () => {
    if (!activeThreshold || !user?.id) return;

    const confirmed = window.confirm(
      t("thresholds.stopConfirm")
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      await updateThreshold(activeThreshold.id, {
        patientId: activeThreshold.patientId,
        doctorId: activeThreshold.doctorId,
        temperatureMin: activeThreshold.temperatureMin,
        temperatureMax: activeThreshold.temperatureMax,
        heartRateMin: activeThreshold.heartRateMin,
        heartRateMax: activeThreshold.heartRateMax,
        respiratoryRateMin: activeThreshold.respiratoryRateMin,
        respiratoryRateMax: activeThreshold.respiratoryRateMax,
        spo2Min: activeThreshold.spo2Min,
        sysMin: activeThreshold.sysMin,
        sysMax: activeThreshold.sysMax,
        diaMin: activeThreshold.diaMin,
        diaMax: activeThreshold.diaMax,
        glucoseMin: activeThreshold.glucoseMin,
        glucoseMax: activeThreshold.glucoseMax,
        effectiveFrom: activeThreshold.effectiveFrom,
        effectiveTo: new Date().toISOString(),
      });

      showToast(t("thresholds.stopSuccess"), "success");
      await loadPatientThresholds(activeThreshold.patientId);
      setFormData(createDefaultFormData(activeThreshold.patientId));
    } catch (error: any) {
      console.error("Failed to archive threshold", error);
      showToast(error?.response?.data?.error || t("thresholds.stopError"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t("thresholds.title")}</h1>
          <p className="mt-1 text-base text-slate-500 dark:text-slate-400">{t("thresholds.description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <FaPlus className="mr-2 h-3 w-3" />{t("thresholds.createConfig")}
          </button>
          <button
            type="button"
            onClick={() => formData.patientId && void loadPatientThresholds(formData.patientId)}
            disabled={loadingThresholds || !formData.patientId}
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaSyncAlt className={`mr-2 h-3 w-3 ${loadingThresholds ? "animate-spin" : ""}`} />{t("common.refresh")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {[
          { label: t("thresholds.managedPatients"), value: patientOptions.length },
          { label: t("thresholds.activeConfigs"), value: activeThreshold ? 1 : 0 },
          { label: t("thresholds.historyConfigs"), value: reusableHistoryCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4">
            <div className="text-sm font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
          </div>
        ))}
      </div>

      {/* Patient selector */}
      <div className="mb-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4">
        <label className="mb-2 block text-base font-medium text-slate-700 dark:text-slate-300">{t("thresholds.filterByPatient")}</label>
        <PatientSearchSelect
          value={formData.patientId}
          options={patientOptions}
          onChange={(patientId) => setFormData(createDefaultFormData(patientId))}
          disabled={loadingPatients}
          loadingLabel={t("thresholds.loadingPatients")}
          placeholder={t("thresholds.selectPatient")}
          searchPlaceholder={t("thresholds.searchPatient")}
          noResultsLabel={t("thresholds.noPatientFound")}
        />
      </div>

      {/* Config list */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("thresholds.configList")}</h2>
            <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">{t("thresholds.configListDesc")}</p>
          </div>
          <span className="text-sm text-slate-400 dark:text-slate-500">
            {thresholdHistory.length} {t("thresholds.configsCount")}
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {loadingThresholds && (
            <div className="px-5 py-8 text-base text-slate-400 dark:text-slate-500">{t("thresholds.loadingConfigs")}</div>
          )}
          {!loadingThresholds && !formData.patientId && (
            <div className="px-5 py-8 text-base text-slate-400 dark:text-slate-500">{t("thresholds.selectPatientFirst")}</div>
          )}
          {!loadingThresholds && formData.patientId && thresholdHistory.length === 0 && (
            <div className="px-5 py-8 text-base text-slate-400 dark:text-slate-500">{t("thresholds.noConfigs")}</div>
          )}

          {paginatedHistory.map((threshold, index) => {
            const absoluteIndex = (historyPage - 1) * HISTORY_PAGE_SIZE + index;
            const isActive = threshold.id === activeThreshold?.id;
            const canEdit = isActive;

            return (
              <div key={threshold.id} className="px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    {/* Status + version */}
                    <div className="flex flex-wrap items-center gap-3">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {t("thresholds.currentlyActive")}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500">{t("thresholds.history")}</span>
                      )}
                      <span className="text-sm text-slate-400 dark:text-slate-500">
                        {t("thresholds.configVersion")} #{thresholdHistory.length - absoluteIndex}
                      </span>
                    </div>

                    {/* Patient name */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-base font-medium text-slate-800 dark:text-slate-100">
                        {selectedPatient?.patientName || threshold.patientId}
                      </span>
                      {selectedPatient?.patientCode && (
                        <span className="text-sm text-slate-400 dark:text-slate-500">{selectedPatient.patientCode}</span>
                      )}
                    </div>

                    {/* Threshold chips */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {buildHistoryChips(threshold).map((chip, idx) => (
                        <span
                          key={`${threshold.id}-chip-${idx}`}
                          className="rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 text-sm text-slate-600 dark:text-slate-300"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>

                    {/* Date info */}
                    <div className="mt-3 flex flex-wrap gap-5 text-sm">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500">{t("thresholds.validFrom")}: </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateTime(threshold.effectiveFrom)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500">{t("thresholds.validTo")}: </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateTime(threshold.effectiveTo)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500">{t("thresholds.updated")}: </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateTime(threshold.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => applyThresholdToForm(threshold, "edit")}
                      disabled={!canEdit || saving}
                      className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FaEdit className="mr-1.5 h-3 w-3" />{t("thresholds.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyThresholdToForm(threshold, "clone")}
                      disabled={saving}
                      className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FaPlus className="mr-1.5 h-3 w-3" />{t("thresholds.copy")}
                    </button>
                    {isActive && (
                      <button
                        type="button"
                        onClick={handleArchiveActiveThreshold}
                        disabled={saving}
                        className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <FaStopCircle className="mr-1.5 h-3 w-3" />{t("thresholds.stopValidity")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalHistoryPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 px-5 py-3">
            <span className="text-sm text-slate-400 dark:text-slate-500">
              {t("common.page")} {historyPage}/{totalHistoryPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaChevronLeft className="mr-1 h-2.5 w-2.5" />{t("common.previous")}
              </button>
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                disabled={historyPage === totalHistoryPages}
                className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-600 px-2.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("common.next")}<FaChevronRight className="ml-1 h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form modal */}
      {isFormVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={handleCloseForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="threshold-form-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-5 py-3.5">
              <h2 id="threshold-form-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {modeLabel}
              </h2>
              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[calc(90vh-120px)] overflow-y-auto px-5 py-4 space-y-4">
                {/* Patient */}
                <div>
                  <label className="mb-1.5 block text-base font-medium text-slate-700 dark:text-slate-300">
                    {t("alerts.patient")} <span className="text-red-400">*</span>
                  </label>
                  <PatientSearchSelect
                    value={formData.patientId}
                    options={patientOptions}
                    onChange={(patientId) => {
                      setFormData((current) => ({ ...current, patientId }));
                      setEditingThresholdId(null);
                    }}
                    disabled={loadingPatients || Boolean(editingThresholdId)}
                    loadingLabel={t("thresholds.loadingPatients")}
                    placeholder={t("thresholds.selectPatient")}
                    searchPlaceholder={t("thresholds.searchPatient")}
                    noResultsLabel={t("thresholds.noPatientFound")}
                  />
                </div>

                {/* Threshold sections — 2-col grid */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {thresholdSections.map((section) => (
                    <div key={section.title} className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {section.title}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-sm text-slate-400 dark:text-slate-500">{t("thresholds.minimum")}</label>
                          <input
                            type="number"
                            step={section.step}
                            name={section.minKey}
                            value={formData[section.minKey]}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-slate-400 dark:text-slate-500">{t("thresholds.maximum")}</label>
                          <input
                            type="number"
                            step={section.step}
                            name={section.maxKey}
                            value={formData[section.maxKey]}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* SpO2 */}
                  <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">SpO2 (%)</h3>
                    <div>
                      <label className="mb-1 block text-sm text-slate-400 dark:text-slate-500">{t("thresholds.minimum")}</label>
                      <input
                        type="number"
                        name="spo2Min"
                        value={formData.spo2Min}
                        onChange={handleChange}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                      />
                    </div>
                  </div>

                  {/* Validity period */}
                  <div className="rounded-lg border border-slate-100 dark:border-slate-700 p-4 sm:col-span-2">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("thresholds.validityPeriod")}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm text-slate-400 dark:text-slate-500">
                          {t("thresholds.fromDate")} <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="date"
                          name="effectiveFrom"
                          value={formData.effectiveFrom}
                          onChange={handleChange}
                          required
                          className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-400 dark:text-slate-500">{t("thresholds.toDate")}</label>
                        <input
                          type="date"
                          name="effectiveTo"
                          value={formData.effectiveTo}
                          onChange={handleChange}
                          className="w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 px-5 py-3">
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <FaUndo className="mr-1.5 h-3 w-3" />{t("common.reset")}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="rounded-md border border-slate-200 dark:border-slate-600 px-3.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.patientId || saving}
                    className="inline-flex items-center rounded-md bg-slate-900 dark:bg-slate-100 px-4 py-1.5 text-sm font-medium text-white dark:text-slate-900 transition hover:bg-slate-700 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaSave className="mr-1.5 h-3 w-3" />
                    {saving ? t("thresholds.saving") : editingThresholdId ? t("thresholds.updateConfig") : t("thresholds.saveConfig")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
};

export default ThresholdSettingsPage;

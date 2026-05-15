import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaEdit, FaPlus, FaSave, FaStopCircle, FaTimes, FaUndo, FaSyncAlt } from "react-icons/fa";
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

  const handlePatientFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const patientId = event.target.value;
    setFormData(createDefaultFormData(patientId));
    // This will trigger useEffect to load thresholds for the new patient
  };

  const handlePatientChangeInModal = (event: ChangeEvent<HTMLSelectElement>) => {
    const patientId = event.target.value;
    // When changing patient in modal, switch to create mode
    // (can't edit patient A's threshold for patient B)
    setFormData((current) => ({
      ...current,
      patientId: patientId,
    }));
    setEditingThresholdId(null); // Switch to create mode
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
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{t("thresholds.title")}</h1>
          <p className="mt-2 max-w-3xl text-gray-600 dark:text-slate-400">{t("thresholds.description")}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <FaPlus className="mr-2" />{t("thresholds.createConfig")}</button>
          <button
            type="button"
            onClick={() => formData.patientId && void loadPatientThresholds(formData.patientId)}
            disabled={loadingThresholds || !formData.patientId}
            className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSyncAlt
              className={`mr-2 ${loadingThresholds ? "animate-spin" : ""}`}
            />{t("common.refresh")}</button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-slate-400">{t("thresholds.managedPatients")}</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">{patientOptions.length}</div>
        </div>
        <div className="rounded-2xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-4 shadow-sm">
          <div className="text-sm text-blue-700 dark:text-blue-300">{t("thresholds.activeConfigs")}</div>
          <div className="mt-2 text-3xl font-bold text-blue-800 dark:text-blue-200">{activeThreshold ? 1 : 0}</div>
        </div>
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-4 shadow-sm">
          <div className="text-sm text-indigo-700 dark:text-indigo-300">{t("thresholds.historyConfigs")}</div>
          <div className="mt-2 text-3xl font-bold text-indigo-800 dark:text-indigo-200">{reusableHistoryCount}</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("thresholds.filterByPatient")}</label>
        <select
          name="patientId"
          value={formData.patientId}
          onChange={handlePatientFilterChange}
          disabled={loadingPatients}
          className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            {loadingPatients ? t("thresholds.loadingPatients") : t("thresholds.selectPatient")}
          </option>
          {patientOptions.map((patient) => (
            <option key={patient.patientId} value={patient.patientId}>
              {patient.patientName || patient.patientId}
              {patient.patientCode ? ` • ${patient.patientCode}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">{t("thresholds.configList")}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t("thresholds.configListDesc")}</p>
          </div>
          <div className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {thresholdHistory.length} {t("thresholds.configsCount")}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loadingThresholds && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">{t("thresholds.loadingConfigs")}</div>
          )}

          {!loadingThresholds && !formData.patientId && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">{t("thresholds.selectPatientFirst")}</div>
          )}

          {!loadingThresholds && formData.patientId && thresholdHistory.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">{t("thresholds.noConfigs")}</div>
          )}

          {paginatedHistory.map((threshold, index) => {
            const absoluteIndex = (historyPage - 1) * HISTORY_PAGE_SIZE + index;
            const isActive = threshold.id === activeThreshold?.id;
            const canEdit = isActive;

            return (
              <div
                key={threshold.id}
                className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {isActive ? t("thresholds.currentlyActive") : t("thresholds.history")}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                        {t("thresholds.configVersion")} #{thresholdHistory.length - absoluteIndex}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-semibold text-gray-900 dark:text-slate-100">
                        {selectedPatient?.patientName || threshold.patientId}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-gray-500 dark:text-slate-400">
                        {selectedPatient?.patientCode || t("common.notUpdated")}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {buildHistoryChips(threshold).map((chip, idx) => (
                        <span
                          key={`${threshold.id}-chip-${idx}`}
                          className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-slate-300"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("thresholds.validFrom")}</div>
                        <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {formatDateTime(threshold.effectiveFrom)}
                        </div>
                      </div>

                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("thresholds.validTo")}</div>
                        <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {formatDateTime(threshold.effectiveTo)}
                        </div>
                      </div>

                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("thresholds.updated")}</div>
                        <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {formatDateTime(threshold.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => applyThresholdToForm(threshold, "edit")}
                      disabled={!canEdit || saving}
                      className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaEdit className="mr-2" />{t("thresholds.edit")}</button>

                    <button
                      type="button"
                      onClick={() => applyThresholdToForm(threshold, "clone")}
                      disabled={saving}
                      className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaPlus className="mr-2" />{t("thresholds.copy")}</button>

                    {isActive && (
                      <button
                        type="button"
                        onClick={handleArchiveActiveThreshold}
                        disabled={saving}
                        className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaStopCircle className="mr-2" />{t("thresholds.stopValidity")}</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalHistoryPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t("common.page")} {historyPage}/{totalHistoryPages}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                disabled={historyPage === 1}
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaChevronLeft className="mr-1" />{t("common.previous")}</button>
              
              <button
                type="button"
                onClick={() => setHistoryPage((current) => Math.min(totalHistoryPages, current + 1))}
                disabled={historyPage === totalHistoryPages}
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
                <FaChevronRight className="ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isFormVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCloseForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="threshold-form-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <h2
                id="threshold-form-title"
                className="text-lg font-semibold text-gray-900 dark:text-slate-100"
              >
                {modeLabel}
              </h2>
              <button
                type="button"
                onClick={handleCloseForm}
                className="p-2 items-center rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[calc(92vh-140px)] overflow-y-auto px-4 py-4">
                <div className="grid gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      {t("alerts.patient")} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="patientId"
                      value={formData.patientId}
                      onChange={handlePatientChangeInModal}
                      disabled={loadingPatients || Boolean(editingThresholdId)}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <option value="">
                        {loadingPatients
                          ? t("thresholds.loadingPatients")
                          : t("thresholds.selectPatient")}
                      </option>
                      {patientOptions.map((patient) => (
                        <option
                          key={patient.patientId}
                          value={patient.patientId}
                        >
                          {(patient.patientName || patient.patientId) +
                            (patient.patientCode
                              ? ` • ${patient.patientCode}`
                              : "")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {thresholdSections.map((section) => (
                    <div key={section.title}>
                      <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-slate-100">
                        {section.title}
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">{t("thresholds.minimum")}</label>
                          <input
                            type="number"
                            step={section.step}
                            name={section.minKey}
                            value={formData[section.minKey]}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">{t("thresholds.maximum")}</label>
                          <input
                            type="number"
                            step={section.step}
                            name={section.maxKey}
                            value={formData[section.maxKey]}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div>
                    <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-slate-100">
                      SpO2 (%)
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">{t("thresholds.minimum")}</label>
                        <input
                          type="number"
                          name="spo2Min"
                          value={formData.spo2Min}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-base font-semibold text-gray-800 dark:text-slate-100">{t("thresholds.validityPeriod")}</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">{t("thresholds.fromDate")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="effectiveFrom"
                          value={formData.effectiveFrom}
                          onChange={handleChange}
                          required
                          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">{t("thresholds.toDate")}</label>
                        <input
                          type="date"
                          name="effectiveTo"
                          value={formData.effectiveTo}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-700 px-4 py-3">
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <FaUndo className="mr-2" />{t("common.reset")}</button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >{t("common.cancel")}</button>
                  <button
                    type="submit"
                    disabled={!formData.patientId || saving}
                    className="inline-flex items-center rounded-lg bg-slate-800 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 transition hover:bg-slate-700 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600 dark:disabled:text-slate-100"
                  >
                    <FaSave className="mr-2" />
                    {saving
                      ? t("thresholds.saving")
                      : editingThresholdId
                        ? t("thresholds.updateConfig")
                        : t("thresholds.saveConfig")}
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

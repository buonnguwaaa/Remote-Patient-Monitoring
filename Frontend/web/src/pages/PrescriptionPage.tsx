import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaChevronDown,
  FaChevronRight,
  FaChevronLeft,
  FaEdit,
  FaNotesMedical,
  FaPlus,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";
import { MdOutlineNotificationsActive } from "react-icons/md";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { getMyPatients } from "../services/patientService";
import { getReminders, type ReminderRecord } from "../services/reminderService";
import {
  getPrescriptions,
  createPrescription,
  updatePrescription,
  updatePrescriptionStatus,
  getMedicationAdherence,
  toStartOfDayIso,
  toEndOfDayIso,
} from "../services/prescriptionService";
import type { AssignmentResponse } from "../types/patient";
import type {
  Prescription,
  PrescriptionStatus,
  MedicationDose,
  TimeOfDay,
  MealTiming,
  MedicationAdherence,
} from "../types/index";

// ---- Constants ----
const WEEKDAY_OPTIONS = [
  { value: 1, labelKey: "prescriptions.mon" },
  { value: 2, labelKey: "prescriptions.tue" },
  { value: 3, labelKey: "prescriptions.wed" },
  { value: 4, labelKey: "prescriptions.thu" },
  { value: 5, labelKey: "prescriptions.fri" },
  { value: 6, labelKey: "prescriptions.sat" },
  { value: 0, labelKey: "prescriptions.sun" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Saigon", label: "Asia/Saigon (Khuyến nghị)" },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok" },
];

const STATUS_OPTIONS: Array<{ value: PrescriptionStatus | ""; labelKey: string }> = [
  { value: "", labelKey: "prescriptions.allStatuses" },
  { value: "active", labelKey: "prescriptions.active" },
  { value: "completed", labelKey: "prescriptions.completed" },
  { value: "discontinued", labelKey: "prescriptions.discontinued" },
  { value: "expired", labelKey: "prescriptions.expired" },
];

const ADHERENCE_RANGES = [
  { value: 7, labelKey: "prescriptions.last7Days" },
  { value: 14, labelKey: "prescriptions.last14Days" },
  { value: 30, labelKey: "prescriptions.last30Days" },
];

const ITEMS_PER_PAGE = 5;

// ---- Form Types ----
interface DoseFormData {
  timeOfDay: TimeOfDay;
  customTime: string; // "HH:MM"
  mealTiming: MealTiming | "";
  pillCount: number;
}

interface MedicationFormData {
  drugName: string;
  dosage: string;
  route: string;
  instructions: string;
  schedule: DoseFormData[];
}

interface PrescriptionFormData {
  patientId: string;
  medications: MedicationFormData[];
  timezone: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string;
}

const createDefaultDose = (): DoseFormData => ({
  timeOfDay: "morning",
  customTime: "",
  mealTiming: "",
  pillCount: 1,
});

const createDefaultMedication = (): MedicationFormData => ({
  drugName: "",
  dosage: "",
  route: "",
  instructions: "",
  schedule: [createDefaultDose()],
});

const createDefaultFormData = (patientId = ""): PrescriptionFormData => {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);
  
  const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  const endDateStr = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split("T")[0];

  return {
    patientId,
    medications: [createDefaultMedication()],
    timezone: "Asia/Saigon",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: todayStr,
    endDate: endDateStr,
  };
};

// ---- Helper functions ----
const formatDate = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

const formatTime = (h: number, m: number) =>
  `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const buildWeekdaySummary = (days: number[], t: (key: string) => string) => {
  if (days.length === 7) return "Mỗi ngày";
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order
    .filter((d) => days.includes(d))
    .map((d) => {
      const opt = WEEKDAY_OPTIONS.find((o) => o.value === d);
      return opt ? t(opt.labelKey) : "";
    })
    .join(" • ");
};

const prescriptionFromForm = (form: PrescriptionFormData) => {
  const meds = form.medications.map((med) => {
    const schedule = med.schedule.map((dose) => {
      const dosePayload: {
        timeOfDay: TimeOfDay;
        hour?: number;
        minute?: number;
        mealTiming?: MealTiming;
        pillCount: number;
      } = {
        timeOfDay: dose.timeOfDay,
        pillCount: dose.pillCount,
      };
      if (dose.customTime) {
        const [h, m] = dose.customTime.split(":").map(Number);
        if (!Number.isNaN(h) && !Number.isNaN(m)) {
          dosePayload.hour = h;
          dosePayload.minute = m;
        }
      }
      if (dose.mealTiming) {
        dosePayload.mealTiming = dose.mealTiming as MealTiming;
      }
      return dosePayload;
    });
    return {
      drugName: med.drugName.trim(),
      dosage: med.dosage.trim(),
      route: med.route.trim() || undefined,
      instructions: med.instructions.trim() || undefined,
      schedule,
    };
  });

  return {
    patientId: form.patientId,
    medications: meds,
    timezone: form.timezone,
    daysOfWeek: [...form.daysOfWeek].sort((a, b) => a - b),
    startDate: toStartOfDayIso(form.startDate),
    endDate: form.endDate ? toEndOfDayIso(form.endDate) : undefined,
  };
};

// Pre-fill form from existing prescription
const formFromPrescription = (p: Prescription): PrescriptionFormData => {
  const meds: MedicationFormData[] = p.medications.map((med) => ({
    drugName: med.drugName,
    dosage: med.dosage,
    route: med.route ?? "",
    instructions: med.instructions ?? "",
    schedule: med.schedule.map((dose) => ({
      timeOfDay: dose.timeOfDay,
      customTime:
        dose.hour !== undefined && dose.minute !== undefined
          ? formatTime(dose.hour, dose.minute)
          : "",
      mealTiming: (dose.mealTiming as MealTiming | "") ?? "",
      pillCount: dose.pillCount,
    })),
  }));

  return {
    patientId: p.patientId,
    medications: meds,
    timezone: p.timezone,
    daysOfWeek: p.daysOfWeek,
    startDate: p.startDate.split("T")[0],
    endDate: p.endDate ? p.endDate.split("T")[0] : "",
  };
};

// ---- Status styles ----
const getStatusClasses = (status: PrescriptionStatus) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "completed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "discontinued":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    case "expired":
      return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
};

const getAdherenceSlotClasses = (status: string) => {
  switch (status) {
    case "taken":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "missed":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400";
  }
};

// ---- Main Component ----
export default function PrescriptionPage() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { toast, showToast, hideToast } = useToast();

  const initialPatientId = searchParams.get("patientId") ?? "";

  // ---- State ----
  const [patients, setPatients] = useState<AssignmentResponse[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | "">("");
  const [adherenceDays, setAdherenceDays] = useState(7);

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [adherence, setAdherence] = useState<MedicationAdherence | null>(null);

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [loadingAdherence, setLoadingAdherence] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PrescriptionFormData>(
    createDefaultFormData(initialPatientId)
  );

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedAdherenceDays, setExpandedAdherenceDays] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Flow panel state — track after last create
  const [lastCreatedPrescriptionId, setLastCreatedPrescriptionId] = useState<string | null>(null);

  // ---- Derived ----
  const patientOptions = useMemo(() => {
    const map = new Map<string, AssignmentResponse>();
    patients.forEach((p) => {
      if (!map.has(p.patientId)) map.set(p.patientId, p);
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.patientName || "").localeCompare(b.patientName || "")
    );
  }, [patients]);

  const patientDisplayMap = useMemo(() => {
    return new Map(
      patientOptions.map((p) => [
        p.patientId,
        {
          name: p.patientName || p.patientId,
          code: p.patientCode || p.patientPublicId || t("common.notUpdated"),
        },
      ])
    );
  }, [patientOptions, t]);

  const totalPages = Math.ceil(prescriptions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentPrescriptions = prescriptions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const remindersByPrescription = useMemo(() => {
    const map = new Map<string, ReminderRecord[]>();
    const noPrescription: ReminderRecord[] = [];
    for (const r of reminders) {
      if (r.prescriptionId) {
        const list = map.get(r.prescriptionId) ?? [];
        list.push(r);
        map.set(r.prescriptionId, list);
      } else {
        noPrescription.push(r);
      }
    }
    return { byPrescription: map, noPrescription };
  }, [reminders]);

  // Flow verification
  const flowStep1 = lastCreatedPrescriptionId !== null;
  const flowStep2 = flowStep1 && reminders.some((r) => r.prescriptionId === lastCreatedPrescriptionId);
  const flowStep3 = flowStep1 && (adherence?.summary.expected ?? 0) > 0;

  // ---- Data loading ----
  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const list = await getMyPatients();
      setPatients(list);
    } catch {
      showToast("Không thể tải danh sách bệnh nhân.", "error");
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadPrescriptions = useCallback(async () => {
    if (!selectedPatientId && patientOptions.length === 0) return;
    try {
      setLoadingPrescriptions(true);
      let results: Prescription[] = [];
      if (selectedPatientId) {
        results = await getPrescriptions({
          patientId: selectedPatientId,
          status: statusFilter || undefined,
        });
      } else {
        const groups = await Promise.all(
          patientOptions.map((p) =>
            getPrescriptions({ patientId: p.patientId, status: statusFilter || undefined })
          )
        );
        const merged = groups.flat();
        results = Array.from(new Map(merged.map((p) => [p.id, p])).values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      setPrescriptions(results);
      setCurrentPage(1);
    } catch {
      showToast("Không thể tải danh sách đơn thuốc.", "error");
    } finally {
      setLoadingPrescriptions(false);
    }
  }, [selectedPatientId, statusFilter, patientOptions]);

  const loadReminders = useCallback(async () => {
    if (!selectedPatientId) {
      setReminders([]);
      return;
    }
    try {
      setLoadingReminders(true);
      const list = await getReminders({ patientId: selectedPatientId, kind: "medication" });
      setReminders(list);
    } catch {
      showToast("Không thể tải nhắc nhở thuốc.", "error");
    } finally {
      setLoadingReminders(false);
    }
  }, [selectedPatientId]);

  const loadAdherence = useCallback(async () => {
    if (!selectedPatientId) {
      setAdherence(null);
      return;
    }
    try {
      setLoadingAdherence(true);
      const data = await getMedicationAdherence({
        patientId: selectedPatientId,
        days: adherenceDays,
      });
      setAdherence(data);
    } catch {
      showToast("Không thể tải lịch sử uống thuốc.", "error");
    } finally {
      setLoadingAdherence(false);
    }
  }, [selectedPatientId, adherenceDays]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPrescriptions(), loadReminders(), loadAdherence()]);
  }, [loadPrescriptions, loadReminders, loadAdherence]);

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    if (!loadingPatients && patientOptions.length > 0) {
      void refreshAll();
    }
  }, [loadingPatients, patientOptions.length, selectedPatientId, statusFilter, adherenceDays]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPatientId, statusFilter]);

  // ---- Form handlers ----
  const handleOpenCreate = () => {
    setFormData(createDefaultFormData(selectedPatientId));
    setEditingPrescriptionId(null);
    setIsFormVisible(true);
  };

  const handleOpenEdit = (prescription: Prescription) => {
    setFormData(formFromPrescription(prescription));
    setEditingPrescriptionId(prescription.id);
    setIsFormVisible(true);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingPrescriptionId(null);
  };

  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleWeekday = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  // Medication handlers
  const handleAddMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [...prev.medications, createDefaultMedication()],
    }));
  };

  const handleRemoveMedication = (medIdx: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== medIdx),
    }));
  };

  const handleMedChange = (
    medIdx: number,
    field: keyof Omit<MedicationFormData, "schedule">,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === medIdx ? { ...med, [field]: value } : med
      ),
    }));
  };

  // Dose handlers
  const handleAddDose = (medIdx: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === medIdx
          ? { ...med, schedule: [...med.schedule, createDefaultDose()] }
          : med
      ),
    }));
  };

  const handleRemoveDose = (medIdx: number, doseIdx: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === medIdx
          ? { ...med, schedule: med.schedule.filter((_, j) => j !== doseIdx) }
          : med
      ),
    }));
  };

  const handleDoseChange = (
    medIdx: number,
    doseIdx: number,
    field: keyof DoseFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === medIdx
          ? {
              ...med,
              schedule: med.schedule.map((dose, j) =>
                j === doseIdx ? { ...dose, [field]: value } : dose
              ),
            }
          : med
      ),
    }));
  };

  // ---- Validation ----
  const validateForm = (): boolean => {
    if (!formData.patientId) {
      showToast(t("prescriptions.patientRequired"), "error");
      return false;
    }
    if (formData.medications.length === 0) {
      showToast("Cần ít nhất một loại thuốc.", "error");
      return false;
    }
    if (formData.daysOfWeek.length === 0) {
      showToast("Cần chọn ít nhất một ngày trong tuần.", "error");
      return false;
    }

    for (let i = 0; i < formData.medications.length; i++) {
      const med = formData.medications[i];
      if (!med.drugName.trim()) {
        showToast(`Thuốc #${i + 1}: ${t("prescriptions.drugNameRequired")}`, "error");
        return false;
      }
      if (!med.dosage.trim()) {
        showToast(`Thuốc #${i + 1}: ${t("prescriptions.dosageRequired")}`, "error");
        return false;
      }
      if (med.schedule.length === 0) {
        showToast(`Thuốc #${i + 1}: ${t("prescriptions.scheduleRequired")}`, "error");
        return false;
      }

      const slotKeys = new Set<string>();
      for (let j = 0; j < med.schedule.length; j++) {
        const dose = med.schedule[j];
        if (dose.pillCount <= 0) {
          showToast(`Thuốc #${i + 1}, lịch #${j + 1}: ${t("prescriptions.pillCountRequired")}`, "error");
          return false;
        }
        if (dose.customTime) {
          const [h, m] = dose.customTime.split(":").map(Number);
          if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
            showToast(`Thuốc #${i + 1}, lịch #${j + 1}: ${t("prescriptions.invalidHourMinute")}`, "error");
            return false;
          }
        }
        // Duplicate detection
        const key = `${dose.timeOfDay}|${dose.mealTiming}|${dose.pillCount}`;
        if (slotKeys.has(key)) {
          showToast(
            t("prescriptions.duplicateDoseWarning")
              .replace("{{drug}}", med.drugName || `#${i + 1}`)
              .replace("{{slot}}", `${dose.timeOfDay} ${dose.mealTiming} ${dose.pillCount}v`),
            "error"
          );
          return false;
        }
        slotKeys.add(key);
      }
    }

    if (formData.endDate && formData.startDate > formData.endDate) {
      showToast(t("prescriptions.endDateBeforeStart"), "error");
      return false;
    }
    return true;
  };

  // ---- Submit ----
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      const base = prescriptionFromForm(formData);

      if (editingPrescriptionId) {
        // Full update — must include status
        const existing = prescriptions.find((p) => p.id === editingPrescriptionId);
        await updatePrescription(editingPrescriptionId, {
          ...base,
          status: existing?.status ?? "active",
        });
        showToast(t("prescriptions.updateSuccess"), "success");
      } else {
        const created = await createPrescription(base);
        setLastCreatedPrescriptionId(created.id);
        showToast(t("prescriptions.createSuccess"), "success");
      }

      setIsFormVisible(false);
      setEditingPrescriptionId(null);
      await refreshAll();
    } catch (err: any) {
      showToast(err?.response?.data?.error || t("prescriptions.saveError"), "error");
    } finally {
      setSaving(false);
    }
  };

  // ---- Status change ----
  const handleStatusChange = async (prescription: Prescription, newStatus: PrescriptionStatus) => {
    if (prescription.status === newStatus) return;
    const confirmed = window.confirm(`Đổi trạng thái đơn thuốc sang "${newStatus}"?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      await updatePrescriptionStatus(prescription.id, newStatus);
      showToast(t("prescriptions.statusUpdateSuccess"), "success");
      await refreshAll();
    } catch (err: any) {
      showToast(err?.response?.data?.error || t("prescriptions.statusUpdateError"), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAdherenceDay = (date: string) => {
    setExpandedAdherenceDays((prev) => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  // ---- Render helpers ----
  const renderTimeOfDayLabel = (tod: string) => {
    if (tod === "morning") return t("prescriptions.morning");
    if (tod === "noon") return t("prescriptions.noon");
    if (tod === "evening") return t("prescriptions.evening");
    return tod;
  };

  const renderMealTimingLabel = (mt?: string) => {
    if (mt === "pre_meal") return t("prescriptions.preMeal");
    if (mt === "post_meal") return t("prescriptions.postMeal");
    return "";
  };

  const renderSlotSummary = (dose: MedicationDose) => {
    const parts: string[] = [renderTimeOfDayLabel(dose.timeOfDay)];
    if (dose.time) parts.push(`${t("prescriptions.at")} ${dose.time}`);
    else if (dose.hour !== undefined && dose.minute !== undefined)
      parts.push(`${t("prescriptions.at")} ${formatTime(dose.hour, dose.minute)}`);
    const meal = renderMealTimingLabel(dose.mealTiming);
    if (meal) parts.push(meal);
    parts.push(`${dose.pillCount}v`);
    return parts.join(" · ");
  };

  const renderReminderStatusBadge = (status: string) => {
    const cls =
      status === "active"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        : status === "paused"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400";
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
        {status}
      </span>
    );
  };

  // ---- Render ----
  return (
    <div className="mx-auto p-6 pb-24">
      <Toast toast={toast} onClose={hideToast} />

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <FaNotesMedical size={20} />
            </div>
            {selectedPatientId 
              ? `Đơn thuốc của ${patients.find(p => p.patientId === selectedPatientId)?.name || "bệnh nhân"}`
              : "Danh sách đơn thuốc"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {selectedPatientId 
              ? "Theo dõi các đơn thuốc, lịch uống và trạng thái điều trị của bệnh nhân này."
              : "Các đơn thuốc được kê cho bệnh nhân trong phạm vi quản lý của bạn."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <FaPlus className="mr-2" />
            {t("prescriptions.createPrescription")}
          </button>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={loadingPrescriptions}
            className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            <FaSyncAlt className={`mr-2 ${loadingPrescriptions ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t("prescriptions.filterByPatient")}
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              disabled={loadingPatients}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {loadingPatients ? t("prescriptions.loadingPatients") : t("prescriptions.allPatients")}
              </option>
              {patientOptions.map((p) => (
                <option key={p.patientId} value={p.patientId}>
                  {p.patientName || p.patientId}
                  {p.patientCode ? ` • ${p.patientCode}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:w-56">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t("prescriptions.filterByStatus")}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PrescriptionStatus | "")}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:w-56">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t("prescriptions.adherenceRange")}
            </label>
            <select
              value={adherenceDays}
              onChange={(e) => setAdherenceDays(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ADHERENCE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {t(r.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>



      {/* ── Prescription List ── */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
              {t("prescriptions.prescriptionList")}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {t("prescriptions.prescriptionListDesc")}
            </p>
          </div>

        </div>

        {loadingPrescriptions ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
            {t("prescriptions.loading")}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            <FaNotesMedical className="mx-auto mb-3 text-3xl text-slate-300" />
            {statusFilter ? t("prescriptions.noResults") : t("prescriptions.noPrescriptions")}
          </div>
        ) : (
          <div className="space-y-3">
            {currentPrescriptions.map((pres) => {
              const patientInfo = patientDisplayMap.get(pres.patientId);
              const isExpanded = expandedCards.has(pres.id);
              
              let medTitle = "Đơn thuốc chưa có tên thuốc";
              if (pres.medications && pres.medications.length > 0) {
                if (pres.medications.length === 1) {
                  medTitle = pres.medications[0].drugName;
                } else {
                  medTitle = `${pres.medications.length} loại thuốc: ${pres.medications.slice(0, 2).map(m => m.drugName).join(", ")}${pres.medications.length > 2 ? "..." : ""}`;
                }
              }

              return (
                <div
                  key={pres.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
                >
                  {/* Card header (Outer row) */}
                  <div
                    className="grid cursor-pointer grid-cols-1 gap-4 p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 md:grid-cols-12 md:items-center"
                    onClick={() => toggleCard(pres.id)}
                  >
                    {/* Left: Medicine Title & Patient (optional) */}
                    <div className="md:col-span-5">
                      <div className="flex flex-col items-start gap-2">
                        <span className="text-base font-bold text-blue-700 dark:text-blue-400">
                          {medTitle}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getStatusClasses(pres.status)}`}
                          >
                            {t(`prescriptions.${pres.status}`)}
                          </span>
                          {!selectedPatientId && patientInfo && (
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              • {patientInfo.name} {patientInfo.code ? `(${patientInfo.code})` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Schedule & Meta */}
                    <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 md:col-span-4">
                      <div className="flex items-center gap-1.5">
                        <FaClock className="shrink-0 text-slate-400 dark:text-slate-500" />
                        <span className="line-clamp-1">
                          {formatDate(pres.startDate)}
                          {pres.endDate ? ` - ${formatDate(pres.endDate)}` : " - Vô thời hạn"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {buildWeekdaySummary(pres.daysOfWeek, t)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Medications count & Actions */}
                    <div className="flex items-center justify-between gap-4 md:col-span-3 md:justify-end">
                      <div className="flex shrink-0 items-center justify-center rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {pres.medications.length} loại
                      </div>
                      <div className="flex shrink-0 items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-700">
                        <span className="hidden text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 sm:inline-block">
                          Xem chi tiết
                        </span>
                        {isExpanded ? (
                          <FaChevronDown className="text-slate-400" />
                        ) : (
                          <FaChevronRight className="text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-700 p-4">
                      {/* Medications */}
                      <div className="mb-4 space-y-3">
                        {pres.medications.map((med, mi) => (
                          <div key={mi} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-900 dark:text-slate-100">
                                💊 {med.drugName}
                              </span>
                              <span className="text-sm text-slate-600 dark:text-slate-300">
                                {med.dosage}
                              </span>
                              {med.route && (
                                <span className="text-xs text-slate-400">· {med.route}</span>
                              )}
                            </div>
                            {med.instructions && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                📝 {med.instructions}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {med.schedule.map((dose, di) => (
                                <span
                                  key={di}
                                  className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
                                >
                                  {renderSlotSummary(dose)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {pres.status === "active" && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(pres)}
                            disabled={saving}
                            className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <FaEdit className="mr-1" />
                            {t("prescriptions.edit")}
                          </button>
                        )}

                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">{t("prescriptions.changeStatus")}:</span>
                          {(["active", "completed", "discontinued", "expired"] as PrescriptionStatus[])
                            .filter((s) => s !== pres.status)
                            .map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => void handleStatusChange(pres, s)}
                                disabled={saving}
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${getStatusClasses(s)} opacity-70 hover:opacity-100`}
                              >
                                {t(`prescriptions.${s}`)}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-end border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-50"
              >
                <FaChevronLeft className="mr-1" />
                {t("common.previous")}
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-50"
              >
                {t("common.next")}
                <FaChevronRight className="ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Medication Reminders Panel ── */}
      {selectedPatientId && (
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-slate-100">
                <MdOutlineNotificationsActive className="text-purple-500" />
                {t("prescriptions.remindersPanel")}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {t("prescriptions.remindersPanelDesc")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadReminders()}
              className="text-xs text-blue-600 dark:text-blue-400 underline"
            >
              {t("common.refresh")}
            </button>
          </div>

          {loadingReminders ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t("prescriptions.loadingReminders")}
            </div>
          ) : reminders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              {t("prescriptions.noReminders")}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Grouped by prescriptionId */}
              {Array.from(remindersByPrescription.byPrescription.entries()).map(
                ([prescId, rems]) => {
                  const pres = prescriptions.find((p) => p.id === prescId);
                  return (
                    <div
                      key={prescId}
                      className="rounded-lg border border-purple-100 dark:border-purple-900/30 bg-purple-50 dark:bg-purple-900/10 p-3"
                    >
                      {pres && (
                        <div className="mb-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
                          📋 {pres.medications.map((m) => m.drugName).join(", ")}
                        </div>
                      )}
                      <div className="space-y-2">
                        {rems.map((r) => (
                          <ReminderRow key={r.id} reminder={r} formatTime={formatTime} renderReminderStatusBadge={renderReminderStatusBadge} t={t} />
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
              {/* Reminders without prescriptionId */}
              {remindersByPrescription.noPrescription.map((r) => (
                <ReminderRow key={r.id} reminder={r} formatTime={formatTime} renderReminderStatusBadge={renderReminderStatusBadge} t={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Adherence Panel ── */}
      {selectedPatientId && (
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
                📊 {t("prescriptions.adherencePanel")}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {t("prescriptions.adherencePanelDesc")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadAdherence()}
              className="text-xs text-blue-600 dark:text-blue-400 underline"
            >
              {t("common.refresh")}
            </button>
          </div>

          {loadingAdherence ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t("prescriptions.loadingAdherence")}
            </div>
          ) : !adherence || adherence.summary.expected === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              {t("prescriptions.noAdherence")}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard label={t("prescriptions.expectedDoses")} value={adherence.summary.expected} color="blue" />
                <SummaryCard label={t("prescriptions.takenDoses")} value={adherence.summary.taken} color="green" />
                <SummaryCard label={t("prescriptions.missedDoses")} value={adherence.summary.missed} color="red" />
                <SummaryCard
                  label={t("prescriptions.adherenceRate")}
                  value={`${Math.round(adherence.summary.adherenceRate * 100)}%`}
                  color="purple"
                />
              </div>

              {/* Progress Bar */}
              <div className="mb-5">
                <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{t("prescriptions.adherenceRate")}</span>
                  <span>{Math.round(adherence.summary.adherenceRate * 100)}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-3 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, Math.round(adherence.summary.adherenceRate * 100))}%` }}
                  />
                </div>
              </div>

              {/* Daily breakdown */}
              <div className="space-y-2">
                {adherence.days.map((day) => {
                  const isOpen = expandedAdherenceDays.has(day.date);
                  return (
                    <div
                      key={day.date}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                    >
                      <div
                        className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        onClick={() => toggleAdherenceDay(day.date)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm text-gray-800 dark:text-slate-100">
                            {new Date(day.date).toLocaleDateString("vi-VN", {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                          <span className="text-xs text-slate-400">
                            {day.taken}/{day.expected} liều
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {day.missed > 0 && (
                            <span className="rounded-full bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-300">
                              {day.missed} bỏ lỡ
                            </span>
                          )}
                          {day.taken === day.expected && day.expected > 0 && (
                            <FaCheckCircle className="text-emerald-500" />
                          )}
                          {isOpen ? (
                            <FaChevronDown className="text-slate-400 text-xs" />
                          ) : (
                            <FaChevronRight className="text-slate-400 text-xs" />
                          )}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-slate-100 dark:border-slate-700 px-4 pb-3 pt-2 space-y-3">
                          {day.medications.map((med, mi) => (
                            <div key={mi}>
                              <div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                💊 {med.drugName} {med.dosage}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {med.slots.map((slot, si) => (
                                  <div
                                    key={si}
                                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getAdherenceSlotClasses(slot.status)}`}
                                  >
                                    {slot.status === "taken" ? (
                                      <FaCheckCircle className="shrink-0" />
                                    ) : slot.status === "missed" ? (
                                      <FaTimesCircle className="shrink-0" />
                                    ) : (
                                      <FaClock className="shrink-0" />
                                    )}
                                    <span>
                                      {renderTimeOfDayLabel(slot.timeOfDay)}
                                      {slot.time ? ` ${slot.time}` : ""}
                                      {slot.mealTiming ? ` · ${renderMealTimingLabel(slot.mealTiming)}` : ""}
                                      {` · ${slot.pillCount}v`}
                                    </span>
                                    {slot.status === "taken" && slot.takenAt && (
                                      <span className="text-slate-400">
                                        ({t("prescriptions.takenAt")}{" "}
                                        {new Date(slot.takenAt).toLocaleTimeString("vi-VN", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                        )
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Form Modal ── */}
      {isFormVisible && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
                <FaNotesMedical className="mr-2 inline text-blue-500" />
                {editingPrescriptionId
                  ? t("prescriptions.editPrescription")
                  : t("prescriptions.createPrescription")}
              </h2>
              <button type="button" onClick={handleCloseForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <FaTimes size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-6">
              {/* Patient */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t("prescriptions.patientLabel")} *
                </label>
                <select
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleFormChange}
                  disabled={!!editingPrescriptionId}
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  <option value="">{t("prescriptions.selectPatient")}</option>
                  {patientOptions.map((p) => (
                    <option key={p.patientId} value={p.patientId}>
                      {p.patientName || p.patientId}
                      {p.patientCode ? ` • ${p.patientCode}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone + Dates */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    {t("prescriptions.timezoneLabel")}
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    {t("prescriptions.startDateLabel")} *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    {t("prescriptions.endDateLabel")}
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Days of week */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t("prescriptions.repeatOn")} *
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleToggleWeekday(opt.value)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                        formData.daysOfWeek.includes(opt.value)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medications */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    {t("prescriptions.medications")} *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="inline-flex items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <FaPlus className="mr-1" />
                    {t("prescriptions.addMedication")}
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.medications.map((med, mi) => (
                    <div
                      key={mi}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          💊 {t("prescriptions.medications")} #{mi + 1}
                        </span>
                        {formData.medications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(mi)}
                            className="text-xs text-rose-500 hover:underline"
                          >
                            <FaTrash className="mr-1 inline" />
                            {t("prescriptions.removeMedication")}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                            {t("prescriptions.drugName")} *
                          </label>
                          <input
                            type="text"
                            value={med.drugName}
                            onChange={(e) => handleMedChange(mi, "drugName", e.target.value)}
                            placeholder="VD: Amlodipine"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                            {t("prescriptions.dosage")} *
                          </label>
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e) => handleMedChange(mi, "dosage", e.target.value)}
                            placeholder="VD: 5mg"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                            {t("prescriptions.route")}
                          </label>
                          <input
                            type="text"
                            value={med.route}
                            onChange={(e) => handleMedChange(mi, "route", e.target.value)}
                            placeholder="VD: oral"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">
                            {t("prescriptions.instructions")}
                          </label>
                          <input
                            type="text"
                            value={med.instructions}
                            onChange={(e) => handleMedChange(mi, "instructions", e.target.value)}
                            placeholder="VD: Uống sau bữa sáng"
                            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Schedule */}
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {t("prescriptions.schedule")} *
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddDose(mi)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <FaPlus className="mr-1 inline" />
                            {t("prescriptions.addDose")}
                          </button>
                        </div>

                        <div className="space-y-2">
                          {med.schedule.map((dose, di) => (
                            <div
                              key={di}
                              className="flex flex-wrap items-center gap-2 rounded-lg bg-white dark:bg-slate-700 p-2.5"
                            >
                              <select
                                value={dose.timeOfDay}
                                onChange={(e) =>
                                  handleDoseChange(mi, di, "timeOfDay", e.target.value)
                                }
                                className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="morning">{t("prescriptions.morning")}</option>
                                <option value="noon">{t("prescriptions.noon")}</option>
                                <option value="evening">{t("prescriptions.evening")}</option>
                              </select>

                              <input
                                type="time"
                                value={dose.customTime}
                                onChange={(e) =>
                                  handleDoseChange(mi, di, "customTime", e.target.value)
                                }
                                placeholder="HH:MM"
                                className="w-24 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />

                              <select
                                value={dose.mealTiming}
                                onChange={(e) =>
                                  handleDoseChange(mi, di, "mealTiming", e.target.value)
                                }
                                className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">{t("prescriptions.noMealTiming")}</option>
                                <option value="pre_meal">{t("prescriptions.preMeal")}</option>
                                <option value="post_meal">{t("prescriptions.postMeal")}</option>
                              </select>

                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={dose.pillCount}
                                  min={0.5}
                                  step={0.5}
                                  onChange={(e) =>
                                    handleDoseChange(mi, di, "pillCount", Number(e.target.value))
                                  }
                                  className="w-16 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-center text-xs text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-xs text-slate-400">{t("prescriptions.pillCount")}</span>
                              </div>

                              {med.schedule.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDose(mi, di)}
                                  className="ml-auto text-rose-400 hover:text-rose-600"
                                >
                                  <FaTimes size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving
                    ? t("prescriptions.saving")
                    : editingPrescriptionId
                    ? t("prescriptions.updatePrescription")
                    : t("prescriptions.savePrescription")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----
function ReminderRow({
  reminder,
  formatTime,
  renderReminderStatusBadge,
  t,
}: {
  reminder: ReminderRecord;
  formatTime: (h: number, m: number) => string;
  renderReminderStatusBadge: (status: string) => React.ReactNode;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg bg-white dark:bg-slate-800 p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-slate-100 line-clamp-2">
          {reminder.message}
        </p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>⏰ {formatTime(reminder.hour, reminder.minute)}</span>
          {reminder.timeOfDay && <span>· {reminder.timeOfDay}</span>}
          {reminder.mealTiming && (
            <span>· {reminder.mealTiming === "pre_meal" ? t("prescriptions.preMeal") : t("prescriptions.postMeal")}</span>
          )}
        </div>
      </div>
      {renderReminderStatusBadge(reminder.status)}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: "blue" | "green" | "red" | "purple";
}) {
  const colorMap = {
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200",
    green: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200",
    red: "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-200",
    purple: "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200",
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colorMap[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}

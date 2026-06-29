import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
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
  FaBan,
  FaFilePrescription,
  FaListUl,
  FaTrash,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { getMyPatients } from "../services/patientService";
import {
  getPrescriptions,
  createPrescription,
  updatePrescription,
  updatePrescriptionStatus,
  toStartOfDayIso,
  toEndOfDayIso,
} from "../services/prescriptionService";
import type { AssignmentResponse } from "../types/patient";
import type {
  Prescription,
  PrescriptionStatus,
  TimeOfDay,
  MealTiming,
} from "../types/index";

// ---- Constants ----
const WEEKDAY_OPTIONS = [
  { value: 1, labelKey: "prescriptions.mon", label: "T2" },
  { value: 2, labelKey: "prescriptions.tue", label: "T3" },
  { value: 3, labelKey: "prescriptions.wed", label: "T4" },
  { value: 4, labelKey: "prescriptions.thu", label: "T5" },
  { value: 5, labelKey: "prescriptions.fri", label: "T6" },
  { value: 6, labelKey: "prescriptions.sat", label: "T7" },
  { value: 0, labelKey: "prescriptions.sun", label: "CN" },
];

const STATUS_OPTIONS: Array<{ value: PrescriptionStatus | ""; label: string }> = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang hiệu lực" },
  { value: "completed", label: "Đã hoàn thành" },
  { value: "discontinued", label: "Đã dừng" },
  { value: "expired", label: "Hết hạn" },
];

const ITEMS_PER_PAGE = 5;

interface DrugSuggestion {
  name: string;
  dosage?: string;
  schedule?: Partial<Record<"morning" | "noon" | "evening", {
    customTime: string;
    mealTiming: MealTiming | "";
    pillCount: number;
  }>>;
}

const drug = (
  name: string,
  dosage?: string,
  schedule?: DrugSuggestion["schedule"]
): DrugSuggestion => ({ name, dosage, schedule });

const DRUG_SUGGESTIONS: DrugSuggestion[] = [
  drug("Paracetamol", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Ibuprofen", "400mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Amoxicillin", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "14:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Omeprazole", "20mg", { morning: { customTime: "07:00", mealTiming: "pre_meal", pillCount: 1 } }),
  drug("Metformin", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Amlodipine", "5mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Losartan", "50mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
];

const ROUTE_OPTIONS = [
  "Uống",
  "Tiêm tĩnh mạch",
  "Tiêm bắp",
  "Tiêm dưới da",
  "Bôi ngoài da",
  "Nhỏ mắt",
  "Nhỏ tai",
  "Nhỏ mũi",
  "Đặt dưới lưỡi",
  "Hít",
  "Đặt trực tràng",
];

// ---- Form Types ----
interface SlotFormData {
  enabled: boolean;
  customTime: string;
  mealTiming: MealTiming | "";
  pillCount: number;
}

interface ExtraSlotFormData {
  customTime: string;
  mealTiming: MealTiming | "";
  pillCount: number;
}

interface MedScheduleForm {
  morning: SlotFormData;
  noon: SlotFormData;
  evening: SlotFormData;
  extras: ExtraSlotFormData[];
}

interface MedicationFormData {
  drugName: string;
  dosage: string;
  route: string;
  instructions: string;
  schedule: MedScheduleForm;
}

interface PrescriptionFormData {
  patientId: string;
  medications: MedicationFormData[];
  timezone: string;
  daysOfWeek: number[];
  startDate: string;
  endDate: string;
}

const createDefaultSlot = (enabled = false): SlotFormData => ({
  enabled,
  customTime: "",
  mealTiming: "",
  pillCount: 1,
});

const createDefaultSchedule = (): MedScheduleForm => ({
  morning: createDefaultSlot(true),
  noon: createDefaultSlot(true),
  evening: createDefaultSlot(true),
  extras: [],
});

const createDefaultMedication = (): MedicationFormData => ({
  drugName: "",
  dosage: "",
  route: "",
  instructions: "",
  schedule: createDefaultSchedule(),
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
    timezone: "Asia/Ho_Chi_Minh",
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

const slotToDosePayload = (
  timeOfDay: TimeOfDay,
  customTime: string,
  mealTiming: MealTiming | "",
  pillCount: number
) => {
  const payload: {
    timeOfDay: TimeOfDay;
    hour?: number;
    minute?: number;
    mealTiming?: MealTiming;
    pillCount: number;
  } = { timeOfDay, pillCount };
  if (customTime) {
    const [h, m] = customTime.split(":").map(Number);
    if (!Number.isNaN(h) && !Number.isNaN(m)) { payload.hour = h; payload.minute = m; }
  }
  if (mealTiming) payload.mealTiming = mealTiming as MealTiming;
  return payload;
};

const extraTimeOfDay = (customTime: string): TimeOfDay => {
  if (!customTime) return "morning";
  const h = Number(customTime.split(":")[0]);
  if (h < 12) return "morning";
  if (h < 18) return "noon";
  return "evening";
};

const prescriptionFromForm = (form: PrescriptionFormData) => {
  const meds = form.medications.map((med) => {
    const schedule: ReturnType<typeof slotToDosePayload>[] = [];
    for (const tod of ["morning", "noon", "evening"] as const) {
      const slot = med.schedule[tod];
      if (slot.enabled) {
        schedule.push(slotToDosePayload(tod, slot.customTime, slot.mealTiming, slot.pillCount));
      }
    }
    for (const extra of med.schedule.extras) {
      schedule.push(slotToDosePayload(
        extraTimeOfDay(extra.customTime),
        extra.customTime,
        extra.mealTiming,
        extra.pillCount
      ));
    }
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

const formFromPrescription = (p: Prescription): PrescriptionFormData => {
  const meds: MedicationFormData[] = (p.medications || []).map((med) => {
    const schedule = createDefaultSchedule();
    const usedSlots = { morning: false, noon: false, evening: false };
    for (const dose of (med.schedule || [])) {
      const tod = dose.timeOfDay as "morning" | "noon" | "evening";
      const ct =
        dose.hour !== undefined && dose.minute !== undefined
          ? formatTime(dose.hour, dose.minute)
          : (dose as any).time ?? "";
      if (tod === "morning" || tod === "noon" || tod === "evening") {
        if (!usedSlots[tod]) {
          usedSlots[tod] = true;
          schedule[tod] = { enabled: true, customTime: ct, mealTiming: (dose.mealTiming as MealTiming | "") ?? "", pillCount: dose.pillCount };
        } else {
          schedule.extras.push({ customTime: ct, mealTiming: (dose.mealTiming as MealTiming | "") ?? "", pillCount: dose.pillCount });
        }
      } else {
        schedule.extras.push({ customTime: ct, mealTiming: (dose.mealTiming as MealTiming | "") ?? "", pillCount: dose.pillCount });
      }
    }
    return { drugName: med.drugName || "", dosage: med.dosage || "", route: med.route ?? "", instructions: med.instructions ?? "", schedule };
  });

  return {
    patientId: p.patientId,
    medications: meds,
    timezone: p.timezone,
    daysOfWeek: p.daysOfWeek || [],
    startDate: p.startDate ? p.startDate.split("T")[0] : "",
    endDate: p.endDate ? p.endDate.split("T")[0] : "",
  };
};

const getStatusLabel = (status: PrescriptionStatus) => {
  switch (status) {
    case "active": return "Đang hiệu lực";
    case "completed": return "Đã hoàn thành";
    case "discontinued": return "Đã dừng";
    case "expired": return "Hết hạn";
  }
};

const getStatusClasses = (status: PrescriptionStatus) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    case "completed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
    case "discontinued":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
    case "expired":
      return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600";
  }
};

export default function PrescriptionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast, showToast, hideToast } = useToast();

  const initialPatientId = searchParams.get("patientId") ?? "";

  // ---- State ----
  const [patients, setPatients] = useState<AssignmentResponse[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | "">("");
  const [searchTerm, setSearchTerm] = useState("");

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PrescriptionFormData>(
    createDefaultFormData(initialPatientId)
  );

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

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
          code: p.patientCode || p.patientPublicId || "N/A",
        },
      ])
    );
  }, [patientOptions]);

  // Group by patient
  const patientGroups = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    // Filter first
    const filtered = prescriptions.filter(p => {
      const pt = patientDisplayMap.get(p.patientId);
      const matchName = pt?.name.toLowerCase().includes(term);
      const matchCode = pt?.code.toLowerCase().includes(term);
      const matchDrug = p.medications.some(m => m.drugName.toLowerCase().includes(term));
      
      return matchName || matchCode || matchDrug;
    });

    const groups = new Map<string, Prescription[]>();
    filtered.forEach(p => {
      if (!groups.has(p.patientId)) groups.set(p.patientId, []);
      groups.get(p.patientId)!.push(p);
    });

    // Sort prescriptions inside each group
    const sortedGroups = Array.from(groups.entries()).map(([patientId, list]) => {
      list.sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      return { patientId, list };
    });

    // Sort groups by patient name
    sortedGroups.sort((a, b) => {
      const nameA = patientDisplayMap.get(a.patientId)?.name || "";
      const nameB = patientDisplayMap.get(b.patientId)?.name || "";
      return nameA.localeCompare(nameB);
    });

    return sortedGroups;
  }, [prescriptions, searchTerm, patientDisplayMap]);

  const totalPages = Math.ceil(patientGroups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentGroups = patientGroups.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
        results = await getPrescriptions({
          status: statusFilter || undefined,
        });
      }
      setPrescriptions(results);
      setCurrentPage(1);
    } catch {
      showToast("Không thể tải danh sách đơn thuốc.", "error");
    } finally {
      setLoadingPrescriptions(false);
    }
  }, [selectedPatientId, statusFilter, patientOptions]);

  useEffect(() => { void loadPatients(); }, []);
  useEffect(() => {
    if (!loadingPatients && patientOptions.length > 0) {
      void loadPrescriptions();
    }
  }, [loadingPatients, patientOptions.length, selectedPatientId, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [selectedPatientId, statusFilter, searchTerm]);

  // ---- Handlers ----
  const handleOpenCreate = (patientId = selectedPatientId) => {
    setFormData(createDefaultFormData(patientId));
    setEditingPrescriptionId(null);
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenEdit = (prescription: Prescription) => {
    setFormData(formFromPrescription(prescription));
    setEditingPrescriptionId(prescription.id);
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    setEditingPrescriptionId(null);
  };

  const toggleCardExpansion = (patientId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const handleStopPrescription = async (p: Prescription) => {
    if (!window.confirm("Bạn có chắc chắn muốn dừng đơn thuốc này? Lịch nhắc thuốc liên quan cũng sẽ bị dừng.")) return;
    try {
      setSaving(true);
      await updatePrescriptionStatus(p.id, "discontinued");
      showToast("Đã dừng đơn thuốc.", "success");
      await loadPrescriptions();
    } catch (e: any) {
      showToast(e?.response?.data?.error || "Không thể dừng đơn thuốc.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Form Field Handlers
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDrugSelect = (medIdx: number, suggestion: DrugSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) => {
        if (i !== medIdx) return med;
        const updated = { ...med, drugName: suggestion.name };
        if (suggestion.dosage) updated.dosage = suggestion.dosage;
        if (suggestion.schedule) {
          const s = createDefaultSchedule();
          s.morning.enabled = false;
          s.noon.enabled = false;
          s.evening.enabled = false;
          for (const tod of ["morning", "noon", "evening"] as const) {
            const slot = suggestion.schedule[tod];
            if (slot) s[tod] = { enabled: true, ...slot };
          }
          updated.schedule = s;
        }
        return updated;
      }),
    }));
  };

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

  const handleMedChange = (medIdx: number, field: keyof Omit<MedicationFormData, "schedule">, value: string) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) => i === medIdx ? { ...med, [field]: value } : med),
    }));
  };

  const handleToggleSlot = (medIdx: number, tod: "morning" | "noon" | "evening") => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === medIdx
          ? { ...med, schedule: { ...med.schedule, [tod]: { ...med.schedule[tod], enabled: !med.schedule[tod].enabled } } }
          : med
      ),
    }));
  };

  const handleSlotChange = (medIdx: number, tod: "morning" | "noon" | "evening", field: keyof Omit<SlotFormData, "enabled">, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === medIdx
          ? { ...med, schedule: { ...med.schedule, [tod]: { ...med.schedule[tod], [field]: value } } }
          : med
      ),
    }));
  };

  const handleAddExtra = (medIdx: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === medIdx
          ? { ...med, schedule: { ...med.schedule, extras: [...med.schedule.extras, { customTime: "", mealTiming: "", pillCount: 1 }] } }
          : med
      ),
    }));
  };

  const handleRemoveExtra = (medIdx: number, extraIdx: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === medIdx
          ? { ...med, schedule: { ...med.schedule, extras: med.schedule.extras.filter((_, j) => j !== extraIdx) } }
          : med
      ),
    }));
  };

  const handleExtraChange = (medIdx: number, extraIdx: number, field: keyof ExtraSlotFormData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === medIdx
          ? {
            ...med,
            schedule: {
              ...med.schedule,
              extras: med.schedule.extras.map((ex, j) => j === extraIdx ? { ...ex, [field]: value } : ex),
            },
          }
          : med
      ),
    }));
  };
  
  const handleToggleWeekday = (dayValue: number) => {
    setFormData((current) => {
      const exists = current.daysOfWeek.includes(dayValue);
      return {
        ...current,
        daysOfWeek: exists
          ? current.daysOfWeek.filter((item) => item !== dayValue)
          : [...current.daysOfWeek, dayValue],
      };
    });
  };

  const validateForm = (): boolean => {
    if (!formData.patientId) { showToast("Vui lòng chọn bệnh nhân", "error"); return false; }
    if (formData.medications.length === 0) { showToast("Cần ít nhất một loại thuốc.", "error"); return false; }
    if (formData.daysOfWeek.length === 0) { showToast("Cần chọn ít nhất một ngày trong tuần.", "error"); return false; }

    for (let i = 0; i < formData.medications.length; i++) {
      const med = formData.medications[i];
      if (!med.drugName.trim() || med.drugName.trim().length < 2) { 
        showToast(`Thuốc #${i + 1}: Tên thuốc phải có ít nhất 2 ký tự`, "error"); 
        return false; 
      }
      if (!med.dosage.trim()) { showToast(`Thuốc #${i + 1}: Vui lòng nhập liều lượng`, "error"); return false; }
      const { morning, noon, evening, extras } = med.schedule;
      const enabledCount = [morning, noon, evening].filter((s) => s.enabled).length + extras.length;
      if (enabledCount === 0) { showToast(`Thuốc #${i + 1}: Cần có ít nhất 1 giờ uống`, "error"); return false; }
    }
    if (formData.endDate && formData.startDate > formData.endDate) {
      showToast("Ngày kết thúc không hợp lệ", "error"); return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      const base = prescriptionFromForm(formData);

      if (editingPrescriptionId) {
        const existing = prescriptions.find((p) => p.id === editingPrescriptionId);
        await updatePrescription(editingPrescriptionId, { ...base, status: existing?.status ?? "active" });
        showToast("Cập nhật thành công", "success");
      } else {
        await createPrescription(base);
        showToast("Tạo mới thành công", "success");
      }
      await loadPrescriptions();
      handleCloseForm();
    } catch (error: any) {
      showToast(error?.response?.data?.error || "Lỗi lưu", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-4 py-8 pb-24 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

      {!isFormVisible ? (
        <>
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Đơn Thuốc</h1>
              <p className="mt-2 text-gray-600 dark:text-slate-400">Quản lý toàn bộ lịch trình điều trị bằng thuốc của bệnh nhân.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => handleOpenCreate()} className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 shadow-sm">
                <FaPlus className="mr-2" /> Tạo đơn thuốc mới
              </button>
              <button onClick={loadPrescriptions} disabled={loadingPrescriptions} className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:opacity-60">
                <FaSyncAlt className={`mr-2 ${loadingPrescriptions ? "animate-spin" : ""}`} /> Làm mới
              </button>
            </div>
          </div>

          <div className="mb-8 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Tìm kiếm</label>
                <input 
                  type="text" 
                  placeholder="Tên, mã, tên thuốc..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2.5 px-3 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Bệnh nhân</label>
                <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Tất cả bệnh nhân</option>
                  {patientOptions.map((p) => (
                    <option key={p.patientId} value={p.patientId}>
                      {(p.patientName || p.patientId) + (p.patientCode ? ` • ${p.patientCode}` : "")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Trạng thái</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none">
                  {STATUS_OPTIONS.map((o) => (<option key={o.label} value={o.value}>{o.label}</option>))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {loadingPrescriptions ? (
              <div className="py-12 text-center text-slate-500">Đang tải dữ liệu...</div>
            ) : currentGroups.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">Không tìm thấy đơn thuốc nào.</div>
            ) : (
              currentGroups.map(({ patientId, list }) => {
                const pt = patientDisplayMap.get(patientId);
                const isExpanded = expandedCards.has(patientId);
                const activeCount = list.filter(p => p.status === "active").length;
                
                // Get sample active drugs
                const sampleDrugs = Array.from(new Set(
                  list.filter(p => p.status === "active")
                      .flatMap(p => p.medications.map(m => m.drugName))
                ));

                return (
                  <div key={patientId} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div 
                      className={`p-5 flex items-center justify-between cursor-pointer transition ${isExpanded ? 'bg-slate-50 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                      onClick={() => toggleCardExpansion(patientId)}
                    >
                      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="min-w-[200px]">
                          <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400">{pt?.name || patientId}</h3>
                          <p className="text-sm text-slate-500">Mã BN: {pt?.code}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${activeCount > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {activeCount} đơn đang hiệu lực
                          </span>
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                            Tổng {list.length} đơn
                          </span>
                        </div>
                        {sampleDrugs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 ml-auto md:ml-4">
                            {sampleDrugs.slice(0, 3).map((d, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20">
                                {d}
                              </span>
                            ))}
                            {sampleDrugs.length > 3 && (
                              <span className="text-xs px-2 py-0.5 text-slate-500">+{sampleDrugs.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenCreate(patientId); }}
                          className="hidden md:inline-flex px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                        >
                          <FaPlus className="mr-1 mt-0.5" /> Tạo đơn
                        </button>
                        <div className="text-slate-400 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-full">
                          {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-200 dark:border-slate-700 p-0 overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                              <th className="px-5 py-3 font-semibold w-1/3">Thuốc</th>
                              <th className="px-5 py-3 font-semibold">Thời gian</th>
                              <th className="px-5 py-3 font-semibold">Trạng thái</th>
                              <th className="px-5 py-3 font-semibold text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {list.map(p => {
                              const drugsStr = p.medications.slice(0, 2).map(m => m.drugName).join(", ");
                              const hasMore = p.medications.length > 2;
                              return (
                                <tr 
                                  key={p.id} 
                                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition cursor-pointer relative group"
                                  onClick={() => navigate(`/prescriptions/${p.id}`)}
                                >
                                  <td className="px-5 py-4">
                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                      {drugsStr} {hasMore && <span className="text-slate-400 text-xs italic"> +{p.medications.length - 2} thuốc khác</span>}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">{p.medications.length} loại thuốc</div>
                                    {/* Hover tooltip */}
                                    <div className="absolute left-1/4 top-[80%] hidden w-72 z-50 group-hover:block bg-slate-800 text-slate-100 p-4 rounded-xl shadow-xl text-xs border border-slate-700 pointer-events-none">
                                      <h4 className="font-bold mb-2 text-sm text-blue-300">Chi tiết đơn thuốc:</h4>
                                      <ul className="space-y-1.5 mb-2">
                                         {(p.medications || []).map((m, i) => (
                                           <li key={i}><span className="font-semibold text-white">{m.drugName}</span> - {m.dosage} ({(m.schedule || []).length} lần/ngày)</li>
                                         ))}
                                      </ul>
                                      <div className="mt-2 pt-2 border-t border-slate-600 text-slate-400 italic">Click để xem toàn bộ thông tin đơn thuốc</div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="text-slate-700 dark:text-slate-300">{formatDate(p.startDate)} {p.endDate && `- ${formatDate(p.endDate)}`}</div>
                                    <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]" title={p.daysOfWeek.map(d => WEEKDAY_OPTIONS.find(o=>o.value===d)?.label).join(", ")}>
                                      Lặp lại: {p.daysOfWeek.length===7 ? "Mỗi ngày" : p.daysOfWeek.map(d => WEEKDAY_OPTIONS.find(o=>o.value===d)?.label).join(", ")}
                                    </div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusClasses(p.status)}`}>
                                      {getStatusLabel(p.status)}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      <Link 
                                        to={`/prescriptions/${p.id}`}
                                        className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 transition"
                                        title="Xem chi tiết"
                                      >
                                        <FaListUl />
                                      </Link>
                                      {p.status === "active" && (
                                        <>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }}
                                            className="p-1.5 text-amber-600 bg-amber-50 rounded hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 transition"
                                            title="Sửa đơn thuốc"
                                          >
                                            <FaEdit />
                                          </button>
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleStopPrescription(p); }}
                                            className="p-1.5 text-rose-600 bg-rose-50 rounded hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30 transition"
                                            title="Dừng đơn thuốc"
                                          >
                                            <FaBan />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-5">
              <div className="text-sm text-slate-500">Trang {currentPage} / {totalPages}</div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"><FaChevronLeft/></button>
                <button onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50"><FaChevronRight/></button>
              </div>
            </div>
          )}
        </>
      ) : (
        // Form
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FaFilePrescription className="text-blue-500" />
              {editingPrescriptionId ? "Sửa đơn thuốc" : "Tạo đơn thuốc mới"}
            </h2>
            <button onClick={handleCloseForm} className="text-slate-400 hover:text-slate-600"><FaTimes size={24}/></button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50">
               <div className="md:col-span-2">
                 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Bệnh nhân *</label>
                 {editingPrescriptionId ? (
                   <div className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 cursor-not-allowed">
                     {patientDisplayMap.get(formData.patientId)?.name || formData.patientId}
                     {patientDisplayMap.get(formData.patientId)?.code && ` • ${patientDisplayMap.get(formData.patientId)?.code}`}
                   </div>
                 ) : (
                   <select
                     name="patientId"
                     value={formData.patientId}
                     onChange={handleFormChange}
                     className="w-full rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:ring-blue-500"
                   >
                     <option value="">Chọn bệnh nhân</option>
                     {patientOptions.map((p) => (
                       <option key={p.patientId} value={p.patientId}>
                         {(p.patientName || p.patientId) + (p.patientCode ? ` • ${p.patientCode}` : "")}
                       </option>
                     ))}
                   </select>
                 )}
               </div>
               
               <div>
                 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ngày bắt đầu *</label>
                 <input type="date" name="startDate" value={formData.startDate} onChange={handleFormChange} required className="w-full rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm focus:ring-blue-500" />
               </div>
               <div>
                 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ngày kết thúc</label>
                 <input type="date" name="endDate" value={formData.endDate} onChange={handleFormChange} className="w-full rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm focus:ring-blue-500" />
               </div>
               
               <div className="md:col-span-4">
                 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Lặp lại các ngày trong tuần *</label>
                 <div className="flex flex-wrap gap-2">
                   {WEEKDAY_OPTIONS.map((day) => (
                     <button
                       key={day.value} type="button" onClick={() => handleToggleWeekday(day.value)}
                       className={`px-4 py-2 rounded-lg text-sm font-medium transition ${formData.daysOfWeek.includes(day.value) ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300'}`}
                     >
                       {day.label}
                     </button>
                   ))}
                 </div>
               </div>
             </div>

             <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  Danh sách Thuốc
                  <button type="button" onClick={handleAddMedication} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition font-semibold flex items-center gap-1 dark:bg-blue-900/30 dark:text-blue-400">
                    <FaPlus /> Thêm thuốc
                  </button>
                </h3>
                
                {formData.medications.map((med, idx) => (
                  <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-white dark:bg-slate-800 relative shadow-sm">
                    {formData.medications.length > 1 && (
                      <button type="button" onClick={() => handleRemoveMedication(idx)} className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-lg transition"><FaTrash/></button>
                    )}
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Thuốc #{idx + 1}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="relative group lg:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên thuốc *</label>
                        <input type="text" value={med.drugName} onChange={e => handleMedChange(idx, "drugName", e.target.value)} required placeholder="VD: Paracetamol" className="w-full rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm focus:ring-blue-500" />
                        <div className="hidden group-focus-within:block absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          <div className="p-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 sticky top-0">Gợi ý nhanh</div>
                          {DRUG_SUGGESTIONS.filter(d => d.name.toLowerCase().includes(med.drugName.toLowerCase())).slice(0,10).map((d, i) => (
                            <button key={i} type="button" onMouseDown={() => handleDrugSelect(idx, d)} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200">
                              <span className="font-semibold">{d.name}</span> {d.dosage && <span className="text-slate-400 text-xs ml-2">{d.dosage}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Liều lượng *</label>
                        <input type="text" value={med.dosage} onChange={e => handleMedChange(idx, "dosage", e.target.value)} required placeholder="VD: 500mg, 1 viên" className="w-full rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Đường dùng</label>
                        <input type="text" list={`routes-${idx}`} value={med.route} onChange={e => handleMedChange(idx, "route", e.target.value)} placeholder="VD: Uống" className="w-full rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm focus:ring-blue-500" />
                        <datalist id={`routes-${idx}`}>{ROUTE_OPTIONS.map(r => <option key={r} value={r} />)}</datalist>
                      </div>
                      <div className="md:col-span-2 lg:col-span-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hướng dẫn thêm</label>
                        <input type="text" value={med.instructions} onChange={e => handleMedChange(idx, "instructions", e.target.value)} placeholder="VD: Uống nhiều nước" className="w-full rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm focus:ring-blue-500" />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                       <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 text-sm">Lịch uống</h5>
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                         {(["morning", "noon", "evening"] as const).map(tod => {
                           const slot = med.schedule[tod];
                           const label = tod === "morning" ? "Sáng" : tod === "noon" ? "Trưa" : "Tối";
                           return (
                             <div key={tod} className={`p-3 rounded-lg border ${slot.enabled ? 'bg-white border-blue-200 dark:bg-slate-800 dark:border-blue-900/50 shadow-sm' : 'bg-transparent border-slate-200 dark:border-slate-700 opacity-60'}`}>
                               <label className="flex items-center gap-2 mb-3 cursor-pointer">
                                 <input type="checkbox" checked={slot.enabled} onChange={() => handleToggleSlot(idx, tod)} className="w-4 h-4 rounded text-blue-600" />
                                 <span className="font-semibold text-slate-800 dark:text-slate-200">{label}</span>
                               </label>
                               {slot.enabled && (
                                 <div className="space-y-3">
                                   <div className="grid grid-cols-2 gap-2">
                                     <div>
                                       <div className="text-[10px] text-slate-500 mb-1">Giờ (Tùy chọn)</div>
                                       <input type="time" value={slot.customTime} onChange={e=>handleSlotChange(idx, tod, "customTime", e.target.value)} className="w-full p-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700" />
                                     </div>
                                     <div>
                                       <div className="text-[10px] text-slate-500 mb-1">Số viên/lần</div>
                                       <input type="number" min="0.25" step="0.25" value={slot.pillCount} onChange={e=>handleSlotChange(idx, tod, "pillCount", Number(e.target.value))} className="w-full p-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700" required />
                                     </div>
                                   </div>
                                   <div>
                                      <select value={slot.mealTiming} onChange={e=>handleSlotChange(idx, tod, "mealTiming", e.target.value)} className="w-full p-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
                                        <option value="">Không chỉ định ăn</option>
                                        <option value="pre_meal">Trước ăn</option>
                                        <option value="post_meal">Sau ăn</option>
                                      </select>
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                       
                       {/* Extras */}
                       {med.schedule.extras.length > 0 && (
                         <div className="mt-4 space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                           {med.schedule.extras.map((ex, exIdx) => (
                             <div key={exIdx} className="flex flex-wrap md:flex-nowrap items-end gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                               <div className="flex-1 min-w-[120px]">
                                 <label className="block text-xs text-slate-500 mb-1">Giờ uống *</label>
                                 <input type="time" required value={ex.customTime} onChange={e=>handleExtraChange(idx, exIdx, "customTime", e.target.value)} className="w-full p-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700" />
                               </div>
                               <div className="flex-1 min-w-[120px]">
                                 <label className="block text-xs text-slate-500 mb-1">Bữa ăn</label>
                                 <select value={ex.mealTiming} onChange={e=>handleExtraChange(idx, exIdx, "mealTiming", e.target.value)} className="w-full p-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
                                   <option value="">-</option>
                                   <option value="pre_meal">Trước ăn</option>
                                   <option value="post_meal">Sau ăn</option>
                                 </select>
                               </div>
                               <div className="flex-1 min-w-[80px]">
                                 <label className="block text-xs text-slate-500 mb-1">Số lượng *</label>
                                 <input type="number" required min="0.25" step="0.25" value={ex.pillCount} onChange={e=>handleExtraChange(idx, exIdx, "pillCount", Number(e.target.value))} className="w-full p-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700" />
                               </div>
                               <button type="button" onClick={() => handleRemoveExtra(idx, exIdx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><FaTrash size={14}/></button>
                             </div>
                           ))}
                         </div>
                       )}
                       <button type="button" onClick={() => handleAddExtra(idx)} className="mt-3 text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
                         <FaPlus size={12}/> Thêm khung giờ khác
                       </button>
                    </div>
                  </div>
                ))}
             </div>
             
             <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={handleCloseForm} className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200">
                  Hủy
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50">
                  {saving && <FaSyncAlt className="animate-spin" />}
                  Lưu Đơn Thuốc
                </button>
             </div>
          </form>
        </div>
      )}
    </div>
  );
}

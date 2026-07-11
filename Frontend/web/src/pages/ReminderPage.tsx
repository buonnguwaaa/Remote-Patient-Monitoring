import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaPlus,
  FaRegClock,
  FaSyncAlt,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaSearch,
  FaNotesMedical,
  FaListUl,
  FaExternalLinkAlt,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { getMyPatients } from "../services/patientService";
import { getPrescriptions } from "../services/prescriptionService";
import {
  createReminder,
  getReminders,
  updateReminder,
  updateReminderStatus,
  type ReminderBasePayload,
  type ReminderKind,
  type ReminderRecord,
  type ReminderStatus,
  type UpdateReminderPayload,
} from "../services/reminderService";
import type { Prescription } from "../types/index";
import type { AssignmentResponse } from "../types/patient";

type ReminderStatusFilter = ReminderStatus | "all";
type ReminderKindFilter = ReminderKind | "all";

interface ReminderFormData {
  patientId: string;
  kind: ReminderKind;
  message: string;
  time: string;
  daysOfWeek: number[];
  timezone: string;
  startDate: string;
  endDate: string;
  status: ReminderStatus;
}

interface MedicationGroup {
  id: string; // patientId_prescriptionId
  type: "group";
  patientId: string;
  prescriptionId: string;
  reminders: ReminderRecord[];
  status: ReminderStatus;
  patientName: string;
  patientCode: string;
}

type AggregatedItem = { type: "single"; reminder: ReminderRecord } | MedicationGroup;

const ReminderPage = () => {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const weekdayOptions = [
    { value: 1, label: t("reminders.mon", "T2") },
    { value: 2, label: t("reminders.tue", "T3") },
    { value: 3, label: t("reminders.wed", "T4") },
    { value: 4, label: t("reminders.thu", "T5") },
    { value: 5, label: t("reminders.fri", "T6") },
    { value: 6, label: t("reminders.sat", "T7") },
    { value: 0, label: t("reminders.sun", "CN") },
  ];

  const reminderKindOptions: Array<{
    value: ReminderKind;
    label: string;
  }> = [
    { value: "measure", label: t("reminders.measure", "Đo chỉ số") },
    { value: "medication", label: t("reminders.medication", "Uống thuốc") },
  ];

  const reminderStatusOptions: Array<{
    value: ReminderStatusFilter;
    label: string;
  }> = [
    { value: "all", label: t("reminders.allStatuses", "Tất cả trạng thái") },
    { value: "active", label: t("reminders.active", "Đang chạy") },
    { value: "paused", label: t("reminders.paused", "Tạm dừng") },
    { value: "expired", label: t("reminders.expired", "Hết hạn") },
    { value: "canceled", label: t("reminders.canceled", "Đã hủy") },
  ];

  const createDefaultFormData = (patientId = ""): ReminderFormData => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    return {
      patientId,
      kind: "measure",
      message: "",
      time: "08:00",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      timezone: "Asia/Ho_Chi_Minh",
      startDate: today.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      status: "active",
    };
  };

  const toDateInputValue = (value: string) => value.slice(0, 10);
  const toStartOfDayIso = (value: string) => new Date(`${value}T00:00:00`).toISOString();
  const toEndOfDayIso = (value: string) => new Date(`${value}T23:59:59`).toISOString();

  const formatDate = (value: string) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };


  const formatTime = (hour: number, minute: number) =>
    `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const parseTimesString = (timeStr: string) => {
    if (!timeStr) return [];
    return timeStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => {
        const [hText, mText] = t.split(":");
        const hour = Number.parseInt(hText || "", 10);
        const minute = Number.parseInt(mText || "", 10);
        return { hour, minute };
      });
  };

  const getReminderFirstTime = (r: any) => {
    if (r.times && r.times.length > 0) {
      return r.times[0];
    }
    return { hour: r.hour || 0, minute: r.minute || 0 };
  };

  const getStatusLabel = (status: ReminderStatus) => {
    switch (status) {
      case "active": return t("reminders.active", "Đang chạy");
      case "paused": return t("reminders.paused", "Tạm dừng");
      case "expired": return t("reminders.expired", "Hết hạn");
      case "canceled": return t("reminders.canceled", "Đã hủy");
      default: return status;
    }
  };

  const getStatusClasses = (status: ReminderStatus) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "paused": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "expired": return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
      case "canceled": return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
      default: return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    }
  };

  const buildWeekdaySummary = (daysOfWeek: number[]) => {
    const orderedDays = weekdayOptions.filter((option) => daysOfWeek.includes(option.value));
    if (orderedDays.length === weekdayOptions.length) {
      return t("reminders.everyday", "Mỗi ngày");
    }
    return orderedDays.map((option) => option.label).join(" • ");
  };

  const initialPatientId = searchParams.get("patientId") ?? "";
  const { toast, showToast, hideToast } = useToast();

  const [patients, setPatients] = useState<AssignmentResponse[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [statusFilter, setStatusFilter] = useState<ReminderStatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<ReminderKindFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [hideInactive, setHideInactive] = useState(true);
  
  const [formData, setFormData] = useState<ReminderFormData>(createDefaultFormData(initialPatientId));
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [prescriptionMap, setPrescriptionMap] = useState<Map<string, Prescription>>(new Map());
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  
  // Modal for Viewing Group
  const [viewingGroup, setViewingGroup] = useState<MedicationGroup | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const patientOptions = useMemo(() => {
    const patientMap = new Map<string, AssignmentResponse>();
    patients.forEach((item) => {
      if (!patientMap.has(item.patientId)) patientMap.set(item.patientId, item);
    });
    return Array.from(patientMap.values()).sort((left, right) =>
      (left.patientName || "").localeCompare(right.patientName || ""),
    );
  }, [patients]);

  const patientDisplayMap = useMemo(() => {
    return new Map(patientOptions.map((item) => [
      item.patientId,
      {
        name: item.patientName || item.patientId,
        code: item.patientCode || item.patientPublicId || t("common.notUpdated", "N/A"),
      },
    ]));
  }, [patientOptions]);

  // Aggregation Logic
  const aggregatedItems = useMemo(() => {
    // 1. Filter
    const filteredList = reminders.filter(r => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (hideInactive && statusFilter === "all" && (r.status === "expired" || r.status === "canceled")) return false;
      
      if (searchTerm) {
        const pt = patientDisplayMap.get(r.patientId);
        const term = searchTerm.toLowerCase();
        const matchName = pt?.name?.toLowerCase().includes(term);
        const matchCode = pt?.code?.toLowerCase().includes(term);
        const matchMsg = r.message.toLowerCase().includes(term);
        if (!matchName && !matchCode && !matchMsg) return false;
      }
      return true;
    });

    // 2. Group
    const groups = new Map<string, MedicationGroup>();
    const singles: AggregatedItem[] = [];

    filteredList.forEach(r => {
      if (r.kind === "medication" && r.prescriptionId) {
        const key = `${r.patientId}_${r.prescriptionId}`;
        if (!groups.has(key)) {
          const pt = patientDisplayMap.get(r.patientId);
          groups.set(key, {
            id: key,
            type: "group",
            patientId: r.patientId,
            prescriptionId: r.prescriptionId,
            reminders: [],
            status: "expired",
            patientName: pt?.name || r.patientId,
            patientCode: pt?.code || "",
          });
        }
        groups.get(key)!.reminders.push(r);
      } else {
        singles.push({ type: "single", reminder: r });
      }
    });

    // 3. Compute group status and sort
    const groupArr = Array.from(groups.values());
    groupArr.forEach(g => {
      const statuses = g.reminders.map(r => r.status);
      if (statuses.includes("active")) g.status = "active";
      else if (statuses.includes("paused")) g.status = "paused";
      else if (statuses.includes("canceled")) g.status = "canceled";
      else g.status = "expired";
      
      // Sort reminders within group by time
      g.reminders.sort((a, b) => {
        const timeA = getReminderFirstTime(a);
        const timeB = getReminderFirstTime(b);
        if (timeA.hour !== timeB.hour) return timeA.hour - timeB.hour;
        return timeA.minute - timeB.minute;
      });
    });

    const allItems = [...groupArr, ...singles];
    allItems.sort((a, b) => {
      const timeA = a.type === "group" 
        ? Math.max(...a.reminders.map(r => new Date(r.createdAt).getTime())) 
        : new Date(a.reminder.createdAt).getTime();
      const timeB = b.type === "group" 
        ? Math.max(...b.reminders.map(r => new Date(r.createdAt).getTime())) 
        : new Date(b.reminder.createdAt).getTime();
      return timeB - timeA;
    });

    return allItems;
  }, [reminders, statusFilter, kindFilter, searchTerm, patientDisplayMap, hideInactive]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(aggregatedItems.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = aggregatedItems.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPatientId, statusFilter, kindFilter, searchTerm, hideInactive]);

  const applyReminderToForm = (reminder: ReminderRecord) => {
    let timeStr = "";
    if (reminder.times && reminder.times.length > 0) {
      timeStr = reminder.times.map((t) => formatTime(t.hour, t.minute)).join(", ");
    } else {
      timeStr = formatTime(reminder.hour, reminder.minute);
    }

    setFormData({
      patientId: reminder.patientId,
      kind: reminder.kind,
      message: reminder.message,
      time: timeStr,
      daysOfWeek: reminder.daysOfWeek,
      timezone: reminder.timezone,
      startDate: toDateInputValue(reminder.startDate),
      endDate: toDateInputValue(reminder.endDate),
      status: reminder.status,
    });
    setEditingReminderId(reminder.id);
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = (patientId = selectedPatientId || formData.patientId) => {
    setFormData(createDefaultFormData(patientId));
    setEditingReminderId(null);
  };

  const handleCloseForm = () => {
    setIsFormVisible(false);
    resetForm();
  };

  const handleOpenCreateForm = () => {
    resetForm(selectedPatientId);
    setIsFormVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildPayload = (): ReminderBasePayload | UpdateReminderPayload | null => {
    if (!formData.patientId) {
      showToast(t("reminders.patientRequired", "Vui lòng chọn bệnh nhân"), "error");
      return null;
    }
    if (!formData.message.trim()) {
      showToast(t("reminders.messageRequired", "Vui lòng nhập nội dung"), "error");
      return null;
    }
    if (formData.daysOfWeek.length === 0) {
      showToast(t("reminders.daysRequired", "Vui lòng chọn ngày"), "error");
      return null;
    }

    const times = parseTimesString(formData.time);
    if (times.length === 0) {
      showToast(t("reminders.invalidTime", "Giờ không hợp lệ"), "error");
      return null;
    }

    for (const tVal of times) {
      if (Number.isNaN(tVal.hour) || Number.isNaN(tVal.minute) || tVal.hour < 0 || tVal.hour > 23 || tVal.minute < 0 || tVal.minute > 59) {
        showToast(t("reminders.invalidTime", "Giờ không hợp lệ (định dạng HH:mm, ví dụ: 08:00, 12:00)"), "error");
        return null;
      }
    }

    const startDate = new Date(`${formData.startDate}T00:00:00`);
    const endDate = new Date(`${formData.endDate}T23:59:59`);

    if (endDate.getTime() < startDate.getTime()) {
      showToast(t("reminders.endDateBeforeStart", "Ngày kết thúc phải sau ngày bắt đầu"), "error");
      return null;
    }

    const basePayload: ReminderBasePayload = {
      patientId: formData.patientId,
      kind: formData.kind,
      message: formData.message.trim(),
      times,
      daysOfWeek: [...formData.daysOfWeek].sort((left, right) => left - right),
      timezone: formData.timezone,
      startDate: toStartOfDayIso(formData.startDate),
      endDate: toEndOfDayIso(formData.endDate),
    };

    if (!editingReminderId) return basePayload;
    return { ...basePayload, status: formData.status } as UpdateReminderPayload;
  };

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const assignments = await getMyPatients();
      setPatients(assignments);
      if (initialPatientId && !assignments.some((item) => item.patientId === initialPatientId)) {
        setSelectedPatientId("");
        setFormData(createDefaultFormData());
      }
    } catch (error) {
      console.error(error);
      showToast("Không thể tải danh sách bệnh nhân.", "error");
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadReminders = async () => {
    try {
      setLoadingReminders(true);
      const targetPatientIds = selectedPatientId ? [selectedPatientId] : patientOptions.map((item) => item.patientId);
      if (targetPatientIds.length === 0) {
        setReminders([]);
        return;
      }
      const reminderGroups = await Promise.all(
        targetPatientIds.map((patientId) => getReminders({ patientId }))
      );
      const merged = reminderGroups.flat();
      const uniqueReminders = Array.from(new Map(merged.map((item) => [item.id, item])).values());
      setReminders(uniqueReminders);

      // Fetch prescriptions for all medication reminders to enable per-slot drug computation
      const prescriptionIds = [...new Set(
        uniqueReminders
          .filter(r => r.kind === 'medication' && r.prescriptionId)
          .map(r => r.prescriptionId!)
      )];
      if (prescriptionIds.length > 0) {
        try {
          // Fetch all prescriptions for the relevant patients
          const patientIdsForRx = [...new Set(
            uniqueReminders.filter(r => r.kind === 'medication' && r.prescriptionId).map(r => r.patientId)
          )];
          const rxGroups = await Promise.all(
            patientIdsForRx.map(pid => getPrescriptions({ patientId: pid }))
          );
          const newMap = new Map<string, Prescription>();
          rxGroups.flat().forEach(rx => { newMap.set(rx.id, rx); });
          setPrescriptionMap(newMap);
        } catch (e) {
          console.error('Failed to load prescriptions for reminder page', e);
        }
      }
      
      // Update viewing group if modal is open
      setViewingGroup(prev => {
        if (!prev) return null;
        const latestReminders = uniqueReminders.filter(r => r.patientId === prev.patientId && r.prescriptionId === prev.prescriptionId);
        return { ...prev, reminders: latestReminders };
      });
      
    } catch (error) {
      console.error(error);
      showToast("Không thể tải danh sách nhắc nhở.", "error");
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => { void loadPatients(); }, []);
  useEffect(() => {
    if (patientOptions.length === 0 && !loadingPatients) { setReminders([]); return; }
    if (!loadingPatients && patientOptions.length > 0) { void loadReminders(); }
  }, [loadingPatients, patientOptions, selectedPatientId]);

  useEffect(() => {
    if (isFormVisible || viewingGroup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [isFormVisible, viewingGroup]);

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    try {
      setSaving(true);
      if (editingReminderId) {
        await updateReminder(editingReminderId, payload as UpdateReminderPayload);
        showToast(t("reminders.updateSuccess", "Cập nhật thành công"), "success");
      } else {
        await createReminder(payload as ReminderBasePayload);
        showToast(t("reminders.createSuccess", "Tạo mới thành công"), "success");
      }
      await loadReminders();
      resetForm((payload as ReminderBasePayload).patientId);
      setIsFormVisible(false);
    } catch (error: any) {
      console.error(error);
      showToast(error?.response?.data?.error || t("reminders.saveError", "Lỗi lưu"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusUpdate = async (reminder: ReminderRecord, nextStatus: ReminderStatus) => {
    const actionLabel = nextStatus === "paused" ? "tạm dừng" : nextStatus === "active" ? "tiếp tục" : "hủy";
    if (!window.confirm(`Bạn có muốn ${actionLabel} nhắc nhở này không?`)) return;

    try {
      setSaving(true);
      await updateReminderStatus(reminder.id, nextStatus);
      await loadReminders();
      showToast(`Đã ${actionLabel} nhắc nhở thành công.`, "success");
      if (editingReminderId === reminder.id) setFormData((c) => ({ ...c, status: nextStatus }));
    } catch (error: any) {
      showToast(error?.response?.data?.error || "Lỗi cập nhật", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-4 py-8 pb-24 sm:px-6 lg:px-8">
      {toast && <Toast toast={toast} onClose={hideToast} />}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{t("reminders.title", "Quản lý Nhắc nhở")}</h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400">Thiết lập và theo dõi lịch nhắc nhở đo chỉ số, uống thuốc của bệnh nhân.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="inline-flex items-center rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white transition shadow-sm"
          >
            <FaPlus className="mr-2" /> Tạo nhắc nhở đo chỉ số
          </button>
          <button
            type="button"
            onClick={() => void loadReminders()}
            disabled={loadingReminders}
            className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            <FaSyncAlt className={`mr-2 ${loadingReminders ? "animate-spin" : ""}`} /> Làm mới
          </button>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Tìm kiếm</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tên, mã, nội dung..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2.5 pl-9 pr-3 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Bệnh nhân</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tất cả bệnh nhân</option>
              {patientOptions.map((p) => (
                <option key={p.patientId} value={p.patientId}>
                  {(p.patientName || p.patientId) + (p.patientCode ? ` • ${p.patientCode}` : "")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Loại nhắc nhở</label>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as ReminderKindFilter)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">Tất cả loại</option>
              {reminderKindOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReminderStatusFilter)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {reminderStatusOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex items-center">
          <input
            id="hide-inactive-checkbox"
            type="checkbox"
            checked={hideInactive}
            onChange={(e) => setHideInactive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="hide-inactive-checkbox" className="ml-2 text-sm text-gray-600 dark:text-slate-400 cursor-pointer select-none">
            Ẩn nhắc nhở hết hạn và đã hủy
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Nhắc nhở và đơn thuốc ({aggregatedItems.length} mục)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loadingReminders ? (
          <div className="col-span-full py-12 text-center text-slate-500">Đang tải dữ liệu...</div>
        ) : aggregatedItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">Không tìm thấy nhắc nhở nào phù hợp.</div>
        ) : (
          currentItems.map((item) => {
            if (item.type === "group") {
              // Medication Group Card
              return (
                <div key={item.id} className="flex flex-col h-full rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                  <div className="flex-1 flex flex-col">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 px-5 py-4 flex justify-between items-start border-b border-indigo-100 dark:border-indigo-900/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <FaNotesMedical className="text-indigo-600 dark:text-indigo-400" />
                          <span className="font-semibold text-indigo-900 dark:text-indigo-200">Uống thuốc theo Đơn</span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{item.patientName}</h3>
                        <p className="text-xs text-slate-500">Mã BN: {item.patientCode || "N/A"}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClasses(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {item.reminders.length > 0 && (
                          <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold">Hiệu lực:</span>
                            <span>{formatDate(item.reminders[0].startDate)}</span>
                            <span>→</span>
                            <span>{formatDate(item.reminders[0].endDate)}</span>
                          </div>
                        )}
                        {/* Drug names summary - computed from prescription data */}
                        {(() => {
                          const rx = item.prescriptionId ? prescriptionMap.get(item.prescriptionId) : undefined;
                          if (!rx) return null;
                          const drugNames = [...new Set(rx.medications.map(m => m.drugName))];
                          if (drugNames.length === 0) return null;
                          return (
                            <ul className="mb-3 text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
                              {drugNames.slice(0, 3).map((d, i) => <li key={i} className="flex items-start gap-1.5"><span className="mt-1 text-indigo-400">•</span>{d}</li>)}
                              {drugNames.length > 3 && <li className="text-slate-400 text-xs">+{drugNames.length - 3} thuốc nữa...</li>}
                            </ul>
                          );
                        })()}
                        {/* Time slots chips - computed per slot from prescription.medications */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {(() => {
                            const rx = item.prescriptionId ? prescriptionMap.get(item.prescriptionId) : undefined;
                            // Collect all unique times from the single reminder record
                            const allTimes = new Map<string, number>(); // timeStr -> drugCount
                            item.reminders.forEach(r => {
                              const slots = (r.times && r.times.length > 0) ? r.times : [{ hour: r.hour || 0, minute: r.minute || 0 }];
                              slots.forEach(tObj => {
                                const timeStr = formatTime(tObj.hour, tObj.minute);
                                if (!allTimes.has(timeStr)) {
                                  // Count drugs at this slot from prescription
                                  let drugCount = 0;
                                  if (rx) {
                                    rx.medications.forEach(med => {
                                      med.schedule.forEach(dose => {
                                        const dh = (dose as any).hour ?? (dose.timeOfDay === 'morning' ? 8 : dose.timeOfDay === 'noon' ? 12 : 20);
                                        const dm = (dose as any).minute ?? 0;
                                        if (dh === tObj.hour && dm === tObj.minute) drugCount++;
                                      });
                                    });
                                  } else {
                                    // Fallback: count from message
                                    const msgs = (r.message || '').split(/;|\n/).filter(s => s.trim());
                                    drugCount = msgs.length || 1;
                                  }
                                  allTimes.set(timeStr, drugCount);
                                }
                              });
                            });
                            const sortedTimes = Array.from(allTimes.keys()).sort();
                            return (
                              <>
                                {sortedTimes.slice(0, 4).map((t, i) => (
                                  <span key={i} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-md font-medium border border-slate-200 dark:border-slate-600">
                                    {t} • {allTimes.get(t)} thuốc
                                  </span>
                                ))}
                                {sortedTimes.length > 4 && (
                                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs px-2 py-1 rounded-md font-medium">
                                    +{sortedTimes.length - 4} khung giờ nữa
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 pt-0">
                    <div className="flex gap-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button 
                        onClick={() => setViewingGroup(item)}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/50 dark:text-indigo-300 py-2 rounded-lg text-sm font-medium transition"
                      >
                        <FaListUl /> Xem lịch nhắc
                      </button>
                      <Link 
                        to={`/prescriptions?patientId=${item.patientId}&prescriptionId=${item.prescriptionId}`}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 py-2 rounded-lg text-sm font-medium transition"
                      >
                        Mở đơn thuốc <FaExternalLinkAlt className="text-xs opacity-70" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            } else {
              // Single Reminder Card
              const r = item.reminder;
              const ptInfo = patientDisplayMap.get(r.patientId);
              const canToggle = r.status === "active" || r.status === "paused";
              
              return (
                <div key={r.id} className="flex flex-col h-full rounded-xl border border-sky-200 dark:border-sky-900/50 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                  <div className="flex-1 flex flex-col">
                    <div className="bg-sky-50 dark:bg-sky-900/20 px-5 py-4 flex justify-between items-start border-b border-sky-100 dark:border-sky-900/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sky-600 dark:text-sky-400 font-semibold text-sm">
                             Nhắc {r.kind === "measure" ? "Đo chỉ số" : "Uống thuốc"}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100">{ptInfo?.name || r.patientId}</h3>
                        <p className="text-xs text-slate-500">Mã BN: {ptInfo?.code || "N/A"}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusClasses(r.status)}`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">{r.message}</p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] uppercase text-slate-500 mb-1">Giờ nhắc</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                              <FaRegClock className="mr-1.5 opacity-70"/>
                              {r.times && r.times.length > 0
                                ? r.times.map((t) => formatTime(t.hour, t.minute)).join(", ")
                                : formatTime(r.hour, r.minute)}
                            </p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                            <p className="text-[10px] uppercase text-slate-500 mb-1">Lặp lại</p>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={buildWeekdaySummary(r.daysOfWeek)}>{buildWeekdaySummary(r.daysOfWeek)}</p>
                          </div>
                        </div>

                        <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Hiệu lực:</span>
                          <span>{formatDate(r.startDate)}</span>
                          <span>→</span>
                          <span>{formatDate(r.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 pt-0">
                    <div className="flex flex-wrap gap-2 mt-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button onClick={() => applyReminderToForm(r)} disabled={!canToggle || saving} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                        Sửa
                      </button>
                      {r.status === "active" && (
                        <button onClick={() => void handleQuickStatusUpdate(r, "paused")} disabled={saving} className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:hover:bg-amber-800/60 dark:text-amber-400 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                          Dừng
                        </button>
                      )}
                      {r.status === "paused" && (
                        <button onClick={() => void handleQuickStatusUpdate(r, "active")} disabled={saving} className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/60 dark:text-emerald-400 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                          Tiếp tục
                        </button>
                      )}
                      {canToggle && (
                        <button onClick={() => void handleQuickStatusUpdate(r, "canceled")} disabled={saving} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 dark:text-rose-400 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                          Hủy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-5">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Hiển thị {startIndex + 1}-{Math.min(endIndex, aggregatedItems.length)} của {aggregatedItems.length} mục
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {viewingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chi tiết nhắc uống thuốc</h3>
                <p className="text-sm text-slate-500">Bệnh nhân: {viewingGroup.patientName}</p>
              </div>
              <button onClick={() => setViewingGroup(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-indigo-800 dark:text-indigo-300 mb-2">
                  Đây là các lịch nhắc được tự động sinh ra từ đơn thuốc. Để thay đổi giờ uống hoặc nội dung nhắc, vui lòng chỉnh sửa trực tiếp trong Đơn Thuốc.
                </p>
                <Link 
                  to={`/prescriptions?patientId=${viewingGroup.patientId}&prescriptionId=${viewingGroup.prescriptionId}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Đến trang Đơn Thuốc <FaExternalLinkAlt className="text-[10px]" />
                </Link>
              </div>
              
              {/* Group reminders by TIME SLOT for clarity */}
              {(() => {
                const mealTimingMapModal: Record<string, string> = {
                  "before meal": "trước ăn", "after meal": "sau ăn", "with meal": "trong bữa ăn",
                  "pre_meal": "trước ăn", "post_meal": "sau ăn", "with_meal": "trong bữa ăn",
                };
                const translateMsg = (msg: string) => {
                  let r = msg.trim();
                  Object.entries(mealTimingMapModal).forEach(([en, vi]) => { r = r.replace(new RegExp(en, 'gi'), vi); });
                  return r;
                };

                // Build map: timeKey -> { time, drugs: [{name, status, reminderId, rObj}] }
                type TimeSlotEntry = { time: string; hour: number; minute: number; drugs: Array<{ text: string; status: string; reminderId: string; rObj: ReminderRecord }> };
                const slotMap = new Map<string, TimeSlotEntry>();

                viewingGroup.reminders.forEach(r => {
                  const times = (r.times && r.times.length > 0)
                    ? r.times.map(tObj => ({ hour: tObj.hour, minute: tObj.minute }))
                    : [{ hour: r.hour, minute: r.minute }];

                  const drugs = (r.message || '').split(/;|\n/)
                    .map(s => translateMsg(s)).filter(Boolean);
                  const uniqueDrugs = Array.from(new Set(drugs));

                  times.forEach(({ hour, minute }) => {
                    const key = formatTime(hour, minute);
                    if (!slotMap.has(key)) slotMap.set(key, { time: key, hour, minute, drugs: [] });
                    uniqueDrugs.forEach(drugText => {
                      const existing = slotMap.get(key)!.drugs.find(d => d.text === drugText);
                      if (!existing) {
                        slotMap.get(key)!.drugs.push({ text: drugText, status: r.status, reminderId: r.id, rObj: r });
                      }
                    });
                  });
                });

                const sortedSlots = Array.from(slotMap.values()).sort((a, b) => a.hour - b.hour || a.minute - b.minute);

                // Compute per-reminder overall status for action buttons
                const reminderById = new Map(viewingGroup.reminders.map(r => [r.id, r]));

                return (
                  <div className="space-y-3">
                    {sortedSlots.map(slot => {
                      // Determine dominant status for this slot
                      const statuses = slot.drugs.map(d => d.status);
                      const slotStatus: ReminderStatus = statuses.includes('active') ? 'active' : statuses.includes('paused') ? 'paused' : statuses.includes('canceled') ? 'canceled' : 'expired';
                      // Collect unique reminders for action buttons
                      const uniqueReminderIds = Array.from(new Set(slot.drugs.map(d => d.reminderId)));

                      return (
                        <div key={slot.time} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-slate-800 dark:text-slate-200">{slot.time}</span>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusClasses(slotStatus)}`}>
                                {getStatusLabel(slotStatus)}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {uniqueReminderIds.map(rid => {
                                const rObj = reminderById.get(rid);
                                if (!rObj) return null;
                                return (
                                  <div key={rid} className="flex gap-1.5">
                                    {rObj.status === 'active' && (
                                      <button onClick={() => void handleQuickStatusUpdate(rObj, 'paused')} disabled={saving}
                                        className="bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50">Tạm dừng</button>
                                    )}
                                    {rObj.status === 'paused' && (
                                      <button onClick={() => void handleQuickStatusUpdate(rObj, 'active')} disabled={saving}
                                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50">Kích hoạt</button>
                                    )}
                                    {(rObj.status === 'active' || rObj.status === 'paused') && (
                                      <button onClick={() => void handleQuickStatusUpdate(rObj, 'canceled')} disabled={saving}
                                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50">Hủy</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* Drug list for this time slot */}
                          <ul className="space-y-1.5">
                            {slot.drugs.map((drug, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <span className="mt-1 text-indigo-500 shrink-0">💊</span>
                                <span>{drug.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-end">
              <button onClick={() => setViewingGroup(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg text-sm font-semibold transition">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal Form */}
      {isFormVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingReminderId ? "Chỉnh sửa nhắc nhở thủ công" : "Tạo nhắc nhở đo chỉ số"}
              </h3>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-500 focus:outline-none"><FaTimes size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Bệnh nhân *</label>
                  <select
                    name="patientId"
                    value={formData.patientId}
                    onChange={handleFormChange}
                    required
                    disabled={!!editingReminderId}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <option value="">Chọn bệnh nhân</option>
                    {patientOptions.map((p) => (
                      <option key={p.patientId} value={p.patientId}>
                        {(p.patientName || p.patientId) + (p.patientCode ? ` • ${p.patientCode}` : "")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Loại nhắc nhở *</label>
                  <select
                    name="kind"
                    value={formData.kind}
                    onChange={handleFormChange}
                    required
                    disabled={!!editingReminderId}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    {reminderKindOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {formData.kind === 'medication' && !editingReminderId && (
                     <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Lưu ý: Đây là nhắc thuốc thủ công, không tự động đồng bộ với đơn thuốc.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nội dung nhắc nhở *</label>
                <input
                  type="text"
                  name="message"
                  value={formData.message}
                  onChange={handleFormChange}
                  required
                  placeholder="VD: Nhớ đo huyết áp nhé!"
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Giờ nhắc (HH:mm) *</label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Ngày lặp lại trong tuần *</label>
                <div className="flex flex-wrap gap-2">
                  {weekdayOptions.map((day) => {
                    const isSelected = formData.daysOfWeek.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleToggleWeekday(day.value)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                {formData.daysOfWeek.length === 0 && <p className="mt-1 text-xs text-rose-500">Vui lòng chọn ít nhất 1 ngày.</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Ngày kết thúc *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {editingReminderId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Trạng thái</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Đang chạy</option>
                    <option value="paused">Tạm dừng</option>
                    <option value="canceled">Đã hủy</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={saving}
                  className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || formData.daysOfWeek.length === 0}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <FaSyncAlt className="mr-2 animate-spin" />
                  ) : null}
                  {editingReminderId ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderPage;

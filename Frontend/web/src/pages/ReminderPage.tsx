import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaEdit,
  FaPauseCircle,
  FaPlayCircle,
  FaPlus,
  FaRegClock,
  FaSave,
  FaStopCircle,
  FaSyncAlt,
  FaTimes,
  FaUndo,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { getMyPatients } from "../services/patientService";
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

const ReminderPage = () => {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

const weekdayOptions = [
  { value: 1, label: t("reminders.mon") },
  { value: 2, label: t("reminders.tue") },
  { value: 3, label: t("reminders.wed") },
  { value: 4, label: t("reminders.thu") },
  { value: 5, label: t("reminders.fri") },
  { value: 6, label: t("reminders.sat") },
  { value: 0, label: t("reminders.sun") },
];

const reminderKindOptions: Array<{
  value: ReminderKind;
  label: string;
  helper: string;
}> = [
  {
    value: "measure",
    label: t("reminders.measure"),
    helper: t("reminders.measureHelper"),
  },
  {
    value: "medication",
    label: t("reminders.medication"),
    helper: t("reminders.medicationHelper"),
  },
];

const reminderStatusOptions: Array<{
  value: ReminderStatusFilter;
  label: string;
}> = [
  { value: "all", label: t("reminders.allStatuses") },
  { value: "active", label: t("reminders.active") },
  { value: "paused", label: t("reminders.paused") },
  { value: "expired", label: t("reminders.expired") },
  { value: "canceled", label: t("reminders.canceled") },
];

const timezoneOptions = [
  { value: "Asia/Saigon", label: t("reminders.timezoneRecommended") },
  { value: "UTC", label: "UTC" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok" },
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
    timezone: "Asia/Saigon",
    startDate: today.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    status: "active",
  };
};

const toDateInputValue = (value: string) => value.slice(0, 10);
const toStartOfDayIso = (value: string) =>
  new Date(`${value}T00:00:00`).toISOString();
const toEndOfDayIso = (value: string) =>
  new Date(`${value}T23:59:59`).toISOString();

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

const getKindLabel = (kind: ReminderKind) =>
  kind === "measure" ? t("reminders.measure") : t("reminders.medication");

const getStatusLabel = (status: ReminderStatus) => {
  switch (status) {
    case "active":
      return t("reminders.active");
    case "paused":
      return t("reminders.paused");
    case "expired":
      return t("reminders.expired");
    case "canceled":
      return t("reminders.canceled");
    default:
      return status;
  }
};

const getStatusClasses = (status: ReminderStatus) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "paused":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "expired":
      return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    case "canceled":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    default:
      return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
};

const buildWeekdaySummary = (daysOfWeek: number[]) => {
  const orderedDays = weekdayOptions.filter((option) =>
    daysOfWeek.includes(option.value),
  );
  if (orderedDays.length === weekdayOptions.length) {
    return t("reminders.everyday");
  }

  return orderedDays.map((option) => option.label).join(" • ");
};



  const initialPatientId = searchParams.get("patientId") ?? "";

  const { toast, showToast, hideToast } = useToast();

  const [patients, setPatients] = useState<AssignmentResponse[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [statusFilter, setStatusFilter] = useState<ReminderStatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<ReminderKindFilter>("all");
  const [formData, setFormData] = useState<ReminderFormData>(
    createDefaultFormData(initialPatientId),
  );
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(
    null,
  );
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const patientOptions = useMemo(() => {
    const patientMap = new Map<string, AssignmentResponse>();

    patients.forEach((item) => {
      if (!patientMap.has(item.patientId)) {
        patientMap.set(item.patientId, item);
      }
    });

    return Array.from(patientMap.values()).sort((left, right) =>
      (left.patientName || "").localeCompare(right.patientName || ""),
    );
  }, [patients]);

  const patientDisplayMap = useMemo(() => {
    const entries = patientOptions.map(
      (item) =>
        [
          item.patientId,
          {
            name: item.patientName || item.patientId,
            code: item.patientCode || item.patientPublicId || t("common.notUpdated"),
          },
        ] as const,
    );

    return new Map(entries);
  }, [patientOptions]);

  const modeLabel = editingReminderId
    ? t("reminders.editReminder")
    : t("reminders.createNew");

  // Pagination calculations
  const totalPages = Math.ceil(reminders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReminders = reminders.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPatientId, statusFilter, kindFilter]);

  const applyReminderToForm = (reminder: ReminderRecord) => {
    setFormData({
      patientId: reminder.patientId,
      kind: reminder.kind,
      message: reminder.message,
      time: formatTime(reminder.hour, reminder.minute),
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

  const buildPayload = ():
    | ReminderBasePayload
    | UpdateReminderPayload
    | null => {
    if (!formData.patientId) {
      showToast(t("reminders.patientRequired"), "error");
      return null;
    }

    if (!formData.message.trim()) {
      showToast(t("reminders.messageRequired"), "error");
      return null;
    }

    if (formData.daysOfWeek.length === 0) {
      showToast(t("reminders.daysRequired"), "error");
      return null;
    }

    const [hourText, minuteText] = formData.time.split(":");
    const hour = Number.parseInt(hourText || "", 10);
    const minute = Number.parseInt(minuteText || "", 10);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      showToast(t("reminders.invalidTime"), "error");
      return null;
    }

    const startDate = new Date(`${formData.startDate}T00:00:00`);
    const endDate = new Date(`${formData.endDate}T23:59:59`);

    if (endDate.getTime() < startDate.getTime()) {
      showToast(t("reminders.endDateBeforeStart"), "error");
      return null;
    }

    const basePayload: ReminderBasePayload = {
      patientId: formData.patientId,
      kind: formData.kind,
      message: formData.message.trim(),
      hour,
      minute,
      daysOfWeek: [...formData.daysOfWeek].sort((left, right) => left - right),
      timezone: formData.timezone,
      startDate: toStartOfDayIso(formData.startDate),
      endDate: toEndOfDayIso(formData.endDate),
    };

    if (!editingReminderId) {
      return basePayload;
    }

    return {
      ...basePayload,
      status: formData.status,
    };
  };

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const assignments = await getMyPatients();
      setPatients(assignments);

      if (
        initialPatientId &&
        !assignments.some((item) => item.patientId === initialPatientId)
      ) {
        setSelectedPatientId("");
        setFormData(createDefaultFormData());
      }
    } catch (error) {
      console.error("Failed to load patients for reminders", error);
      showToast(
        "Không thể tải danh sách bệnh nhân để cấu hình nhắc nhở.",
        "error",
      );
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadReminders = async () => {
    try {
      setLoadingReminders(true);

      const targetPatientIds = selectedPatientId
        ? [selectedPatientId]
        : patientOptions.map((item) => item.patientId);

      if (targetPatientIds.length === 0) {
        setReminders([]);
        return;
      }

      const reminderGroups = await Promise.all(
        targetPatientIds.map((patientId) =>
          getReminders({
            patientId,
            status: statusFilter === "all" ? undefined : statusFilter,
            kind: kindFilter === "all" ? undefined : kindFilter,
          }),
        ),
      );

      const merged = reminderGroups.flat();
      const uniqueReminders = Array.from(
        new Map(merged.map((item) => [item.id, item])).values(),
      ).sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );

      setReminders(uniqueReminders);
    } catch (error) {
      console.error("Failed to load reminders", error);
      showToast("Không thể tải danh sách nhắc nhở.", "error");
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    if (patientOptions.length === 0 && !loadingPatients) {
      setReminders([]);
      return;
    }

    if (!loadingPatients && patientOptions.length > 0) {
      void loadReminders();
    }
  }, [
    loadingPatients,
    patientOptions,
    selectedPatientId,
    statusFilter,
    kindFilter,
  ]);

  useEffect(() => {
    if (!isFormVisible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFormVisible]);

  const handleFormChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePatientFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedPatientId(event.target.value);
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
        await updateReminder(
          editingReminderId,
          payload as UpdateReminderPayload,
        );
        showToast(t("reminders.updateSuccess"), "success");
      } else {
        await createReminder(payload as ReminderBasePayload);
        showToast(t("reminders.createSuccess"), "success");
      }

      await loadReminders();
      resetForm((payload as ReminderBasePayload).patientId);
      setIsFormVisible(false);
    } catch (error: any) {
      console.error("Failed to save reminder", error);
      showToast(
        error?.response?.data?.error || t("reminders.saveError"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusUpdate = async (
    reminder: ReminderRecord,
    nextStatus: ReminderStatus,
  ) => {
    const actionLabel =
      nextStatus === "paused"
        ? t("reminders.paused").toLowerCase()
        : nextStatus === "active"
          ? t("reminders.resume").toLowerCase()
          : t("common.cancel").toLowerCase();

    const confirmed = window.confirm(
      `Bạn có muốn ${actionLabel} nhắc nhở này không?`,
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      await updateReminderStatus(reminder.id, nextStatus);
      await loadReminders();
      showToast(`Đã ${actionLabel} nhắc nhở thành công.`, "success");

      if (editingReminderId === reminder.id) {
        setFormData((current) => ({ ...current, status: nextStatus }));
      }
    } catch (error: any) {
      console.error("Failed to update reminder status", error);
      showToast(
        error?.response?.data?.error ||
          t("reminders.statusUpdateError"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto  p-6">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{t("reminders.title")}</h1>
          <p className="mt-2 max-w-3xl text-gray-600 dark:text-slate-400">{t("reminders.description")}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <FaPlus className="mr-2" />{t("reminders.createReminder")}</button>
          <button
            type="button"
            onClick={() => void loadReminders()}
            disabled={loadingReminders}
            className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSyncAlt
              className={`mr-2 ${loadingReminders ? "animate-spin" : ""}`}
            />{t("common.refresh")}</button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.filterByPatient")}</label>
            <select
              value={selectedPatientId}
              onChange={handlePatientFilterChange}
              disabled={loadingPatients}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {loadingPatients
                  ? t("reminders.loadingPatients")
                  : t("reminders.allPatients")}
              </option>
              {patientOptions.map((patient) => (
                <option key={patient.patientId} value={patient.patientId}>
                  {(patient.patientName || patient.patientId) +
                    (patient.patientCode ? ` • ${patient.patientCode}` : "")}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:w-64">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.status")}</label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ReminderStatusFilter)
              }
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {reminderStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:w-64">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.reminderType")}</label>
            <select
              value={kindFilter}
              onChange={(event) =>
                setKindFilter(event.target.value as ReminderKindFilter)
              }
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t("reminders.allTypes")}</option>
              {reminderKindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">{t("reminders.reminderList")}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t("reminders.reminderListDesc")}</p>
          </div>
          <div className="flex items-center gap-3">
            {totalPages > 1 && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t("common.page")} {currentPage} {t("common.of")} {totalPages}
              </div>
            )}
            <div className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {reminders.length} {t("reminders.remindersCount")}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loadingReminders && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">{t("reminders.loadingReminders")}</div>
          )}

          {!loadingReminders && reminders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">{t("reminders.noReminders")}</div>
          )}

          {currentReminders.map((reminder) => {
            const patientInfo = patientDisplayMap.get(reminder.patientId);
            const canToggle =
              reminder.status === "active" || reminder.status === "paused";
            const canEdit =
              reminder.status === "active" || reminder.status === "paused";

            return (
              <div
                key={reminder.id}
                className=" border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {getKindLabel(reminder.kind)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(reminder.status)}`}
                      >
                        {getStatusLabel(reminder.status)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-semibold text-gray-900 dark:text-slate-100">
                        {patientInfo?.name || reminder.patientId}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-gray-500 dark:text-slate-400">
                        {patientInfo?.code || t("common.notUpdated")}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-slate-300">
                      {reminder.message}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("reminders.reminderTime")}</div>
                        <div className="mt-1 flex items-center text-sm font-semibold text-gray-800 dark:text-slate-100">
                          <FaRegClock className="mr-2 text-slate-400" />
                          {formatTime(reminder.hour, reminder.minute)}
                        </div>
                      </div>

                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("reminders.repeatDays")}</div>
                        <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {buildWeekdaySummary(reminder.daysOfWeek)}
                        </div>
                      </div>

                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("reminders.validity")}</div>
                        <div className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {formatDate(reminder.startDate)} -{" "}
                          {formatDate(reminder.endDate)}
                        </div>
                      </div>

                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("reminders.updated")}</div>
                        <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {formatDateTime(reminder.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => applyReminderToForm(reminder)}
                      disabled={!canEdit || saving}
                      className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaEdit className="mr-2" />{t("reminders.edit")}</button>

                    {reminder.status === "active" && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleQuickStatusUpdate(reminder, "paused")
                        }
                        disabled={saving}
                        className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaPauseCircle className="mr-2" />{t("reminders.paused")}</button>
                    )}

                    {reminder.status === "paused" && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleQuickStatusUpdate(reminder, "active")
                        }
                        disabled={saving}
                        className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaPlayCircle className="mr-2" />{t("reminders.resume")}</button>
                    )}

                    {canToggle && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleQuickStatusUpdate(reminder, "canceled")
                        }
                        disabled={saving}
                        className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaStopCircle className="mr-2" />{t("reminders.cancel")}</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t("common.showing")} {startIndex + 1}-{Math.min(endIndex, reminders.length)} {t("common.of")} {reminders.length} {t("reminders.remindersCount")}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaChevronLeft className="mr-1" />{t("common.previous")}</button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-medium transition ${
                      page === currentPage
                        ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                        : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
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
            aria-labelledby="reminder-form-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <div className="flex items-center justify-between  px-4 py-3">
              <h2
                id="reminder-form-title"
                className="text-lg font-semibold text-gray-900 dark:text-slate-100"
              >
                {modeLabel}
              </h2>
              <button
                type="button"
                onClick={handleCloseForm}
                className="p-2 items-center rounded-lg  dark:border-slate-600  text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                      onChange={handleFormChange}
                      disabled={loadingPatients || Boolean(editingReminderId)}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <option value="">
                        {loadingPatients
                          ? t("reminders.loadingPatients")
                          : t("reminders.selectPatient")}
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.reminderType")}</label>
                      <select
                        name="kind"
                        value={formData.kind}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {reminderKindOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                        {
                          reminderKindOptions.find(
                            (item) => item.value === formData.kind,
                          )?.helper
                        }
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.reminderTime")}</label>
                      <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.reminderContent")} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleFormChange}
                      placeholder={
                        formData.kind === "medication"
                          ? t("reminders.medicationPlaceholder")
                          : t("reminders.reminderContentPlaceholder")
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.repeatOn")}</label>
                    <div className="flex flex-wrap gap-2">
                      {weekdayOptions.map((option) => {
                        const active = formData.daysOfWeek.includes(
                          option.value,
                        );

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleToggleWeekday(option.value)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                              active
                                ? "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.validFrom")}</label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.validTo")}</label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.timezone")}</label>
                      <select
                        name="timezone"
                        value={formData.timezone}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {timezoneOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">{t("reminders.status")}</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleFormChange}
                        disabled={!editingReminderId}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <option value="active">{t("reminders.active")}</option>
                        <option value="paused">{t("reminders.paused")}</option>
                        <option value="canceled">{t("reminders.canceled")}</option>
                        <option value="expired">{t("reminders.expired")}</option>
                      </select>
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
                      ? t("reminders.saving")
                      : editingReminderId
                        ? t("reminders.updateReminder")
                        : t("reminders.saveReminder")}
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

export default ReminderPage;

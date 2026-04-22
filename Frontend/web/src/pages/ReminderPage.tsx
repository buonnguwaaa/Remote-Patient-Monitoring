import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
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

const weekdayOptions = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

const reminderKindOptions: Array<{
  value: ReminderKind;
  label: string;
  helper: string;
}> = [
  {
    value: "measure",
    label: "Đo chỉ số",
    helper: "Nhắc bệnh nhân đo huyết áp, đường huyết, SpO2...",
  },
  {
    value: "medication",
    label: "Uống thuốc",
    helper: "Nhắc bệnh nhân dùng thuốc đúng giờ và đều đặn.",
  },
];

const reminderStatusOptions: Array<{
  value: ReminderStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang chạy" },
  { value: "paused", label: "Tạm dừng" },
  { value: "expired", label: "Hết hạn" },
  { value: "canceled", label: "Đã hủy" },
];

const timezoneOptions = [
  { value: "Asia/Saigon", label: "Asia/Saigon (Khuyến nghị)" },
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
  kind === "measure" ? "Đo chỉ số" : "Uống thuốc";

const getStatusLabel = (status: ReminderStatus) => {
  switch (status) {
    case "active":
      return "Đang chạy";
    case "paused":
      return "Tạm dừng";
    case "expired":
      return "Hết hạn";
    case "canceled":
      return "Đã hủy";
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
    return "Mỗi ngày";
  }

  return orderedDays.map((option) => option.label).join(" • ");
};

const ReminderPage = () => {
  const [searchParams] = useSearchParams();
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
            code: item.patientCode || item.patientPublicId || "Chưa có mã",
          },
        ] as const,
    );

    return new Map(entries);
  }, [patientOptions]);

  const selectedPatientInfo = selectedPatientId
    ? patientDisplayMap.get(selectedPatientId)
    : null;
  const modeLabel = editingReminderId
    ? "Chỉnh sửa nhắc nhở"
    : "Tạo nhắc nhở mới";

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
      showToast("Vui lòng chọn bệnh nhân cho nhắc nhở này.", "error");
      return null;
    }

    if (!formData.message.trim()) {
      showToast("Nội dung nhắc nhở không được để trống.", "error");
      return null;
    }

    if (formData.daysOfWeek.length === 0) {
      showToast("Cần chọn ít nhất một ngày lặp lại.", "error");
      return null;
    }

    const [hourText, minuteText] = formData.time.split(":");
    const hour = Number.parseInt(hourText || "", 10);
    const minute = Number.parseInt(minuteText || "", 10);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      showToast("Giờ nhắc chưa hợp lệ.", "error");
      return null;
    }

    const startDate = new Date(`${formData.startDate}T00:00:00`);
    const endDate = new Date(`${formData.endDate}T23:59:59`);

    if (endDate.getTime() < startDate.getTime()) {
      showToast("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.", "error");
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
        showToast("Đã cập nhật nhắc nhở thành công.", "success");
      } else {
        await createReminder(payload as ReminderBasePayload);
        showToast("Đã tạo nhắc nhở mới thành công.", "success");
      }

      await loadReminders();
      resetForm((payload as ReminderBasePayload).patientId);
      setIsFormVisible(false);
    } catch (error: any) {
      console.error("Failed to save reminder", error);
      showToast(
        error?.response?.data?.error || "Không thể lưu nhắc nhở.",
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
        ? "tạm dừng"
        : nextStatus === "active"
          ? "kích hoạt lại"
          : "hủy";

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
          "Không thể cập nhật trạng thái nhắc nhở.",
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
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
            Nhắc Nhở Bệnh Nhân
          </h1>
          <p className="mt-2 max-w-3xl text-gray-600 dark:text-slate-400">
            Quản lý lịch nhắc đo chỉ số và uống thuốc theo từng bệnh nhân, theo
            dõi trạng thái chạy, và điều chỉnh nhanh khi kế hoạch chăm sóc thay
            đổi.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <FaPlus className="mr-2" />
            Tạo nhắc nhở
          </button>
          <button
            type="button"
            onClick={() => void loadReminders()}
            disabled={loadingReminders}
            className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FaSyncAlt
              className={`mr-2 ${loadingReminders ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Lọc theo bệnh nhân
            </label>
            <select
              value={selectedPatientId}
              onChange={handlePatientFilterChange}
              disabled={loadingPatients}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {loadingPatients
                  ? "-- Đang tải bệnh nhân --"
                  : "-- Tất cả bệnh nhân tôi quản lý --"}
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
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Trạng thái
            </label>
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
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Loại nhắc nhở
            </label>
            <select
              value={kindFilter}
              onChange={(event) =>
                setKindFilter(event.target.value as ReminderKindFilter)
              }
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả loại</option>
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
            <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
              Danh sách nhắc nhở
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Theo dõi lịch đang áp dụng, chỉnh sửa nhanh, và tạm dừng hay hủy
              khi kế hoạch thay đổi.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {reminders.length} nhắc nhở
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {loadingReminders && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              Đang tải reminder...
            </div>
          )}

          {!loadingReminders && reminders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              Chưa có reminder nào theo bộ lọc hiện tại.
            </div>
          )}

          {reminders.map((reminder) => {
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
                        {patientInfo?.code || "Chưa có mã"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-slate-300">
                      {reminder.message}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Giờ nhắc
                        </div>
                        <div className="mt-1 flex items-center text-sm font-semibold text-gray-800 dark:text-slate-100">
                          <FaRegClock className="mr-2 text-slate-400" />
                          {formatTime(reminder.hour, reminder.minute)}
                        </div>
                      </div>

                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Lặp lại
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {buildWeekdaySummary(reminder.daysOfWeek)}
                        </div>
                      </div>

                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Hiệu lực
                        </div>
                        <div className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {formatDate(reminder.startDate)} -{" "}
                          {formatDate(reminder.endDate)}
                        </div>
                      </div>

                      <div className="flex-none rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Cập nhật
                        </div>
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
                      <FaEdit className="mr-2" />
                      Chỉnh sửa
                    </button>

                    {reminder.status === "active" && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleQuickStatusUpdate(reminder, "paused")
                        }
                        disabled={saving}
                        className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FaPauseCircle className="mr-2" />
                        Tạm dừng
                      </button>
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
                        <FaPlayCircle className="mr-2" />
                        Tiếp tục
                      </button>
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
                        <FaStopCircle className="mr-2" />
                        Hủy lịch
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
                      Bệnh nhân <span className="text-red-500">*</span>
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
                          ? "-- Đang tải bệnh nhân --"
                          : "-- Chọn bệnh nhân --"}
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
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Loại nhắc nhở
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Giờ nhắc
                      </label>
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
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      Nội dung nhắc nhở <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleFormChange}
                      placeholder={
                        formData.kind === "medication"
                          ? "Ví dụ: Uống thuốc huyết áp sau ăn sáng."
                          : "Ví dụ: Đo huyết áp và SpO2 trước 8h sáng."
                      }
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      Lặp lại theo ngày
                    </label>
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
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Hiệu lực từ ngày
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Hiệu lực đến ngày
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Múi giờ
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Trạng thái
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleFormChange}
                        disabled={!editingReminderId}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <option value="active">Đang chạy</option>
                        <option value="paused">Tạm dừng</option>
                        <option value="canceled">Đã hủy</option>
                        <option value="expired">Hết hạn</option>
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
                  <FaUndo className="mr-2" />
                  Đặt lại
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.patientId || saving}
                    className="inline-flex items-center rounded-lg bg-slate-800 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 transition hover:bg-slate-700 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600 dark:disabled:text-slate-100"
                  >
                    <FaSave className="mr-2" />
                    {saving
                      ? "Đang lưu..."
                      : editingReminderId
                        ? "Cập nhật nhắc nhở"
                        : "Lưu nhắc nhở"}
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

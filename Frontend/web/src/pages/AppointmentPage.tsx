import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FaCalendarAlt,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaPlus,
  FaSyncAlt,
  FaTimes,
  FaMapMarkerAlt,
  FaStickyNote,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { getMyPatients } from "../services/patientService";
import {
  getMyAppointments,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  type FollowUpAppointment,
  type AppointmentStatus,
} from "../services/appointmentService";
import type { AssignmentResponse } from "../types/patient";

// ── Constants ──────────────────────────────────────────────────────────────

const TIMEZONE = "Asia/Ho_Chi_Minh";
const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS: { value: AppointmentStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "scheduled", label: "Đã đặt" },
  { value: "completed", label: "Hoàn thành" },
  { value: "canceled", label: "Đã hủy" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });

const toLocalDateString = (iso: string) => {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split("T")[0];
};

const toLocalTimeString = (iso: string) => {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  });
};

const toISOFromLocalInputs = (date: string, time: string): string => {
  return new Date(`${date}T${time}:00`).toISOString();
};

const getStatusStyle = (status: AppointmentStatus) => {
  switch (status) {
    case "scheduled":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "canceled":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  }
};

const getStatusLabel = (status: AppointmentStatus) => {
  switch (status) {
    case "scheduled":
      return "Đã đặt";
    case "completed":
      return "Hoàn thành";
    case "canceled":
      return "Đã hủy";
  }
};

// ── DayScheduleChart ───────────────────────────────────────────────────────

interface DayScheduleChartProps {
  date: string;
  time: string;
  onTimeChange: (t: string) => void;
  existingItems: { id: string; time: string; name: string }[];
}

function DayScheduleChart({
  date,
  time,
  onTimeChange,
  existingItems,
}: DayScheduleChartProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragWinStart = useRef(0);

  const WIN_HALF = 90;
  const RANGE = 180;

  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const minsToTime = (mins: number) => {
    const snapped = Math.round(mins / 2) * 2;
    const clamped = Math.max(0, Math.min(23 * 60 + 45, snapped));
    return `${Math.floor(clamped / 60)
      .toString()
      .padStart(2, "0")}:${(clamped % 60).toString().padStart(2, "0")}`;
  };

  const selectedMins = time ? toMins(time) : 9 * 60;
  const winStart = Math.max(6 * 60, selectedMins - WIN_HALF);
  const pct = (mins: number) =>
    `${(((Math.max(winStart, Math.min(winStart + RANGE, mins)) - winStart) / RANGE) * 100).toFixed(2)}%`;

  const ticks: number[] = [];
  for (let m = Math.ceil(winStart / 30) * 30; m <= winStart + RANGE; m += 30)
    ticks.push(m);

  const conflict = existingItems.some((e) => e.time === time);

  const calcMins = (clientX: number, ws: number) => {
    if (!barRef.current) return null;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ws + ratio * RANGE;
  };

  const handleBarClick = (e: React.MouseEvent) => {
    if (dragging.current) return;
    const mins = calcMins(e.clientX, winStart);
    if (mins !== null) onTimeChange(minsToTime(mins));
  };

  const handleDotMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    dragWinStart.current = winStart;

    const onMove = (ev: MouseEvent) => {
      const mins = calcMins(ev.clientX, dragWinStart.current);
      if (mins !== null) onTimeChange(minsToTime(mins));
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 pt-3 pb-4">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Biểu đồ lịch —{" "}
        {new Date(date + "T00:00:00").toLocaleDateString("vi-VN", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        })}
        <span className="ml-2 normal-case font-normal text-slate-300 dark:text-slate-600">
          kéo hoặc click để chọn giờ
        </span>
      </p>

      <div className="relative select-none" style={{ height: "68px" }}>
        {/* Timeline bar */}
        <div className="absolute inset-x-0" style={{ top: "24px" }}>
          <div
            ref={barRef}
            className="relative h-1.5 cursor-crosshair rounded-full bg-slate-200 dark:bg-slate-600"
            onClick={handleBarClick}
          >
            {ticks.map((m) => (
              <div
                key={m}
                className={`pointer-events-none absolute top-0 bottom-0 w-px ${
                  m % 60 === 0
                    ? "bg-slate-300 dark:bg-slate-500"
                    : "bg-slate-200 dark:bg-slate-600"
                }`}
                style={{ left: pct(m) }}
              />
            ))}

            {/* Existing appointments — tiny dots */}
            {existingItems.map((item) => (
              <div
                key={item.id}
                title={`${item.time} · ${item.name}`}
                className="pointer-events-none absolute top-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400"
                style={{ left: pct(toMins(item.time)) }}
              />
            ))}

            {/* New appointment dot — draggable */}
            {time && (
              <div
                onMouseDown={handleDotMouseDown}
                className={`absolute top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-white shadow active:cursor-grabbing dark:border-slate-900 ${
                  conflict ? "bg-rose-500" : "bg-indigo-500"
                }`}
                style={{ left: pct(toMins(time)) }}
              />
            )}
          </div>

          {/* Tick labels */}
          <div className="relative mt-1.5">
            {ticks
              .filter((m) => m % 60 === 0)
              .map((m) => (
                <span
                  key={m}
                  className="pointer-events-none absolute -translate-x-1/2 text-[9px] text-slate-400 dark:text-slate-500"
                  style={{ left: pct(m) }}
                >
                  {`${Math.floor(m / 60)}:00`}
                </span>
              ))}
          </div>
        </div>

        {/* Time label above dot */}
        {time && (
          <div
            className="pointer-events-none absolute flex -translate-x-1/2 flex-col items-center gap-0.5"
            style={{ left: pct(toMins(time)), top: 0 }}
          >
            <span
              className={`font-mono text-[10px] font-bold leading-none ${
                conflict
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-indigo-600 dark:text-indigo-400"
              }`}
            >
              {time}
            </span>
            <div
              className={`w-px ${conflict ? "bg-rose-400" : "bg-indigo-400"}`}
              style={{ height: "6px" }}
            />
          </div>
        )}
      </div>

      {conflict && (
        <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
          ⚠ Giờ này đã có lịch — bạn vẫn có thể đặt nhưng nên kiểm tra lại.
        </p>
      )}
      {existingItems.length === 0 && (
        <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          ✓ Ngày này chưa có lịch nào khác
        </p>
      )}
    </div>
  );
}

// ── LocationCombobox ───────────────────────────────────────────────────────

interface LocationComboboxProps {
  value: string;
  onChange: (v: string) => void;
}

function LocationCombobox({ value, onChange }: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value
    ? LOCATION_OPTIONS.filter((o) =>
        o.toLowerCase().includes(value.toLowerCase()),
      )
    : LOCATION_OPTIONS;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        placeholder="Gõ hoặc chọn địa điểm..."
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
          {filtered.map((loc) => (
            <li
              key={loc}
              onMouseDown={() => {
                onChange(loc);
                setOpen(false);
              }}
              className={`cursor-pointer px-4 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${
                loc === value
                  ? "font-semibold text-indigo-600 dark:text-indigo-400"
                  : "text-gray-800 dark:text-slate-100"
              }`}
            >
              {loc}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface PatientSelectProps {
  value: string;
  onChange: (id: string) => void;
  patients: AssignmentResponse[];
  disabled?: boolean;
  placeholder?: string;
}

function PatientSelect({
  value,
  onChange,
  patients,
  disabled,
  placeholder,
}: PatientSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = patients.find((p) => p.patientId === value);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return patients.filter(
      (p) =>
        (p.patientName || "").toLowerCase().includes(q) ||
        (p.patientCode || p.patientPublicId || "").toLowerCase().includes(q),
    );
  }, [patients, query]);

  const label = selected
    ? `${selected.patientName || selected.patientId} (${selected.patientCode || selected.patientPublicId || ""})`
    : "";

  return (
    <div className="relative">
      <div
        className={`flex cursor-pointer items-center justify-between rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 ${disabled ? "opacity-60 pointer-events-none" : "hover:border-blue-400"}`}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={label ? "" : "text-gray-400 dark:text-slate-400"}>
          {label || placeholder || "Chọn bệnh nhân..."}
        </span>
        <FaChevronDown className="shrink-0 text-gray-400 text-xs" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              placeholder="Tìm tên hoặc mã bệnh nhân..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto pb-2">
            {value && (
              <li
                className="cursor-pointer px-4 py-2 text-sm text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                onClick={() => {
                  onChange("");
                  setQuery("");
                  setOpen(false);
                }}
              >
                — Bỏ chọn —
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-4 py-2 text-sm text-gray-400">
                Không tìm thấy
              </li>
            ) : (
              filtered.map((p) => (
                <li
                  key={p.patientId}
                  className={`cursor-pointer px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${p.patientId === value ? "font-semibold text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-slate-100"}`}
                  onClick={() => {
                    onChange(p.patientId);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {p.patientName || p.patientId}
                  <span className="ml-2 text-xs text-gray-400">
                    {p.patientCode || p.patientPublicId || ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Location presets ───────────────────────────────────────────────────────

const LOCATION_OPTIONS = [
  "Phòng khám 1",
  "Phòng khám 2",
  "Phòng khám 3",
  "Phòng khám 4",
  "Khoa Nội",
  "Khoa Ngoại",
  "Khoa Tim mạch",
  "Khoa Thần kinh",
  "Khoa Hô hấp",
  "Khoa Tiêu hóa",
  "Khoa Nhi",
  "Khoa Sản",
  "Khoa Mắt",
  "Khoa Tai mũi họng",
  "Khoa Da liễu",
  "Khoa Ung bướu",
  "Phòng xét nghiệm",
  "Phòng siêu âm",
  "Phòng X-quang",
  "Phòng nội soi",
];

// ── Form state ─────────────────────────────────────────────────────────────

interface FormData {
  patientId: string;
  date: string;
  time: string;
  location: string;
  notes: string;
}

const defaultForm = (patientId = ""): FormData => {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const dateStr = now.toISOString().split("T")[0];
  return { patientId, date: dateStr, time: "08:00", location: "", notes: "" };
};

// ── Main component ─────────────────────────────────────────────────────────

export default function AppointmentPage() {
  const { toast, showToast, hideToast } = useToast();

  const [patients, setPatients] = useState<AssignmentResponse[]>([]);
  const [appointments, setAppointments] = useState<FollowUpAppointment[]>([]);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterPatientId, setFilterPatientId] = useState("");

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [allScheduled, setAllScheduled] = useState<FollowUpAppointment[]>([]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const patientMap = useMemo(() => {
    const map = new Map<string, AssignmentResponse>();
    patients.forEach((p) => {
      if (!map.has(p.patientId)) map.set(p.patientId, p);
    });
    return map;
  }, [patients]);

  const patientOptions = useMemo(
    () =>
      Array.from(patientMap.values()).sort((a, b) =>
        (a.patientName || "").localeCompare(b.patientName || ""),
      ),
    [patientMap],
  );

  const filteredAppointments = useMemo(() => {
    if (!filterPatientId) return appointments;
    return appointments.filter((a) => a.patientId === filterPatientId);
  }, [appointments, filterPatientId]);

  // Lịch đã có trong ngày bác sĩ chọn ở form (để hiển thị lịch trống)
  const appointmentsOnFormDate = useMemo(() => {
    if (!form.date) return [];
    return allScheduled
      .filter((a) => {
        if (editingId && a.id === editingId) return false;
        const d = new Date(a.scheduledAt).toLocaleDateString("sv-SE", {
          timeZone: TIMEZONE,
        });
        return d === form.date;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
  }, [allScheduled, form.date, editingId]);

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const pagedAppointments = filteredAppointments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Data loading ──────────────────────────────────────────────────────────

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

  const loadAllScheduled = useCallback(async () => {
    try {
      const list = await getMyAppointments({ status: "scheduled" });
      setAllScheduled(list);
    } catch {
      // non-critical, ignore
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    try {
      setLoadingList(true);
      const list = await getMyAppointments({
        status: statusFilter || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(`${toDate}T23:59:59`).toISOString() : undefined,
      });
      setAppointments(list);
      setCurrentPage(1);
    } catch {
      showToast("Không thể tải danh sách lịch tái khám.", "error");
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, fromDate, toDate]);

  useEffect(() => {
    void loadPatients();
  }, []);
  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);
  useEffect(() => {
    void loadAllScheduled();
  }, [loadAllScheduled]);

  // ── Form actions ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(defaultForm(filterPatientId));
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEdit = (appt: FollowUpAppointment) => {
    setForm({
      patientId: appt.patientId,
      date: toLocalDateString(appt.scheduledAt),
      time: toLocalTimeString(appt.scheduledAt),
      location: appt.location || "",
      notes: appt.notes || "",
    });
    setEditingId(appt.id);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.patientId) {
      showToast("Vui lòng chọn bệnh nhân.", "error");
      return;
    }
    if (!form.date || !form.time) {
      showToast("Vui lòng chọn ngày và giờ tái khám.", "error");
      return;
    }

    const scheduledAt = toISOFromLocalInputs(form.date, form.time);
    if (new Date(scheduledAt) <= new Date()) {
      showToast("Thời gian tái khám phải sau thời điểm hiện tại.", "error");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateAppointment(editingId, {
          scheduledAt,
          timezone: TIMEZONE,
          location: form.location || undefined,
          notes: form.notes || undefined,
        });
        showToast("Cập nhật lịch tái khám thành công.", "success");
      } else {
        await createAppointment({
          patientId: form.patientId,
          scheduledAt,
          timezone: TIMEZONE,
          location: form.location || undefined,
          notes: form.notes || undefined,
        });
        showToast("Đặt lịch tái khám thành công.", "success");
      }
      closeForm();
      await Promise.all([loadAppointments(), loadAllScheduled()]);
    } catch (err: any) {
      showToast(
        err?.response?.data?.error || "Không thể lưu lịch tái khám.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    appt: FollowUpAppointment,
    status: AppointmentStatus,
  ) => {
    if (!window.confirm(`Đổi trạng thái sang "${getStatusLabel(status)}"?`))
      return;
    try {
      setSaving(true);
      await updateAppointmentStatus(appt.id, status);
      showToast("Cập nhật trạng thái thành công.", "success");
      await Promise.all([loadAppointments(), loadAllScheduled()]);
    } catch (err: any) {
      showToast(
        err?.response?.data?.error || "Không thể cập nhật trạng thái.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto p-6 pb-24">
      <Toast toast={toast} onClose={hideToast} />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <FaCalendarAlt size={20} />
            </div>
            Lịch tái khám
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Quản lý và đặt lịch tái khám cho bệnh nhân. Hệ thống sẽ tự động nhắc
            nhở bệnh nhân 24 giờ trước.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <FaPlus className="mr-2" />
            Tạo lịch mới
          </button>
          <button
            type="button"
            onClick={() => void loadAppointments()}
            disabled={loadingList}
            className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
          >
            <FaSyncAlt
              className={`mr-2 ${loadingList ? "animate-spin" : ""}`}
            />
            Làm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Lọc theo bệnh nhân
            </label>
            <PatientSelect
              value={filterPatientId}
              onChange={(id) => {
                setFilterPatientId(id);
                setCurrentPage(1);
              }}
              patients={patientOptions}
              disabled={loadingPatients}
              placeholder={loadingPatients ? "Đang tải..." : "Tất cả bệnh nhân"}
            />
          </div>

          <div className="lg:w-48">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as AppointmentStatus | "")
              }
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:w-44">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Từ ngày
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="lg:w-44">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Appointment List */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
              Danh sách lịch tái khám
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {filteredAppointments.length} lịch hẹn
            </p>
          </div>
        </div>

        {loadingList ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Đang tải...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-10 text-center">
            <FaCalendarAlt className="mx-auto mb-3 text-3xl text-slate-300" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Chưa có lịch tái khám nào.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-3 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <FaPlus className="mr-2" />
              Tạo lịch đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pagedAppointments.map((appt) => {
              const patient = patientMap.get(appt.patientId);
              const isExpanded = expandedIds.has(appt.id);
              const patientName = patient?.patientName || appt.patientId;
              const patientCode =
                patient?.patientCode || patient?.patientPublicId || "";

              return (
                <div
                  key={appt.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
                >
                  {/* Card row */}
                  <div
                    className="grid cursor-pointer grid-cols-1 gap-4 p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 md:grid-cols-12 md:items-center"
                    onClick={() => toggleExpand(appt.id)}
                  >
                    {/* Patient */}
                    <div className="md:col-span-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {patientName}
                      </p>
                      {patientCode && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {patientCode}
                        </p>
                      )}
                    </div>

                    {/* Date/time */}
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 md:col-span-4">
                      <FaCalendarAlt className="shrink-0 text-indigo-400" />
                      <span>{formatDateTime(appt.scheduledAt)}</span>
                    </div>

                    {/* Status + chevron */}
                    <div className="flex items-center justify-between gap-3 md:col-span-4 md:justify-end">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(appt.status)}`}
                      >
                        {getStatusLabel(appt.status)}
                      </span>
                      {isExpanded ? (
                        <FaChevronDown className="text-slate-400 shrink-0" />
                      ) : (
                        <FaChevronRight className="text-slate-400 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
                      {appt.location && (
                        <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <FaMapMarkerAlt className="mt-0.5 shrink-0 text-slate-400" />
                          <span>{appt.location}</span>
                        </div>
                      )}
                      {appt.notes && (
                        <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <FaStickyNote className="mt-0.5 shrink-0 text-slate-400" />
                          <span>{appt.notes}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {appt.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() => openEdit(appt)}
                            disabled={saving}
                            className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <FaEdit className="mr-1" />
                            Chỉnh sửa
                          </button>
                        )}
                        {appt.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleStatusChange(appt, "completed")
                            }
                            disabled={saving}
                            className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                          >
                            <FaCheckCircle className="mr-1" />
                            Hoàn thành
                          </button>
                        )}
                        {appt.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleStatusChange(appt, "canceled")
                            }
                            disabled={saving}
                            className="inline-flex items-center rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                          >
                            <FaTimesCircle className="mr-1" />
                            Hủy lịch
                          </button>
                        )}
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
                Trước
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
                Sau
                <FaChevronRight className="ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-slate-100">
                <FaCalendarAlt className="text-indigo-500" />
                {editingId ? "Chỉnh sửa lịch tái khám" : "Đặt lịch tái khám"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-5 p-6"
            >
              {/* Patient */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Bệnh nhân <span className="text-rose-500">*</span>
                </label>
                <PatientSelect
                  value={form.patientId}
                  onChange={(id) => setForm((f) => ({ ...f, patientId: id }))}
                  patients={patientOptions}
                  disabled={!!editingId}
                />
                {!!editingId && (
                  <p className="mt-1 text-xs text-slate-400">
                    Không thể đổi bệnh nhân khi chỉnh sửa.
                  </p>
                )}
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Ngày tái khám <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Giờ tái khám <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={form.time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, time: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Day schedule chart */}
              {form.date && (
                <DayScheduleChart
                  date={form.date}
                  time={form.time}
                  onTimeChange={(t) => setForm((f) => ({ ...f, time: t }))}
                  existingItems={appointmentsOnFormDate.map((a) => ({
                    id: a.id,
                    time: toLocalTimeString(a.scheduledAt),
                    name:
                      patientMap.get(a.patientId)?.patientName || "Bệnh nhân",
                  }))}
                />
              )}

              {/* Location */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Địa điểm
                </label>
                <LocationCombobox
                  value={form.location}
                  onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="VD: Mang theo kết quả xét nghiệm, nhịn ăn trước 6 giờ"
                  className="w-full resize-none rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Reminder notice */}
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 text-xs text-indigo-700 dark:text-indigo-300">
                Bệnh nhân sẽ nhận thông báo nhắc nhở tự động{" "}
                <strong>24 giờ trước</strong> giờ tái khám.
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Đặt lịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

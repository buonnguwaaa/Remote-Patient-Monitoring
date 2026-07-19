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
  FaThList,
  FaCalendarWeek,
  FaCalendarDay,
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
const CALENDAR_START_HOUR = 6;
const CALENDAR_END_HOUR = 20;
const HOUR_HEIGHT = 60; // px per hour

const STATUS_OPTIONS: { value: AppointmentStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "scheduled", label: "Đã đặt" },
  { value: "completed", label: "Hoàn thành" },
  { value: "canceled", label: "Đã hủy" },
];

const VI_DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

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

const toMins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
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

// Calendar-specific status colors (bg for event cards)
const getCalendarEventStyle = (status: AppointmentStatus) => {
  switch (status) {
    case "scheduled":
      return {
        bg: "bg-blue-500 hover:bg-blue-600",
        border: "border-l-4 border-l-blue-700",
        text: "text-white",
      };
    case "completed":
      return {
        bg: "bg-emerald-500 hover:bg-emerald-600",
        border: "border-l-4 border-l-emerald-700",
        text: "text-white",
      };
    case "canceled":
      return {
        bg: "bg-rose-400 hover:bg-rose-500",
        border: "border-l-4 border-l-rose-600",
        text: "text-white",
      };
  }
};

// Get start of week (Monday) for a date
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  // Start on Monday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dateToYMD = (d: Date) => d.toISOString().split("T")[0];

// ── DayScheduleChart ───────────────────────────────────────────────────────

interface DayScheduleChartProps {
  date: string;
  time: string;
  onTimeChange: (t: string) => void;
  existingItems: {
    id: string;
    time: string;
    name: string;
    duration?: number;
  }[];
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

  const newStartMins = time ? toMins(time) : 9 * 60;
  const newEndMins = newStartMins + 30;

  const conflict = existingItems.some((e) => {
    const start = toMins(e.time);
    const end = start + (e.duration || 30);
    return start < newEndMins && newStartMins < end;
  });

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

            {/* Existing appointments — shaded intervals */}
            {existingItems.map((item) => {
              const start = toMins(item.time);
              const duration = item.duration || 30;
              const end = start + duration;

              // Calculate width in percentage
              const leftPct = pct(start);

              // We calculate width relative to the visible timeline range
              const visibleStart = Math.max(winStart, start);
              const visibleEnd = Math.min(winStart + RANGE, end);
              const widthPct =
                visibleEnd > visibleStart
                  ? `${(((visibleEnd - visibleStart) / RANGE) * 100).toFixed(2)}%`
                  : "0%";

              return (
                <div
                  key={item.id}
                  title={`${item.time} - ${minsToTime(end)} · ${item.name}`}
                  className="pointer-events-none absolute top-0 bottom-0 z-10 bg-rose-200/40 dark:bg-rose-900/30 border-l border-r border-rose-400/50"
                  style={{
                    left: leftPct,
                    width: widthPct,
                  }}
                />
              );
            })}

            {/* New appointment dot — draggable */}
            {time && (
              <div
                onMouseDown={handleDotMouseDown}
                className={`absolute top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-white shadow active:cursor-grabbing dark:border-slate-900 ${
                  conflict ? "bg-rose-500 animate-pulse" : "bg-indigo-500"
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
          ⚠ Giờ này đã có lịch — không thể tạo lịch trùng giờ.
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

// ── MiniCalendar ──────────────────────────────────────────────────────────

interface MiniCalendarProps {
  selected: Date;
  onSelect: (d: Date) => void;
}

function MiniCalendar({ selected, onSelect }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(selected);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Sync viewMonth when selected jumps far away
  useEffect(() => {
    if (
      selected.getFullYear() !== viewMonth.getFullYear() ||
      selected.getMonth() !== viewMonth.getMonth()
    ) {
      const d = new Date(selected);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      setViewMonth(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  // First day-of-week of the month (0=Sun)
  const firstDow = new Date(year, month, 1).getDay();
  // Shift so week starts Monday: Mon=0 … Sun=6
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(year, month, i + 1),
    ),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));
  const goThisMonth = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setViewMonth(d);
    onSelect(new Date());
  };

  const monthLabel = viewMonth.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <FaChevronLeft size={10} />
        </button>
        <button
          onClick={goThisMonth}
          className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition capitalize"
        >
          {monthLabel}
        </button>
        <button
          onClick={nextMonth}
          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <FaChevronRight size={10} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-2">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-2">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} />;
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selected);

          return (
            <button
              key={idx}
              onClick={() => onSelect(date)}
              className={`relative flex flex-col items-center justify-center rounded-full w-9 h-9 mx-auto text-xs font-medium transition ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : isToday
                    ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── CalendarView ───────────────────────────────────────────────────────────

type CalendarMode = "week" | "day";

interface CalendarViewProps {
  appointments: FollowUpAppointment[];
  patientMap: Map<string, AssignmentResponse>;
  onEdit: (appt: FollowUpAppointment) => void;
  onStatusChange: (
    appt: FollowUpAppointment,
    status: AppointmentStatus,
  ) => void;
  saving: boolean;
  onCreateAtDate?: (date: string, time: string) => void;
}

function CalendarView({
  appointments,
  patientMap,
  onEdit,
  onStatusChange,
  saving,
  onCreateAtDate,
}: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedAppt, setSelectedAppt] = useState<FollowUpAppointment | null>(
    null,
  );
  const popupRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = new Date().getHours();
      const scrollTop = Math.max(
        0,
        (currentHour - CALENDAR_START_HOUR - 1) * HOUR_HEIGHT,
      );
      scrollRef.current.scrollTop = scrollTop;
    }
  }, [mode]);

  // Close popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedAppt(null);
      }
    };
    if (selectedAppt) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedAppt]);

  const weekStart = getWeekStart(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const prevPeriod = () => {
    if (mode === "week") setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };
  const nextPeriod = () => {
    if (mode === "week") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  // Get appointments for a specific day
  const getApptForDay = (day: Date) =>
    appointments.filter((a) => {
      const d = new Date(a.scheduledAt);
      return isSameDay(d, day);
    });

  // Compute top offset (px) and height (px) for an appointment card
  const getEventStyle = (scheduledAt: string) => {
    const d = new Date(scheduledAt);
    const localH = parseInt(
      d.toLocaleString("vi-VN", {
        hour: "2-digit",
        hour12: false,
        timeZone: TIMEZONE,
      }),
    );
    const localM = d.getMinutes();
    const startMins = localH * 60 + localM;
    const topMins = startMins - CALENDAR_START_HOUR * 60;
    const top = (topMins / 60) * HOUR_HEIGHT;
    const height = Math.max(HOUR_HEIGHT * 0.75, 44);
    return { top: Math.max(0, top), height };
  };

  const hours = Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
    (_, i) => CALENDAR_START_HOUR + i,
  );

  const totalCalendarHeight = hours.length * HOUR_HEIGHT;

  // Title
  const periodLabel =
    mode === "week"
      ? (() => {
          const end = addDays(weekStart, 6);
          const startStr = weekStart.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
          });
          const endStr = end.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
          return `${startStr} – ${endStr}`;
        })()
      : currentDate.toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

  const displayDays = mode === "week" ? weekDays : [currentDate];

  // Current time indicator
  const now = new Date();
  const nowMins =
    now.getHours() * 60 + now.getMinutes() - CALENDAR_START_HOUR * 60;
  const nowTop = (nowMins / 60) * HOUR_HEIGHT;
  const showNowLine =
    now.getHours() >= CALENDAR_START_HOUR &&
    now.getHours() <= CALENDAR_END_HOUR;

  return (
    <>
      <div className="flex gap-4 items-start">
        {/* ── Mini calendar sidebar ── */}
        <div className="hidden lg:block shrink-0 w-[280px] rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-3">
          <MiniCalendar
            selected={currentDate}
            onSelect={(d) => {
              setCurrentDate(d);
              setMode("day");
            }}
          />

          {/* Quick jump buttons */}
          <div className="mt-4 space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">
              Chuyển nhanh
            </p>
            <button
              onClick={() => {
                setCurrentDate(new Date());
                setMode("day");
              }}
              className="w-full text-left rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition font-medium"
            >
              📅 Hôm nay
            </button>
            <button
              onClick={() => {
                setCurrentDate(new Date());
                setMode("week");
              }}
              className="w-full text-left rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition font-medium"
            >
              📆 Tuần này
            </button>
            <button
              onClick={() => {
                const next = addDays(new Date(), 7);
                setCurrentDate(next);
                setMode("week");
              }}
              className="w-full text-left rounded-lg px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition font-medium"
            >
              ⏭ Tuần tới
            </button>
          </div>

          {/* Appointment count summary */}
          {appointments.length > 0 && (
            <div className="mt-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                Tổng lịch hẹn
              </p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                {appointments.length}
              </p>
              <div className="mt-1.5 space-y-0.5">
                {(
                  ["scheduled", "completed", "canceled"] as AppointmentStatus[]
                ).map((s) => {
                  const count = appointments.filter(
                    (a) => a.status === s,
                  ).length;
                  if (count === 0) return null;
                  return (
                    <div key={s} className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {getStatusLabel(s)}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          s === "scheduled"
                            ? "text-blue-600 dark:text-blue-400"
                            : s === "completed"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-500 dark:text-rose-400"
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* ── Main calendar panel ── */}
        <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          {/* Calendar header */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 dark:border-slate-700 px-4 py-3">
            {/* Left: today + nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Hôm nay
              </button>
              <button
                onClick={prevPeriod}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300"
              >
                <FaChevronLeft size={12} />
              </button>
              <button
                onClick={nextPeriod}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300"
              >
                <FaChevronRight size={12} />
              </button>
              <h2 className="ml-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {periodLabel}
              </h2>
            </div>

            {/* Right: mode toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => setMode("week")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                  mode === "week"
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <FaCalendarWeek size={11} />
                Tuần
              </button>
              <button
                onClick={() => setMode("day")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                  mode === "day"
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <FaCalendarDay size={11} />
                Ngày
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div
            className="grid border-b border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
            style={{
              gridTemplateColumns: `56px repeat(${displayDays.length}, 1fr)`,
            }}
          >
            <div className="py-2" /> {/* GMT offset placeholder */}
            {displayDays.map((day, idx) => {
              const isToday = isSameDay(day, today);
              const isSelected = mode === "day" && isSameDay(day, currentDate);
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center py-2 cursor-pointer select-none"
                  onClick={() => {
                    setCurrentDate(day);
                    if (mode === "week") setMode("day");
                  }}
                >
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase">
                    {VI_DAYS[day.getDay()]}
                  </span>
                  <div
                    className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition ${
                      isToday || isSelected
                        ? "bg-indigo-600 text-white"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: "600px" }}
          >
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `56px repeat(${displayDays.length}, 1fr)`,
                height: `${totalCalendarHeight}px`,
              }}
            >
              {/* Hour labels column */}
              <div className="relative">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 text-[10px] text-slate-400 dark:text-slate-500 select-none -translate-y-2"
                    style={{
                      top: `${(h - CALENDAR_START_HOUR) * HOUR_HEIGHT}px`,
                    }}
                  >
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {displayDays.map((day, colIdx) => {
                const dayAppts = getApptForDay(day);
                const isDayToday = isSameDay(day, today);

                return (
                  <div
                    key={colIdx}
                    className="relative border-l border-slate-200 dark:border-slate-700/60"
                    style={{ height: `${totalCalendarHeight}px` }}
                  >
                    {/* Hour grid lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800"
                        style={{
                          top: `${(h - CALENDAR_START_HOUR) * HOUR_HEIGHT}px`,
                        }}
                      />
                    ))}

                    {/* Half-hour lines */}
                    {hours.map((h) => (
                      <div
                        key={`${h}-half`}
                        className="absolute inset-x-0 border-t border-dashed border-slate-100 dark:border-slate-800/60"
                        style={{
                          top: `${(h - CALENDAR_START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px`,
                        }}
                      />
                    ))}

                    {/* Current time line */}
                    {showNowLine && isDayToday && (
                      <div
                        className="absolute inset-x-0 z-20 flex items-center"
                        style={{ top: `${nowTop}px` }}
                      >
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
                        <div className="flex-1 h-px bg-red-500" />
                      </div>
                    )}

                    {/* Appointment events */}
                    {dayAppts.map((appt) => {
                      const { top, height } = getEventStyle(appt.scheduledAt);
                      const patient = patientMap.get(appt.patientId);
                      const name = patient?.patientName || "Bệnh nhân";
                      const time = toLocalTimeString(appt.scheduledAt);
                      const style = getCalendarEventStyle(appt.status);

                      return (
                        <div
                          key={appt.id}
                          className={`absolute inset-x-1 z-10 rounded-md px-1.5 py-1 cursor-pointer overflow-hidden select-none transition-all shadow-sm ${style.bg} ${style.border} ${style.text}`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppt(appt);
                          }}
                        >
                          <p className="text-[10px] font-bold leading-tight truncate">
                            {time}
                          </p>
                          <p className="text-[11px] font-medium leading-tight truncate mt-0.5">
                            {name}
                          </p>
                        </div>
                      );
                    })}

                    {/* Click on empty slot → create */}
                    <div
                      className="absolute inset-0 z-0 cursor-pointer"
                      onClick={() => {
                        if (onCreateAtDate) {
                          onCreateAtDate(dateToYMD(day), "09:00");
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>{" "}
        {/* end main calendar panel */}
      </div>{" "}
      {/* end flex sidebar+calendar wrapper */}
      {/* Appointment detail popup */}
      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div
            ref={popupRef}
            className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
          >
            {/* Popup header colored by status */}
            <div
              className={`px-5 py-3 flex items-center justify-between ${
                selectedAppt.status === "scheduled"
                  ? "bg-blue-500"
                  : selectedAppt.status === "completed"
                    ? "bg-emerald-500"
                    : "bg-rose-400"
              }`}
            >
              <div>
                <p className="text-xs text-white/80 uppercase font-semibold tracking-wide">
                  Lịch tái khám
                </p>
                <p className="text-white font-bold text-base mt-0.5">
                  {toLocalTimeString(selectedAppt.scheduledAt)} ·{" "}
                  {new Date(selectedAppt.scheduledAt).toLocaleDateString(
                    "vi-VN",
                    {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      timeZone: TIMEZONE,
                    },
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="text-white/80 hover:text-white transition"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Popup body */}
            <div className="px-5 py-4 space-y-3">
              {/* Patient name */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-sm font-bold shrink-0">
                  {(patientMap.get(selectedAppt.patientId)?.patientName ||
                    "B")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {patientMap.get(selectedAppt.patientId)?.patientName ||
                      selectedAppt.patientId}
                  </p>
                  <p className="text-xs text-slate-400">
                    {patientMap.get(selectedAppt.patientId)?.patientCode ||
                      patientMap.get(selectedAppt.patientId)?.patientPublicId ||
                      ""}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(selectedAppt.status)}`}
                >
                  {getStatusLabel(selectedAppt.status)}
                </span>
              </div>

              {/* Location */}
              {selectedAppt.location && (
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <FaMapMarkerAlt className="mt-0.5 shrink-0 text-slate-400" />
                  <span>{selectedAppt.location}</span>
                </div>
              )}

              {/* Notes */}
              {selectedAppt.notes && (
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <FaStickyNote className="mt-0.5 shrink-0 text-slate-400" />
                  <span>{selectedAppt.notes}</span>
                </div>
              )}
            </div>

            {/* Popup actions */}
            {selectedAppt.status === "scheduled" && (
              <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 px-5 py-3">
                <button
                  onClick={() => {
                    onEdit(selectedAppt);
                    setSelectedAppt(null);
                  }}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition"
                >
                  <FaEdit size={11} /> Chỉnh sửa
                </button>
                <button
                  onClick={() => {
                    void onStatusChange(selectedAppt, "completed");
                    setSelectedAppt(null);
                  }}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-60 transition"
                >
                  <FaCheckCircle size={11} /> Hoàn thành
                </button>
                <button
                  onClick={() => {
                    void onStatusChange(selectedAppt, "canceled");
                    setSelectedAppt(null);
                  }}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 py-2 text-xs font-medium text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-60 transition"
                >
                  <FaTimesCircle size={11} /> Hủy lịch
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type ViewMode = "calendar" | "list";

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

  // View mode: calendar or list
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

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

  // Check if chosen slot conflicts with existing appointments using overlap math
  const isConflict = useMemo(() => {
    if (!form.time) return false;
    const newStartMins = toMins(form.time);
    const newEndMins = newStartMins + 30; // standard 30-min duration

    return appointmentsOnFormDate.some((a) => {
      const startMins = toMins(toLocalTimeString(a.scheduledAt));
      const duration = a.durationMinutes || 30;
      const endMins = startMins + duration;
      return startMins < newEndMins && newStartMins < endMins;
    });
  }, [appointmentsOnFormDate, form.time]);

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
      // non-critical
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

  const openCreate = (date?: string, time?: string) => {
    setForm({
      ...defaultForm(filterPatientId),
      ...(date ? { date } : {}),
      ...(time ? { time } : {}),
    });
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

    if (isConflict) {
      showToast("Giờ này đã có lịch, vui lòng chọn giờ khác.", "error");
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
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-slate-900">
      <div className="w-full space-y-4 px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <Toast toast={toast} onClose={hideToast} />

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-800 dark:text-slate-100">
              Lịch tái khám
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Quản lý và đặt lịch tái khám cho bệnh nhân. Hệ thống sẽ tự động
              nhắc nhở bệnh nhân 24 giờ trước.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* View mode switch */}
            <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                title="Xem lịch"
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${
                  viewMode === "calendar"
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <FaCalendarWeek size={13} />
                <span className="hidden sm:inline">Lịch</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="Xem danh sách"
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${
                  viewMode === "list"
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <FaThList size={13} />
                <span className="hidden sm:inline">Danh sách</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => openCreate()}
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

        {/* ── Calendar view ── */}
        {viewMode === "calendar" ? (
          <CalendarView
            appointments={filteredAppointments.filter(
              (a) => a.status !== "canceled",
            )}
            patientMap={patientMap}
            onEdit={openEdit}
            onStatusChange={handleStatusChange}
            saving={saving}
            onCreateAtDate={(date, time) => openCreate(date, time)}
          />
        ) : (
          <>
            {/* Filters (list mode only) */}
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
                    placeholder={
                      loadingPatients ? "Đang tải..." : "Tất cả bệnh nhân"
                    }
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
                    onClick={() => openCreate()}
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
          </>
        )}

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
                      duration: a.durationMinutes,
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
                    disabled={saving || isConflict}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving
                      ? "Đang lưu..."
                      : editingId
                        ? "Cập nhật"
                        : "Đặt lịch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useMemo, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";

interface AssignmentResponse {
  patientId: string;
  patientName?: string;
  patientCode?: string;
  patientPublicId?: string;
  [key: string]: any;
}

interface PatientSelectProps {
  value: string;
  onChange: (id: string) => void;
  patients: AssignmentResponse[];
  disabled?: boolean;
  placeholder?: string;
}

export default function PatientSelect({
  value,
  onChange,
  patients,
  disabled,
  placeholder,
}: PatientSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex cursor-pointer items-center justify-between rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm text-gray-900 dark:text-slate-100 ${
          disabled ? "opacity-60 pointer-events-none" : "hover:border-blue-400"
        }`}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className={label ? "" : "text-gray-400 dark:text-slate-400"}>
          {label || placeholder || "Chọn bệnh nhân..."}
        </span>
        <FaChevronDown className="shrink-0 text-gray-400 text-xs" />
      </div>

      {open && (
        <div className="absolute z-[100] mt-1 w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl">
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
                className="cursor-pointer px-4 py-2 text-sm text-gray-500 hover:bg-slate-50 dark:hover:bg-slate-700"
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
                  className={`cursor-pointer px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    p.patientId === value
                      ? "font-semibold text-blue-600 dark:text-blue-400"
                      : "text-gray-800 dark:text-slate-100"
                  }`}
                  onClick={() => {
                    onChange(p.patientId);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {p.patientName || p.patientId}{" "}
                  <span className="text-gray-500 text-xs ml-1">
                    ({p.patientCode || p.patientPublicId || ""})
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

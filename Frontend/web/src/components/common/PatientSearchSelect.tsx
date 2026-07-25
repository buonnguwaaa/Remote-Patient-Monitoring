import { useState, useRef, useEffect, useMemo } from "react";
import { FaSearch, FaChevronDown } from "react-icons/fa";

export interface PatientSearchSelectProps {
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
          value={disabled ? (selectedDisplayText || loadingLabel || placeholder || "") : (open ? inputValue : selectedDisplayText)}
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

export default PatientSearchSelect;

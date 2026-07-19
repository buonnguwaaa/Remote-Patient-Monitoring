import { type ReactNode } from "react";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";

/**
 * PatientListCard — unified patient row card.
 *
 * Design reference: ThresholdSettingsPage active-card style.
 * Fixes applied vs v1:
 * - Actions default to row layout (not column) → no whitespace stretch on short cards
 * - Auto-renders a chevron indicator when card is expandable (has `expanded` + `onClick`)
 * - `expanded` accepts null to represent collapsed state
 */

export type AccentColor = "emerald" | "red" | "amber" | "blue" | "slate";

const accentBorderMap: Record<AccentColor, string> = {
  emerald: "border-l-emerald-500",
  red:     "border-l-red-500",
  amber:   "border-l-amber-400",
  blue:    "border-l-blue-500",
  slate:   "border-l-slate-300 dark:border-l-slate-600",
};

interface PatientListCardProps {
  /** Patient full name */
  name: string;
  /** Patient code / ID shown beside name */
  code?: string;
  /** Optional status badge(s) rendered inline with name */
  badge?: ReactNode;
  /** Optional subtitle line (meta info, timestamps, etc.) */
  subtitle?: ReactNode;
  /** Extra info row rendered between subtitle and actions (inline, left-side) */
  infoRow?: ReactNode;
  /** Main body content rendered below the header row */
  children?: ReactNode;
  /** Action buttons rendered on the right side */
  actions?: ReactNode;
  /** Colored left stripe — omit for no stripe */
  accentColor?: AccentColor;
  /** Makes the header row clickable (expand/collapse). A chevron will appear automatically. */
  onClick?: () => void;
  /** Whether the card is currently expanded (controls chevron direction) */
  isExpanded?: boolean;
  /** Additional CSS class on root element */
  className?: string;
  /** Render expanded drawer below the card — pass null/undefined to hide */
  expanded?: ReactNode;
}

export default function PatientListCard({
  name,
  code,
  badge,
  subtitle,
  infoRow,
  children,
  actions,
  accentColor,
  onClick,
  isExpanded = false,
  className = "",
  expanded,
}: PatientListCardProps) {
  const accentClass = accentColor
    ? `border-l-4 ${accentBorderMap[accentColor]}`
    : "";

  const isClickable = !!onClick;
  const isExpandable = isClickable && expanded !== undefined;

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-shadow hover:shadow-md ${accentClass} ${className}`}
    >
      {/* ── Main row ── */}
      <div
        className={`p-5 flex items-center justify-between gap-4 ${
          isClickable
            ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
            : ""
        } ${isExpanded ? "bg-slate-50 dark:bg-slate-700/30" : ""}`}
        onClick={onClick}
      >
        {/* Left: header */}
        <div className="flex-1 min-w-0">
          {/* Name + code + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {name}
            </h3>
            {code && (
              <span className="text-sm text-slate-400 dark:text-slate-500 font-normal">
                #{code}
              </span>
            )}
            {badge}
          </div>

          {/* Subtitle / meta */}
          {subtitle && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-4">
              {subtitle}
            </div>
          )}

          {/* Info row (tags, counts, etc.) */}
          {infoRow && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {infoRow}
            </div>
          )}

          {/* Body slot (heavy content like metric grids) */}
          {children && <div className="mt-3">{children}</div>}
        </div>

        {/* Right: actions + optional chevron */}
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
          {isExpandable && (
            <div
              className="p-1.5 rounded-full text-slate-400 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            >
              {isExpanded ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
            </div>
          )}
        </div>
      </div>

      {/* ── Expanded drawer ── */}
      {isExpanded && expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          {expanded}
        </div>
      )}
    </div>
  );
}

// ── Reusable action button variants ──────────────────────────────────────────

interface ActionBtnProps {
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger" | "icon";
  title?: string;
  disabled?: boolean;
}

export function CardActionBtn({
  onClick,
  children,
  variant = "ghost",
  title,
  disabled,
}: ActionBtnProps) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const styles: Record<string, string> = {
    primary:
      "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white",
    ghost:
      "px-3 py-1.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800",
    danger:
      "px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
    icon:
      "p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700",
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${styles[variant]}`}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// ── Status badge helper ───────────────────────────────────────────────────────

interface StatusBadgeProps {
  children: ReactNode;
  color?: "emerald" | "red" | "amber" | "blue" | "slate";
  dot?: boolean;
}

const badgeColorMap: Record<string, string> = {
  emerald: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  red:     "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400",
  amber:   "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
  blue:    "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400",
  slate:   "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
};

const dotColorMap: Record<string, string> = {
  emerald: "bg-emerald-500",
  red:     "bg-red-500",
  amber:   "bg-amber-400",
  blue:    "bg-blue-500",
  slate:   "bg-slate-400",
};

export function StatusBadge({ children, color = "slate", dot }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColorMap[color]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColorMap[color]}`} />}
      {children}
    </span>
  );
}

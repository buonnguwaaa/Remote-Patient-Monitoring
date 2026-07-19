import type { ElementType } from "react";

export type StatCardVariant = "default" | "danger" | "warning" | "success" | "info";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ElementType;
  variant?: StatCardVariant;
  loading?: boolean;
  /** Optional small badge shown below the value (e.g. trend info) */
  badge?: React.ReactNode;
}

const variantStyles: Record<
  StatCardVariant,
  { icon: string; iconBg: string; value: string; border: string; label: string }
> = {
  default: {
    border: "border-slate-200 dark:border-slate-700",
    iconBg: "bg-slate-100 dark:bg-slate-700",
    icon: "text-slate-500 dark:text-slate-400",
    label: "text-slate-500 dark:text-slate-400",
    value: "text-slate-900 dark:text-white",
  },
  danger: {
    border: "border-red-200 dark:border-red-900/50",
    iconBg: "bg-red-100 dark:bg-red-500/20",
    icon: "text-red-600 dark:text-red-400",
    label: "text-red-600 dark:text-red-400",
    value: "text-red-700 dark:text-red-300",
  },
  warning: {
    border: "border-amber-200 dark:border-amber-900/50",
    iconBg: "bg-amber-100 dark:bg-amber-500/20",
    icon: "text-amber-600 dark:text-amber-400",
    label: "text-amber-700 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-300",
  },
  success: {
    border: "border-emerald-200 dark:border-emerald-900/50",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    label: "text-emerald-700 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  info: {
    border: "border-blue-200 dark:border-blue-900/50",
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    icon: "text-blue-600 dark:text-blue-400",
    label: "text-slate-500 dark:text-slate-400",
    value: "text-slate-900 dark:text-white",
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  loading = false,
  badge,
}: StatCardProps) {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm flex items-center justify-between animate-pulse">
        <div className="space-y-3">
          <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-9 w-16 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border ${styles.border} bg-white dark:bg-slate-800 p-5 shadow-sm flex items-center justify-between transition-shadow hover:shadow-md`}
    >
      <div>
        <p className={`text-sm font-medium ${styles.label}`}>{label}</p>
        <p className={`mt-1 text-3xl font-bold leading-none ${styles.value}`}>
          {value}
        </p>
        {badge && <div className="mt-2">{badge}</div>}
      </div>
      <div
        className={`h-12 w-12 rounded-full ${styles.iconBg} flex items-center justify-center shrink-0`}
      >
        <Icon className={`text-xl ${styles.icon}`} />
      </div>
    </div>
  );
}

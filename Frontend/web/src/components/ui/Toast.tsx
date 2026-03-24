import { useEffect, useState } from "react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa";

import type { ToastState } from "../../hooks/useToast";

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

const toastStyles = {
  success: {
    wrapper: "border-emerald-200 bg-white/95 text-slate-900 shadow-emerald-100",
    icon: "bg-emerald-100 text-emerald-600",
    progress: "bg-emerald-500",
    Icon: FaCheckCircle,
  },
  error: {
    wrapper: "border-rose-200 bg-white/95 text-slate-900 shadow-rose-100",
    icon: "bg-rose-100 text-rose-600",
    progress: "bg-rose-500",
    Icon: FaExclamationCircle,
  },
  info: {
    wrapper: "border-sky-200 bg-white/95 text-slate-900 shadow-sky-100",
    icon: "bg-sky-100 text-sky-600",
    progress: "bg-sky-500",
    Icon: FaInfoCircle,
  },
} as const;

const Toast = ({ toast, onClose }: ToastProps) => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!toast) {
      setRemainingTime(0);
      setIsPaused(false);
      return;
    }

    setRemainingTime(toast.duration);
    setIsPaused(false);
  }, [toast]);

  useEffect(() => {
    if (!toast || isPaused) return;

    const step = 40;
    const timer = window.setInterval(() => {
      setRemainingTime((current) => {
        const nextValue = current - step;
        if (nextValue <= 0) {
          window.clearInterval(timer);
          onClose();
          return 0;
        }
        return nextValue;
      });
    }, step);

    return () => window.clearInterval(timer);
  }, [toast, isPaused, onClose]);

  if (!toast) return null;

  const variant = toastStyles[toast.type];
  const progressWidth = `${Math.max(0, (remainingTime / toast.duration) * 100)}%`;
  const StatusIcon = variant.Icon;

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[300]">
      <div
        className={`pointer-events-auto w-[360px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${variant.wrapper}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex items-start gap-3 p-4">
          <div
            className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${variant.icon}`}
          >
            <StatusIcon />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{toast.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{toast.message}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng thông báo"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>

        <div className="h-1 w-full bg-slate-200/80">
          <div
            className={`h-full transition-[width] duration-75 ease-linear ${variant.progress}`}
            style={{ width: progressWidth }}
          />
        </div>
      </div>
    </div>
  );
};

export default Toast;

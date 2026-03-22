import React from "react";
import type { ToastState } from "../../hooks/useToast";

interface ToastProps {
    toast: ToastState | null;
}

const COLORS = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
};

const ICONS = {
    success: "✓",
    error: "✕",
    info: "ℹ",
};

const Toast: React.FC<ToastProps> = ({ toast }) => {
    if (!toast) return null;

    return (
        <>
            <div
                className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${COLORS[toast.type]}`}
                style={{ animation: "toastSlideIn 0.3s ease" }}
            >
                <span className="text-base font-bold">{ICONS[toast.type]}</span>
                {toast.message}
            </div>
            <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
        </>
    );
};

export default Toast;

import { useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastState {
    message: string;
    type: ToastType;
}

export function useToast(duration = 3000) {
    const [toast, setToast] = useState<ToastState | null>(null);

    const showToast = (message: string, type: ToastType = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), duration);
    };

    const hideToast = () => setToast(null);

    return { toast, showToast, hideToast };
}

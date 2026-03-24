import { useCallback, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
  duration: number;
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  duration?: number;
}

const defaultTitles: Record<ToastType, string> = {
  success: "Thành công",
  error: "Thất bại",
  info: "Thông báo",
};

export function useToast(defaultDuration = 4000) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (
      message: string,
      typeOrOptions: ToastType | ToastOptions = "success",
      extraOptions?: Omit<ToastOptions, "type">
    ) => {
      const normalizedOptions =
        typeof typeOrOptions === "string"
          ? { type: typeOrOptions, ...extraOptions }
          : typeOrOptions;

      const type = normalizedOptions.type ?? "success";

      setToast({
        id: Date.now(),
        message,
        type,
        title: normalizedOptions.title ?? defaultTitles[type],
        duration: normalizedOptions.duration ?? defaultDuration,
      });
    },
    [defaultDuration]
  );

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return { toast, showToast, hideToast };
}

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark";
export type FontFamily = "system" | "sans" | "serif" | "mono";
export type FontSize = "small" | "medium" | "large";

const STORAGE_KEYS = {
  theme: "rpm-theme",
  fontFamily: "rpm-font-family",
  fontSize: "rpm-font-size",
} as const;

const FONT_FAMILY_VALUES: Record<FontFamily, string> = {
  system:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  sans: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"Consolas", "Courier New", monospace',
};

const FONT_SIZE_VALUES: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

export const FONT_FAMILY_OPTIONS: Array<{
  value: FontFamily;
  label: string;
  sample: string;
  cssValue: string;
}> = [
  {
    value: "system",
    label: "Mặc định hệ thống",
    sample: "Sức khỏe bệnh nhân ổn định",
    cssValue: FONT_FAMILY_VALUES.system,
  },
  {
    value: "sans",
    label: "Sans Serif",
    sample: "Nhắc lịch tái khám cho bệnh nhân",
    cssValue: FONT_FAMILY_VALUES.sans,
  },
  {
    value: "serif",
    label: "Serif",
    sample: "Theo dõi chỉ số sinh hiệu mỗi ngày",
    cssValue: FONT_FAMILY_VALUES.serif,
  },
  {
    value: "mono",
    label: "Monospace",
    sample: "Nhiệt độ: 37.1°C | SPO2: 98%",
    cssValue: FONT_FAMILY_VALUES.mono,
  },
];

export const FONT_SIZE_OPTIONS: Array<{
  value: FontSize;
  label: string;
  description: string;
}> = [
  { value: "small", label: "Nhỏ", description: "Hiển thị nhiều nội dung hơn" },
  { value: "medium", label: "Vừa", description: "Cân bằng giữa đọc và bố cục" },
  { value: "large", label: "Lớn", description: "Dễ đọc, phù hợp màn hình lớn" },
];

const isTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark";

const isFontFamily = (value: string | null): value is FontFamily =>
  value === "system" ||
  value === "sans" ||
  value === "serif" ||
  value === "mono";

const isFontSize = (value: string | null): value is FontSize =>
  value === "small" || value === "medium" || value === "large";

const getSystemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  fontFamily: FontFamily;
  setFontFamily: (fontFamily: FontFamily) => void;
  fontSize: FontSize;
  setFontSize: (fontSize: FontSize) => void;
  resetAppearance: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const getInitialTheme = (): Theme => {
    const stored = localStorage.getItem(STORAGE_KEYS.theme);
    if (isTheme(stored)) return stored;
    return getSystemTheme();
  };

  const getInitialFontFamily = (): FontFamily => {
    const stored = localStorage.getItem(STORAGE_KEYS.fontFamily);
    return isFontFamily(stored) ? stored : "system";
  };

  const getInitialFontSize = (): FontSize => {
    const stored = localStorage.getItem(STORAGE_KEYS.fontSize);
    return isFontSize(stored) ? stored : "medium";
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [fontFamily, setFontFamily] =
    useState<FontFamily>(getInitialFontFamily);
  const [fontSize, setFontSize] = useState<FontSize>(getInitialFontSize);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-font-family", FONT_FAMILY_VALUES[fontFamily]);
    localStorage.setItem(STORAGE_KEYS.fontFamily, fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--app-font-size", FONT_SIZE_VALUES[fontSize]);
    localStorage.setItem(STORAGE_KEYS.fontSize, fontSize);
  }, [fontSize]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const resetAppearance = () => {
    setTheme(getSystemTheme());
    setFontFamily("system");
    setFontSize("medium");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === "dark",
        fontFamily,
        setFontFamily,
        fontSize,
        setFontSize,
        resetAppearance,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};

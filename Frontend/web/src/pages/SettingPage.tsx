import {
  Check,
  MoonStar,
  Palette,
  RefreshCcw,
  SunMedium,
  Type,
  ZoomIn,
} from "lucide-react";
import {
  useFontFamilyOptions,
  useFontSizeOptions,
  type Theme,
  useTheme,
  type FontFamily,
  type FontSize,
} from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useTranslation } from "react-i18next";
import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";

const SettingPage = () => {
  const { t } = useTranslation();
  const { changeLanguage } = useLanguage();
  const { theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize } =
    useTheme();

  const { toast, showToast, hideToast } = useToast(4000);

  const FONT_FAMILY_OPTIONS = useFontFamilyOptions();
  const FONT_SIZE_OPTIONS = useFontSizeOptions();

  const THEME_OPTIONS: Array<{
    value: Theme;
    label: string;
  }> = [
    {
      value: "light",
      label: t("settings.light"),
    },
    {
      value: "dark",
      label: t("settings.dark"),
    },
  ];

  const selectedFontSize =
    FONT_SIZE_OPTIONS.find((option) => option.value === fontSize)?.label ||
    t("settings.fontSizeOptions.medium");
  const selectedFontOption =
    FONT_FAMILY_OPTIONS.find((option) => option.value === fontFamily) ||
    FONT_FAMILY_OPTIONS[0];

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    showToast(t("settings.updateSuccess"), "success", {
      title: t("settings.updateSuccessTitle"),
    });
  };

  const handleFontFamilyChange = (newFontFamily: FontFamily) => {
    setFontFamily(newFontFamily);
    showToast(t("settings.updateSuccess"), "success", {
      title: t("settings.updateSuccessTitle"),
    });
  };

  const handleFontSizeChange = (newFontSize: FontSize) => {
    setFontSize(newFontSize);
    showToast(t("settings.updateSuccess"), "success", {
      title: t("settings.updateSuccessTitle"),
    });
  };

  const handleRestoreDefaults = () => {
    setTheme("light");
    changeLanguage("vi");
    setFontFamily("system");
    setFontSize("medium");
    showToast(t("settings.updateSuccess"), "success", {
      title: t("settings.updateSuccessTitle"),
    });
  };

  return (
    <>
      <Toast toast={toast} onClose={hideToast} />

      <div className="min-h-screen bg-[#f5f6fa] dark:bg-slate-900 transition-colors duration-300">
        <div className="w-full space-y-4 px-4 py-8 pb-24 sm:px-6 lg:px-8">
          <section className="mb-2 px-2 transition-colors duration-300">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
                  {t("settings.title")}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {t("settings.description")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer shadow-sm"
                >
                  <RefreshCcw size={15} />
                  {t("settings.restoreDefaults")}
                </button>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Theme Selector */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 transition-colors duration-300">
              <div className="mb-3 flex items-center gap-2 text-gray-800 dark:text-slate-100">
                <Palette size={18} />
                <h2 className="text-base font-semibold">
                  {t("settings.theme")}
                </h2>
              </div>

              <div className="grid gap-3">
                {THEME_OPTIONS.map((option) => {
                  const isActive = theme === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleThemeChange(option.value)}
                      className={`rounded-xl border px-3 py-2 text-left transition duration-300 ${
                        isActive
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
                      } cursor-pointer`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {option.value === "light" ? (
                          <SunMedium size={16} />
                        ) : (
                          <MoonStar size={16} />
                        )}
                        {option.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Font Family Selector */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 transition-colors duration-300">
              <div className="mb-3 flex items-center gap-2 text-gray-800 dark:text-slate-100">
                <Type size={18} />
                <h2 className="text-base font-semibold">
                  {t("settings.fontFamily")}
                </h2>
              </div>

              <div>
                <select
                  id="font-family-select"
                  value={fontFamily}
                  onChange={(event) => {
                    const nextOption = FONT_FAMILY_OPTIONS.find(
                      (option) => option.value === event.target.value,
                    );

                    if (nextOption) {
                      handleFontFamilyChange(nextOption.value as FontFamily);
                    }
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/20 cursor-pointer"
                >
                  {FONT_FAMILY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <p
                  className="mt-2 text-xs text-gray-500 dark:text-slate-400"
                  style={{ fontFamily: selectedFontOption.cssValue }}
                >
                  {t("settings.sample")} {selectedFontOption.sample}
                </p>
              </div>
            </section>

            {/* Font Size Selector */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 lg:col-span-2 transition-colors duration-300">
              <div className="mb-4 flex items-center gap-2 text-gray-800 dark:text-slate-100">
                <ZoomIn size={18} />
                <h2 className="text-lg font-semibold">
                  {t("settings.fontSize")}
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {FONT_SIZE_OPTIONS.map((option) => {
                  const isActive = fontSize === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFontSizeChange(option.value)}
                      className={`rounded-xl border px-4 py-3 text-left transition duration-300 ${
                        isActive
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
                      } cursor-pointer`}
                    >
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>{option.label}</span>
                        {isActive ? <Check size={16} /> : null}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
                {t("settings.currentSize")}
                <span className="ml-1 font-semibold text-gray-700 dark:text-slate-200">
                  {selectedFontSize}
                </span>
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingPage;

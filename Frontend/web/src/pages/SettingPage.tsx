import {
  Check,
  Globe,
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
} from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useTranslation } from "react-i18next";

const LANGUAGE_OPTIONS = [
  {
    value: "vi",
    label: "Tiếng Việt",
    flag: "🇻🇳",
  },
  {
    value: "en",
    label: "English",
    flag: "🇬🇧",
  },
];

const SettingPage = () => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const {
    theme,
    setTheme,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    resetAppearance,
  } = useTheme();

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

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-slate-900">
      <div className="mx-auto  space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {t("settings.title")}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {t("settings.description")}
              </p>
            </div>

            <button
              type="button"
              onClick={resetAppearance}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
            >
              <RefreshCcw size={16} />
              {t("settings.restoreDefaults")}
            </button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Language Selector */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2 text-gray-800 dark:text-slate-100">
              <Globe size={18} />
              <h2 className="text-base font-semibold">{language === "vi" ? "Ngôn ngữ" : "Language"}</h2>
            </div>

            <div className="grid gap-3">
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = language === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeLanguage(option.value as "vi" | "en")}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="text-xl">{option.flag}</span>
                      {option.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2 text-gray-800 dark:text-slate-100">
              <Palette size={18} />
              <h2 className="text-base font-semibold">{t("settings.theme")}</h2>
            </div>

            <div className="grid gap-3">
              {THEME_OPTIONS.map((option) => {
                const isActive = theme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
                    }`}
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

          <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2 text-gray-800 dark:text-slate-100">
              <Type size={18} />
              <h2 className="text-base font-semibold">{t("settings.fontFamily")}</h2>
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
                    setFontFamily(nextOption.value);
                  }
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
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

          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 lg:col-span-3">
            <div className="mb-4 flex items-center gap-2 text-gray-800 dark:text-slate-100">
              <ZoomIn size={18} />
              <h2 className="text-lg font-semibold">{t("settings.fontSize")}</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {FONT_SIZE_OPTIONS.map((option) => {
                const isActive = fontSize === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFontSize(option.value)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500"
                    }`}
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

        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {t("settings.previewInterface")}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {t("settings.cardTitle")}
              </p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">
                {t("settings.patientRecord")}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                {t("settings.patientRecordDesc")}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {t("settings.latestMetrics")}
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {t("settings.spo2Stable")}
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                {t("settings.alertDesc")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingPage;

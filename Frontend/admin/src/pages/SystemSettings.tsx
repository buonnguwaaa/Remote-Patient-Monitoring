import React, { useEffect, useState } from "react";
import { FaHistory, FaSave } from "react-icons/fa";
import { MdAdminPanelSettings } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Toast from "../components/ui/Toast";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../hooks/useToast";

type SystemStatus = "online" | "offline" | "maintenance";
type Language = "vi" | "en";
type ThemeMode = "light" | "dark";

interface SettingsFormState {
  systemStatus: SystemStatus;
  maintenanceMessage: string;
  allowRegistrations: boolean;
  maxPatientsPerDoctor: number;
  language: Language;
  emailNotifications: boolean;
  theme: ThemeMode;
}

const sectionClass =
  "rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20 dark:disabled:bg-slate-800 dark:disabled:text-slate-400";
const labelClass = "mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200";
const rowClass =
  "flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/70";

const initialFormState = (theme: ThemeMode): SettingsFormState => ({
  systemStatus: "online",
  maintenanceMessage: "Hệ thống đang bảo trì, vui lòng quay lại sau.",
  allowRegistrations: true,
  maxPatientsPerDoctor: 50,
  language: "vi",
  emailNotifications: true,
  theme,
});

const SystemSettings: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { toast, showToast, hideToast } = useToast(4000);
  const { t } = useTranslation();

  const [savedSettings, setSavedSettings] = useState<SettingsFormState>(() =>
    initialFormState(theme as ThemeMode)
  );
  const [draftSettings, setDraftSettings] = useState<SettingsFormState>(() =>
    initialFormState(theme as ThemeMode)
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setSavedSettings((current) => ({ ...current, theme: theme as ThemeMode, language }));
      setDraftSettings((current) => ({ ...current, theme: theme as ThemeMode, language }));
    }
  }, [theme, language, isEditing]);

  const updateDraft = <K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) => {
    setDraftSettings((current) => ({ ...current, [key]: value }));
  };

  const startEditing = () => {
    setDraftSettings(savedSettings);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftSettings(savedSettings);
    setIsEditing(false);
  };

  const handleSaveSettings = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isEditing) return;

    setSavedSettings(draftSettings);
    setTheme(draftSettings.theme);
    setLanguage(draftSettings.language);
    setIsEditing(false);
    showToast(t("systemSettings.toast.updateSuccess"), "success", {
      title: t("systemSettings.toast.updateSuccessTitle"),
    });
  };

  return (
    <>
      <Toast toast={toast} onClose={hideToast} />

      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm shadow-slate-200/50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:shadow-none lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-300/40 dark:bg-indigo-500 dark:shadow-indigo-500/20">
              <MdAdminPanelSettings className="text-2xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t("systemSettings.title")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("systemSettings.description")}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div
              className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold ${
                isEditing
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {isEditing ? t("common.editMode") : t("common.viewMode")}
            </div>

            <button
              type="button"
              onClick={() => navigate("/activity-history")}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <FaHistory className="mr-2 text-slate-500 dark:text-slate-300" />
              {t("systemSettings.viewHistory")}
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <section className={sectionClass}>
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t("systemSettings.interfaceSettings.title")}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("systemSettings.interfaceSettings.description")}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>{t("systemSettings.interfaceSettings.displayMode")}</label>
                <select
                  className={inputClass}
                  value={draftSettings.theme}
                  onChange={(event) => updateDraft("theme", event.target.value as ThemeMode)}
                  disabled={!isEditing}
                >
                  <option value="light">{t("systemSettings.interfaceSettings.light")}</option>
                  <option value="dark">{t("systemSettings.interfaceSettings.dark")}</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>{t("systemSettings.interfaceSettings.language")}</label>
                <select
                  className={inputClass}
                  value={draftSettings.language}
                  onChange={(event) => updateDraft("language", event.target.value as Language)}
                  disabled={!isEditing}
                >
                  <option value="vi">{t("systemSettings.interfaceSettings.vietnamese")}</option>
                  <option value="en">{t("systemSettings.interfaceSettings.english")}</option>
                </select>
              </div>
            </div>

            <div className={`${rowClass} mt-5`}>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{t("systemSettings.interfaceSettings.emailNotifications")}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("systemSettings.interfaceSettings.emailNotificationsDesc")}
                </p>
              </div>

              <label className={`relative inline-flex items-center ${!isEditing ? "cursor-not-allowed" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={draftSettings.emailNotifications}
                  onChange={(event) => updateDraft("emailNotifications", event.target.checked)}
                  disabled={!isEditing}
                />
                <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 peer-checked:bg-slate-900 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:opacity-60 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-200 after:bg-white after:transition-all after:content-[''] dark:bg-slate-600 dark:peer-focus:ring-indigo-500/20 dark:peer-checked:bg-indigo-500" />
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  <FaSave className="mr-2" />
                  {t("systemSettings.saveSettings")}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                <MdAdminPanelSettings className="mr-2 text-lg" />
                {t("systemSettings.editSystem")}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

export default SystemSettings;

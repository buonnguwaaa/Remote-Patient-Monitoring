import React, { useEffect, useState } from "react";
import { FaHistory, FaPowerOff, FaSave } from "react-icons/fa";
import { MdAdminPanelSettings } from "react-icons/md";
import { useNavigate } from "react-router-dom";

import Toast from "../components/ui/Toast";
import { useTheme } from "../context/ThemeContext";
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

const statusMeta = {
  online: {
    label: "Trực tuyến",
    badgeClass:
      "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    helperText: "Hệ thống đang hoạt động bình thường và chấp nhận truy cập mới.",
  },
  offline: {
    label: "Ngoại tuyến",
    badgeClass:
      "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    helperText: "Toàn bộ truy cập mới sẽ bị chặn cho đến khi bạn bật lại hệ thống.",
  },
  maintenance: {
    label: "Bảo trì",
    badgeClass:
      "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    helperText: "Người dùng sẽ thấy thông báo bảo trì thay vì nội dung chính.",
  },
} as const;

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
  const { toast, showToast, hideToast } = useToast(4000);

  const [savedSettings, setSavedSettings] = useState<SettingsFormState>(() =>
    initialFormState(theme as ThemeMode)
  );
  const [draftSettings, setDraftSettings] = useState<SettingsFormState>(() =>
    initialFormState(theme as ThemeMode)
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setSavedSettings((current) => ({ ...current, theme: theme as ThemeMode }));
      setDraftSettings((current) => ({ ...current, theme: theme as ThemeMode }));
    }
  }, [theme, isEditing]);

  const currentStatus = statusMeta[draftSettings.systemStatus];

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

    if (draftSettings.systemStatus === "maintenance" && !draftSettings.maintenanceMessage.trim()) {
      showToast("Vui lòng nhập thông báo bảo trì trước khi lưu.", "error", {
        title: "Cập nhật thất bại",
      });
      return;
    }

    if (!Number.isFinite(draftSettings.maxPatientsPerDoctor) || draftSettings.maxPatientsPerDoctor < 1) {
      showToast("Số bệnh nhân tối đa mỗi bác sĩ phải lớn hơn 0.", "error", {
        title: "Cập nhật thất bại",
      });
      return;
    }

    setSavedSettings(draftSettings);
    setTheme(draftSettings.theme);
    setIsEditing(false);
    showToast("Cài đặt hệ thống đã được cập nhật.", "success", {
      title: "Cập nhật thành công",
    });
  };

  const toggleSystemStatus = () => {
    if (!isEditing) {
      showToast("Hãy bấm Chỉnh sửa hệ thống trước khi cập nhật trạng thái.", "error", {
        title: "Chưa thể thay đổi",
      });
      return;
    }

    updateDraft("systemStatus", draftSettings.systemStatus === "online" ? "offline" : "online");
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
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cài đặt hệ thống</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Quản lý trạng thái vận hành, quyền đăng ký và giao diện hiển thị theo một bố cục gọn hơn, dễ nhìn hơn.
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
              {isEditing ? "Đang chỉnh sửa" : "Chế độ xem"}
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/activity-history")}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <FaHistory className="mr-2 text-slate-500 dark:text-slate-300" />
              Xem lịch sử hoạt động
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <FaPowerOff />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Trạng thái hệ thống</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Theo dõi nhanh tình trạng hiện tại và chuyển đổi ngay khi cần.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Trạng thái hiện tại
                  </p>
                  <div
                    className={`mt-3 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${currentStatus.badgeClass}`}
                  >
                    {currentStatus.label}
                  </div>
                  <p className="mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-300">
                    {currentStatus.helperText}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleSystemStatus}
                  disabled={!isEditing}
                  className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
                    !isEditing
                      ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      : draftSettings.systemStatus === "online"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-slate-900 hover:bg-slate-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                  }`}
                >
                  {draftSettings.systemStatus === "online" ? "Tắt hệ thống" : "Bật hệ thống"}
                </button>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
              <div>
                <label className={labelClass}>Chế độ vận hành</label>
                <select
                  className={inputClass}
                  value={draftSettings.systemStatus}
                  onChange={(event) =>
                    updateDraft("systemStatus", event.target.value as SettingsFormState["systemStatus"])
                  }
                  disabled={!isEditing}
                >
                  <option value="online">Trực tuyến</option>
                  <option value="offline">Ngoại tuyến</option>
                  <option value="maintenance">Bảo trì</option>
                </select>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Gợi ý hiển thị</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Chỉ khi bấm Chỉnh sửa hệ thống thì các trường mới được mở để giảm thao tác nhầm trên trang admin.
                </p>
              </div>
            </div>

            {draftSettings.systemStatus === "maintenance" && (
              <div className="mt-5">
                <label className={labelClass}>Thông báo bảo trì</label>
                <textarea
                  className={inputClass}
                  rows={4}
                  value={draftSettings.maintenanceMessage}
                  onChange={(event) => updateDraft("maintenanceMessage", event.target.value)}
                  disabled={!isEditing}
                />
              </div>
            )}
          </section>

          <section className={sectionClass}>
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Cài đặt chung</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Điều chỉnh đăng ký mới và giới hạn bệnh nhân theo bác sĩ.
              </p>
            </div>

            <div className="space-y-4">
              <div className={rowClass}>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Cho phép đăng ký mới</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Bật để cho phép người dùng mới tạo tài khoản trong hệ thống.
                  </p>
                </div>

                <label className={`relative inline-flex items-center ${!isEditing ? "cursor-not-allowed" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={draftSettings.allowRegistrations}
                    onChange={(event) => updateDraft("allowRegistrations", event.target.checked)}
                    disabled={!isEditing}
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 peer-checked:bg-slate-900 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:opacity-60 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-200 after:bg-white after:transition-all after:content-[''] dark:bg-slate-600 dark:peer-focus:ring-indigo-500/20 dark:peer-checked:bg-indigo-500" />
                </label>
              </div>

              <div>
                <label className={labelClass}>Số bệnh nhân tối đa mỗi bác sĩ</label>
                <input
                  type="number"
                  className={inputClass}
                  value={draftSettings.maxPatientsPerDoctor}
                  onChange={(event) =>
                    updateDraft("maxPatientsPerDoctor", parseInt(event.target.value, 10) || 0)
                  }
                  min={1}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Cài đặt giao diện</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Giữ giao diện admin đồng bộ với ngôn ngữ và chế độ hiển thị bạn muốn.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className={labelClass}>Chế độ hiển thị</label>
                <select
                  className={inputClass}
                  value={draftSettings.theme}
                  onChange={(event) => updateDraft("theme", event.target.value as ThemeMode)}
                  disabled={!isEditing}
                >
                  <option value="light">Sáng</option>
                  <option value="dark">Tối</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Ngôn ngữ</label>
                <select
                  className={inputClass}
                  value={draftSettings.language}
                  onChange={(event) => updateDraft("language", event.target.value as Language)}
                  disabled={!isEditing}
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className={`${rowClass} mt-5`}>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">Thông báo qua email</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Gửi các thay đổi và thông báo hệ thống quan trọng đến email quản trị.
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
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  <FaSave className="mr-2" />
                  Lưu cài đặt
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                <MdAdminPanelSettings className="mr-2 text-lg" />
                Chỉnh sửa hệ thống
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

export default SystemSettings;

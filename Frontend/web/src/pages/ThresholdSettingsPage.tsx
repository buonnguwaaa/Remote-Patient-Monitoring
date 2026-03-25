import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { FaEdit, FaPlus, FaSave, FaStopCircle, FaUndo } from "react-icons/fa";

import { useAuth } from "../context/AuthContext";
import { getMyPatients } from "../services/patientService";
import {
  createThreshold,
  getThresholds,
  updateThreshold,
  type ThresholdPayload,
  type ThresholdRecord,
} from "../services/thresholdService";
import type { AssignmentResponse } from "../types/patient";

interface ThresholdFormData {
  patientId: string;
  temperatureMin: string;
  temperatureMax: string;
  systolicMin: string;
  systolicMax: string;
  diastolicMin: string;
  diastolicMax: string;
  pulseMin: string;
  pulseMax: string;
  glucoseMin: string;
  glucoseMax: string;
  spo2Min: string;
  respiratoryRateMin: string;
  respiratoryRateMax: string;
  effectiveFrom: string;
  effectiveTo: string;
}

interface NoticeState {
  type: "success" | "error" | "info";
  message: string;
}

const createDefaultFormData = (patientId = ""): ThresholdFormData => ({
  patientId,
  temperatureMin: "36.5",
  temperatureMax: "37.2",
  systolicMin: "90",
  systolicMax: "120",
  diastolicMin: "60",
  diastolicMax: "80",
  pulseMin: "60",
  pulseMax: "90",
  glucoseMin: "70",
  glucoseMax: "125",
  spo2Min: "95",
  respiratoryRateMin: "12",
  respiratoryRateMax: "18",
  effectiveFrom: new Date().toISOString().split("T")[0],
  effectiveTo: "",
});

const toDateInputValue = (value?: string | null) => (value ? value.slice(0, 10) : "");
const toStartOfDayIso = (value: string) => new Date(`${value}T00:00:00`).toISOString();
const toEndOfDayIso = (value: string) => new Date(`${value}T23:59:59`).toISOString();
const toNumber = (value: string) => Number.parseFloat(value || "0");

const formatDateTime = (value?: string | null) => {
  if (!value) return "Không giới hạn";

  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const thresholdSections = [
  {
    title: "Nhiệt độ (độ C)",
    minKey: "temperatureMin" as const,
    maxKey: "temperatureMax" as const,
    step: "0.1",
  },
  {
    title: "Huyết áp tâm thu (mmHg)",
    minKey: "systolicMin" as const,
    maxKey: "systolicMax" as const,
    step: "1",
  },
  {
    title: "Huyết áp tâm trương (mmHg)",
    minKey: "diastolicMin" as const,
    maxKey: "diastolicMax" as const,
    step: "1",
  },
  {
    title: "Nhịp tim (bpm)",
    minKey: "pulseMin" as const,
    maxKey: "pulseMax" as const,
    step: "1",
  },
  {
    title: "Đường huyết (mg/dL)",
    minKey: "glucoseMin" as const,
    maxKey: "glucoseMax" as const,
    step: "1",
  },
  {
    title: "Nhịp thở (lần/phút)",
    minKey: "respiratoryRateMin" as const,
    maxKey: "respiratoryRateMax" as const,
    step: "1",
  },
];

const buildHistoryChips = (item: ThresholdRecord) => {
  const chips = [
    `HATT: ${item.sysMin}-${item.sysMax}`,
    `HATTr: ${item.diaMin}-${item.diaMax}`,
    `Nhịp tim: ${item.heartRateMin}-${item.heartRateMax}`,
    `Nhiệt độ: ${item.temperatureMin}-${item.temperatureMax}`,
    `Nhịp thở: ${item.respiratoryRateMin}-${item.respiratoryRateMax}`,
    `SpO2 >= ${item.spo2Min}%`,
  ];

  if (item.glucoseMin != null || item.glucoseMax != null) {
    chips.push(`Đường huyết: ${item.glucoseMin ?? "-"}-${item.glucoseMax ?? "-"}`);
  }

  return chips;
};

const ThresholdSettingsPage = () => {
  const { user } = useAuth();

  const [patients, setPatients] = useState<AssignmentResponse[]>([]);
  const [formData, setFormData] = useState<ThresholdFormData>(createDefaultFormData());
  const [activeThreshold, setActiveThreshold] = useState<ThresholdRecord | null>(null);
  const [thresholdHistory, setThresholdHistory] = useState<ThresholdRecord[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingThresholds, setLoadingThresholds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingThresholdId, setEditingThresholdId] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const patientOptions = useMemo(() => {
    const patientMap = new Map<string, AssignmentResponse>();

    patients.forEach((item) => {
      if (!patientMap.has(item.patientId)) {
        patientMap.set(item.patientId, item);
      }
    });

    return Array.from(patientMap.values()).sort((left, right) =>
      (left.patientName || "").localeCompare(right.patientName || "")
    );
  }, [patients]);

  const selectedPatient = useMemo(
    () => patientOptions.find((item) => item.patientId === formData.patientId) || null,
    [formData.patientId, patientOptions]
  );

  const modeLabel = editingThresholdId ? "Cập nhật cấu hình hiện tại" : "Tạo cấu hình mới";
  const reusableHistoryCount = thresholdHistory.filter((item) => item.id !== activeThreshold?.id).length;

  const applyThresholdToForm = (threshold: ThresholdRecord, mode: "edit" | "clone" = "edit") => {
    setFormData({
      patientId: threshold.patientId,
      temperatureMin: String(threshold.temperatureMin),
      temperatureMax: String(threshold.temperatureMax),
      systolicMin: String(threshold.sysMin),
      systolicMax: String(threshold.sysMax),
      diastolicMin: String(threshold.diaMin),
      diastolicMax: String(threshold.diaMax),
      pulseMin: String(threshold.heartRateMin),
      pulseMax: String(threshold.heartRateMax),
      glucoseMin: threshold.glucoseMin != null ? String(threshold.glucoseMin) : "",
      glucoseMax: threshold.glucoseMax != null ? String(threshold.glucoseMax) : "",
      spo2Min: String(threshold.spo2Min),
      respiratoryRateMin: String(threshold.respiratoryRateMin),
      respiratoryRateMax: String(threshold.respiratoryRateMax),
      effectiveFrom:
        mode === "clone" ? new Date().toISOString().split("T")[0] : toDateInputValue(threshold.effectiveFrom),
      effectiveTo: mode === "clone" ? "" : toDateInputValue(threshold.effectiveTo),
    });
    setEditingThresholdId(mode === "edit" ? threshold.id : null);
  };

  const resetForm = (patientId = formData.patientId) => {
    if (activeThreshold && patientId === activeThreshold.patientId) {
      applyThresholdToForm(activeThreshold, "edit");
      return;
    }

    setFormData(createDefaultFormData(patientId));
    setEditingThresholdId(null);
  };

  const buildPayload = (): ThresholdPayload | null => {
    if (!user?.id) {
      setNotice({ type: "error", message: "Không tìm thấy thông tin bác sĩ đang đăng nhập." });
      return null;
    }

    if (!formData.patientId) {
      setNotice({ type: "error", message: "Vui lòng chọn bệnh nhân trước khi lưu." });
      return null;
    }

    const startDate = new Date(`${formData.effectiveFrom}T00:00:00`);
    const now = new Date();

    if (startDate.getTime() > now.getTime() && !editingThresholdId) {
      setNotice({
        type: "error",
        message:
          "Tạm thời chỉ nên tạo cấu hình có hiệu lực từ hôm nay trở về trước để tránh khoảng trống cảnh báo.",
      });
      return null;
    }

    if (formData.effectiveTo) {
      const endDate = new Date(`${formData.effectiveTo}T23:59:59`);
      if (endDate.getTime() < startDate.getTime()) {
        setNotice({
          type: "error",
          message: "Ngày kết thúc không được nhỏ hơn ngày bắt đầu.",
        });
        return null;
      }
    }

    return {
      patientId: formData.patientId,
      doctorId: user.id,
      temperatureMin: toNumber(formData.temperatureMin),
      temperatureMax: toNumber(formData.temperatureMax),
      heartRateMin: toNumber(formData.pulseMin),
      heartRateMax: toNumber(formData.pulseMax),
      respiratoryRateMin: toNumber(formData.respiratoryRateMin),
      respiratoryRateMax: toNumber(formData.respiratoryRateMax),
      spo2Min: toNumber(formData.spo2Min),
      sysMin: toNumber(formData.systolicMin),
      sysMax: toNumber(formData.systolicMax),
      diaMin: toNumber(formData.diastolicMin),
      diaMax: toNumber(formData.diastolicMax),
      glucoseMin: formData.glucoseMin ? toNumber(formData.glucoseMin) : null,
      glucoseMax: formData.glucoseMax ? toNumber(formData.glucoseMax) : null,
      effectiveFrom: toStartOfDayIso(formData.effectiveFrom),
      effectiveTo: formData.effectiveTo ? toEndOfDayIso(formData.effectiveTo) : null,
    };
  };

  const loadPatientThresholds = async (patientId: string) => {
    if (!patientId || !user?.id) {
      setActiveThreshold(null);
      setThresholdHistory([]);
      setEditingThresholdId(null);
      return;
    }

    try {
      setLoadingThresholds(true);
      const [latest, history] = await Promise.all([
        getThresholds({ patientId, doctorId: user.id, latest: true }),
        getThresholds({ patientId, doctorId: user.id }),
      ]);

      const latestThreshold = latest[0] || null;
      setActiveThreshold(latestThreshold);
      setThresholdHistory(history);

      if (latestThreshold) {
        applyThresholdToForm(latestThreshold, "edit");
      } else {
        setFormData(createDefaultFormData(patientId));
        setEditingThresholdId(null);
      }
    } catch (error) {
      console.error("Failed to load thresholds", error);
      setNotice({ type: "error", message: "Không thể tải cấu hình ngưỡng đã lưu." });
    } finally {
      setLoadingThresholds(false);
    }
  };

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoadingPatients(true);
        const response = await getMyPatients();
        setPatients(response);
      } catch (error) {
        console.error("Failed to load patients", error);
        setNotice({ type: "error", message: "Không thể tải danh sách bệnh nhân của bác sĩ." });
      } finally {
        setLoadingPatients(false);
      }
    };

    void loadPatients();
  }, []);

  useEffect(() => {
    if (!formData.patientId) {
      setActiveThreshold(null);
      setThresholdHistory([]);
      setEditingThresholdId(null);
      return;
    }

    void loadPatientThresholds(formData.patientId);
  }, [formData.patientId, user?.id]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setNotice(null);
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePatientChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const patientId = event.target.value;
    setNotice(null);
    setFormData(createDefaultFormData(patientId));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload = buildPayload();
    if (!payload) return;

    try {
      setSaving(true);

      if (editingThresholdId) {
        await updateThreshold(editingThresholdId, payload);
        setNotice({ type: "success", message: "Đã cập nhật cấu hình ngưỡng thành công." });
      } else {
        await createThreshold(payload);
        setNotice({ type: "success", message: "Đã tạo cấu hình ngưỡng mới thành công." });
      }

      await loadPatientThresholds(payload.patientId);
    } catch (error: any) {
      console.error("Failed to save threshold", error);
      setNotice({
        type: "error",
        message: error?.response?.data?.error || "Không thể lưu cấu hình ngưỡng.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveActiveThreshold = async () => {
    if (!activeThreshold || !user?.id) return;

    const confirmed = window.confirm(
      "Thao tác này sẽ ngừng hiệu lực cấu hình hiện tại. Bạn có muốn tiếp tục không?"
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      await updateThreshold(activeThreshold.id, {
        patientId: activeThreshold.patientId,
        doctorId: activeThreshold.doctorId,
        temperatureMin: activeThreshold.temperatureMin,
        temperatureMax: activeThreshold.temperatureMax,
        heartRateMin: activeThreshold.heartRateMin,
        heartRateMax: activeThreshold.heartRateMax,
        respiratoryRateMin: activeThreshold.respiratoryRateMin,
        respiratoryRateMax: activeThreshold.respiratoryRateMax,
        spo2Min: activeThreshold.spo2Min,
        sysMin: activeThreshold.sysMin,
        sysMax: activeThreshold.sysMax,
        diaMin: activeThreshold.diaMin,
        diaMax: activeThreshold.diaMax,
        glucoseMin: activeThreshold.glucoseMin,
        glucoseMax: activeThreshold.glucoseMax,
        effectiveFrom: activeThreshold.effectiveFrom,
        effectiveTo: new Date().toISOString(),
      });

      setNotice({
        type: "success",
        message: "Đã ngừng hiệu lực cấu hình hiện tại. Bạn có thể tạo cấu hình mới ngay bây giờ.",
      });
      await loadPatientThresholds(activeThreshold.patientId);
      setFormData(createDefaultFormData(activeThreshold.patientId));
    } catch (error: any) {
      console.error("Failed to archive threshold", error);
      setNotice({
        type: "error",
        message: error?.response?.data?.error || "Không thể ngừng hiệu lực cấu hình hiện tại.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Cấu Hình Ngưỡng Cảnh Báo</h1>
        <p className="mt-2 max-w-3xl text-gray-600 dark:text-slate-400">
          Cấu hình ngưỡng thật theo từng bệnh nhân, lưu lịch sử thay đổi, và cho phép chỉnh sửa hoặc
          ngừng hiệu lực ngay trên một màn hình.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-slate-400">Bệnh nhân đang quản lý</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-slate-100">{patientOptions.length}</div>
        </div>
        <div className="rounded-2xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-4 shadow-sm">
          <div className="text-sm text-blue-700 dark:text-blue-300">Bản đang hiệu lực</div>
          <div className="mt-2 text-3xl font-bold text-blue-800 dark:text-blue-200">{activeThreshold ? 1 : 0}</div>
        </div>
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 p-4 shadow-sm">
          <div className="text-sm text-indigo-700 dark:text-indigo-300">Bản lịch sử sẵn sàng dùng lại</div>
          <div className="mt-2 text-3xl font-bold text-indigo-800 dark:text-indigo-200">{reusableHistoryCount}</div>
        </div>
      </div>

      {notice && (
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.type === "success"
              ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300"
              : notice.type === "error"
                ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                : "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-3xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Bệnh nhân và cấu hình đang áp dụng</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Chọn bệnh nhân để tải ngưỡng đang áp dụng, xem mốc hiệu lực, và thao tác nhanh.
            </p>
          </div>

          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
            Chọn Bệnh Nhân <span className="text-red-500">*</span>
          </label>
          <select
            name="patientId"
            value={formData.patientId}
            onChange={handlePatientChange}
            disabled={loadingPatients}
            className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {loadingPatients ? "-- Đang tải bệnh nhân --" : "-- Chọn bệnh nhân --"}
            </option>
            {patientOptions.map((patient) => (
              <option key={patient.patientId} value={patient.patientId}>
                {patient.patientName || patient.patientId}
              </option>
            ))}
          </select>

          <div className="mt-5 rounded-3xl border border-dashed border-slate-200 dark:border-slate-600 bg-gradient-to-br from-slate-50 dark:from-slate-800 via-white dark:via-slate-800 to-blue-50 dark:to-slate-800 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-800 dark:text-slate-100">
                  {selectedPatient?.patientName || "Chưa chọn bệnh nhân"}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {loadingThresholds
                    ? "Đang tải cấu hình..."
                    : activeThreshold
                      ? `Đang có 1 cấu hình hiệu lực từ ${formatDateTime(activeThreshold.effectiveFrom)}`
                      : "Chưa có cấu hình nào đang hiệu lực"}
                </p>
              </div>

              {activeThreshold && (
                <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Đang hiệu lực
                </div>
              )}
            </div>

            {activeThreshold && (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-400">Bắt đầu</div>
                    <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {formatDateTime(activeThreshold.effectiveFrom)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-400">Kết thúc</div>
                    <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {formatDateTime(activeThreshold.effectiveTo)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-slate-400">Cập nhật</div>
                    <div className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">
                      {formatDateTime(activeThreshold.updatedAt)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => applyThresholdToForm(activeThreshold, "edit")}
                    className="inline-flex items-center rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/40 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 dark:hover:bg-blue-900/60"
                  >
                    <FaEdit className="mr-2" />
                    Chỉnh sửa cấu hình hiện tại
                  </button>
                  <button
                    type="button"
                    onClick={() => applyThresholdToForm(activeThreshold, "clone")}
                    className="inline-flex items-center rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                  >
                    <FaPlus className="mr-2" />
                    Tạo phiên bản mới
                  </button>
                  <button
                    type="button"
                    onClick={handleArchiveActiveThreshold}
                    disabled={saving}
                    className="inline-flex items-center rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/40 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 transition hover:bg-red-100 dark:hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaStopCircle className="mr-2" />
                    Ngừng hiệu lực
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Lịch sử cấu hình</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                Chọn một bản ghi đã lưu để clone nhanh, đối chiếu thay đổi, hoặc quay lại bản đang áp dụng.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {thresholdHistory.length} bản ghi
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {!formData.patientId && (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-5 text-sm text-gray-500 dark:text-slate-400">
                Chọn bệnh nhân để xem lịch sử cấu hình.
              </div>
            )}

            {formData.patientId && thresholdHistory.length === 0 && !loadingThresholds && (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-5 text-sm text-gray-500 dark:text-slate-400">
                Chưa có bản ghi cấu hình nào cho bệnh nhân này.
              </div>
            )}

            {thresholdHistory.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => applyThresholdToForm(item, item.id === activeThreshold?.id ? "edit" : "clone")}
                className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-4 text-left transition ${
                  item.id === activeThreshold?.id
                    ? "border-emerald-200 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 dark:from-emerald-900/30 to-white dark:to-slate-800 shadow-sm"
                    : "border-slate-200 dark:border-slate-600 bg-gradient-to-br from-slate-50 dark:from-slate-700/50 to-white dark:to-slate-800 hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-sm"
                }`}
              >
                <div
                  className={`absolute inset-y-0 left-0 w-1 ${
                    item.id === activeThreshold?.id ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-600 group-hover:bg-blue-300 dark:group-hover:bg-blue-500"
                  }`}
                />

                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                        Bản cấu hình #{thresholdHistory.length - index}
                      </p>
                      <span className="rounded-full bg-white/90 dark:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-300 shadow-sm">
                        Cập nhật {formatDateTime(item.updatedAt)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div>Từ {formatDateTime(item.effectiveFrom)}</div>
                      <div>Đến {formatDateTime(item.effectiveTo)}</div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {buildHistoryChips(item).map((chip) => (
                        <span
                          key={`${item.id}-${chip}`}
                          className="rounded-full bg-white dark:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:text-slate-300 shadow-sm"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 self-start whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                      item.id === activeThreshold?.id
                        ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {item.id === activeThreshold?.id ? "Hiện tại" : "Lịch sử"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">{modeLabel}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {editingThresholdId
                ? "Bạn đang chỉnh sửa trực tiếp bản cấu hình đang hiệu lực."
                : "Nếu bệnh nhân đã có cấu hình, thao tác lưu sẽ tạo thêm một phiên bản mới để giữ lịch sử."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => resetForm()}
            className="inline-flex items-center rounded-xl bg-gray-100 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 transition hover:bg-gray-200 dark:hover:bg-slate-600"
          >
            <FaUndo className="mr-2" />
            Đặt lại
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {thresholdSections.map((section) => (
            <div key={section.title} className="md:col-span-2">
              <h3 className="mb-3 border-b dark:border-slate-600 pb-2 text-lg font-semibold text-gray-800 dark:text-slate-100">{section.title}</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">Tối thiểu</label>
                  <input
                    type="number"
                    step={section.step}
                    name={section.minKey}
                    value={formData[section.minKey]}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">Tối đa</label>
                  <input
                    type="number"
                    step={section.step}
                    name={section.maxKey}
                    value={formData[section.maxKey]}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="md:col-span-2">
            <h3 className="mb-3 border-b dark:border-slate-600 pb-2 text-lg font-semibold text-gray-800 dark:text-slate-100">SpO2 (%)</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">Tối thiểu</label>
                <input
                  type="number"
                  name="spo2Min"
                  value={formData.spo2Min}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-3 border-b dark:border-slate-600 pb-2 text-lg font-semibold text-gray-800 dark:text-slate-100">Thời gian hiệu lực</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">
                  Từ ngày <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="effectiveFrom"
                  value={formData.effectiveFrom}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600 dark:text-slate-300">Đến ngày (tùy chọn)</label>
                <input
                  type="date"
                  name="effectiveTo"
                  value={formData.effectiveTo}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={!formData.patientId || saving}
            className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-slate-600"
          >
            <FaSave className="mr-2" />
            {saving ? "Đang lưu..." : editingThresholdId ? "Cập nhật cấu hình" : "Lưu cấu hình mới"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ThresholdSettingsPage;

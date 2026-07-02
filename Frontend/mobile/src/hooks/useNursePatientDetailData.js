import { useCallback, useRef, useState } from "react";
import { getPatientById } from "../api/patientApi";
import { getMeasurements } from "../api/measurementApi";
import { getThresholds } from "../api/thresholdApi";
import { getMyNurseAlerts } from "../api/alertApi";
import { getPrescriptions } from "../api/prescriptionApi";

// --------------- helpers ---------------

function extractData(response) {
  if (!response?.ok) return null;
  return response.body?.data || response.body || null;
}

function extractList(response) {
  const data = extractData(response);
  return Array.isArray(data) ? data : [];
}

function normalizeObjectId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.$oid === "string") return value.$oid;
  return String(value);
}

function getErrorMessage(response) {
  if (!response) return "Không thể kết nối tới máy chủ.";
  if (typeof response.error === "string" && response.error) return response.error;
  if (typeof response.body === "string" && response.body) return response.body;
  if (response.body?.error) return response.body.error;
  return "Đã xảy ra lỗi không xác định.";
}

export function normalizeProfile(raw = {}) {
  return {
    id: normalizeObjectId(raw.id || raw._id),
    name: raw.name || "Chưa rõ bệnh nhân",
    patientCode: raw.userPublicId || raw.patientCode || raw.patientPublicId || "",
    email: raw.email || "",
    phone: raw.phone || raw.phoneNumber || "",
    gender: raw.gender || "",
    dateOfBirth: raw.dateOfBirth || raw.birthDate || "",
    avatarUrl: raw.avatarUrl || "",
    status: raw.status || "",
    isActive: raw.status === "active" || raw.isActive === true,
    insuranceNumber: raw.insuranceNumber || "",
    cccd: raw.cccd || raw.CCCD || "",
    emergencyContactName: raw.emergencyContactName || "",
    emergencyContactPhone: raw.emergencyContactPhone || "",
    diseaseTypes: Array.isArray(raw.diseaseTypes) ? raw.diseaseTypes : [],
  };
}

export function normalizeMeasurements(list = []) {
  return list.map((m) => ({
    id: normalizeObjectId(m._id || m.id),
    createdAt: m.createdAt || "",
    device: m.device || "",
    note: m.note || "",
    mealTiming: m.mealTiming || "",
    bloodPressure: m.bloodPressure
      ? {
          systolic: m.bloodPressure.systolic || null,
          diastolic: m.bloodPressure.diastolic || null,
        }
      : null,
    heartRate: m.heartRate || null,
    glucose: (() => {
      if (!m.glucose) return null;
      if (typeof m.glucose === "object") return m.glucose.bloodGlucose || null;
      return m.glucose;
    })(),
    spo2: m.spo2 || null,
    temperature: m.temperature || null,
    respiratoryRate: m.respiratoryRate || null,
    height: m.height || null,
    weight: m.weight || null,
  }));
}

export function normalizeThreshold(raw = null) {
  if (!raw) return null;
  return {
    id: normalizeObjectId(raw._id || raw.id),
    temperatureMin: raw.temperatureMin ?? null,
    temperatureMax: raw.temperatureMax ?? null,
    systolicMin: raw.sysMin ?? raw.systolicMin ?? null,
    systolicMax: raw.sysMax ?? raw.systolicMax ?? null,
    diastolicMin: raw.diaMin ?? raw.diastolicMin ?? null,
    diastolicMax: raw.diaMax ?? raw.diastolicMax ?? null,
    heartRateMin: raw.heartRateMin ?? null,
    heartRateMax: raw.heartRateMax ?? null,
    glucoseMin: raw.glucoseMin ?? null,
    glucoseMax: raw.glucoseMax ?? null,
    spo2Min: raw.spo2Min ?? null,
    respiratoryRateMin: raw.respiratoryRateMin ?? null,
    respiratoryRateMax: raw.respiratoryRateMax ?? null,
    validFrom: raw.effectiveFrom || raw.validFrom || "",
    validTo: raw.effectiveTo || raw.validTo || "",
    isLatest: raw.isLatest === true,
  };
}

export function normalizeAlerts(list = []) {
  return list.map((a) => ({
    id: normalizeObjectId(a._id || a.id),
    patientId: normalizeObjectId(a.patientId),
    severity: a.severity || "low",
    status: a.status || "open",
    createdAt: a.createdAt || "",
    violations: Array.isArray(a.violations) ? a.violations : [],
    measurementId: normalizeObjectId(a.measurementId),
    acknowledgedBy: a.acknowledgedBy || null,
    acknowledgedAt: a.acknowledgedAt || null,
  }));
}

// --------------- hook ---------------

export function useNursePatientDetailData(patientId) {
  const [profile, setProfile] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [latestThreshold, setLatestThreshold] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async ({ showRefresh = false } = {}) => {
      if (!patientId) return;
      const requestId = ++requestIdRef.current;

      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const [profileRes, measurementsRes, thresholdsRes, alertsRes, presRes] = await Promise.all([
          getPatientById(patientId),
          getMeasurements({ patientId }),
          getThresholds({ patientId, latest: true }),
          getMyNurseAlerts({ patientId, status: "open", limit: 50, sortOrder: "desc" }),
          getPrescriptions({ patientId, status: "active" }).then(data => ({ ok: true, data })).catch(err => ({ ok: false, error: err.message })),
        ]);

        if (!mountedRef.current || requestIdRef.current !== requestId) return;

        if (profileRes?.ok) {
          const raw = extractData(profileRes);
          setProfile(normalizeProfile(raw || {}));
        } else {
          setError(getErrorMessage(profileRes));
        }

        if (measurementsRes?.ok) {
          setMeasurements(normalizeMeasurements(extractList(measurementsRes)));
        }

        if (thresholdsRes?.ok) {
          const threshList = extractList(thresholdsRes);
          const latest = threshList.find((t) => t.isLatest) || threshList[0] || null;
          setLatestThreshold(normalizeThreshold(latest));
        }

        if (alertsRes?.ok) {
          setAlerts(normalizeAlerts(extractList(alertsRes)));
        }

        if (presRes?.ok) {
          setPrescriptions(Array.isArray(presRes.data) ? presRes.data : []);
        }
      } catch (err) {
        if (!mountedRef.current || requestIdRef.current !== requestId) return;
        setError(err?.message || "Không tải được thông tin bệnh nhân.");
      } finally {
        if (mountedRef.current && requestIdRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [patientId]
  );

  const refresh = useCallback(() => {
    load({ showRefresh: true });
  }, [load]);

  return {
    profile,
    measurements,
    latestThreshold,
    alerts,
    prescriptions,
    loading,
    refreshing,
    error,
    load,
    refresh,
  };
}

export default useNursePatientDetailData;

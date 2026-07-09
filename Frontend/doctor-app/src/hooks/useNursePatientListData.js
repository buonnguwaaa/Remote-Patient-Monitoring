import { useCallback, useEffect, useRef, useState } from "react";

import { getMyNurseProfile } from "../api/profileApi";
import { getMyPatientOverview } from "../api/patientOverviewApi";

function extractData(response) {
  if (!response?.ok) return null;
  return response.body?.data || response.body || null;
}

function getErrorMessage(response) {
  if (!response) return "Không thể kết nối tới máy chủ.";
  if (typeof response.error === "string" && response.error) return response.error;
  if (typeof response.body === "string" && response.body) return response.body;
  if (response.body?.error) return response.body.error;
  return "Đã xảy ra lỗi không xác định.";
}

function hasPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasBloodPressure(measurement) {
  return (
    hasPositiveNumber(measurement?.bloodPressure?.systolic) ||
    hasPositiveNumber(measurement?.bloodPressure?.diastolic)
  );
}

function normalizeNurseProfile(profile = {}, fallbackName = "") {
  return {
    id: profile.id || "",
    name: profile.name || fallbackName || "Điều dưỡng",
  };
}

function normalizeThreshold(raw = null) {
  if (!raw) return null;
  return {
    id: raw.id || raw._id || "",
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
  };
}

function buildLastMeasurements(measurement) {
  return {
    bp: hasBloodPressure(measurement)
      ? {
          systolic: measurement?.bloodPressure?.systolic || 0,
          diastolic: measurement?.bloodPressure?.diastolic || 0,
          pulse: hasPositiveNumber(measurement?.heartRate) ? measurement.heartRate : null,
        }
      : null,
    glucose: (() => {
      const glucVal = measurement?.glucose ? (typeof measurement.glucose === "object" ? measurement.glucose.bloodGlucose : measurement.glucose) : null;
      return hasPositiveNumber(glucVal)
        ? { value: glucVal, timing: measurement?.mealTiming || measurement?.timing || "" }
        : null;
    })(),
    spo2: hasPositiveNumber(measurement?.spo2) ? { value: measurement.spo2 } : null,
    temp: hasPositiveNumber(measurement?.temperature)
      ? { value: measurement.temperature }
      : null,
    heartRate: hasPositiveNumber(measurement?.heartRate)
      ? { value: measurement.heartRate }
      : null,
    respiratoryRate: hasPositiveNumber(measurement?.respiratoryRate)
      ? { value: measurement.respiratoryRate }
      : null,
  };
}

function buildPatientListItem(profile, latestMeasurement, alertsSummary, thresholds) {
  return {
    patientId: profile.patientId,
    user: {
      _id: profile.patientId,
      name: profile.name,
      emailLower: profile.email ? String(profile.email).toLowerCase() : "",
      avatarUrl: profile.avatarUrl,
      isActive: profile.status === "active",
    },
    patientCode: profile.patientCode,
    patientInfo: {
      _id: profile.patientId,
      userId: profile.patientId,
      insuranceNumber: profile.insuranceNumber,
      CCCD: profile.cccd,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
    },
    lastMeasurementAt: latestMeasurement?.createdAt || "",
    lastMeasurements: buildLastMeasurements(latestMeasurement),
    thresholds: thresholds || null,
    alertsSummary: alertsSummary || {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      lastAlertAt: null,
    },
  };
}

export function useNursePatientListData(currentUser) {
  const [nurseProfile, setNurseProfile] = useState(
    normalizeNurseProfile({}, currentUser?.name || currentUser?.username || "")
  );
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadNotice, setLoadNotice] = useState("");

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isRequestCurrent = useCallback((requestId) => {
    return mountedRef.current && requestIdRef.current === requestId;
  }, []);

  const loadPatients = useCallback(
    async ({ showLoader = true, showRefresh = false } = {}) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (showLoader && isRequestCurrent(requestId)) {
        setLoading(true);
      }
      if (showRefresh && isRequestCurrent(requestId)) {
        setRefreshing(true);
      }

      if (isRequestCurrent(requestId)) {
        setLoadError("");
        setLoadNotice("");
      }

      try {
        const fallbackNurseName = currentUser?.name || currentUser?.username || "Điều dưỡng";
        const [nurseResponse, overviewResponse] = await Promise.all([
          getMyNurseProfile(),
          getMyPatientOverview(),
        ]);

        if (!isRequestCurrent(requestId)) {
          return;
        }

        if (!overviewResponse.ok) {
          throw new Error(getErrorMessage(overviewResponse));
        }

        const notices = [];
        if (!nurseResponse.ok) {
          notices.push("Không tải được hồ sơ điều dưỡng, đang dùng tên từ phiên đăng nhập.");
        }

        setNurseProfile(
          nurseResponse.ok
            ? normalizeNurseProfile(extractData(nurseResponse), fallbackNurseName)
            : normalizeNurseProfile({}, fallbackNurseName)
        );

        const overviewData = extractData(overviewResponse) || {};
        const rawPatients = overviewData.patients || [];

        const nextPatients = rawPatients.map((rawItem) => {
          const profile = {
            patientId: rawItem.patientId,
            patientCode: rawItem.patientPublicId || rawItem.patientCode || "",
            name: rawItem.name || "Chưa rõ bệnh nhân",
            email: rawItem.email || "",
            avatarUrl: rawItem.avatarUrl || "",
            status: rawItem.status || "",
            insuranceNumber: rawItem.insuranceNumber || "",
            cccd: rawItem.cccd || "",
            emergencyContactName: rawItem.emergencyContactName || "",
            emergencyContactPhone: rawItem.emergencyContactPhone || "",
          };

          return buildPatientListItem(
            profile,
            rawItem.latestMeasurement,
            rawItem.alertsSummary,
            normalizeThreshold(rawItem.latestThreshold)
          );
        });

        // Patients are already sorted by the backend, but we can do a secondary sort if needed.
        // We'll preserve the sort to ensure it completely matches:
        nextPatients.sort((left, right) => {
          const highDiff = right.alertsSummary.high - left.alertsSummary.high;
          if (highDiff !== 0) return highDiff;
          const medDiff = right.alertsSummary.medium - left.alertsSummary.medium;
          if (medDiff !== 0) return medDiff;
          const lowDiff = right.alertsSummary.low - left.alertsSummary.low;
          if (lowDiff !== 0) return lowDiff;
          return left.user.name.localeCompare(right.user.name, "vi");
        });

        setPatients(nextPatients);
        setLoadNotice(notices.join(" "));
      } catch (error) {
        if (!isRequestCurrent(requestId)) {
          return;
        }

        setPatients([]);
        setNurseProfile(
          normalizeNurseProfile({}, currentUser?.name || currentUser?.username || "Điều dưỡng")
        );
        setLoadError(error?.message || "Không tải được danh sách bệnh nhân.");
      } finally {
        if (isRequestCurrent(requestId)) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [currentUser?.name, currentUser?.username, isRequestCurrent]
  );

  return {
    nurseProfile,
    patients,
    loading,
    refreshing,
    loadError,
    loadNotice,
    loadPatients,
  };
}

export default useNursePatientListData;

import { useCallback, useEffect, useRef, useState } from "react";

import { getMyAssignments } from "../api/assignmentApi";
import { getMyNurseProfile } from "../api/profileApi";
import { getPatientById } from "../api/patientApi";
import { getThresholds } from "../api/thresholdApi";
import { getMeasurements } from "../api/measurementApi";
import { getMyNurseAlerts } from "../api/alertApi";

const PATIENT_FETCH_CONCURRENCY = 4;
const ALERTS_PAGE_SIZE = 100;
const ALERTS_MAX_PAGES = 20;

function extractData(response) {
  if (!response?.ok) return null;
  return response.body?.data || response.body || null;
}

function extractList(response) {
  const data = extractData(response);
  return Array.isArray(data) ? data : [];
}

function getErrorMessage(response) {
  if (!response) return "KhÃ´ng thá»ƒ káº¿t ná»‘i tá»›i mÃ¡y chá»§.";
  if (typeof response.error === "string" && response.error) return response.error;
  if (typeof response.body === "string" && response.body) return response.body;
  if (response.body?.error) return response.body.error;
  return "ÄÃ£ xáº£y ra lá»—i khÃ´ng xÃ¡c Ä‘á»‹nh.";
}

function normalizeObjectId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.$oid === "string") return value.$oid;
  return String(value);
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

function normalizeAssignmentPatient(item = {}) {
  return {
    assignmentId: normalizeObjectId(item.id),
    patientId: normalizeObjectId(item.patientId),
    patientCode: item.patientPublicId || item.patientCode || "",
    name: item.patientName || "ChÆ°a rÃµ bá»‡nh nhÃ¢n",
  };
}

function normalizeNurseProfile(profile = {}, fallbackName = "") {
  return {
    id: profile.id || "",
    name: profile.name || fallbackName || "Äiá»u dÆ°á»¡ng",
  };
}

function normalizePatientProfile(profile = {}, fallback = {}) {
  return {
    patientId: profile.id || fallback.patientId || "",
    patientCode: profile.userPublicId || fallback.patientCode || "",
    name: profile.name || fallback.name || "ChÆ°a rÃµ bá»‡nh nhÃ¢n",
    email: profile.email || "",
    avatarUrl: profile.avatarUrl || "",
    status: profile.status || "",
    insuranceNumber: profile.insuranceNumber || "",
    cccd: profile.cccd || "",
    emergencyContactName: profile.emergencyContactName || "",
    emergencyContactPhone: profile.emergencyContactPhone || "",
  };
}

function extractLatestMeasurement(response) {
  const measurements = extractList(response);
  return measurements[0] || null;
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

function buildAlertsSummaryMap(alerts = []) {
  const summaryMap = new Map();

  alerts.forEach((alert) => {
    if (alert?.status !== "open") {
      return;
    }

    const patientId = normalizeObjectId(alert?.patientId);
    if (!patientId) return;

    const currentSummary = summaryMap.get(patientId) || {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      lastAlertAt: null,
    };

    currentSummary.total += 1;
    if (alert?.severity === "high") {
      currentSummary.high += 1;
    } else if (alert?.severity === "medium") {
      currentSummary.medium += 1;
    } else if (alert?.severity === "low") {
      currentSummary.low += 1;
    }

    const currentLastAt = new Date(currentSummary.lastAlertAt || 0).getTime();
    const nextLastAt = new Date(alert?.createdAt || 0).getTime();
    if (nextLastAt > currentLastAt) {
      currentSummary.lastAlertAt = alert?.createdAt || null;
    }

    summaryMap.set(patientId, currentSummary);
  });

  return summaryMap;
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

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}

async function fetchAllNurseAlerts() {
  const alerts = [];

  for (let page = 1; page <= ALERTS_MAX_PAGES; page += 1) {
    const response = await getMyNurseAlerts({
      page,
      limit: ALERTS_PAGE_SIZE,
      sortOrder: "desc",
      status: "open",
    });

    if (!response.ok) {
      return { ok: false, response, alerts };
    }

    const pageItems = extractList(response);
    alerts.push(...pageItems);

    if (pageItems.length < ALERTS_PAGE_SIZE) {
      break;
    }
  }

  return { ok: true, alerts };
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
        const fallbackNurseName = currentUser?.name || currentUser?.username || "Äiá»u dÆ°á»¡ng";
        const [nurseResponse, assignmentsResponse, alertsResult] = await Promise.all([
          getMyNurseProfile(),
          getMyAssignments(),
          fetchAllNurseAlerts(),
        ]);

        if (!isRequestCurrent(requestId)) {
          return;
        }

        if (!assignmentsResponse.ok) {
          throw new Error(getErrorMessage(assignmentsResponse));
        }

        const notices = [];
        const assignments = extractList(assignmentsResponse).map(normalizeAssignmentPatient);
        const alerts = alertsResult.ok ? alertsResult.alerts : [];
        const alertsSummaryMap = buildAlertsSummaryMap(alerts);

        if (!nurseResponse.ok) {
          notices.push("KhÃ´ng táº£i Ä‘Æ°á»£c há»“ sÆ¡ Ä‘iá»u dÆ°á»¡ng, Ä‘ang dÃ¹ng tÃªn tá»« phiÃªn Ä‘Äƒng nháº­p.");
        }

        if (!alertsResult.ok) {
          notices.push("KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u cáº£nh bÃ¡o, cÃ¡c bá»™ lá»c cáº£nh bÃ¡o cÃ³ thá»ƒ chÆ°a Ä‘áº§y Ä‘á»§.");
        }

        setNurseProfile(
          nurseResponse.ok
            ? normalizeNurseProfile(extractData(nurseResponse), fallbackNurseName)
            : normalizeNurseProfile({}, fallbackNurseName)
        );

        const patientFetchResults = await mapWithConcurrency(
          assignments,
          PATIENT_FETCH_CONCURRENCY,
          async (assignment) => {
            const [patientResponse, measurementResponse, thresholdResponse] = await Promise.all([
              getPatientById(assignment.patientId),
              getMeasurements({ patientId: assignment.patientId, latest: true }),
              getThresholds({ patientId: assignment.patientId, latest: true }),
            ]);

            const profile = patientResponse.ok
              ? normalizePatientProfile(extractData(patientResponse), assignment)
              : normalizePatientProfile({}, assignment);
            const latestMeasurement = measurementResponse.ok ? extractLatestMeasurement(measurementResponse) : null;
            const thresholds = thresholdResponse.ok ? extractList(thresholdResponse)[0] : null;

            return {
              item: buildPatientListItem(profile, latestMeasurement, alertsSummaryMap.get(assignment.patientId), thresholds),
              profileLoaded: patientResponse.ok,
              latestMeasurementLoaded: measurementResponse.ok,
            };
          }
        );

        if (!isRequestCurrent(requestId)) {
          return;
        }

        const patientProfileErrorCount = patientFetchResults.filter(
          (result) => !result.profileLoaded
        ).length;
        const measurementErrorCount = patientFetchResults.filter(
          (result) => !result.latestMeasurementLoaded
        ).length;

        if (patientProfileErrorCount > 0) {
          notices.push(`CÃ³ ${patientProfileErrorCount} há»“ sÆ¡ bá»‡nh nhÃ¢n chÆ°a táº£i Ä‘á»§ chi tiáº¿t.`);
        }

        if (measurementErrorCount > 0) {
          notices.push(`CÃ³ ${measurementErrorCount} bá»‡nh nhÃ¢n chÆ°a táº£i Ä‘Æ°á»£c báº£n Ä‘o gáº§n nháº¥t.`);
        }

        const nextPatients = patientFetchResults
          .map((result) => result.item)
          .sort((left, right) => {
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
          normalizeNurseProfile({}, currentUser?.name || currentUser?.username || "Äiá»u dÆ°á»¡ng")
        );
        setLoadError(error?.message || "KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch bá»‡nh nhÃ¢n.");
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


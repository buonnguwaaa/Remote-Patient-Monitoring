import api from "./api";
import type { AssignmentResponse, AlertResponse } from "../types/patient";
import { normalizeAlertSeverity } from "../utils/alertSeverity";
import type { AlertSeverity } from "../types/index";

// ---- Patient detail types ----
export interface PatientDetailResponse {
  id: string;
  name: string;
  avatarUrl?: string;
  dob: string;
  gender: string;
  phone?: string;
  status: string; // 'active' | 'inactive'
  userPublicId?: string;
  patientCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalHistory?: string;
  insuranceNumber?: string;
  cccd?: string;
  diseaseTypes?: {
    bloodPressure: boolean;
    glucose: boolean;
  };
}

export type MealTiming = "pre_meal" | "post_meal";

export interface MeasurementResponse {
  id: string;
  patientId: string;

  temperature?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  spo2?: number | null;

  bloodPressure?: {
    systolic?: number | null;
    diastolic?: number | null;
    map?: number | null;
  } | null;

  height?: number | null;
  weight?: number | null;
  bmi?: number | null;

  glucose?: {
    bloodGlucose?: number | null;
  } | number | null;

  mealTiming?: MealTiming | null;

  device?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentApiResponse extends Omit<AssignmentResponse, "patientCode"> {
  patientCode?: string;
  patientPublicId?: string;
}

export const getMyPatients = async (): Promise<AssignmentResponse[]> => {
  const response = await api.get<{ data: AssignmentApiResponse[] | null }>("/assignments/me");

  return (response.data.data || []).map((assignment) => ({
    ...assignment,
    patientCode: assignment.patientCode || assignment.patientPublicId,
  }));
};

export const getMyPatientsPaginated = async (
  page: number,
  limit: number
): Promise<{ data: AssignmentResponse[]; total: number }> => {
  const response = await api.get<{
    data: AssignmentApiResponse[] | null;
    total: number;
  }>("/assignments/me", { params: { page, limit } });

  const data = (response.data.data || []).map((assignment) => ({
    ...assignment,
    patientCode: assignment.patientCode || assignment.patientPublicId,
  }));

  return { data, total: response.data.total || 0 };
};

export const getLatestAlertForPatient = async (
  patientId: string
): Promise<AlertResponse | null> => {
  const alertsResult = await getAlerts();
  const alerts = alertsResult.alerts;
  const latestAlert = [...alerts]
    .filter((alert) => alert.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return latestAlert || null;
};

export const getAlerts = async (params?: {
  patientId?: string;
  status?: "open" | "ack";
  severity?: AlertSeverity;
  isLatest?: boolean;
  limit?: number;
  page?: number;
  sortOrder?: "asc" | "desc";
}): Promise<{ alerts: AlertResponse[]; total: number }> => {
  const response = await api.get<{ data: AlertResponse[] | null; total?: number }>("/alerts/doctors/me", {
    params: {
      patientId: params?.patientId,
      status: params?.status,
      severity: params?.severity,
      isLatest: params?.isLatest ? "true" : undefined,
      limit: params?.limit,
      page: params?.page,
      sortOrder: params?.sortOrder,
    },
  });

  const raw = response.data.data || [];
  // Normalize severity tại API boundary
  const alerts: AlertResponse[] = raw.map((alert) => ({
    ...alert,
    severity: normalizeAlertSeverity(alert.severity),
    violations: (alert.violations || []).map((v) => ({
      ...v,
      severity: normalizeAlertSeverity(v.severity),
    })),
  }));

  return {
    alerts,
    total: response.data.total || 0,
  };
};


export const acknowledgeAlert = async (alertId: string): Promise<AlertResponse> => {
  const response = await api.patch<{ data: AlertResponse }>(`/alerts/ack/${alertId}`);
  const alert = response.data.data;
  return {
    ...alert,
    severity: normalizeAlertSeverity(alert.severity),
    violations: (alert.violations || []).map((v) => ({
      ...v,
      severity: normalizeAlertSeverity(v.severity),
    })),
  };
};

export const getAlertById = async (alertId: string): Promise<AlertResponse | null> => {
  try {
    const response = await api.get<{ data: AlertResponse }>(`/alerts/${alertId}`);
    const alert = response.data.data;
    if (!alert) return null;
    return {
      ...alert,
      severity: normalizeAlertSeverity(alert.severity),
      violations: (alert.violations || []).map((v) => ({
        ...v,
        severity: normalizeAlertSeverity(v.severity),
      })),
    };
  } catch {
    return null;
  }
};

export const getPatientById = async (
  id: string
): Promise<PatientDetailResponse> => {
  const response = await api.get<{ data: PatientDetailResponse }>(
    `/users/patients/${id}`
  );

  return {
    ...response.data.data,
    patientCode: response.data.data.patientCode || response.data.data.userPublicId,
  };
};

export const getMeasurements = async (params: {
  patientId?: string;
  latest?: boolean;
}): Promise<MeasurementResponse[]> => {
  const response = await api.get<{ data: MeasurementResponse[] | null }>(
    "/measurements",
    {
      params: {
        patientId: params.patientId,
        latest: params.latest ? "true" : undefined,
      },
    }
  );
  return response.data.data || [];
};

export interface AdherenceResponse {
  from: string;
  to: string;
  summary: {
    expected: number;
    taken: number;
    missed: number;
    adherenceRate: number;
  };
  days: Array<{
    date: string;
    expected: number;
    taken: number;
    missed: number;
    medications: Array<{
      prescriptionId: string;
      drugName: string;
      dosage: string;
      expected: number;
      taken: number;
      missed: number;
      slots: Array<{
        time: string;
        hour: number;
        minute: number;
        timeOfDay: string;
        mealTiming: string;
        pillCount: number;
        status: "taken" | "missed" | "pending";
        intakeId?: string;
        takenAt?: string;
      }>;
    }>;
  }>;
}

export const getAdherence = async (params: {
  patientId: string;
  days?: number;
  from?: string;
  to?: string;
}): Promise<AdherenceResponse> => {
  const response = await api.get<{ data: AdherenceResponse }>("/medication-intakes/adherence", {
    params,
  });
  return response.data.data;
};

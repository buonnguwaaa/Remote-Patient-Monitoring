import api from "./api";
import type { AssignmentResponse, AlertResponse } from "../types/patient";

// ---- Patient detail types ----
export interface PatientDetailResponse {
  id: string;
  name: string;
  avatarUrl?: string;
  dob: string;
  gender: string;
  phone?: string;
  status: string; // 'active' | 'inactive'
  patientCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalHistory?: string;
}

export interface MeasurementResponse {
  id: string;
  patientId: string;
  temperature: number;
  heartRate: number;
  respiratoryRate: number;
  spo2: number;
  bloodPressure: { systolic: number; diastolic: number };
  type: string;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  timing?: string;
  device?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const getMyPatients = async (): Promise<AssignmentResponse[]> => {
  const response = await api.get<{ data: AssignmentResponse[] | null }>("/assignments/me");
  return response.data.data || [];
};

export const getLatestAlertForPatient = async (
  patientId: string
): Promise<AlertResponse | null> => {
  const response = await api.get<{ data: AlertResponse[] | null }>("/alerts", {
    params: { patientId, isLatest: "true" },
  });
  const alerts = response.data.data || [];
  return alerts && alerts.length > 0 ? alerts[0] : null;
};

export const getAlerts = async (params?: {
  patientId?: string;
  status?: "open" | "ack";
  severity?: "high" | "info";
  isLatest?: boolean;
}): Promise<AlertResponse[]> => {
  const response = await api.get<{ data: AlertResponse[] | null }>("/alerts", {
    params: {
      patientId: params?.patientId,
      status: params?.status,
      severity: params?.severity,
      isLatest: params?.isLatest ? "true" : undefined,
    },
  });

  return response.data.data || [];
};

export const acknowledgeAlert = async (alertId: string): Promise<AlertResponse> => {
  const response = await api.patch<{ data: AlertResponse }>(`/alerts/${alertId}`);
  return response.data.data;
};

export const getPatientById = async (
  id: string
): Promise<PatientDetailResponse> => {
  const response = await api.get<{ data: PatientDetailResponse }>(
    `/users/patients/${id}`
  );
  return response.data.data;
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

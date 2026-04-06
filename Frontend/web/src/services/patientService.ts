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
  userPublicId?: string;
  patientCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalHistory?: string;
}

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
  } | null;
  type: string;
  systolic?: number | null;
  diastolic?: number | null;
  glucose?: number | null;
  timing?: string;
  device?: string;
  note?: string;
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

export const getLatestAlertForPatient = async (
  patientId: string
): Promise<AlertResponse | null> => {
  const alerts = await getAlerts();
  const latestAlert = [...alerts]
    .filter((alert) => alert.patientId === patientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return latestAlert || null;
};

export const getAlerts = async (params?: {
  patientId?: string;
  status?: "open" | "ack";
  severity?: "high" | "info";
  isLatest?: boolean;
  limit?: number;
  page?: number;
  sortOrder?: "asc" | "desc";
}): Promise<AlertResponse[]> => {
  const response = await api.get<{ data: AlertResponse[] | null }>("/alerts/doctors/me", {
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

  return response.data.data || [];
};


export const acknowledgeAlert = async (alertId: string): Promise<AlertResponse> => {
  const response = await api.patch<{ data: AlertResponse }>(`/alerts/ack/${alertId}`);
  return response.data.data;
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

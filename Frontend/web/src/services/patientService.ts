import api from "./api";
import type { AssignmentResponse, AlertResponse } from "../types/patient";

export const getMyPatients = async (): Promise<AssignmentResponse[]> => {
  const response = await api.get<{ data: AssignmentResponse[] | null }>("/assignments");
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
  const response = await api.patch<{ data: AlertResponse }>(`/alerts/${alertId}/acknowledge`);
  return response.data.data;
};

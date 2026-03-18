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

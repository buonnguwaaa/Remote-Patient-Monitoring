import api from "./api";
import type {
  Prescription,
  PrescriptionStatus,
  MedicationAdherence,
  CreatePrescriptionPayload,
  UpdatePrescriptionPayload,
} from "../types/index";

// ---- Date helpers (consistent với ReminderPage) ----
// Dùng local time để tránh lệch ngày do timezone
export const toStartOfDayIso = (date: string): string =>
  new Date(`${date}T00:00:00`).toISOString();

export const toEndOfDayIso = (date: string): string =>
  new Date(`${date}T23:59:59`).toISOString();

// ---- Prescription API ----

export const getPrescriptions = async (params?: {
  patientId?: string;
  status?: PrescriptionStatus | "";
  latest?: boolean;
}): Promise<Prescription[]> => {
  const response = await api.get<{ data: Prescription[] | null; message: string }>(
    "/prescriptions",
    {
      params: {
        patientId: params?.patientId || undefined,
        status: params?.status || undefined,
        latest: params?.latest ? "true" : undefined,
      },
    }
  );
  return response.data.data || [];
};

export const getPrescriptionById = async (id: string): Promise<Prescription | null> => {
  try {
    const response = await api.get<{ data: Prescription; message: string }>(
      `/prescriptions/${id}`
    );
    return response.data.data || null;
  } catch {
    return null;
  }
};

export const createPrescription = async (
  payload: CreatePrescriptionPayload
): Promise<Prescription> => {
  const response = await api.post<{ data: Prescription; message: string }>(
    "/prescriptions",
    payload
  );
  return response.data.data;
};

export const updatePrescription = async (
  id: string,
  payload: UpdatePrescriptionPayload
): Promise<Prescription> => {
  // Full update — phải gửi toàn bộ fields (medications, timezone, daysOfWeek, startDate, endDate, status)
  const response = await api.patch<{ data: Prescription; message: string }>(
    `/prescriptions/${id}`,
    payload
  );
  return response.data.data;
};

export const updatePrescriptionStatus = async (
  id: string,
  status: PrescriptionStatus
): Promise<Prescription> => {
  const response = await api.patch<{ data: Prescription; message: string }>(
    `/prescriptions/${id}/status`,
    { status }
  );
  return response.data.data;
};


// ---- Medication Adherence ----

export const getMedicationAdherence = async (params: {
  patientId?: string;
  days?: number;
  from?: string;
  to?: string;
}): Promise<MedicationAdherence | null> => {
  const response = await api.get<{ data: MedicationAdherence | null; message: string }>(
    "/medication-intakes/adherence",
    {
      params: {
        patientId: params.patientId || undefined,
        days: params.days || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
      },
    }
  );
  return response.data.data || null;
};

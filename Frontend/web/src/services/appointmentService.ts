import api from "./api";

export type AppointmentStatus = "scheduled" | "completed" | "canceled";

export interface FollowUpAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  timezone: string;
  location: string;
  notes: string;
  status: AppointmentStatus;
  durationMinutes?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentPayload {
  patientId: string;
  scheduledAt: string;
  timezone: string;
  location?: string;
  notes?: string;
}

export interface UpdateAppointmentPayload {
  scheduledAt?: string;
  timezone?: string;
  location?: string;
  notes?: string;
}

export const getMyAppointments = async (params?: {
  status?: AppointmentStatus | "";
  from?: string;
  to?: string;
}): Promise<FollowUpAppointment[]> => {
  const response = await api.get<{ data: FollowUpAppointment[] | null }>("/appointments/me", {
    params: {
      status: params?.status || undefined,
      from: params?.from || undefined,
      to: params?.to || undefined,
    },
  });
  return response.data.data || [];
};

export const createAppointment = async (payload: CreateAppointmentPayload): Promise<FollowUpAppointment> => {
  const response = await api.post<{ data: FollowUpAppointment }>("/appointments", payload);
  return response.data.data;
};

export const updateAppointment = async (id: string, payload: UpdateAppointmentPayload): Promise<FollowUpAppointment> => {
  const response = await api.patch<{ data: FollowUpAppointment }>(`/appointments/${id}`, payload);
  return response.data.data;
};

export const updateAppointmentStatus = async (id: string, status: AppointmentStatus): Promise<FollowUpAppointment> => {
  const response = await api.patch<{ data: FollowUpAppointment }>(`/appointments/${id}/status`, { status });
  return response.data.data;
};

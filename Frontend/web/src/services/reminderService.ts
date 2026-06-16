import api from "./api";

export type ReminderKind = "measure" | "medication";
export type ReminderStatus = "active" | "paused" | "expired" | "canceled";

export interface ReminderRecord {
  id: string;
  patientId: string;
  kind: ReminderKind;
  message: string;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  timezone: string;
  status: ReminderStatus;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // New fields from prescription-linked reminders
  prescriptionId?: string;
  timeOfDay?: "morning" | "noon" | "evening";
  mealTiming?: "pre_meal" | "post_meal";
}

export interface ReminderBasePayload {
  patientId: string;
  kind: ReminderKind;
  message: string;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  timezone: string;
  startDate: string;
  endDate: string;
}

export interface UpdateReminderPayload extends ReminderBasePayload {
  status: ReminderStatus;
}

interface ReminderApiResponse {
  id: string;
  patientId: string;
  kind: ReminderKind;
  message: string;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  timezone: string;
  status: ReminderStatus;
  startDate: string;
  endDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // New fields
  prescriptionId?: string;
  timeOfDay?: "morning" | "noon" | "evening";
  mealTiming?: "pre_meal" | "post_meal";
}

const mapReminder = (item: ReminderApiResponse): ReminderRecord => ({
  id: item.id,
  patientId: item.patientId,
  kind: item.kind,
  message: item.message,
  hour: item.hour,
  minute: item.minute,
  daysOfWeek: item.daysOfWeek ?? [],
  timezone: item.timezone,
  status: item.status,
  startDate: item.startDate,
  endDate: item.endDate,
  createdBy: item.createdBy,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  prescriptionId: item.prescriptionId,
  timeOfDay: item.timeOfDay,
  mealTiming: item.mealTiming,
});

export const getReminders = async (params?: {
  patientId?: string;
  status?: ReminderStatus;
  kind?: ReminderKind;
  latest?: boolean;
}) => {
  const response = await api.get<{ data: ReminderApiResponse[] | null }>("/reminders", {
    params: {
      patientId: params?.patientId,
      status: params?.status,
      kind: params?.kind,
      latest: params?.latest ? "true" : undefined,
    },
  });

  return (response.data.data || []).map(mapReminder);
};

export const createReminder = async (payload: ReminderBasePayload) => {
  const response = await api.post<{ data: ReminderApiResponse }>("/reminders", payload);
  return mapReminder(response.data.data);
};

export const updateReminder = async (id: string, payload: UpdateReminderPayload) => {
  const response = await api.patch<{ data: ReminderApiResponse }>(`/reminders/${id}`, payload);
  return mapReminder(response.data.data);
};

export const updateReminderStatus = async (id: string, status: ReminderStatus) => {
  const response = await api.patch<{ data: ReminderApiResponse }>(`/reminders/${id}/status`, {
    status,
  });

  return mapReminder(response.data.data);
};

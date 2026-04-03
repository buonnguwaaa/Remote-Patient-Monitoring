import api from "./api";

export interface ThresholdPayload {
  patientId: string;
  doctorId: string;
  temperatureMin: number;
  temperatureMax: number;
  heartRateMin: number;
  heartRateMax: number;
  respiratoryRateMin: number;
  respiratoryRateMax: number;
  spo2Min: number;
  sysMin: number;
  sysMax: number;
  diaMin: number;
  diaMax: number;
  glucoseMin: number | null;
  glucoseMax: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface ThresholdRecord {
  id: string;
  patientId: string;
  doctorId: string;
  temperatureMin: number;
  temperatureMax: number;
  heartRateMin: number;
  heartRateMax: number;
  respiratoryRateMin: number;
  respiratoryRateMax: number;
  spo2Min: number;
  sysMin: number;
  sysMax: number;
  diaMin: number;
  diaMax: number;
  glucoseMin: number | null;
  glucoseMax: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ThresholdApiResponse {
  id: string;
  patientId: string;
  doctorId: string;
  temperatureMin?: number;
  temperatureMax?: number;
  heartRateMin?: number;
  heartRateMax?: number;
  respiratoryRateMin?: number;
  respiratoryRateMax?: number;
  spo2Min?: number;
  sysMin?: number;
  sysMax?: number;
  diaMin?: number;
  diaMax?: number;
  glucoseMin?: number | null;
  glucoseMax?: number | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

const mapThreshold = (item: ThresholdApiResponse): ThresholdRecord => ({
  id: item.id,
  patientId: item.patientId,
  doctorId: item.doctorId,
  temperatureMin: item.temperatureMin ?? 0,
  temperatureMax: item.temperatureMax ?? 0,
  heartRateMin: item.heartRateMin ?? 0,
  heartRateMax: item.heartRateMax ?? 0,
  respiratoryRateMin: item.respiratoryRateMin ?? 0,
  respiratoryRateMax: item.respiratoryRateMax ?? 0,
  spo2Min: item.spo2Min ?? 0,
  sysMin: item.sysMin ?? 0,
  sysMax: item.sysMax ?? 0,
  diaMin: item.diaMin ?? 0,
  diaMax: item.diaMax ?? 0,
  glucoseMin: item.glucoseMin ?? null,
  glucoseMax: item.glucoseMax ?? null,
  effectiveFrom: item.effectiveFrom,
  effectiveTo: item.effectiveTo ?? null,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const buildPayload = (payload: ThresholdPayload) => ({
  patientId: payload.patientId,
  doctorId: payload.doctorId,
  temperatureMin: payload.temperatureMin,
  temperatureMax: payload.temperatureMax,
  heartRateMin: payload.heartRateMin,
  heartRateMax: payload.heartRateMax,
  respiratoryRateMin: payload.respiratoryRateMin,
  respiratoryRateMax: payload.respiratoryRateMax,
  spo2Min: payload.spo2Min,
  sysMin: payload.sysMin,
  sysMax: payload.sysMax,
  diaMin: payload.diaMin,
  diaMax: payload.diaMax,
  glucoseMin: payload.glucoseMin,
  glucoseMax: payload.glucoseMax,
  effectiveFrom: payload.effectiveFrom,
  effectiveTo: payload.effectiveTo,
});

export const getThresholds = async (params: {
  patientId?: string;
  doctorId?: string;
  latest?: boolean;
}) => {
  const response = await api.get<{ data: ThresholdApiResponse[] | null }>("/thresholds", {
    params: {
      patientId: params.patientId,
      doctorId: params.doctorId,
      latest: params.latest ? "true" : undefined,
    },
  });

  return (response.data.data || []).map(mapThreshold);
};

export const createThreshold = async (payload: ThresholdPayload) => {
  const response = await api.post<{ data: ThresholdApiResponse }>("/thresholds", buildPayload(payload));
  return mapThreshold(response.data.data);
};

export const updateThreshold = async (id: string, payload: ThresholdPayload) => {
  const response = await api.patch<{ data: ThresholdApiResponse }>(`/thresholds/${id}`, {
    temperatureMin: payload.temperatureMin,
    temperatureMax: payload.temperatureMax,
    heartRateMin: payload.heartRateMin,
    heartRateMax: payload.heartRateMax,
    respiratoryRateMin: payload.respiratoryRateMin,
    respiratoryRateMax: payload.respiratoryRateMax,
    spo2Min: payload.spo2Min,
    sysMin: payload.sysMin,
    sysMax: payload.sysMax,
    diaMin: payload.diaMin,
    diaMax: payload.diaMax,
    glucoseMin: payload.glucoseMin,
    glucoseMax: payload.glucoseMax,
    effectiveFrom: payload.effectiveFrom,
    effectiveTo: payload.effectiveTo,
  });

  return mapThreshold(response.data.data);
};

export const deleteThreshold = async (id: string) => {
  await api.delete(`/thresholds/${id}`);
};

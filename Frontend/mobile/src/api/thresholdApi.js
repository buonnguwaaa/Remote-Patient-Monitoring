import request from "./httpClient";

export async function getThresholds(params) {
  const queryParams = new URLSearchParams();
  if (params.patientId) queryParams.append("patient_id", params.patientId);
  return request(`/thresholds?${queryParams.toString()}`, { method: "GET" });
}

export default { getThresholds };

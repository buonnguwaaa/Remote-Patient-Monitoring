import request from "./httpClient";

export async function getThresholds(params) {
  const queryParams = new URLSearchParams();
  if (params.patientId) queryParams.append("patientId", params.patientId);
  if (params.latest) queryParams.append("latest", "true");
  return request(`/thresholds?${queryParams.toString()}`, { method: "GET" });
}

export default { getThresholds };

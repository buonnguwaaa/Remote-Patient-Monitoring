import request from "./httpClient";

export const getMyPatients = () => request("/assignments/me");

export const getAlerts = (params = {}) => {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", params.limit);
  if (params.page) query.set("page", params.page);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return request(`/alerts/doctors/me${qs ? "?" + qs : ""}`);
};

export const getMyProfile = () => request("/users/doctors/me");

export const getPatientById = (id) => request(`/users/patients/${id}`);

export const getMeasurements = (params = {}) => {
  const query = new URLSearchParams();
  if (params.patientId) query.set("patientId", params.patientId);
  if (params.latest) query.set("latest", params.latest ? "true" : "false");
  const qs = query.toString();
  return request(`/measurements${qs ? "?" + qs : ""}`);
};

export const getThresholds = (params = {}) => {
  const query = new URLSearchParams();
  if (params.patientId) query.set("patientId", params.patientId);
  if (params.latest) query.set("latest", "true");
  const qs = query.toString();
  return request(`/thresholds${qs ? "?" + qs : ""}`);
};

export const acknowledgeAlert = (alertId) => request(`/alerts/ack/${alertId}`, { method: "PATCH" });

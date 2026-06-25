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

export const getAlertById = (alertId) => request(`/alerts/${alertId}`);

export const createThreshold = (payload) => request("/thresholds", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const updateThreshold = (id, payload) => request(`/thresholds/${id}`, {
  method: "PATCH",
  body: JSON.stringify(payload),
});

export const getReminders = (params = {}) => {
  const query = new URLSearchParams();
  if (params.patientId) query.set("patientId", params.patientId);
  if (params.status) query.set("status", params.status);
  if (params.kind) query.set("kind", params.kind);
  const qs = query.toString();
  return request(`/reminders${qs ? "?" + qs : ""}`);
};

export const createReminder = (payload) => request("/reminders", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const updateReminder = (id, payload) => request(`/reminders/${id}`, {
  method: "PATCH",
  body: JSON.stringify(payload),
});

export const updateReminderStatus = (id, status) => request(`/reminders/${id}/status`, {
  method: "PATCH",
  body: JSON.stringify({ status }),
});

export const getPrescriptions = (params = {}) => {
  const query = new URLSearchParams();
  if (params.patientId) query.set("patientId", params.patientId);
  if (params.status) query.set("status", params.status);
  if (params.latest) query.set("latest", "true");
  const qs = query.toString();
  return request(`/prescriptions${qs ? "?" + qs : ""}`);
};

export const createPrescription = (payload) => request("/prescriptions", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const updatePrescription = (id, payload) => request(`/prescriptions/${id}`, {
  method: "PATCH",
  body: JSON.stringify(payload),
});

export const updatePrescriptionStatus = (id, status) => request(`/prescriptions/${id}/status`, {
  method: "PATCH",
  body: JSON.stringify({ status }),
});

export const getAdherence = (params = {}) => {
  const query = new URLSearchParams();
  if (params.patientId) query.set("patientId", params.patientId);
  if (params.days) query.set("days", params.days);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const qs = query.toString();
  return request(`/medication-intakes/adherence${qs ? "?" + qs : ""}`);
};


import request from "./httpClient";

export async function createMeasurement(payload) {
  return request("/measurements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMeasurements({ patientId, mealTiming, latest } = {}) {
  const query = [];

  if (patientId) query.push(`patientId=${encodeURIComponent(patientId)}`);
  if (mealTiming) query.push(`mealTiming=${encodeURIComponent(mealTiming)}`);
  if (latest) query.push("latest=true");

  const path = `/measurements${query.length > 0 ? `?${query.join("&")}` : ""}`;
  return request(path, { method: "GET" });
}

export default { createMeasurement, getMeasurements };

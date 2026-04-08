import request from "./httpClient";

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getMyAlerts(params = {}) {
  return request(`/alerts/patients/me${buildQuery(params)}`, {
    method: "GET",
  });
}

export function getMyNurseAlerts(params = {}) {
  return request(`/alerts/nurses/me${buildQuery(params)}`, {
    method: "GET",
  });
}

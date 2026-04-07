import request from "./httpClient";

export async function getPatientById(id) {
  return request(`/users/patients/${encodeURIComponent(id)}`, { method: "GET" });
}

export default { getPatientById };

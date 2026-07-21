import request from "./httpClient";

export async function getMyAssignments() {
  return request("/assignments/me", { method: "GET" });
}

export async function getMyCareTeam() {
  return request("/assignments/my-care-team", { method: "GET" });
}

export default { getMyAssignments, getMyCareTeam };

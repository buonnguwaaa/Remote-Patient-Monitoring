import request from "./httpClient";

export async function getMyAssignments() {
  return request("/assignments/me", { method: "GET" });
}

export default { getMyAssignments };

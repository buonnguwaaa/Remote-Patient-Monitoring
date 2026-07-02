import request from "./httpClient";

export async function getDepartments() {
  return request("/departments", { method: "GET" });
}

export default {
  getDepartments,
};

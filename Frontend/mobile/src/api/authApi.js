import request from "./httpClient";

export async function register(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function refresh() {
  return request("/auth/refresh", { method: "POST" });
}

export async function me() {
  return request("/auth/me", { method: "GET" });
}

export async function logout() {
  return request("/auth/logout", { method: "POST" });
}

export async function forgotPassword(email) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(payload) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export default { register, login, refresh, me, logout, forgotPassword, resetPassword };

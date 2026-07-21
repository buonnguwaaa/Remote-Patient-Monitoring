import request from "./httpClient";
import * as SecureStore from "../utils/secureStoreHelper";

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
  // Gửi kèm refreshToken trong body từ SecureStore để đảm bảo hoạt động trên mobile
  let refreshToken = null;
  try {
    refreshToken = await SecureStore.getItemAsync("patient_refreshToken");
    if (!refreshToken) refreshToken = await SecureStore.getItemAsync("refreshToken");
  } catch (e) {}

  return request("/auth/refresh", {
    method: "POST",
    body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
  });
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

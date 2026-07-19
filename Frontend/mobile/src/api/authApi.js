import request from "./httpClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  // Gửi kèm refreshToken trong body để đảm bảo hoạt động trên mobile
  // (cookie httpOnly không ổn định trên React Native)
  let refreshToken = null;
  try {
    refreshToken = await AsyncStorage.getItem("refreshToken");
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

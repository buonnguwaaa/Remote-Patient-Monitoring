import request from "./httpClient";
import * as SecureStore from "../utils/secureStoreHelper";

export const login = (payload) =>
  request("/auth/login", { method: "POST", body: JSON.stringify(payload) });

export const me = () => request("/auth/me", { method: "GET" });

export const logout = () => request("/auth/logout", { method: "POST" });

export const refresh = async () => {
  let storedRefreshToken = null;
  try {
    storedRefreshToken = await SecureStore.getItemAsync("staff_refreshToken");
  } catch {}

  return request("/auth/refresh", {
    method: "POST",
    body: storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
  });
};

export const forgotPassword = (email) =>
  request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const verifyResetOtp = ({ email, otp }) =>
  request("/auth/verify-reset-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });

export const resetPassword = ({ email, otp, newPassword, confirmedNewPassword }) =>
  request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword, confirmedNewPassword }),
  });

export default { login, me, logout, refresh, forgotPassword, verifyResetOtp, resetPassword };

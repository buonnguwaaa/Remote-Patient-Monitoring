import Constants from "expo-constants";
import * as SecureStore from "../utils/secureStoreHelper";

const extras = Constants?.manifest?.extra || Constants?.expoConfig?.extra || {};
export const BASE_URL =
  process.env.EXPO_PUBLIC_BASE_URL || extras.BASE_URL || "";

// Global logout callback — registered by AuthProvider on mount
let _onAuthFailure = null;
export function setAuthFailureHandler(fn) {
  _onAuthFailure = fn;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return { ok: response.ok, status: response.status, body: null };
  try {
    return { ok: response.ok, status: response.status, body: JSON.parse(text) };
  } catch {
    return { ok: response.ok, status: response.status, body: text };
  }
}

export async function request(path, options = {}, canRetry = true) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  let token = null;
  try {
    // Try new staff key first, fallback to old doctor key for migration
    token = await SecureStore.getItemAsync("staff_accessToken");
    if (!token) token = await SecureStore.getItemAsync("doctor_accessToken");
  } catch { }

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (response.status === 401 && canRetry && path !== "/auth/refresh") {
      // Try to silently refresh the session using stored refresh token
      let storedRefreshToken = null;
      try {
        storedRefreshToken = await SecureStore.getItemAsync("staff_refreshToken");
        if (!storedRefreshToken) storedRefreshToken = await SecureStore.getItemAsync("doctor_refreshToken");
      } catch { }

      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
      });

      if (refreshResponse.ok) {
        // Extract new access token from response body and save it
        try {
          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData?.accessToken;
          if (newAccessToken) {
            await SecureStore.setItemAsync("staff_accessToken", newAccessToken);
          }
        } catch { }

        // Retry original request with new token
        return request(path, options, false);
      }

      // Refresh failed — clear stored credentials and force logout
      try {
        await SecureStore.deleteItemAsync("staff_accessToken");
        await SecureStore.deleteItemAsync("staff_refreshToken");
        await SecureStore.deleteItemAsync("doctor_accessToken");
        await SecureStore.deleteItemAsync("doctor_refreshToken");
      } catch { }

      if (_onAuthFailure) {
        _onAuthFailure();
      }

      return {
        ok: false,
        status: 401,
        body: { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." },
      };
    }

    return parseResponse(response);
  } catch (error) {
    clearTimeout(timer);
    if (error?.name === "AbortError")
      return { ok: false, status: 0, error: "timeout" };
    return { ok: false, status: 0, error: error?.message || "network error" };
  }
}

export default request;

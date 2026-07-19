import Constants from "expo-constants";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitSessionExpired } from "./authEvent";

const extras =
  Constants?.manifest?.extra || Constants?.expoConfig?.extra || {};

let envBaseUrl = process.env.EXPO_PUBLIC_BASE_URL || extras.BASE_URL || "";
export const BASE_URL = envBaseUrl

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return { ok: response.ok, status: response.status, body: null };
  }

  try {
    return { ok: response.ok, status: response.status, body: JSON.parse(text) };
  } catch (error) {
    return { ok: response.ok, status: response.status, body: text };
  }
}

export async function request(path, options = {}, canRetry = true) {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  let token = null;
  try {
    token = await AsyncStorage.getItem("accessToken");
  } catch (e) {
    // Ignore async storage errors
  }

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 15000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      credentials: "include",
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401 && canRetry && path !== "/auth/refresh") {
      // Lấy refreshToken từ AsyncStorage để gửi kèm body (fallback cho cookie)
      let storedRefreshToken = null;
      try {
        storedRefreshToken = await AsyncStorage.getItem("refreshToken");
      } catch (e) {}

      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
      });

      if (refreshResponse.ok) {
        return request(path, options, false);
      }

      // Refresh token cũng hết hạn → force logout, chuyển về Login
      emitSessionExpired();
      return { ok: false, status: 401, body: null };
    }

    return parseResponse(response);
  } catch (error) {
    clearTimeout(timer);

    if (error?.name === "AbortError") {
      return { ok: false, status: 0, error: "timeout" };
    }

    return {
      ok: false,
      status: 0,
      error: error?.message || "network error",
    };
  }
}

export default request;

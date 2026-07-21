import Constants from "expo-constants";
import * as SecureStore from "../utils/secureStoreHelper";
import { emitSessionExpired } from "./authEvent";

const extras =
  Constants?.manifest?.extra || Constants?.expoConfig?.extra || {};

let envBaseUrl = process.env.EXPO_PUBLIC_BASE_URL || extras.BASE_URL || "";
export const BASE_URL = envBaseUrl;

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
    token = await SecureStore.getItemAsync("patient_accessToken");
    if (!token) token = await SecureStore.getItemAsync("accessToken");
  } catch (e) {
    // Ignore storage errors
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
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401 && canRetry && path !== "/auth/refresh") {
      // Lấy refreshToken từ SecureStore để gửi kèm body
      let storedRefreshToken = null;
      try {
        storedRefreshToken = await SecureStore.getItemAsync("patient_refreshToken");
        if (!storedRefreshToken) storedRefreshToken = await SecureStore.getItemAsync("refreshToken");
      } catch (e) {}

      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
      });

      if (refreshResponse.ok) {
        // Extract new access token from response body and save it into SecureStore
        try {
          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData?.accessToken;
          if (newAccessToken) {
            await SecureStore.setItemAsync("patient_accessToken", newAccessToken);
          }
        } catch (e) {}

        // Retry original request with new token
        return request(path, options, false);
      }

      // Refresh token cũng hết hạn → force logout, chuyển về Login
      try {
        await SecureStore.deleteItemAsync("patient_accessToken");
        await SecureStore.deleteItemAsync("patient_refreshToken");
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
      } catch (e) {}

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

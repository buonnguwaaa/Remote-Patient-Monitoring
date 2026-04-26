import Constants from "expo-constants";

const extras =
  Constants?.manifest?.extra || Constants?.expoConfig?.extra || {};
export const BASE_URL =
  process.env.EXPO_PUBLIC_BASE_URL || extras.BASE_URL || "http://192.168.1.171:8080";

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

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (refreshResponse.ok) {
        return request(path, options, false);
      }
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

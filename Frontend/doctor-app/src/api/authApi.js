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

export default { login, me, logout, refresh };

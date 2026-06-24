import request from "./httpClient";

export const login = (payload) =>
  request("/auth/login", { method: "POST", body: JSON.stringify(payload) });

export const me = () => request("/auth/me", { method: "GET" });

export const logout = () => request("/auth/logout", { method: "POST" });

export const refresh = () => request("/auth/refresh", { method: "POST" });

export default { login, me, logout, refresh };

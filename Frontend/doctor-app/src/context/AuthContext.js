import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as authApi from "../api/authApi";

const AuthContext = createContext(null);

function extractUser(response) {
  if (!response?.ok) return null;
  const body = response.body;
  return body?.data || body?.user || body || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authApi.me();
        const u = extractUser(res);
        if (u && (u.role === "user.doctor" || u.role === "doctor")) {
          setUser(u);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (!res.ok) {
      return { ok: false, error: res.body?.error || "Đăng nhập thất bại" };
    }

    const token = res.body?.data?.accessToken || res.body?.accessToken;
    if (token) {
      await AsyncStorage.setItem("doctor_accessToken", token);
    }

    const meRes = await authApi.me();
    const u = extractUser(meRes);

    if (!u) return { ok: false, error: "Không lấy được thông tin tài khoản" };
    if (u.role !== "user.doctor" && u.role !== "doctor") {
      await AsyncStorage.removeItem("doctor_accessToken");
      return { ok: false, error: "Tài khoản này không phải bác sĩ" };
    }

    setUser(u);
    return { ok: true, data: u };
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    try {
      await AsyncStorage.removeItem("doctor_accessToken");
      await AsyncStorage.removeItem("doctor_refreshToken");
    } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;

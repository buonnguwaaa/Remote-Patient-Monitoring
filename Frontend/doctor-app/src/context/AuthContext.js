import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
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
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [sessionPassword, setSessionPassword] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const bioEnabled = await SecureStore.getItemAsync("doctor_biometric_enabled");
        setIsBiometricEnabled(bioEnabled === "true");

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
    setSessionPassword(password); 
    return { ok: true, data: u };
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    try {
      await AsyncStorage.removeItem("doctor_accessToken");
      await AsyncStorage.removeItem("doctor_refreshToken");
    } catch {}
    setUser(null);
    setSessionPassword(null);
  };

  const enableBiometric = async (passwordInput) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        return { ok: false, error: "Thiết bị không hỗ trợ hoặc chưa đăng ký sinh trắc học." };
      }

      const authRes = await LocalAuthentication.authenticateAsync({
        promptMessage: "Xác thực sinh trắc học để kích hoạt đăng nhập nhanh",
        cancelLabel: "Hủy",
      });

      if (!authRes.success) {
        return { ok: false, error: "Xác thực sinh trắc học thất bại." };
      }

      const emailToSave = user?.email;
      const passwordToSave = passwordInput || sessionPassword;

      if (!emailToSave || !passwordToSave) {
        return { ok: false, error: "Không tìm thấy mật khẩu phiên. Vui lòng nhập mật khẩu để xác nhận." };
      }

      await SecureStore.setItemAsync("doctor_email", emailToSave);
      await SecureStore.setItemAsync("doctor_password", passwordToSave);
      await SecureStore.setItemAsync("doctor_biometric_enabled", "true");
      setIsBiometricEnabled(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Lỗi khi bật sinh trắc học." };
    }
  };

  const disableBiometric = async () => {
    try {
      await SecureStore.deleteItemAsync("doctor_email");
      await SecureStore.deleteItemAsync("doctor_password");
      await SecureStore.setItemAsync("doctor_biometric_enabled", "false");
      setIsBiometricEnabled(false);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Lỗi khi tắt sinh trắc học." };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      initializing,
      login,
      logout,
      isBiometricEnabled,
      sessionPassword,
      enableBiometric,
      disableBiometric
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;

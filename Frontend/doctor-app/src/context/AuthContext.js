import React, { createContext, useContext, useEffect, useState } from "react";
import { DeviceEventEmitter, Alert } from "react-native";
import * as SecureStore from "../utils/secureStoreHelper";
import * as LocalAuthentication from "expo-local-authentication";
import * as authApi from "../api/authApi";
import { setAuthFailureHandler } from "../api/httpClient";
import { buildRealtimeSocketUrl } from "../api/chatApi";
import { setCachedUserRole } from "../navigation/navigationRef";
import {
  registerCurrentDevicePushToken,
  deactivateCurrentDevicePushToken,
  attachPushTokenRefreshListener,
} from "../services/pushNotificationService";

const AuthContext = createContext(null);

function isStaffRole(role) {
  return (
    role === "user.doctor" ||
    role === "doctor" ||
    role === "user.nurse" ||
    role === "nurse"
  );
}

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

  const role = user?.role;
  const isDoctor = role === "user.doctor" || role === "doctor";
  const isNurse = role === "user.nurse" || role === "nurse";
  const userRole = role;

  // Cache role for push notification routing (navigationRef cannot access React context)
  useEffect(() => {
    setCachedUserRole(role || null);
  }, [role]);

  // Realtime notification socket listener — doctor only
  useEffect(() => {
    if (!user) return undefined;
    // Guard: only connect WebSocket for doctors
    if (!isDoctor) return undefined;

    let socket = null;
    let reconnectTimeout = null;
    let active = true;

    const connectSocket = async () => {
      try {
        const url = await buildRealtimeSocketUrl();
        if (!active) return;
        socket = new WebSocket(url);

        socket.onopen = () => {
          console.log("[Realtime WS] Connected to realtime notification socket");
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            console.log("[Realtime WS] Received event:", payload);
            if (payload?.type === "chat.alert_message" && payload?.data) {
              DeviceEventEmitter.emit("NEW_ALERT", payload.data);
              const severityText = payload.data.severity === "high" ? "Ưu tiên cao ⚠️" : "Cần theo dõi ⚠️";
              Alert.alert(
                `Cảnh báo mới (${severityText})`,
                payload.data.preview || "Có cảnh báo sức khỏe mới cần kiểm tra.",
                [{ text: "Đóng", style: "cancel" }]
              );
            }
          } catch (e) {
            console.warn("[Realtime WS] Failed to parse message:", e);
          }
        };

        socket.onclose = (e) => {
          console.log("[Realtime WS] Socket closed, reconnecting in 5s...", e.reason);
          if (active) {
            reconnectTimeout = setTimeout(connectSocket, 5000);
          }
        };

        socket.onerror = (e) => {
          console.error("[Realtime WS] Socket error:", e);
        };
      } catch (err) {
        console.error("[Realtime WS] Failed to create websocket:", err);
      }
    };

    connectSocket();

    return () => {
      active = false;
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user?.id, user?._id, isDoctor]);

  // Register global auth failure handler
  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      setSessionPassword(null);
    });
    return () => setAuthFailureHandler(null);
  }, []);

  // Register / deregister FCM push token when login state changes
  useEffect(() => {
    if (!user?.id && !user?._id) return undefined;

    let mounted = true;
    const detachRefresh = attachPushTokenRefreshListener();

    (async () => {
      const result = await registerCurrentDevicePushToken();
      if (!mounted) return;
      if (!result?.ok) {
        console.warn(
          "[Push Notification Debug]",
          `Status: Failed/Skipped\nReason: ${result?.reason || "error"}\nError: ${result?.error || "none"}`
        );
      } else {
        console.log(
          "[Push Notification Debug]",
          "Status: Registered Successfully!"
        );
      }
    })();

    return () => {
      mounted = false;
      detachRefresh();
    };
  }, [user?.id, user?._id]);

  useEffect(() => {
    (async () => {
      try {
        // Check biometric (try new staff key, fallback to old doctor key)
        const bioEnabled =
          (await SecureStore.getItemAsync("staff_biometric_enabled")) ||
          (await SecureStore.getItemAsync("doctor_biometric_enabled"));
        setIsBiometricEnabled(bioEnabled === "true");

        const res = await authApi.me();
        const u = extractUser(res);
        if (u && isStaffRole(u.role)) {
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
      await SecureStore.setItemAsync("staff_accessToken", token);
    }

    const meRes = await authApi.me();
    const u = extractUser(meRes);

    if (!u) return { ok: false, error: "Không lấy được thông tin tài khoản" };

    // Reject patients
    if (u.role === "user.patient" || u.role === "patient") {
      try { await SecureStore.deleteItemAsync("staff_accessToken"); } catch {}
      return {
        ok: false,
        error: "Ứng dụng này chỉ dành cho bác sĩ/y tá. Vui lòng dùng app bệnh nhân.",
      };
    }

    // Reject unknown roles
    if (!isStaffRole(u.role)) {
      try { await SecureStore.deleteItemAsync("staff_accessToken"); } catch {}
      return { ok: false, error: "Tài khoản không có quyền truy cập ứng dụng này." };
    }

    setUser(u);
    setSessionPassword(password);
    return { ok: true, data: u };
  };

  const logout = async () => {
    try {
      const result = await deactivateCurrentDevicePushToken();
      if (!result?.ok && !result?.skipped) {
        console.warn("[push] failed to deactivate staff device token", result?.error);
      }
    } catch {}

    try { await authApi.logout(); } catch {}
    try {
      // Clear both old and new keys
      await SecureStore.deleteItemAsync("staff_accessToken");
      await SecureStore.deleteItemAsync("staff_refreshToken");
      await SecureStore.deleteItemAsync("doctor_accessToken");
      await SecureStore.deleteItemAsync("doctor_refreshToken");
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

      await SecureStore.setItemAsync("staff_email", emailToSave);
      await SecureStore.setItemAsync("staff_password", passwordToSave);
      await SecureStore.setItemAsync("staff_biometric_enabled", "true");
      setIsBiometricEnabled(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Lỗi khi bật sinh trắc học." };
    }
  };

  const disableBiometric = async () => {
    try {
      await SecureStore.deleteItemAsync("staff_email");
      await SecureStore.deleteItemAsync("staff_password");
      await SecureStore.setItemAsync("staff_biometric_enabled", "false");
      // Also clear old keys
      try { await SecureStore.deleteItemAsync("doctor_email"); } catch {}
      try { await SecureStore.deleteItemAsync("doctor_password"); } catch {}
      try { await SecureStore.setItemAsync("doctor_biometric_enabled", "false"); } catch {}
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
      isDoctor,
      isNurse,
      userRole,
      isBiometricEnabled,
      sessionPassword,
      enableBiometric,
      disableBiometric,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;

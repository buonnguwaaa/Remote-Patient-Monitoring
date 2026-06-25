import React, { createContext, useContext, useEffect, useState } from "react";
import { DeviceEventEmitter, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as authApi from "../api/authApi";
import { setAuthFailureHandler } from "../api/httpClient";
import { buildRealtimeSocketUrl } from "../api/chatApi";
import {
  registerCurrentDevicePushToken,
  deactivateCurrentDevicePushToken,
  attachPushTokenRefreshListener,
} from "../services/pushNotificationService";

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

  // Realtime notification socket listener
  useEffect(() => {
    if (!user) return undefined;

    let socket = null;
    let reconnectTimeout = null;

    const connectSocket = () => {
      try {
        const url = buildRealtimeSocketUrl();
        socket = new WebSocket(url);

        socket.onopen = () => {
          console.log("[Realtime WS] Connected to realtime notification socket");
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            console.log("[Realtime WS] Received event:", payload);
            if (payload?.type === "chat.alert_message" && payload?.data) {
              // Emit global DeviceEventEmitter event
              DeviceEventEmitter.emit("NEW_ALERT", payload.data);
              
              // Trigger a visual popup
              const severityText = payload.data.severity === "high" ? "NGUY KỊCH ⚠️" : "Cảnh báo ⚠️";
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
          reconnectTimeout = setTimeout(connectSocket, 5000);
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
      if (socket) {
        socket.onclose = null; // Prevent reconnect
        socket.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user?.id, user?._id]);

  // Register global auth failure handler so httpClient can trigger logout
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
      if (!result?.ok && !result?.skipped) {
        console.warn("[push] failed to register doctor device token", result?.error);
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
      await SecureStore.setItemAsync("doctor_accessToken", token);
    }

    const meRes = await authApi.me();
    const u = extractUser(meRes);

    if (!u) return { ok: false, error: "Không lấy được thông tin tài khoản" };
    if (u.role !== "user.doctor" && u.role !== "doctor") {
      await SecureStore.deleteItemAsync("doctor_accessToken");
      return { ok: false, error: "Tài khoản này không phải bác sĩ" };
    }

    setUser(u);
    setSessionPassword(password); 
    return { ok: true, data: u };
  };

  const logout = async () => {
    // Deactivate push token before clearing session
    try {
      const result = await deactivateCurrentDevicePushToken();
      if (!result?.ok && !result?.skipped) {
        console.warn("[push] failed to deactivate doctor device token", result?.error);
      }
    } catch {}

    try { await authApi.logout(); } catch {}
    try {
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

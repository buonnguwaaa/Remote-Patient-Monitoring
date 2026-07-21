import React, { createContext, useEffect, useState } from "react";
import * as authApi from "../api/authApi";
import { onSessionExpired } from "../api/authEvent";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Alert } from "react-native";
import * as SecureStore from "../utils/secureStoreHelper";
import * as LocalAuthentication from "expo-local-authentication";

let CookieManager = null;
if (Platform.OS !== "web") {
  try {
    CookieManager =
      require("@react-native-cookies/cookies").default ||
      require("@react-native-cookies/cookies");
  } catch (e) {
    console.warn("CookieManager is not supported in this environment (e.g. Expo Go):", e.message);
  }
}
import {
  attachPushTokenRefreshListener,
  deactivateCurrentDevicePushToken,
  registerCurrentDevicePushToken,
} from "../services/pushNotificationService";

const AuthContext = createContext(null);

function extractUserPayload(response) {
  if (!response?.ok) {
    return null;
  }

  const body = response.body;
  if (!body) {
    return null;
  }

  return body.data || body.user || body;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [sessionPassword, setSessionPassword] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const bioEnabled = await SecureStore.getItemAsync("patient_biometric_enabled");
        setIsBiometricEnabled(bioEnabled === "true");

        const response = await authApi.me();
        setUser(extractUserPayload(response));
      } catch (error) {
        setUser(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  // Khi httpClient phát hiện refresh token hết hạn → tự động logout
  useEffect(() => {
    const unsubscribe = onSessionExpired(async () => {
      try {
        if (CookieManager) await CookieManager.clearAll();
      } catch (e) {}
      try {
        await SecureStore.deleteItemAsync("patient_accessToken");
        await SecureStore.deleteItemAsync("patient_refreshToken");
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("refreshToken");
      } catch (e) {}

      setUser((currentUser) => {
        if (currentUser) {
          Alert.alert(
            "Phiên đăng nhập hết hạn",
            "Phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại.",
            [{ text: "Đăng nhập lại", style: "default" }]
          );
        }
        return null;
      });

      setSessionPassword(null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let mounted = true;
    const detachPushTokenRefreshListener = attachPushTokenRefreshListener();

    (async () => {
      const result = await registerCurrentDevicePushToken();
      if (!mounted) {
        return;
      }

      if (!result?.ok && !result?.skipped) {
        console.warn("[push] failed to register device token", result?.error);
      }
    })();

    return () => {
      mounted = false;
      detachPushTokenRefreshListener();
    };
  }, [user?.id]);

  const parseBackendError = (res) => {
    let errorMsg = res.error || res.body?.error || res.body || "Đã xảy ra lỗi";
    if (typeof errorMsg === "string" && (errorMsg.includes("Field validation") || errorMsg.includes("RegisterRequest") || errorMsg.includes("LoginRequest"))) {
      if (errorMsg.includes("Email")) {
        if (errorMsg.includes("required")) {
          return "Vui lòng nhập email.";
        } else if (errorMsg.includes("email")) {
          return "Email không đúng định dạng.";
        }
      }
      if (errorMsg.includes("Password")) {
        if (errorMsg.includes("required")) {
          return "Vui lòng nhập mật khẩu.";
        } else if (errorMsg.includes("min")) {
          return "Mật khẩu phải có ít nhất 6 ký tự.";
        }
      }
      if (errorMsg.includes("ConfirmedPassword")) {
        if (errorMsg.includes("required")) {
          return "Vui lòng nhập mật khẩu xác nhận.";
        } else if (errorMsg.includes("min")) {
          return "Mật khẩu xác nhận phải có ít nhất 8 ký tự.";
        }
      }
      if (errorMsg.includes("Name")) {
        return "Vui lòng nhập họ và tên.";
      }
      if (errorMsg.includes("Gender")) {
        return "Vui lòng chọn giới tính.";
      }
      if (errorMsg.includes("Dob")) {
        return "Vui lòng nhập ngày sinh.";
      }
      return "Thông tin gửi đi không hợp lệ.";
    }
    return errorMsg;
  };

  const refreshBiometricStatus = async () => {
    try {
      const bioEnabled = await SecureStore.getItemAsync("patient_biometric_enabled");
      setIsBiometricEnabled(bioEnabled === "true");
    } catch {
      setIsBiometricEnabled(false);
    }
  };

  const login = async (email, password) => {
    const loginResponse = await authApi.login({ email, password });
    if (!loginResponse.ok) {
      return { ok: false, error: parseBackendError(loginResponse) };
    }

    // Lưu bộ token vào SecureStore bảo mật của thiết bị
    const loginData = loginResponse.body?.data || loginResponse.body;
    if (loginData?.AccessToken || loginData?.accessToken) {
      const at = loginData.AccessToken || loginData.accessToken;
      const rt = loginData.RefreshToken || loginData.refreshToken;
      try {
        if (at) await SecureStore.setItemAsync("patient_accessToken", at);
        if (rt) await SecureStore.setItemAsync("patient_refreshToken", rt);
      } catch (e) {}
    }

    const meResponse = await authApi.me();
    const meUser = extractUserPayload(meResponse);

    if (meUser) {
      // Reject doctor and nurse — they must use the staff app
      const role = meUser.role;
      if (
        role === "user.doctor" || role === "doctor" ||
        role === "user.nurse" || role === "nurse"
      ) {
        try { await authApi.logout(); } catch {}
        return {
          ok: false,
          error: "Ứng dụng này chỉ dành cho bệnh nhân. Vui lòng dùng app nhân viên y tế.",
        };
      }
      setUser(meUser);
      setSessionPassword(password);
      await refreshBiometricStatus();
      return { ok: true, data: meUser };
    }

    setSessionPassword(password);
    await refreshBiometricStatus();
    return { ok: true, data: loginResponse.body };
  };

  const register = async (payload) => {
    const response = await authApi.register(payload);
    if (!response.ok) {
      return { ok: false, error: parseBackendError(response) };
    }

    const meResponse = await authApi.me();
    const meUser = extractUserPayload(meResponse);
    if (meUser) {
      setUser(meUser);
    }

    return { ok: true, data: response.body };
  };

  const logout = async () => {
    try {
      const deactivateResult = await deactivateCurrentDevicePushToken();
      if (!deactivateResult?.ok && !deactivateResult?.skipped) {
        console.warn(
          "[push] failed to deactivate device token before logout",
          deactivateResult?.error,
        );
      }
    } catch (error) {
      console.warn("[push] unexpected deactivate token error", error);
    }

    try {
      await authApi.logout();
    } catch (error) {
      // noop
    }

    try {
      if (CookieManager) {
        await CookieManager.clearAll();
      }
    } catch (e) {
      console.warn("Failed to clear cookies", e);
    }

    try {
      await SecureStore.deleteItemAsync("patient_accessToken");
      await SecureStore.deleteItemAsync("patient_refreshToken");
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      await AsyncStorage.removeItem("accessToken");
      await AsyncStorage.removeItem("refreshToken");
    } catch (e) {}

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

      await SecureStore.setItemAsync("patient_email", emailToSave);
      await SecureStore.setItemAsync("patient_password", passwordToSave);
      await SecureStore.setItemAsync("patient_biometric_enabled", "true");
      setIsBiometricEnabled(true);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Lỗi khi bật sinh trắc học." };
    }
  };

  const disableBiometric = async () => {
    try {
      await SecureStore.deleteItemAsync("patient_email");
      await SecureStore.deleteItemAsync("patient_password");
      await SecureStore.setItemAsync("patient_biometric_enabled", "false");
      setIsBiometricEnabled(false);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || "Lỗi khi tắt sinh trắc học." };
    }
  };

  const refreshSession = async () => {
    const refreshResponse = await authApi.refresh();
    if (!refreshResponse.ok) {
      return false;
    }

    const meResponse = await authApi.me();
    const meUser = extractUserPayload(meResponse);
    setUser(meUser);

    return Boolean(meUser);
  };

  const updateUser = (nextUser) => {
    setUser((currentUser) => {
      if (typeof nextUser === "function") {
        return nextUser(currentUser);
      }

      return { ...(currentUser || {}), ...(nextUser || {}) };
    });
  };

  const saveGoogleTokens = async (accessToken, refreshToken) => {
    try {
      if (accessToken) await SecureStore.setItemAsync("patient_accessToken", accessToken);
      if (refreshToken) await SecureStore.setItemAsync("patient_refreshToken", refreshToken);
    } catch (e) {
      console.warn("Failed to save google tokens into SecureStore", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        login,
        register,
        logout,
        refreshSession,
        updateUser,
        saveGoogleTokens,
        isBiometricEnabled,
        sessionPassword,
        enableBiometric,
        disableBiometric,
        refreshBiometricStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;

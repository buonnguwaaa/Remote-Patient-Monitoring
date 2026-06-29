import React, { createContext, useEffect, useState } from "react";
import * as authApi from "../api/authApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
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

  const login = async (email, password) => {
    const loginResponse = await authApi.login({ email, password });
    if (!loginResponse.ok) {
      return { ok: false, error: loginResponse.error || loginResponse.body };
    }

    const meResponse = await authApi.me();
    const meUser = extractUserPayload(meResponse);
    if (meUser) {
      setUser(meUser);
      setSessionPassword(password);
      return { ok: true, data: meUser };
    }

    setSessionPassword(password);
    return { ok: true, data: loginResponse.body };
  };

  const register = async (payload) => {
    const response = await authApi.register(payload);
    if (!response.ok) {
      return { ok: false, error: response.error || response.body };
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
      if (accessToken) await AsyncStorage.setItem("accessToken", accessToken);
      if (refreshToken)
        await AsyncStorage.setItem("refreshToken", refreshToken);
    } catch (e) {
      console.warn("Failed to save google tokens", e);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;

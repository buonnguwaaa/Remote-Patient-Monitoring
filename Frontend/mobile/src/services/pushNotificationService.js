import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  deactivateNotificationToken,
  registerNotificationToken,
} from "../api/notificationTokenApi";
import { markNotificationRead } from "../api/notificationsApi";
import { emitNotificationEvent } from "./notificationEvents";
import { navigateFromNotificationPayload } from "../navigation/navigationRef";

const DEVICE_ID_STORAGE_KEY = "@rpm/notification-device-id";

function normalizeNotificationPayload(data) {
  if (!data || typeof data !== "object") {
    return {};
  }

  return Object.entries(data).reduce((acc, [key, value]) => {
    acc[key] = typeof value === "string" ? value : value == null ? "" : String(value);
    return acc;
  }, {});
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

async function getDeviceId() {
  if (Platform.OS !== "android") {
    return null;
  }

  const nativeAndroidId = Application.getAndroidId?.();
  if (nativeAndroidId) {
    return nativeAndroidId;
  }

  const persistedDeviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (persistedDeviceId) {
    return persistedDeviceId;
  }

  const generatedDeviceId = `android-installation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, generatedDeviceId);
  return generatedDeviceId;
}

async function registerTokenWithBackend(token) {
  const deviceId = await getDeviceId();
  if (!deviceId) {
    return { ok: false, skipped: true, reason: "missing-device-id" };
  }

  const response = await registerNotificationToken({
    deviceId,
    platform: "android",
    provider: "fcm",
    token,
  });

  if (!response.ok) {
    return {
      ok: false,
      error: response.error || response.body || "register token failed",
    };
  }

  return { ok: true, data: response.body };
}

export async function registerCurrentDevicePushToken() {
  if (Platform.OS !== "android") {
    return { ok: false, skipped: true, reason: "android-only-phase" };
  }

  try {
    await ensureAndroidChannel();

    const currentPermissions = await Notifications.getPermissionsAsync();
    let finalStatus = currentPermissions.status;

    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      return { ok: false, skipped: true, reason: "permission-denied" };
    }

    const nativeToken = await Notifications.getDevicePushTokenAsync();
    const token = nativeToken?.data;

    if (!token) {
      return { ok: false, skipped: true, reason: "missing-native-token" };
    }

    return registerTokenWithBackend(token);
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "register token failed",
    };
  }
}

export async function deactivateCurrentDevicePushToken() {
  if (Platform.OS !== "android") {
    return { ok: false, skipped: true, reason: "android-only-phase" };
  }

  try {
    const deviceId = await getDeviceId();
    if (!deviceId) {
      return { ok: false, skipped: true, reason: "missing-device-id" };
    }

    const response = await deactivateNotificationToken({ deviceId });
    if (!response.ok) {
      return {
        ok: false,
        error: response.error || response.body || "deactivate token failed",
      };
    }

    return { ok: true, data: response.body };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "deactivate token failed",
    };
  }
}

export function attachPushTokenRefreshListener() {
  if (Platform.OS !== "android") {
    return () => {};
  }

  const subscription = Notifications.addPushTokenListener(async (token) => {
    const nextToken = token?.data;
    if (!nextToken) {
      return;
    }

    const result = await registerTokenWithBackend(nextToken);
    if (!result?.ok && !result?.skipped) {
      console.warn("[push] failed to refresh device token", result?.error);
    }
  });

  return () => {
    subscription.remove();
  };
}

async function handleNotificationOpened(payload) {
  const data = normalizeNotificationPayload(payload);
  emitNotificationEvent({ kind: "opened", payload: data });

  if (data.notificationId) {
    try {
      await markNotificationRead(data.notificationId);
    } catch (error) {
      console.warn("[push] failed to mark notification as read", error);
    }
  }

  navigateFromNotificationPayload(data);
}

export async function processInitialNotificationResponse() {
  try {
    const lastResponse = await Notifications.getLastNotificationResponseAsync();
    const data = normalizeNotificationPayload(
      lastResponse?.notification?.request?.content?.data || {}
    );
    if (!data.notificationId && !data.alertId && !data.reminderId) {
      return;
    }
    await handleNotificationOpened(data);
  } catch (error) {
    console.warn("[push] failed to process initial notification response", error);
  }
}

export function attachNotificationListeners() {
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    const data = normalizeNotificationPayload(notification?.request?.content?.data || {});
    emitNotificationEvent({ kind: "received", payload: data });
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = normalizeNotificationPayload(
      response?.notification?.request?.content?.data || {}
    );
    void handleNotificationOpened(data);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

export default {
  registerCurrentDevicePushToken,
  deactivateCurrentDevicePushToken,
  attachPushTokenRefreshListener,
  attachNotificationListeners,
  processInitialNotificationResponse,
};

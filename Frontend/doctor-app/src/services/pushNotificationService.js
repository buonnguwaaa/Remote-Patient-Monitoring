import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  registerNotificationToken,
  deactivateNotificationToken,
} from "../api/notificationTokenApi";
import { navigateFromNotificationPayload } from "../navigation/navigationRef";

const DEVICE_ID_KEY = "@rpm_doctor/notification-device-id";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizePayload(data) {
  if (!data || typeof data !== "object") return {};
  return Object.entries(data).reduce((acc, [key, value]) => {
    acc[key] = typeof value === "string" ? value : value == null ? "" : String(value);
    return acc;
  }, {});
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  try {
    await Notifications.deleteNotificationChannelAsync("default");
  } catch (_) {}

  await Notifications.setNotificationChannelAsync("rpm_doctor_notification", {
    name: "Cảnh báo RPM Doctor",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: "default",
  });
}

async function getDeviceId() {
  if (Platform.OS !== "android") return null;

  const nativeId = Application.getAndroidId?.();
  if (nativeId) return nativeId;

  try {
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored) return stored;

    const generated = `doctor-android-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return `doctor-android-fallback-${Date.now()}`;
  }
}

async function registerTokenWithBackend(token) {
  const deviceId = await getDeviceId();
  if (!deviceId) return { ok: false, skipped: true, reason: "missing-device-id" };

  const res = await registerNotificationToken({
    deviceId,
    platform: "android",
    provider: "fcm",
    token,
  });

  if (!res.ok) {
    return { ok: false, error: res.error || res.body || "register token failed" };
  }
  return { ok: true, data: res.body };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Request permission and register the FCM push token with the backend.
 * Call this after a successful login.
 */
export async function registerCurrentDevicePushToken() {
  if (Platform.OS !== "android") {
    return { ok: false, skipped: true, reason: "android-only-phase" };
  }

  try {
    await ensureAndroidChannel();

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;

    if (status !== "granted") {
      const { status: requested } = await Notifications.requestPermissionsAsync();
      status = requested;
    }

    if (status !== "granted") {
      return { ok: false, skipped: true, reason: "permission-denied" };
    }

    const native = await Notifications.getDevicePushTokenAsync();
    const token = native?.data;
    if (!token) return { ok: false, skipped: true, reason: "missing-native-token" };

    return registerTokenWithBackend(token);
  } catch (error) {
    return { ok: false, error: error?.message || "register token failed" };
  }
}

/**
 * Deactivate the push token for this device.
 * Call this on logout.
 */
export async function deactivateCurrentDevicePushToken() {
  if (Platform.OS !== "android") {
    return { ok: false, skipped: true, reason: "android-only-phase" };
  }

  try {
    const deviceId = await getDeviceId();
    if (!deviceId) return { ok: false, skipped: true, reason: "missing-device-id" };

    const res = await deactivateNotificationToken({ deviceId });
    if (!res.ok) {
      return { ok: false, error: res.error || res.body || "deactivate token failed" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || "deactivate token failed" };
  }
}

/**
 * Listen for automatic FCM token refreshes and re-register them.
 * Returns a cleanup function — call it on logout or unmount.
 */
export function attachPushTokenRefreshListener() {
  if (Platform.OS !== "android") return () => {};

  const sub = Notifications.addPushTokenListener(async (token) => {
    const next = token?.data;
    if (!next) return;
    const result = await registerTokenWithBackend(next);
    if (!result?.ok && !result?.skipped) {
      console.warn("[push] failed to refresh doctor device token", result?.error);
    }
  });

  return () => sub.remove();
}

/**
 * Attach foreground + tap listeners.
 * Returns a cleanup function.
 */
export function attachNotificationListeners() {
  // Set handler for foreground notifications
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Foreground: show banner but no navigation (doctor can dismiss)
  const receivedSub = Notifications.addNotificationReceivedListener((_notification) => {
    // No-op for foreground — the setNotificationHandler above handles display
  });

  // Tap on notification (foreground or background)
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = normalizePayload(
      response?.notification?.request?.content?.data || {}
    );
    navigateFromNotificationPayload(data);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

/**
 * Handle the notification the app was cold-started from (if any).
 * Call this after the navigator is ready.
 */
export async function processInitialNotificationResponse() {
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    const data = normalizePayload(last?.notification?.request?.content?.data || {});
    if (!data.type && !data.alertId) return; // nothing actionable
    navigateFromNotificationPayload(data);
  } catch (error) {
    console.warn("[push] failed to process initial notification response", error);
  }
}

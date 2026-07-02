import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

// Holds a navigation action that arrived before the navigator was ready
let pendingNotificationAction = null;

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  return Object.entries(payload).reduce((acc, [key, value]) => {
    acc[key] = typeof value === "string" ? value : value == null ? "" : String(value);
    return acc;
  }, {});
}

/**
 * Map a notification data payload to a screen navigation action.
 *
 * Notification types sent by the backend:
 *   - type = "alert"       → open Alerts screen (highlight the alert)
 *   - type = "reminder"    → open Reminders screen
 *   - type = "new_message" → open Chat screen (doctor only)
 *   - fallback             → open Alerts screen (safest default for doctors)
 */
function buildNavigationAction(payload, isNurse) {
  const data = normalizePayload(payload);
  const type = data.type;

  // Nurse routing: avoid Chat/VideoCall routes
  if (isNurse) {
    if (type === "alert" && data.patientId) {
      return {
        screen: "NursePatientDetail",
        params: { patientId: data.patientId },
      };
    }
    return { screen: "NursePatients", params: {} };
  }

  // Doctor routing
  if (type === "alert" && data.alertId) {
    return {
      screen: "Alerts",
      params: { selectedAlertId: data.alertId, patientId: data.patientId },
    };
  }

  if (type === "reminder") {
    return {
      screen: "Reminders",
      params: { selectedReminderId: data.reminderId },
    };
  }

  if (type === "new_message" && data.conversationId) {
    return {
      screen: "ChatDetail",
      params: { 
        conversationId: data.conversationId,
        patientId: data.senderId,
      },
    };
  }

  // Default: go to alerts
  return { screen: "Alerts", params: {} };
}

// Cache the current user role so navigationRef can access it without React context
let _cachedRole = null;
export function setCachedUserRole(role) {
  _cachedRole = role;
}

function performNavigation(action) {
  if (!action) return false;
  if (!navigationRef.isReady()) {
    pendingNotificationAction = action;
    return false;
  }
  try {
    navigationRef.navigate(action.screen, action.params);
  } catch (e) {
    console.warn("[nav] Failed to navigate from notification:", e);
  }
  return true;
}

export function navigateFromNotificationPayload(payload) {
  const isNurse = _cachedRole === "user.nurse" || _cachedRole === "nurse";
  return performNavigation(buildNavigationAction(payload, isNurse));
}

export function flushPendingNotificationNavigation() {
  if (!pendingNotificationAction || !navigationRef.isReady()) return false;
  const action = pendingNotificationAction;
  pendingNotificationAction = null;
  try {
    navigationRef.navigate(action.screen, action.params);
  } catch (e) {
    console.warn("[nav] Failed to flush pending navigation:", e);
  }
  return true;
}

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
 *   - type = "new_message" → open Chat screen
 *   - fallback             → open Alerts screen (safest default for doctors)
 */
function buildNavigationAction(payload) {
  const data = normalizePayload(payload);
  const type = data.type;

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
        patientId: data.senderId, // senderId is the patient who sent the message
      },
    };
  }

  // Default: go to alerts
  return { screen: "Alerts", params: {} };
}

function performNavigation(action) {
  if (!action) return false;
  if (!navigationRef.isReady()) {
    pendingNotificationAction = action;
    return false;
  }
  navigationRef.navigate(action.screen, action.params);
  return true;
}

export function navigateFromNotificationPayload(payload) {
  return performNavigation(buildNavigationAction(payload));
}

export function flushPendingNotificationNavigation() {
  if (!pendingNotificationAction || !navigationRef.isReady()) return false;
  const action = pendingNotificationAction;
  pendingNotificationAction = null;
  navigationRef.navigate(action.screen, action.params);
  return true;
}

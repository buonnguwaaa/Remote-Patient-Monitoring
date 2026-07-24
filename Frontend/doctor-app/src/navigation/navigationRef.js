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
 * Map a notification data payload to a screen navigation action for Doctor/Nurse App.
 */
function buildNavigationAction(payload, isNurse) {
  const data = normalizePayload(payload);
  const type = data.type;

  // 1. Chat notifications
  if (
    type === "chat" ||
    type === "new_message" ||
    type === "message" ||
    data.conversationId ||
    data.targetScreen === "ChatDetail" ||
    data.targetScreen === "Chat"
  ) {
    if (isNurse) {
      if (data.patientId || data.senderId) {
        return {
          screen: "NursePatientDetail",
          params: { patientId: data.patientId || data.senderId },
        };
      }
      return { screen: "NursePatients", params: {} };
    }

    return {
      screen: "ChatTab",
      params: {
        screen: "ChatDetail",
        params: {
          conversationId: data.conversationId,
          patientId: data.senderId || data.patientId,
        },
      },
    };
  }

  // 2. Alert notifications
  if (type === "alert" || data.alertId || data.targetScreen === "Alerts") {
    if (isNurse) {
      if (data.patientId) {
        return {
          screen: "NursePatientDetail",
          params: { patientId: data.patientId },
        };
      }
      return { screen: "NursePatients", params: {} };
    }

    return {
      screen: "AlertsTab",
      params: {
        screen: "Alerts",
        params: { selectedAlertId: data.alertId, patientId: data.patientId },
      },
    };
  }

  // 3. Reminders / Prescriptions
  if (type === "reminder" || type === "prescription") {
    if (isNurse) {
      return { screen: "NursePatients", params: {} };
    }
    return {
      screen: "Reminders",
      params: { selectedReminderId: data.reminderId },
    };
  }

  // 4. Default fallback
  if (isNurse) {
    return { screen: "NursePatients", params: {} };
  }
  return {
    screen: "AlertsTab",
    params: { screen: "Alerts" },
  };
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
    return false;
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
    return false;
  }
  return true;
}

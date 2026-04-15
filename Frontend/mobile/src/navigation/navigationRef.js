import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

let pendingNotificationAction = null;

function normalizePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    acc[key] = typeof value === "string" ? value : value == null ? "" : String(value);
    return acc;
  }, {});
}

function buildNotificationNavigationAction(payload) {
  const data = normalizePayload(payload);
  const type = data.type;

  if (type === "alert" && data.alertId) {
    return {
      name: "MainTabs",
      params: {
        screen: "PatientAlerts",
        params: {
          selectedAlertId: data.alertId,
          notificationId: data.notificationId,
        },
      },
    };
  }

  if (type === "reminder") {
    const targetScreen = data.targetScreen;
    if (targetScreen === "InputMeasurementPatientScreen" || data.reminderKind === "measure") {
      return {
        name: "MainTabs",
        params: {
          screen: "InputMeasurementPatientScreen",
          params: {
            selectedReminderId: data.reminderId,
            notificationId: data.notificationId,
            reminderKind: data.reminderKind,
            reminderMessage: data.message,
          },
        },
      };
    }

    return {
      name: "MainTabs",
      params: {
        screen: "PatientNotifications",
        params: {
          selectedNotificationId: data.notificationId,
          selectedReminderId: data.reminderId,
        },
      },
    };
  }

  if (data.notificationId) {
    return {
      name: "MainTabs",
      params: {
        screen: "PatientNotifications",
        params: { selectedNotificationId: data.notificationId },
      },
    };
  }

  return null;
}

function performNavigation(action) {
  if (!action) return false;
  if (!navigationRef.isReady()) {
    pendingNotificationAction = action;
    return false;
  }

  navigationRef.navigate(action.name, action.params);
  return true;
}

export function navigateFromNotificationPayload(payload) {
  return performNavigation(buildNotificationNavigationAction(payload));
}

export function flushPendingNotificationNavigation() {
  if (!pendingNotificationAction || !navigationRef.isReady()) {
    return false;
  }

  const action = pendingNotificationAction;
  pendingNotificationAction = null;
  navigationRef.navigate(action.name, action.params);
  return true;
}

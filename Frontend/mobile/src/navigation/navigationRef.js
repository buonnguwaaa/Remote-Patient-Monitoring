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

  // 1. Chat notifications -> Navigate to DoctorChat tab
  if (
    type === "chat" ||
    type === "new_message" ||
    type === "message" ||
    data.conversationId ||
    data.targetScreen === "DoctorChat" ||
    data.screen === "DoctorChat"
  ) {
    return {
      name: "MainTabs",
      params: {
        screen: "DoctorChat",
        params: {
          conversationId: data.conversationId,
          senderId: data.senderId,
        },
      },
    };
  }

  // 2. Alert notifications -> Navigate to PatientAlerts screen
  if (type === "alert" || data.alertId || data.targetScreen === "PatientAlerts") {
    return {
      name: "PatientAlerts",
      params: {
        selectedAlertId: data.alertId,
        notificationId: data.notificationId,
        patientId: data.patientId,
      },
    };
  }

  // 3. Medication reminders / Prescriptions -> Navigate to PatientMedications screen
  if (
    type === "medication" ||
    type === "prescription" ||
    data.reminderKind === "medicine" ||
    data.prescriptionId ||
    data.targetScreen === "PatientMedications"
  ) {
    return {
      name: "PatientMedications",
      params: {
        selectedReminderId: data.reminderId,
        prescriptionId: data.prescriptionId,
        notificationId: data.notificationId,
      },
    };
  }

  // 4. Measurement reminders -> Navigate to InputMeasurementPatientScreen
  if (
    type === "reminder" &&
    (data.targetScreen === "InputMeasurementPatientScreen" || data.reminderKind === "measure")
  ) {
    return {
      name: "InputMeasurementPatientScreen",
      params: {
        selectedReminderId: data.reminderId,
        notificationId: data.notificationId,
        reminderKind: data.reminderKind,
        reminderMessage: data.message,
      },
    };
  }

  // 5. Fallback for all other notifications -> Navigate to PatientNotifs tab (Notification Inbox)
  return {
    name: "MainTabs",
    params: {
      screen: "PatientNotifs",
      params: {
        selectedNotificationId: data.notificationId,
        selectedReminderId: data.reminderId,
      },
    },
  };
}

function performNavigation(action) {
  if (!action) return false;
  if (!navigationRef.isReady()) {
    pendingNotificationAction = action;
    return false;
  }

  try {
    navigationRef.navigate(action.name, action.params);
  } catch (err) {
    console.warn("[nav] Failed to perform notification navigation:", err);
    return false;
  }
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
  try {
    navigationRef.navigate(action.name, action.params);
  } catch (err) {
    console.warn("[nav] Failed to flush pending notification navigation:", err);
    return false;
  }
  return true;
}

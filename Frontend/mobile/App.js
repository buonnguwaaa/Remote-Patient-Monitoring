import React, { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import {
  attachNotificationListeners,
  processInitialNotificationResponse,
} from "./src/services/pushNotificationService";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function NotificationLifecycleBridge() {
  useEffect(() => {
    void processInitialNotificationResponse();
    return attachNotificationListeners();
  }, []);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NotificationLifecycleBridge />
        <AppNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

import React, { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { SnackbarProvider } from "./src/context/SnackbarContext";
import { TutorialProvider } from "./src/context/tutorial/TutorialContext";
import AppNavigator from "./src/navigation/AppNavigator";
import ErrorBoundary from "./src/components/ErrorBoundary";
import {
  attachNotificationListeners,
  processInitialNotificationResponse,
} from "./src/services/pushNotificationService";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    <ErrorBoundary>
      <AuthProvider>
        <SnackbarProvider>
          <TutorialProvider>
            <SafeAreaProvider>
              <NotificationLifecycleBridge />
              <AppNavigator />
            </SafeAreaProvider>
          </TutorialProvider>
        </SnackbarProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

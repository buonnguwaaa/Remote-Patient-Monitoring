import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { BadgeProvider } from "./src/context/BadgeContext";
import AppNavigator from "./src/navigation/AppNavigator";
import ErrorBoundary from "./src/components/ErrorBoundary";
import {
  attachNotificationListeners,
  processInitialNotificationResponse,
} from "./src/services/pushNotificationService";

export default function App() {
  useEffect(() => {
    // Attach foreground + tap listeners for the lifetime of the app
    const detach = attachNotificationListeners();

    // Handle cold-start: app was opened by tapping a notification
    processInitialNotificationResponse();

    return detach;
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BadgeProvider>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </BadgeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

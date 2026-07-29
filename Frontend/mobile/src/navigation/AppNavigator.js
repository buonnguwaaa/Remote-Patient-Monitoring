import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../hooks/useAuth";
import { useOnboardingStatus } from "../hooks/useOnboardingStatus";
import {
  navigationRef,
  flushPendingNotificationNavigation,
} from "./navigationRef";
import { BadgeProvider, useBadge } from "../context/BadgeContext";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import RegisterOptionalScreen from "../screens/auth/RegisterOptionalScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import SetPasswordScreen from "../screens/auth/SetPasswordScreen";

import HomeScreen from "../screens/patient/HomeScreen";
import HistoryScreen from "../screens/patient/HistoryScreen";
import AlertScreen from "../screens/patient/AlertScreen";
import ProfileScreen from "../screens/patient/ProfileScreen";
import DoctorChatScreen from "../screens/patient/DoctorChatScreen";
import UserGuideScreen from "../screens/patient/UserGuideScreen";
import InputMeasurementPatientScreen from "../screens/patient/InputMeasurementPatientScreen";
import NotificationInboxScreen from "../screens/patient/NotificationInboxScreen";
import TrackingScreen from "../screens/patient/TrackingScreen";
import TutorialTarget from "../components/tutorial/TutorialTarget";
import { useTutorial } from "../context/tutorial/TutorialContext";
import NotificationContainerScreen from "../screens/patient/NotificationContainerScreen";
import MedicationScreen from "../screens/patient/MedicationScreen";
import VideoCallScreen from "../screens/patient/VideoCallScreen";
import EducationHomeScreen from "../screens/patient/EducationHomeScreen";
import EducationArticleScreen from "../screens/patient/EducationArticleScreen";
import EducationQuizScreen from "../screens/patient/EducationQuizScreen";
import AccountHistoryScreen from "../screens/patient/AccountHistoryScreen";



const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function PatientTabNavigator() {
  const insets = useSafeAreaInsets();
  const { unreadNotifCount, unreadMessageCount } = useBadge();

  const notifBadge = unreadNotifCount > 0 ? (unreadNotifCount > 99 ? "99+" : unreadNotifCount) : undefined;
  const msgBadge = unreadMessageCount > 0 ? (unreadMessageCount > 99 ? "99+" : unreadMessageCount) : undefined;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 6,
        },
        tabBarBadgeStyle: {
          fontSize: 10,
          fontWeight: "700",
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          lineHeight: 18,
          backgroundColor: "#DC2626",
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === "PatientHome") {
            return <Ionicons name="home-outline" size={size} color={color} />;
          }
          if (route.name === "PatientTracking") {
            return <Ionicons name="pulse-outline" size={size} color={color} />;
          }
          if (route.name === "EducationHome") {
            return <Ionicons name="book-outline" size={size} color={color} />;
          }
          if (route.name === "DoctorChat") {
            return <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />;
          }
          if (route.name === "PatientNotifs") {
            return <Ionicons name="notifications-outline" size={size} color={color} />;
          }
          if (route.name === "PatientProfile") {
            return <Ionicons name="person-circle-outline" size={size} color={color} />;
          }
          return null;
        },
      })}
    >
      <Tab.Screen name="PatientHome" component={HomeScreen} options={{ title: "Trang chủ" }} />
      <Tab.Screen
        name="PatientTracking"
        component={TrackingScreen}
        options={{
          title: "Theo dõi",
          tabBarButton: (props) => {
            const { tutorialMode, nextStep, currentStep } = useTutorial();
            const onPress = (e) => {
              if (Platform.OS === 'web' && e && typeof e.preventDefault === 'function') {
                e.preventDefault();
              }
              if (tutorialMode && currentStep?.id === 'home_tracking') {
                nextStep();
              }
              props.onPress(e);
            };
            return (
              <TutorialTarget
                name="homeTrackingCard"
                routeName="PatientHome"
                style={[{ flex: 1 }, props.style]}
              >
                <TouchableOpacity
                  {...props}
                  style={[{ flex: 1, width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }, props.style]}
                  onPress={onPress}
                />
              </TutorialTarget>
            );
          }
        }}
      />
      <Tab.Screen name="EducationHome" component={EducationHomeScreen} options={{ title: "Giáo dục" }} />
      <Tab.Screen name="DoctorChat" component={DoctorChatScreen} options={{ title: "Tin nhắn", tabBarBadge: msgBadge }} />
      <Tab.Screen name="PatientNotifs" component={NotificationContainerScreen} options={{ title: "Thông báo", tabBarBadge: notifBadge }} />
      <Tab.Screen name="PatientProfile" component={ProfileScreen} options={{ title: "Hồ sơ" }} />
    </Tab.Navigator>
  );
}



function MainTabsScreen() {
  return (
    <BadgeProvider>
      <PatientTabNavigator />
    </BadgeProvider>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();
  const { startTutorial } = useTutorial();
  const { checkingOnboarding, hasCompletedOnboarding, markOnboardingComplete } =
    useOnboardingStatus(user?._id || user?.id);

  React.useEffect(() => {
    if (user && !checkingOnboarding && !hasCompletedOnboarding) {
      // We only mark onboarding complete here to avoid repeatedly triggering.
      // The actual tutorial start is handled by HomeScreen > PatientTutorialModal > handleCompleteTutorial
      markOnboardingComplete();
    }
  }, [user, checkingOnboarding, hasCompletedOnboarding, markOnboardingComplete]);

  if (initializing || (user && checkingOnboarding)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          {initializing ? "Đang kiểm tra phiên đăng nhập…" : "Đang chuẩn bị…"}
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="RegisterOptional" component={RegisterOptionalScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
      </Stack.Navigator>
    );
  }

  // Patient-only app: all authenticated users go to patient navigator
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabsScreen} />
      <Stack.Screen name="InputMeasurementPatientScreen" component={InputMeasurementPatientScreen} />
      <Stack.Screen name="PatientHistory" component={HistoryScreen} />
      <Stack.Screen name="PatientAlerts" component={AlertScreen} />
      <Stack.Screen name="PatientNotifications" component={NotificationInboxScreen} />
      <Stack.Screen name="PatientMedications" component={MedicationScreen} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} />
      <Stack.Screen name="EducationArticle" component={EducationArticleScreen} />
      <Stack.Screen name="EducationQuiz" component={EducationQuizScreen} />
      <Stack.Screen name="AccountHistory" component={AccountHistoryScreen} />
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
      <Stack.Screen name="UserGuide" component={UserGuideScreen} />
    </Stack.Navigator>
  );
}

const linking = {
  prefixes: ["rpm://", "exp+rpm-patient://"],
  config: {
    screens: {
      SetPassword: "accept-invite",
    },
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={() => {
        flushPendingNotificationNavigation();
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F2F6FF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#4B5563",
  },
});

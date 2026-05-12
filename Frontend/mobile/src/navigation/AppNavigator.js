import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../hooks/useAuth";
import {
  navigationRef,
  flushPendingNotificationNavigation,
} from "./navigationRef";
import { BadgeProvider, useBadge } from "../context/BadgeContext";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

import HomeScreen from "../screens/patient/HomeScreen";
import HistoryScreen from "../screens/patient/HistoryScreen";
import AlertScreen from "../screens/patient/AlertScreen";
import ProfileScreen from "../screens/patient/ProfileScreen";
import DoctorChatScreen from "../screens/patient/DoctorChatScreen";
import InputMeasurementPatientScreen from "../screens/patient/InputMeasurementPatientScreen";
import NotificationInboxScreen from "../screens/patient/NotificationInboxScreen";
import TrackingScreen from "../screens/patient/TrackingScreen";
import NotificationContainerScreen from "../screens/patient/NotificationContainerScreen";

import NursePatientListScreen from "../screens/nurse/NursePatientListScreen";
import MeasurementInputScreen from "../screens/nurse/MeasurementInputScreen";
import NurseProfileScreen from "../screens/nurse/NurseProfileScreen";

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
      <Tab.Screen name="PatientTracking" component={TrackingScreen} options={{ title: "Theo dõi" }} />
      <Tab.Screen name="DoctorChat" component={DoctorChatScreen} options={{ title: "Tin nhắn", tabBarBadge: msgBadge }} />
      <Tab.Screen name="PatientNotifs" component={NotificationContainerScreen} options={{ title: "Thông báo", tabBarBadge: notifBadge }} />
      <Tab.Screen name="PatientProfile" component={ProfileScreen} options={{ title: "Hồ sơ" }} />
    </Tab.Navigator>
  );
}

function NurseTabNavigator() {
  const insets = useSafeAreaInsets();
  
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
        tabBarIcon: ({ color, size }) => {
          if (route.name === "NursePatients") {
            return <Ionicons name="people-outline" size={size} color={color} />;
          }
          if (route.name === "NurseMeasurementInput") {
            return <Ionicons name="create-outline" size={size} color={color} />;
          }
          if (route.name === "NurseProfile") {
            return <MaterialIcons name="person-outline" size={size} color={color} />;
          }
          return null;
        },
      })}
    >
      <Tab.Screen name="NursePatients" component={NursePatientListScreen} options={{ title: "Bệnh nhân" }} />
      <Tab.Screen
        name="NurseMeasurementInput"
        component={MeasurementInputScreen}
        options={{ title: "Nhập liệu" }}
      />
      <Tab.Screen name="NurseProfile" component={NurseProfileScreen} options={{ title: "Hồ sơ" }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang kiểm tra phiên đăng nhập…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  const role = user?.role || "patient";

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MainTabs"
        component={
          role === "user.nurse" || role === "nurse"
            ? NurseTabNavigator
            : () => (
                <BadgeProvider>
                  <PatientTabNavigator />
                </BadgeProvider>
              )
        }
      />
      {role !== "user.nurse" && role !== "nurse" && (
        <>
          <Stack.Screen name="InputMeasurementPatientScreen" component={InputMeasurementPatientScreen} />
          <Stack.Screen name="PatientHistory" component={HistoryScreen} />
          <Stack.Screen name="PatientAlerts" component={AlertScreen} />
          <Stack.Screen name="PatientNotifications" component={NotificationInboxScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer
      ref={navigationRef}
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

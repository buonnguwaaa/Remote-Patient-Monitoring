import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationRef, flushPendingNotificationNavigation } from "./navigationRef";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useBadges } from "../context/BadgeContext";
import {
  colors,
  tabBar as tabBarTheme,
  headerOptions as themeHeaderOptions,
  rootHeaderOptions as themeRootHeaderOptions,
} from "../theme/rpmTheme";

// Doctor Screens
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PatientsScreen from "../screens/PatientsScreen";
import AlertsScreen from "../screens/AlertsScreen";
import ChatScreen from "../screens/ChatScreen";
import ChatDetailScreen from "../screens/ChatDetailScreen";
import ThresholdsScreen from "../screens/ThresholdsScreen";
import RemindersScreen from "../screens/RemindersScreen";
import PrescriptionsScreen from "../screens/PrescriptionsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import VideoCallScreen from "../screens/VideoCallScreen";
import ComplianceScreen from "../screens/ComplianceScreen";
import MoreScreen from "../screens/MoreScreen";
import AlertDetailScreen from "../screens/AlertDetailScreen";

// Nurse Screens
import NursePatientListScreen from "../screens/nurse/NursePatientListScreen";
import MeasurementInputScreen from "../screens/nurse/MeasurementInputScreen";
import NurseProfileScreen from "../screens/nurse/NurseProfileScreen";
import PatientDetailScreen from "../screens/nurse/PatientDetailScreen";
import NursePrescriptionScreen from "../screens/nurse/NursePrescriptionScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HeaderProfileButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileBtn}>
      <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
    </TouchableOpacity>
  );
};

const commonHeaderOptions = {
  ...themeHeaderOptions,
  headerRight: () => <HeaderProfileButton />,
};

// ─── Doctor Stacks ────────────────────────────────────────────────────────────

const HomeStack = () => (
  <Stack.Navigator screenOptions={commonHeaderOptions}>
    <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Tổng quan" }} />
  </Stack.Navigator>
);

const PatientsStack = () => (
  <Stack.Navigator screenOptions={commonHeaderOptions}>
    <Stack.Screen name="Patients" component={PatientsScreen} options={{ title: "Hồ sơ bệnh nhân" }} />
  </Stack.Navigator>
);

const AlertsStack = () => (
  <Stack.Navigator screenOptions={commonHeaderOptions}>
    <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: "Quản lý cảnh báo" }} />
  </Stack.Navigator>
);

const ChatStack = () => (
  <Stack.Navigator screenOptions={commonHeaderOptions}>
    <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Tin nhắn" }} />
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const MoreStack = () => (
  <Stack.Navigator screenOptions={commonHeaderOptions}>
    <Stack.Screen name="More" component={MoreScreen} options={{ title: "Thêm" }} />
  </Stack.Navigator>
);

// ─── Doctor Main Tabs (unchanged) ─────────────────────────────────────────────

function DoctorMainTabs() {
  const badges = useBadges() || { unreadAlertsCount: 0, unreadChatsCount: 0 };
  const { unreadAlertsCount, unreadChatsCount } = badges;
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tabBarTheme.activeTintColor,
        tabBarInactiveTintColor: tabBarTheme.inactiveTintColor,
        tabBarLabelStyle: tabBarTheme.labelStyle,
        tabBarStyle: tabBarTheme.style(insets.bottom),
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "HomeTab") iconName = "home-outline";
          else if (route.name === "PatientsTab") iconName = "people-outline";
          else if (route.name === "AlertsTab") iconName = "warning-outline";
          else if (route.name === "ChatTab") iconName = "chatbubble-ellipses-outline";
          else if (route.name === "MoreTab") iconName = "ellipsis-horizontal-outline";
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ tabBarLabel: "Tổng quan" }}
      />
      <Tab.Screen
        name="PatientsTab"
        component={PatientsStack}
        options={{ tabBarLabel: "Bệnh nhân" }}
      />
      <Tab.Screen
        name="AlertsTab"
        component={AlertsStack}
        options={{
          tabBarLabel: "Cảnh báo",
          tabBarBadge: unreadAlertsCount > 0 ? (unreadAlertsCount > 99 ? "99+" : unreadAlertsCount) : null,
          tabBarBadgeStyle: tabBarTheme.badgeStyle
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatStack}
        options={{
          tabBarLabel: "Tin nhắn",
          tabBarBadge: unreadChatsCount > 0 ? (unreadChatsCount > 99 ? "99+" : unreadChatsCount) : null,
          tabBarBadgeStyle: tabBarTheme.badgeStyle
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate("ChatTab", { screen: "Chat" });
          },
        })}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{ tabBarLabel: "Thêm" }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.navigate("MoreTab", { screen: "More" });
          },
        })}
      />
    </Tab.Navigator>
  );
}

// ─── Nurse Main Tabs ──────────────────────────────────────────────────────────

function NurseMainTabs() {
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
          if (route.name === "NursePrescriptions") {
            return <Ionicons name="receipt-outline" size={size} color={color} />;
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
      <Tab.Screen name="NursePrescriptions" component={NursePrescriptionScreen} options={{ title: "Đơn thuốc" }} />
      <Tab.Screen name="NurseProfile" component={NurseProfileScreen} options={{ title: "Hồ sơ" }} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

function RootNavigator() {
  const { user, initializing, isDoctor, isNurse } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang kiểm tra phiên đăng nhập…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Nurse navigator
  if (isNurse) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false, headerBackTitleVisible: false }}>
        <Stack.Screen name="NurseMainTabs" component={NurseMainTabs} />
        <Stack.Screen name="NursePatientDetail" component={PatientDetailScreen} />
        <Stack.Screen name="NursePrescriptionDetail" component={NursePrescriptionScreen} />
      </Stack.Navigator>
    );
  }

  // Doctor navigator (default)
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerBackTitleVisible: false }}>
      <Stack.Screen name="MainTabs" component={DoctorMainTabs} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={themeRootHeaderOptions("Hồ sơ bác sĩ")} />
      <Stack.Screen name="Thresholds" component={ThresholdsScreen} options={themeRootHeaderOptions("Cấu hình ngưỡng")} />
      <Stack.Screen name="Reminders" component={RemindersScreen} options={themeRootHeaderOptions("Nhắc nhở")} />
      <Stack.Screen name="Compliance" component={ComplianceScreen} options={themeRootHeaderOptions("Tuân thủ dùng thuốc")} />
      <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} options={themeRootHeaderOptions("Đơn thuốc")} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={themeRootHeaderOptions("Cài đặt")} />
      <Stack.Screen name="AlertDetail" component={AlertDetailScreen} options={themeRootHeaderOptions("Chi tiết cảnh báo")} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={flushPendingNotificationNavigation}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textHint },
  profileBtn: { marginRight: 16 },
});

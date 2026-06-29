import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { navigationRef, flushPendingNotificationNavigation } from "./navigationRef";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useBadges } from "../context/BadgeContext";

// Screens
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HeaderProfileButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={styles.profileBtn}>
      <Ionicons name="person-circle-outline" size={28} color="#2563EB" />
    </TouchableOpacity>
  );
};

const commonHeaderOptions = {
  headerTitleAlign: "center",
  headerRight: () => <HeaderProfileButton />,
  headerStyle: {
    backgroundColor: "#fff",
  },
  headerTitleStyle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  headerShadowVisible: false,
};

// Stacks for each tab
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
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ title: "Đoạn chat", headerRight: null }} />
  </Stack.Navigator>
);

const MoreStack = () => (
  <Stack.Navigator screenOptions={commonHeaderOptions}>
    <Stack.Screen name="More" component={MoreScreen} options={{ title: "Thêm" }} />
    <Stack.Screen name="Thresholds" component={ThresholdsScreen} options={{ title: "Cấu hình ngưỡng" }} />
    <Stack.Screen name="Reminders" component={RemindersScreen} options={{ title: "Nhắc nhở" }} />
    <Stack.Screen name="Compliance" component={ComplianceScreen} options={{ title: "Tuân thủ dùng thuốc" }} />
    <Stack.Screen name="Prescriptions" component={PrescriptionsScreen} options={{ title: "Đơn thuốc" }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Cài đặt" }} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Hồ sơ bác sĩ", headerRight: null }} />
  </Stack.Navigator>
);

function MainTabs() {
  const badges = useBadges() || { unreadAlertsCount: 0, unreadChatsCount: 0 };
  const { unreadAlertsCount, unreadChatsCount } = badges;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          height: 60,
          paddingTop: 8,
        },
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
          tabBarBadgeStyle: { backgroundColor: "#EF4444", fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 }
        }} 
      />
      <Tab.Screen 
        name="ChatTab" 
        component={ChatStack} 
        options={{ 
          tabBarLabel: "Tin nhắn",
          tabBarBadge: unreadChatsCount > 0 ? (unreadChatsCount > 99 ? "99+" : unreadChatsCount) : null,
          tabBarBadgeStyle: { backgroundColor: "#EF4444", fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 }
        }} 
      />
      <Tab.Screen 
        name="MoreTab" 
        component={MoreStack} 
        options={{ tabBarLabel: "Thêm" }} 
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} />
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
  loading: { flex: 1, backgroundColor: "#F2F6FF", alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#4B5563" },
  profileBtn: { marginRight: 16 },
});

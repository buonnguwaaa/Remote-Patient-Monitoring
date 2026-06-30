import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
const SidebarContext = createContext(null);
export const useSidebar = () => useContext(SidebarContext);

const NAV_ITEMS = [
  { name: "Home",          label: "Tổng quan",          icon: "home-outline" },
  { name: "Patients",      label: "Hồ sơ bệnh nhân",    icon: "people-outline" },
  { name: "Alerts",        label: "Quản lý cảnh báo",   icon: "warning-outline" },
  { name: "Chat",          label: "Tin nhắn",            icon: "chatbubble-ellipses-outline" },
  { name: "Compliance",    label: "Tuân thủ dùng thuốc", icon: "checkmark-done-circle-outline" },
  { name: "Thresholds",    label: "Cấu hình ngưỡng",    icon: "options-outline" },
  { name: "Reminders",     label: "Nhắc nhở",            icon: "alarm-outline" },
  { name: "Prescriptions", label: "Đơn thuốc",           icon: "document-text-outline" },
  { name: "Settings",      label: "Cài đặt",             icon: "settings-outline" },
];

const SCREEN_TITLES = {
  Home:          "Tổng quan",
  Patients:      "Hồ sơ bệnh nhân",
  Alerts:        "Quản lý cảnh báo",
  Chat:          "Tin nhắn",
  Compliance:    "Tuân thủ dùng thuốc",
  Thresholds:    "Cấu hình ngưỡng",
  Reminders:     "Nhắc nhở",
  Prescriptions: "Đơn thuốc",
  Profile:       "Hồ sơ bác sĩ",
  Settings:      "Cài đặt",
};

function Sidebar({ visible, currentRoute, onNavigate, onClose }) {
  const { user, logout } = useAuth();
  const { unreadAlertsCount, unreadChatsCount } = useBadges();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -SIDEBAR_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.sidebar, { transform: [{ translateX }], paddingTop: insets.top }]}>
          <View style={styles.sidebarHeader}>
            <View style={styles.logoCircle}>
              <Ionicons name="medical" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.appName}>RPM Doctor</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || user?.username || "Bác sĩ"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.profileCard}
              onPress={() => onNavigate("Profile")}
              activeOpacity={0.8}
            >
              <View style={styles.profileAvatar}>
                <Ionicons name="person-outline" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {user?.name || user?.username || "Bác sĩ"}
                </Text>
                <Text style={styles.profileSub} numberOfLines={1}>
                  {user?.email || "Xem hồ sơ"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={styles.navDivider} />

            {NAV_ITEMS.map((item) => {
              const isActive = currentRoute === item.name;
              let badgeCount = 0;
              if (item.name === "Alerts") {
                badgeCount = unreadAlertsCount;
              } else if (item.name === "Chat") {
                badgeCount = unreadChatsCount;
              }

              return (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => onNavigate(item.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon} size={20} color={isActive ? "#2563EB" : "#6B7280"} />
                    {badgeCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.activeBar} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.sidebarFooter, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={[styles.overlayBg, { opacity }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

function AppHeader({ title, onOpenSidebar, onOpenProfile }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={onOpenSidebar} style={styles.hamburger}>
        <Ionicons name="menu-outline" size={26} color="#111827" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={onOpenProfile} style={styles.profileBtn}>
        <Ionicons name="person-circle-outline" size={28} color="#2563EB" />
      </TouchableOpacity>
    </View>
  );
}

function ScreenContainer({ name, children }) {
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
    <SidebarContext.Provider value={{ openSidebar }}>
      <Sidebar
        visible={sidebarVisible}
        currentRoute={currentRoute}
        onNavigate={navigate}
        onClose={closeSidebar}
      />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreenWrapper} />
        <Stack.Screen name="Profile" component={ProfileScreenWrapper} />
        <Stack.Screen name="Patients" component={PatientsScreenWrapper} />
        <Stack.Screen name="Alerts" component={AlertsScreenWrapper} />
        <Stack.Screen name="Chat" component={ChatScreenWrapper} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        <Stack.Screen name="Thresholds" component={ThresholdsScreenWrapper} />
        <Stack.Screen name="Reminders" component={RemindersScreenWrapper} />
        <Stack.Screen name="Prescriptions" component={PrescriptionsScreenWrapper} />
        <Stack.Screen name="Settings" component={SettingsScreenWrapper} />
        <Stack.Screen name="Compliance" component={ComplianceScreenWrapper} />
        <Stack.Screen name="VideoCall" component={VideoCallScreen} />
      </Stack.Navigator>
    </SidebarContext.Provider>
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

  return <MainNavigator />;
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

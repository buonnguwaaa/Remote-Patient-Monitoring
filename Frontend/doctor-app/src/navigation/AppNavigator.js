<<<<<<< Updated upstream
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
=======
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
>>>>>>> Stashed changes
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigationRef, flushPendingNotificationNavigation } from "./navigationRef";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useBadges } from "../context/BadgeContext";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
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

const SIDEBAR_WIDTH = 280;
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

<<<<<<< Updated upstream
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
=======
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
    <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: false }} />
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
  const insets = useSafeAreaInsets();

  const bottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 24 : 12);

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
          height: 60 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
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
>>>>>>> Stashed changes
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
  const { openSidebar } = useSidebar();
  const openProfile = () => navigation.navigate("Profile");
  return (
    <View style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <AppHeader
        title={SCREEN_TITLES[name]}
        onOpenSidebar={openSidebar}
        onOpenProfile={openProfile}
      />
      {children}
    </View>
  );
}

const HomeScreenWrapper = () => (
  <ScreenContainer name="Home">
    <HomeScreen />
  </ScreenContainer>
);

const ProfileScreenWrapper = () => (
  <ScreenContainer name="Profile">
    <ProfileScreen />
  </ScreenContainer>
);

const PatientsScreenWrapper = () => (
  <ScreenContainer name="Patients">
    <PatientsScreen />
  </ScreenContainer>
);

const AlertsScreenWrapper = () => (
  <ScreenContainer name="Alerts">
    <AlertsScreen />
  </ScreenContainer>
);

const ChatScreenWrapper = (props) => (
  <ScreenContainer name="Chat">
    <ChatScreen {...props} />
  </ScreenContainer>
);

const ComplianceScreenWrapper = (props) => (
  <ScreenContainer name="Compliance">
    <ComplianceScreen {...props} />
  </ScreenContainer>
);

const ThresholdsScreenWrapper = (props) => (
  <ScreenContainer name="Thresholds">
    <ThresholdsScreen {...props} />
  </ScreenContainer>
);

const RemindersScreenWrapper = (props) => (
  <ScreenContainer name="Reminders">
    <RemindersScreen {...props} />
  </ScreenContainer>
);

const PrescriptionsScreenWrapper = (props) => (
  <ScreenContainer name="Prescriptions">
    <PrescriptionsScreen {...props} />
  </ScreenContainer>
);

const SettingsScreenWrapper = (props) => (
  <ScreenContainer name="Settings">
    <SettingsScreen {...props} />
  </ScreenContainer>
);

function MainNavigator() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentRoute, setCurrentRoute] = useState("Home");

  useEffect(() => {
    const handleStateChange = () => {
      if (navigationRef.isReady()) {
        const route = navigationRef.getCurrentRoute();
        if (route) {
          setCurrentRoute(route.name);
        }
      }
    };

    const unsubscribe = navigationRef.addListener("state", handleStateChange);
    handleStateChange();
    return unsubscribe;
  }, []);

  const openSidebar = () => setSidebarVisible(true);
  const closeSidebar = () => setSidebarVisible(false);

  const navigate = useCallback((name) => {
    setCurrentRoute(name);
    setSidebarVisible(false);
    if (navigationRef.isReady()) {
      navigationRef.navigate(name);
    }
  }, []);

  return (
    <SidebarContext.Provider value={{ openSidebar }}>
      <Sidebar
        visible={sidebarVisible}
        currentRoute={currentRoute}
        onNavigate={navigate}
        onClose={closeSidebar}
      />
<<<<<<< Updated upstream
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
=======
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
      />
    </Tab.Navigator>
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  return <MainNavigator />;
=======
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="VideoCall" component={VideoCallScreen} />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ 
          headerShown: true,
          title: "Hồ sơ bác sĩ",
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: "#fff" },
          headerTitleStyle: { fontSize: 17, fontWeight: "700", color: "#111827" },
          headerShadowVisible: false,
          headerBackTitle: "Quay lại",
        }} 
      />
    </Stack.Navigator>
  );
>>>>>>> Stashed changes
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  hamburger: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  profileBtn: { padding: 4 },
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  overlayBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: "#fff",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 15, fontWeight: "800", color: "#111827" },
  userName: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  closeBtn: { padding: 4 },
  navList: { flex: 1, paddingHorizontal: 10, paddingTop: 10 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 2,
    gap: 12,
    position: "relative",
  },
  navItemActive: { backgroundColor: "#EFF6FF" },
  navLabel: { fontSize: 14, fontWeight: "500", color: "#374151", flex: 1 },
  navLabelActive: { color: "#2563EB", fontWeight: "700" },
  activeBar: {
    position: "absolute",
    right: 0,
    top: "20%",
    bottom: "20%",
    width: 3,
    borderRadius: 2,
    backgroundColor: "#2563EB",
  },
  sidebarFooter: { paddingHorizontal: 10 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 10 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    backgroundColor: "#FEF2F2",
  },
  logoutText: { fontSize: 14, fontWeight: "600", color: "#EF4444" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: 10,
    marginBottom: 4,
    padding: 12,
    backgroundColor: "#F8FAFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0EAFF",
    gap: 10,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  profileSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  navDivider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 10, marginBottom: 8, marginTop: 4 },
  iconContainer: {
    position: "relative",
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    right: -8,
    top: -6,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
});

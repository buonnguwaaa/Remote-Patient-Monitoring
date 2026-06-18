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
import { NavigationContainer, useNavigation, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const navigationRef = createNavigationContainerRef();
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import PatientsScreen from "../screens/PatientsScreen";
import AlertsScreen from "../screens/AlertsScreen";

const SIDEBAR_WIDTH = 280;
const Stack = createNativeStackNavigator();
const SidebarContext = createContext(null);
export const useSidebar = () => useContext(SidebarContext);

const NAV_ITEMS = [
  { name: "Home",          label: "Tổng quan",          icon: "home-outline" },
  { name: "Patients",      label: "Hồ sơ bệnh nhân",    icon: "people-outline" },
  { name: "Alerts",        label: "Quản lý cảnh báo",   icon: "warning-outline" },
  { name: "Chat",          label: "Tin nhắn",            icon: "chatbubble-ellipses-outline" },
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
  Thresholds:    "Cấu hình ngưỡng",
  Reminders:     "Nhắc nhở",
  Prescriptions: "Đơn thuốc",
  Profile:       "Hồ sơ bác sĩ",
  Settings:      "Cài đặt",
};

function Sidebar({ visible, currentRoute, onNavigate, onClose }) {
  const { user, logout } = useAuth();
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
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => onNavigate(item.name)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon} size={20} color={isActive ? "#2563EB" : "#6B7280"} />
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

function ScreenContainer({ name, onOpenSidebar, children }) {
  const navigation = useNavigation();
  const openProfile = () => navigation.navigate("Profile");
  return (
    <View style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <AppHeader
        title={SCREEN_TITLES[name]}
        onOpenSidebar={onOpenSidebar}
        onOpenProfile={openProfile}
      />
      {children}
    </View>
  );
}

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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">
          {() => (
            <ScreenContainer name="Home" onOpenSidebar={openSidebar}>
              <HomeScreen />
            </ScreenContainer>
          )}
        </Stack.Screen>
        <Stack.Screen name="Profile">
          {() => (
            <ScreenContainer name="Profile" onOpenSidebar={openSidebar}>
              <ProfileScreen />
            </ScreenContainer>
          )}
        </Stack.Screen>
        <Stack.Screen name="Patients">
          {() => (
            <ScreenContainer name="Patients" onOpenSidebar={openSidebar}>
              <PatientsScreen />
            </ScreenContainer>
          )}
        </Stack.Screen>
        <Stack.Screen name="Alerts">
          {() => (
            <ScreenContainer name="Alerts" onOpenSidebar={openSidebar}>
              <AlertsScreen />
            </ScreenContainer>
          )}
        </Stack.Screen>
        {["Chat", "Thresholds", "Reminders", "Prescriptions", "Settings"].map((name) => (
          <Stack.Screen key={name} name={name}>
            {() => (
              <ScreenContainer name={name} onOpenSidebar={openSidebar}>
                <PlaceholderScreen route={{ params: { title: SCREEN_TITLES[name] } }} />
              </ScreenContainer>
            )}
          </Stack.Screen>
        ))}
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
    <NavigationContainer ref={navigationRef}>
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
});

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useBadges } from "../context/BadgeContext";

const NAV_ITEMS = [
  { name: "Home",          label: "Tổng quan",          icon: "home-outline" },
  { name: "Patients",      label: "Hồ sơ bệnh nhân",    icon: "people-outline" },
  { name: "Alerts",        label: "Quản lý cảnh báo",   icon: "warning-outline" },
  { name: "Chat",          label: "Tin nhắn",            icon: "chatbubble-ellipses-outline" },
  { name: "Compliance",    label: "Tuân thủ dùng thuốc", icon: "checkmark-done-circle-outline" },
  { name: "Thresholds",    label: "Cấu hình ngưỡng",    icon: "options-outline" },
  { name: "Reminders",     label: "Nhắc nhở",            icon: "alarm-outline" },
  { name: "Prescriptions", label: "Đơn thuốc",           icon: "document-text-outline" },
  { name: "Profile",       label: "Hồ sơ bác sĩ",       icon: "person-circle-outline" },
  { name: "Settings",      label: "Cài đặt",             icon: "settings-outline" },
];

export default function DrawerContent(props) {
  const { state, navigation } = props;
  const { user, logout } = useAuth();
  const { unreadAlertsCount, unreadChatsCount } = useBadges() || { unreadAlertsCount: 0, unreadChatsCount: 0 };
  const currentRouteName = state?.routes?.[state?.index]?.name;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Ionicons name="medical" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.appName}>RPM Doctor</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || user?.username || "Bác sĩ"}
          </Text>
        </View>
      </View>

      {/* Nav items */}
      <ScrollView
        contentContainerStyle={{ paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <View style={styles.navSection}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentRouteName === item.name;
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
                onPress={() => navigation.navigate(item.name)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={isActive ? "#2563EB" : "#6B7280"}
                />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {badgeCount > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
                  </View>
                )}
                {isActive && <View style={styles.activeBar} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Logout */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  userName: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  navSection: { paddingHorizontal: 12, paddingTop: 12 },
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
  badgeContainer: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  footer: { paddingHorizontal: 12, paddingBottom: 24 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 12 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    backgroundColor: "#FEF2F2",
  },
  logoutText: { fontSize: 14, fontWeight: "600", color: "#EF4444" },
});

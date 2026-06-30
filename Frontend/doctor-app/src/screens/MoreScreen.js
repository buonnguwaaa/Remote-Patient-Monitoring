import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

const MORE_ITEMS = [
  { name: "Thresholds",    label: "Cấu hình ngưỡng",    icon: "options-outline", color: "#2563EB" },
  { name: "Reminders",     label: "Nhắc nhở",            icon: "alarm-outline", color: "#D97706" },
  { name: "Compliance",    label: "Tuân thủ dùng thuốc", icon: "checkmark-done-circle-outline", color: "#16A34A" },
  { name: "Prescriptions", label: "Đơn thuốc",           icon: "document-text-outline", color: "#7C3AED" },
  { name: "Settings",      label: "Cài đặt",             icon: "settings-outline", color: "#4B5563" },
];

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Profile Card Summary */}
      <TouchableOpacity 
        style={styles.profileCard} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate("Profile")}
      >
        <View style={styles.profileAvatar}>
          <Ionicons name="person-outline" size={24} color="#2563EB" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {user?.name || user?.username || "Bác sĩ"}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {user?.email || "Xem hồ sơ chi tiết"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Công cụ mở rộng</Text>
      
      <View style={styles.menuContainer}>
        {MORE_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.name}
            style={[styles.menuItem, index !== MORE_ITEMS.length - 1 && styles.borderBottom]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.name)}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + "15" }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F6FF",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: "#6B7280",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 12,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#1F2937",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#EF4444",
  },
});

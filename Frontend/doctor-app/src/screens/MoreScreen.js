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
import { colors, radius, spacing, typography, shadows } from "../theme/rpmTheme";

const MORE_ITEMS = [
  { name: "Thresholds",    label: "Cấu hình ngưỡng",    icon: "options-outline", color: colors.primary },
  { name: "Reminders",     label: "Nhắc nhở",            icon: "alarm-outline", color: colors.warning },
  { name: "Compliance",    label: "Tuân thủ dùng thuốc", icon: "checkmark-done-circle-outline", color: colors.success },
  { name: "Prescriptions", label: "Đơn thuốc",           icon: "document-text-outline", color: "#7C3AED" },
  { name: "Settings",      label: "Cài đặt",             icon: "settings-outline", color: colors.textHint },
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
          <Ionicons name="person-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {user?.name || user?.username || "Bác sĩ"}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {user?.email || "Xem hồ sơ chi tiết"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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
            <Ionicons name="chevron-forward" size={18} color={colors.disabled} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color={colors.dangerAccent} />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  profileCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surface,
    padding: spacing.lg, borderRadius: radius.xl, marginBottom: spacing.section,
    ...shadows.card,
  },
  profileAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surfaceSoftBlue, alignItems: "center", justifyContent: "center", marginRight: spacing.lg },
  profileInfo: { flex: 1 },
  profileName: { ...typography.sectionTitle, marginBottom: 4 },
  profileEmail: { fontSize: 13, color: colors.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.textHint, marginBottom: 12, marginLeft: 4, textTransform: "uppercase" },
  menuContainer: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden", marginBottom: spacing.section, ...shadows.card },
  menuItem: { flexDirection: "row", alignItems: "center", padding: spacing.lg, backgroundColor: colors.surface },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: colors.text },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.dangerSoftAlt, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.dangerSoft, gap: 8 },
  logoutText: { fontSize: 15, fontWeight: "600", color: colors.dangerAccent },
});


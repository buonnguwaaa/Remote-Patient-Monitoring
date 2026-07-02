import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function PatientHeroHeader({ profile, openAlertCount, onBack }) {
  const initials = (profile?.name || "BN").split(" ").slice(-2).map(w => w[0]).join("").toUpperCase();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>
      
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{profile?.name}</Text>
        <View style={styles.badgesRow}>
          <Text style={styles.code}>{profile?.patientCode || "Chưa có mã"}</Text>
          <View style={[styles.badge, profile?.isActive ? styles.badgeActive : styles.badgeInactive]}>
            <View style={[styles.dot, { backgroundColor: profile?.isActive ? "#16A34A" : "#6B7280" }]} />
            <Text style={[styles.badgeText, { color: profile?.isActive ? "#16A34A" : "#6B7280" }]}>
              {profile?.isActive ? "Đang theo dõi" : "Đã ngừng"}
            </Text>
          </View>
        </View>
      </View>

      {openAlertCount > 0 && (
        <View style={styles.alertBadge}>
          <Ionicons name="warning" size={12} color="#DC2626" />
          <Text style={styles.alertCount}>{openAlertCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: { paddingRight: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#1D4ED8" },
  info: { flex: 1, justifyContent: "center" },
  name: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 4 },
  badgesRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  code: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, gap: 4 },
  badgeActive: { backgroundColor: "#DCFCE7" },
  badgeInactive: { backgroundColor: "#F3F4F6" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  alertCount: { fontSize: 13, fontWeight: "700", color: "#DC2626" },
});

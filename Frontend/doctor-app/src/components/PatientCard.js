import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PatientCard({ item, onChat, onDetail }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        {/* Avatar */}
        <View style={[styles.avatar, item.isWarning ? styles.avatarWarning : styles.avatarNormal]}>
          <Text style={[styles.avatarText, item.isWarning ? styles.avatarTextWarning : styles.avatarTextNormal]}>
            {item.name ? item.name[0].toUpperCase() : "B"}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.patientName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.patientCode} numberOfLines={1}>
            Mã: {item.patientCode}
          </Text>
          <Text style={styles.patientMeta}>
            Cập nhật: {item.updatedAt}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, item.isWarning ? styles.badgeWarning : styles.badgeNormal]}>
          <Text style={[styles.statusBadgeText, item.isWarning ? styles.badgeTextWarning : styles.badgeTextNormal]}>
            {item.isWarning ? "Cảnh báo" : "Ổn định"}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={onChat}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#7C3AED" />
          <Text style={styles.chatButtonText}>Nhắn tin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailButton}
          onPress={onDetail}
          activeOpacity={0.7}
        >
          <Text style={styles.detailButtonText}>Xem chi tiết</Text>
          <Ionicons name="chevron-forward" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarNormal: { backgroundColor: "#EFF6FF" },
  avatarWarning: { backgroundColor: "#FEF2F2" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  avatarTextNormal: { color: "#2563EB" },
  avatarTextWarning: { color: "#DC2626" },
  cardInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  patientCode: { fontSize: 12, color: "#4B5563", marginTop: 2 },
  patientMeta: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeNormal: { backgroundColor: "#ECFDF5" },
  badgeWarning: { backgroundColor: "#FEF2F2" },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  badgeTextNormal: { color: "#059669" },
  badgeTextWarning: { color: "#DC2626" },
  cardDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },
  cardActions: { flexDirection: "row", gap: 10 },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  chatButtonText: { fontSize: 12, fontWeight: "600", color: "#7C3AED" },
  detailButton: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  detailButtonText: { fontSize: 12, fontWeight: "600", color: "#fff" },
});

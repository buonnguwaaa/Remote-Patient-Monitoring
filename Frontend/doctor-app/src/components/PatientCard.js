import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadows } from "../theme/rpmTheme";

function PatientCard({ item, onChat, onDetail }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={[styles.avatar, item.isWarning ? styles.avatarWarning : styles.avatarNormal]}>
          <Text style={[styles.avatarText, item.isWarning ? styles.avatarTextWarning : styles.avatarTextNormal]}>
            {item.name ? item.name[0].toUpperCase() : "B"}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.patientName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.patientCode} numberOfLines={1}>Mã: {item.patientCode}</Text>
          <Text style={styles.patientMeta}>Cập nhật: {item.updatedAt}</Text>
        </View>
        <View style={[styles.statusBadge, item.isWarning ? styles.badgeWarning : styles.badgeNormal]}>
          <Text style={[styles.statusBadgeText, item.isWarning ? styles.badgeTextWarning : styles.badgeTextNormal]}>
            {item.isWarning ? "Cảnh báo" : "Ổn định"}
          </Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.chatButton} onPress={() => onChat && onChat(item)} activeOpacity={0.7}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#7C3AED" />
          <Text style={styles.chatButtonText}>Nhắn tin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailButton} onPress={() => onDetail && onDetail(item)} activeOpacity={0.7}>
          <Text style={styles.detailButtonText}>Xem chi tiết</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(PatientCard);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius["2xl"], marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: colors.borderSoft, ...shadows.card },
  cardMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  avatarNormal: { backgroundColor: colors.surfaceSoftBlue },
  avatarWarning: { backgroundColor: colors.dangerSoftAlt },
  avatarText: { fontSize: 18, fontWeight: "700" },
  avatarTextNormal: { color: colors.primary },
  avatarTextWarning: { color: colors.danger },
  cardInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: "700", color: colors.text },
  patientCode: { fontSize: 12, color: colors.textHint, marginTop: 2 },
  patientMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  badgeNormal: { backgroundColor: colors.successBg },
  badgeWarning: { backgroundColor: colors.dangerSoftAlt },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  badgeTextNormal: { color: colors.success },
  badgeTextWarning: { color: colors.danger },
  cardDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 12 },
  cardActions: { flexDirection: "row", gap: 10 },
  chatButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 10, backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE" },
  chatButtonText: { fontSize: 12, fontWeight: "600", color: "#7C3AED" },
  detailButton: { flex: 1.2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, height: 36, borderRadius: 10, backgroundColor: colors.primary },
  detailButtonText: { fontSize: 12, fontWeight: "600", color: colors.surface },
});

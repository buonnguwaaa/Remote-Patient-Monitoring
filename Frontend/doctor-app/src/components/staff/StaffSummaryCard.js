import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function StaffSummaryCard({
  greeting,
  name,
  dateString,
  attentionCount,
  onPressAttention,
  onPressStable,
}) {
  const hasAttention = attentionCount > 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.textWrap}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.date}>{dateString}</Text>
        </View>
        <View style={styles.avatarWrap}>
          <Ionicons name="medkit" size={24} color="#2563EB" />
        </View>
      </View>

      {hasAttention ? (
        <TouchableOpacity
          style={[styles.statusBox, styles.statusBoxWarning]}
          onPress={onPressAttention}
          activeOpacity={0.7}
        >
          <View style={styles.statusContent}>
            <View style={[styles.iconWrap, { backgroundColor: "#FEF2F2" }]}>
              <Ionicons name="warning" size={18} color="#DC2626" />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusTitleWarning}>Cần chú ý</Text>
              <Text style={styles.statusSubWarning}>Có {attentionCount} bệnh nhân cần xử lý</Text>
            </View>
            <View style={styles.actionRow}>
              <Text style={[styles.actionText, { color: "#DC2626" }]}>Xem chi tiết</Text>
              <Ionicons name="chevron-forward" size={14} color="#DC2626" />
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.statusBox, styles.statusBoxSuccess]}
          onPress={onPressStable}
          activeOpacity={0.7}
        >
          <View style={styles.statusContent}>
            <View style={[styles.iconWrap, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusTitleSuccess}>Ổn định</Text>
              <Text style={styles.statusSubSuccess}>Tất cả bệnh nhân đang ổn định</Text>
            </View>
            <View style={styles.actionRow}>
              <Text style={[styles.actionText, { color: "#16A34A" }]}>Xem danh sách</Text>
              <Ionicons name="chevron-forward" size={14} color="#16A34A" />
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  textWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statusBoxWarning: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusBoxSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTitleWarning: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 2,
  },
  statusSubWarning: {
    fontSize: 12,
    color: "#B91C1C",
  },
  statusTitleSuccess: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  statusSubSuccess: {
    fontSize: 12,
    color: "#15803D",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

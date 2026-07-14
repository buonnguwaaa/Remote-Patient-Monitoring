import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { normalizeAlertSeverity } from "../../utils/alertSeverity";

function getInitials(name) {
  return (
    String(name || "")
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "BN"
  );
}

export function StaffAlertItem({ alert, onPress }) {
  const initials = getInitials(alert.patientName);
  const isHigh = normalizeAlertSeverity(alert.severity) === "high";
  const isResolved = alert.status === "ack";

  // Không dùng màu vàng để giả lập medium
  const severityColor = isHigh ? "#B91C1C" : "#1D4ED8";
  const severityBg = isHigh ? "#FEE2E2" : "#DBEAFE";
  const severityLabel = isHigh ? "Ưu tiên cao" : "Cần theo dõi";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: severityBg }]}>
            <Text style={[styles.avatarText, { color: severityColor }]}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.patientName} numberOfLines={1}>{alert.patientName || "Bệnh nhân"}</Text>
            <Text style={styles.timeText}>{alert.timeAgo || "Vừa xong"}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.chip, { backgroundColor: severityBg }]}>
            <Text style={[styles.chipText, { color: severityColor }]}>{severityLabel}</Text>
          </View>
          {isResolved ? (
            <View style={[styles.chip, { backgroundColor: "#DCFCE7", marginLeft: 6 }]}>
              <Text style={[styles.chipText, { color: "#16A34A" }]}>Đã xử lý</Text>
            </View>
          ) : (
            <View style={[styles.chip, { backgroundColor: "#FFEDD5", marginLeft: 6 }]}>
              <Text style={[styles.chipText, { color: "#C2410C" }]}>Chưa xử lý</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.detailText} numberOfLines={2}>
          {alert.detailText || "Có chỉ số bất thường"}
        </Text>
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>Chi tiết</Text>
          <Ionicons name="chevron-forward" size={14} color="#2563EB" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    paddingBottom: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  patientName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  timeText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  body: {
    paddingLeft: 44,
  },
  detailText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 2,
  },
  actionText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
});

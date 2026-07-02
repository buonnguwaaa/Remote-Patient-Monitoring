import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function PrescriptionStatsHeader({ stats }) {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Ionicons name="receipt-outline" size={20} color="#2563EB" />
        <Text style={styles.statNum}>{stats.total || 0}</Text>
        <Text style={styles.statLabel}>Tổng đơn</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="pulse-outline" size={20} color="#16A34A" />
        <Text style={styles.statNum}>{stats.active || 0}</Text>
        <Text style={styles.statLabel}>Đang dùng</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="warning-outline" size={20} color="#F59E0B" />
        <Text style={styles.statNum}>{stats.expiring || 0}</Text>
        <Text style={styles.statLabel}>Sắp hết</Text>
      </View>
      <View style={styles.statCard}>
        <Ionicons name="stop-circle-outline" size={20} color="#6B7280" />
        <Text style={styles.statNum}>{stats.stopped || 0}</Text>
        <Text style={styles.statLabel}>Đã dừng</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statNum: { fontSize: 16, fontWeight: "700", color: "#111827", marginVertical: 4 },
  statLabel: { fontSize: 10, color: "#6B7280", textAlign: "center" },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { normalizeAlertSeverity } from "../../../utils/alertSeverity";

export function AlertSummaryCard({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
        <Text style={styles.emptyText}>Bệnh nhân không có cảnh báo nào.</Text>
      </View>
    );
  }

  const renderAlert = (a) => {
    const isHigh = normalizeAlertSeverity(a.severity) === "high";
    const bg = isHigh ? "#FEF2F2" : "#EFF6FF";
    const border = isHigh ? "#FECACA" : "#BFDBFE";
    const color = isHigh ? "#DC2626" : "#1D4ED8";
    const label = isHigh ? "Ưu tiên cao" : "Cần theo dõi";

    return (
      <View
        key={a.id}
        style={[styles.card, { backgroundColor: bg, borderColor: border }]}
        accessibilityLabel={isHigh ? "Cảnh báo ưu tiên cao" : "Cảnh báo cần theo dõi"}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color }]}>{label}</Text>
          <Text style={styles.time}>{new Date(a.createdAt).toLocaleString("vi-VN")}</Text>
        </View>
        <View style={styles.body}>
          {a.violations?.map((v, i) => (
            <Text key={i} style={styles.text}>
              • {v.metric}: Đo {typeof v.observed === "number" ? Math.round(v.observed * 10) / 10 : v.observed} (Ngưỡng: {typeof v.threshold === "number" ? Math.round(v.threshold * 10) / 10 : v.threshold})
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return <View style={styles.container}>{alerts.map(renderAlert)}</View>;
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  empty: { alignItems: "center", padding: 40, gap: 8 },
  emptyText: { color: "#6B7280", fontSize: 14, fontWeight: "500" },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  title: { fontSize: 14, fontWeight: "700" },
  time: { fontSize: 12, color: "#6B7280" },
  body: { paddingLeft: 4 },
  text: { fontSize: 13, color: "#374151", marginBottom: 4 },
});

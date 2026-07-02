import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function AlertSummaryCard({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="checkmark-circle" size={40} color="#16A34A" />
        <Text style={styles.emptyText}>Bệnh nhân không có cảnh báo mở.</Text>
      </View>
    );
  }

  const renderAlert = (a) => {
    const isHigh = a.severity === "high";
    const bg = isHigh ? "#FEF2F2" : "#FFF7ED";
    const border = isHigh ? "#FECACA" : "#FED7AA";
    const color = isHigh ? "#DC2626" : "#EA580C";

    return (
      <View key={a.id} style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color }]}>Mức độ: {isHigh ? "Cao" : "Trung bình"}</Text>
          <Text style={styles.time}>{new Date(a.createdAt).toLocaleString("vi-VN")}</Text>
        </View>
        <View style={styles.body}>
          {a.violations?.map((v, i) => (
            <Text key={i} style={styles.text}>
              • {v.metric}: Đo {v.observed} (Ngưỡng: {v.threshold})
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

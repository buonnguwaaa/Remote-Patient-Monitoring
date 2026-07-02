import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function PrescriptionShortList({ prescriptions, onNavigate }) {
  if (!prescriptions || prescriptions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="receipt" size={32} color="#D1D5DB" />
        <Text style={styles.emptyText}>Chưa có đơn thuốc nào đang điều trị.</Text>
        <TouchableOpacity style={styles.btn} onPress={onNavigate}>
          <Text style={styles.btnText}>Kê đơn mới</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {prescriptions.map(p => (
        <View key={p.id} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.date}>Từ {new Date(p.startDate).toLocaleDateString("vi-VN")}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>Đang dùng</Text></View>
          </View>
          {p.medications?.slice(0, 3).map((m, i) => (
            <Text key={i} style={styles.med}>• {m.drugName} ({m.dosage})</Text>
          ))}
          {p.medications?.length > 3 && <Text style={styles.more}>...và {p.medications.length - 3} thuốc khác</Text>}
        </View>
      ))}
      <TouchableOpacity style={styles.fullBtn} onPress={onNavigate}>
        <Text style={styles.fullBtnText}>Xem toàn bộ đơn thuốc</Text>
        <Ionicons name="arrow-forward" size={16} color="#2563EB" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  empty: { alignItems: "center", padding: 40, gap: 12 },
  emptyText: { color: "#6B7280", fontSize: 14 },
  btn: { backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnText: { color: "#FFF", fontWeight: "600" },
  card: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 16, marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  date: { fontSize: 13, fontWeight: "600", color: "#374151" },
  badge: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, color: "#16A34A", fontWeight: "700" },
  med: { fontSize: 13, color: "#4B5563", marginBottom: 4 },
  more: { fontSize: 12, color: "#9CA3AF", fontStyle: "italic", marginTop: 4 },
  fullBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 12 },
  fullBtnText: { color: "#2563EB", fontWeight: "600", fontSize: 14 },
});

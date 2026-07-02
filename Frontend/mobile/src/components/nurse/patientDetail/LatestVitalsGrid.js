import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { evaluateVitalStatus } from "./thresholdHelpers";

function VitalMiniCard({ icon, label, value, unit, status }) {
  const isAbnormal = status === "low" || status === "high";
  const bg = isAbnormal ? "#FEF2F2" : value == null ? "#F9FAFB" : "#F0FDF4";
  const border = isAbnormal ? "#FECACA" : value == null ? "#F3F4F6" : "#BBF7D0";
  const iconColor = isAbnormal ? "#DC2626" : value == null ? "#9CA3AF" : "#16A34A";
  const textColor = value == null ? "#9CA3AF" : "#111827";

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={16} color={iconColor} />
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardValue, { color: textColor }]}>{value != null ? value : "--"}</Text>
        <Text style={styles.cardUnit}>{unit}</Text>
      </View>
      {isAbnormal && (
        <Text style={styles.statusText}>{status === "high" ? "Cao hơn ngưỡng" : "Thấp hơn ngưỡng"}</Text>
      )}
    </View>
  );
}

export function LatestVitalsGrid({ measurement, threshold }) {
  if (!measurement) {
    return (
      <View style={styles.emptyGrid}>
        <Ionicons name="pulse" size={24} color="#D1D5DB" />
        <Text style={styles.emptyText}>Chưa có kết quả đo nào.</Text>
      </View>
    );
  }

  const bpStatus = () => {
    if (!measurement.bloodPressure) return "none";
    const sys = evaluateVitalStatus(measurement.bloodPressure.systolic, "systolic", threshold);
    const dia = evaluateVitalStatus(measurement.bloodPressure.diastolic, "diastolic", threshold);
    if (sys === "high" || dia === "high") return "high";
    if (sys === "low" || dia === "low") return "low";
    return "normal";
  };

  return (
    <View style={styles.grid}>
      <VitalMiniCard 
        icon="heart" label="Huyết áp" unit="mmHg"
        value={measurement.bloodPressure?.systolic ? `${measurement.bloodPressure.systolic}/${measurement.bloodPressure.diastolic || "--"}` : null}
        status={bpStatus()}
      />
      <VitalMiniCard 
        icon="pulse" label="Nhịp tim" unit="bpm"
        value={measurement.heartRate}
        status={evaluateVitalStatus(measurement.heartRate, "heartRate", threshold)}
      />
      <VitalMiniCard 
        icon="water" label="Đường huyết" unit="mg/dL"
        value={measurement.glucose}
        status={evaluateVitalStatus(measurement.glucose, "glucose", threshold)}
      />
      <VitalMiniCard 
        icon="medical" label="SpO2" unit="%"
        value={measurement.spo2}
        status={evaluateVitalStatus(measurement.spo2, "spo2", threshold)}
      />
      <VitalMiniCard 
        icon="thermometer" label="Nhiệt độ" unit="°C"
        value={measurement.temperature}
        status={evaluateVitalStatus(measurement.temperature, "temperature", threshold)}
      />
      <VitalMiniCard 
        icon="leaf" label="Nhịp thở" unit="lần/phút"
        value={measurement.respiratoryRate}
        status={evaluateVitalStatus(measurement.respiratoryRate, "respiratoryRate", threshold)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  card: { flexBasis: "48%", borderWidth: 1, borderRadius: 12, padding: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  cardLabel: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  cardBody: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  cardValue: { fontSize: 20, fontWeight: "700" },
  cardUnit: { fontSize: 12, color: "#6B7280" },
  statusText: { fontSize: 11, color: "#DC2626", fontWeight: "600", marginTop: 4 },
  emptyGrid: { padding: 32, alignItems: "center", gap: 8 },
  emptyText: { color: "#9CA3AF", fontSize: 14 },
});

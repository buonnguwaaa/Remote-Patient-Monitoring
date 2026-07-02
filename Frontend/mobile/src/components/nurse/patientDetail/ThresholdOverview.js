import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function ThresholdCard({ label, min, max, unit, icon, color }) {
  const empty = min == null && max == null;
  return (
    <View style={styles.cardItem}>
      <View style={[styles.iconBox, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardLabel}>{label}</Text>
        {empty ? (
          <Text style={styles.cardEmpty}>Chưa thiết lập</Text>
        ) : (
          <Text style={styles.cardValue}>
            {min != null && max != null 
              ? `${min} - ${max} ` 
              : min != null 
                ? `≥ ${min} ` 
                : `≤ ${max} `}
            <Text style={styles.cardUnit}>{unit}</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

export function ThresholdOverview({ threshold }) {
  if (!threshold) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="options" size={32} color="#D1D5DB" />
        <Text style={styles.emptyText}>Chưa có ngưỡng nào được thiết lập.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Huyết áp</Text>
      <View style={styles.grid}>
        <ThresholdCard label="Tâm thu" min={threshold.systolicMin} max={threshold.systolicMax} unit="mmHg" icon="water" color="#3B82F6" />
        <ThresholdCard label="Tâm trương" min={threshold.diastolicMin} max={threshold.diastolicMax} unit="mmHg" icon="water-outline" color="#0EA5E9" />
      </View>

      <Text style={styles.sectionTitle}>Sinh hiệu khác</Text>
      <View style={styles.grid}>
        <ThresholdCard label="Nhịp tim" min={threshold.heartRateMin} max={threshold.heartRateMax} unit="bpm" icon="heart" color="#EF4444" />
        <ThresholdCard label="Nhiệt độ" min={threshold.temperatureMin} max={threshold.temperatureMax} unit="°C" icon="thermometer" color="#F97316" />
        <ThresholdCard label="Đường huyết" min={threshold.glucoseMin} max={threshold.glucoseMax} unit="mg/dL" icon="beaker" color="#8B5CF6" />
        <ThresholdCard label="SpO2 tối thiểu" min={threshold.spo2Min} max={null} unit="%" icon="leaf" color="#10B981" />
        <ThresholdCard label="Nhịp thở" min={threshold.respiratoryRateMin} max={threshold.respiratoryRateMax} unit="l/p" icon="fitness" color="#14B8A6" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  emptyState: { alignItems: "center", padding: 40, gap: 8 },
  emptyText: { color: "#9CA3AF" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 8, marginBottom: 12, marginLeft: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 8 },
  cardItem: { 
    width: "48%", 
    backgroundColor: "#FFFFFF", 
    borderRadius: 16, 
    padding: 14, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  cardContent: { gap: 4 },
  cardLabel: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  cardValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardUnit: { fontSize: 12, fontWeight: "500", color: "#9CA3AF" },
  cardEmpty: { fontSize: 13, fontStyle: "italic", color: "#9CA3AF" },
});

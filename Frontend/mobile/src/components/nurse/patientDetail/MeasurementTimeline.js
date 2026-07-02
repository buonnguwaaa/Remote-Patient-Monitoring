import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isMeasurementAbnormal } from "./thresholdHelpers";

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Hôm nay";
  today.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function TimelineCard({ measurement, threshold }) {
  const isAbn = isMeasurementAbnormal(measurement, threshold);

  const renderChip = (label, val, unit) => {
    if (val == null) return null;
    return (
      <View style={styles.chip}>
        <Text style={styles.chipLabel}>{label}:</Text>
        <Text style={styles.chipVal}>{val} {unit}</Text>
      </View>
    );
  };

  return (
    <View style={styles.tlCard}>
      <View style={styles.tlHeader}>
        <Text style={styles.tlTime}>{formatTime(measurement.createdAt)}</Text>
        <View style={[styles.abnBadge, { backgroundColor: isAbn ? "#FEE2E2" : "#DCFCE7" }]}>
          <Text style={[styles.abnText, { color: isAbn ? "#DC2626" : "#16A34A" }]}>
            {isAbn ? "Bất thường" : "Bình thường"}
          </Text>
        </View>
      </View>
      <View style={styles.tlBody}>
        {measurement.bloodPressure?.systolic ? renderChip("HA", `${measurement.bloodPressure.systolic}/${measurement.bloodPressure.diastolic || "--"}`, "mmHg") : null}
        {renderChip("Nhịp tim", measurement.heartRate, "bpm")}
        {renderChip("SpO2", measurement.spo2, "%")}
        {renderChip("Đường huyết", measurement.glucose, "mg/dL")}
        {renderChip("Nhiệt độ", measurement.temperature, "°C")}
        {renderChip("Nhịp thở", measurement.respiratoryRate, "l/p")}
      </View>
      {(measurement.device || measurement.note) && (
        <View style={styles.tlFooter}>
          {measurement.device ? <Text style={styles.footerText}>TB: {measurement.device}</Text> : null}
          {measurement.note ? <Text style={styles.footerText}>Ghi chú: {measurement.note}</Text> : null}
        </View>
      )}
    </View>
  );
}

export function MeasurementTimeline({ measurements, threshold }) {
  const [filterDays, setFilterDays] = useState(7);
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);

  const grouped = useMemo(() => {
    let list = measurements;
    if (filterDays !== "all") {
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - filterDays);
      list = list.filter(m => new Date(m.createdAt) >= limitDate);
    }
    if (onlyAbnormal) {
      list = list.filter(m => isMeasurementAbnormal(m, threshold));
    }

    const groups = {};
    list.forEach(m => {
      const d = new Date(m.createdAt).toISOString().split("T")[0];
      if (!groups[d]) groups[d] = [];
      groups[d].push(m);
    });
    
    return Object.entries(groups).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [measurements, filterDays, onlyAbnormal, threshold]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <View style={styles.daysFilter}>
          {[7, 30, "all"].map(d => (
            <TouchableOpacity 
              key={d} 
              style={[styles.filterBtn, filterDays === d && styles.filterBtnActive]}
              onPress={() => setFilterDays(d)}
            >
              <Text style={[styles.filterBtnText, filterDays === d && styles.filterBtnTextActive]}>
                {d === "all" ? "Tất cả" : `${d} ngày`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity 
          style={[styles.abnToggle, onlyAbnormal && styles.abnToggleActive]}
          onPress={() => setOnlyAbnormal(!onlyAbnormal)}
        >
          <Ionicons name="warning" size={14} color={onlyAbnormal ? "#DC2626" : "#6B7280"} />
          <Text style={[styles.abnToggleText, onlyAbnormal && { color: "#DC2626" }]}>Chỉ bất thường</Text>
        </TouchableOpacity>
      </View>

      {grouped.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>Không có dữ liệu phù hợp.</Text>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {grouped.map(([date, msList]) => (
            <View key={date} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <View style={styles.dayDot} />
                <Text style={styles.dayText}>{formatDateDisplay(date)}</Text>
              </View>
              <View style={styles.dayBody}>
                {msList.map(m => <TimelineCard key={m.id} measurement={m} threshold={threshold} />)}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  daysFilter: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 8, padding: 2 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  filterBtnActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  filterBtnText: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  filterBtnTextActive: { color: "#111827" },
  abnToggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF" },
  abnToggleActive: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  abnToggleText: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  emptyState: { alignItems: "center", padding: 40, gap: 8 },
  emptyText: { color: "#9CA3AF", fontSize: 14 },
  
  dayGroup: { marginBottom: 16 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  dayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2563EB" },
  dayText: { fontSize: 15, fontWeight: "700", color: "#111827" },
  dayBody: { borderLeftWidth: 2, borderLeftColor: "#E5E7EB", marginLeft: 4, paddingLeft: 16 },
  
  tlCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#F3F4F6", shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  tlHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tlTime: { fontSize: 13, fontWeight: "700", color: "#4B5563" },
  abnBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  abnText: { fontSize: 11, fontWeight: "700" },
  tlBody: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  chipLabel: { fontSize: 12, color: "#6B7280" },
  chipVal: { fontSize: 12, fontWeight: "600", color: "#111827" },
  tlFooter: { borderTopWidth: 1, borderTopColor: "#F3F4F6", marginTop: 8, paddingTop: 8, gap: 2 },
  footerText: { fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },
});

import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function formatRelativeTime(iso) {
  if (!iso) return "Chưa có dữ liệu";
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "Chưa có dữ liệu";
  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${Math.round(diffHours / 24)} ngày trước`;
}

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

function MetricPill({ icon, label, value, unit, color = "#4B5563", isWarning = false }) {
  if (value == null || value === "") return null;
  let displayValue = value;
  if (typeof value === "number") {
    displayValue = Math.round(value * 10) / 10;
  }
  return (
    <View style={[styles.metricPill, isWarning && styles.metricPillWarning]}>
      <Ionicons name={icon} size={14} color={isWarning ? "#DC2626" : color} />
      <Text style={[styles.metricLabel, isWarning && styles.metricLabelWarning]}>{label}</Text>
      <Text style={[styles.metricValue, isWarning && styles.metricValueWarning]}>{displayValue}</Text>
      {unit && <Text style={[styles.metricUnit, isWarning && styles.metricUnitWarning]}>{unit}</Text>}
    </View>
  );
}

const NursePatientCard = memo(({ patient, onPress }) => {
  const initials = getInitials(patient?.user?.name);
  const highAlert = patient?.alertsSummary?.high || 0;
  const mediumAlert = patient?.alertsSummary?.medium || 0;
  const lowAlert = patient?.alertsSummary?.low || 0;
  const totalAlerts = highAlert + mediumAlert + lowAlert;

  const hasHighAlert = highAlert > 0;
  const hasAlert = totalAlerts > 0;

  const cardStyle = hasHighAlert ? styles.cardHigh : styles.cardNormal;
  
  return (
    <TouchableOpacity
      style={[styles.card, cardStyle]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, hasHighAlert ? styles.avatarHigh : styles.avatarNormal]}>
            <Text style={[styles.avatarText, hasHighAlert && { color: "#DC2626" }]}>{initials}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{patient?.user?.name}</Text>
            <Text style={styles.code}>{patient?.patientCode ? `Mã: ${patient.patientCode}` : "Chưa có mã"}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {hasHighAlert ? (
            <View style={styles.badgeHigh}>
              <Text style={styles.badgeHighText}>Nghiêm trọng</Text>
            </View>
          ) : hasAlert ? (
            <View style={styles.badgeMedium}>
              <Text style={styles.badgeMediumText}>{totalAlerts} cảnh báo</Text>
            </View>
          ) : (
            <View style={styles.badgeNormal}>
              <Text style={styles.badgeNormalText}>Ổn định</Text>
            </View>
          )}
        </View>
      </View>

      {patient?.lastMeasurementAt ? (
        <View style={styles.body}>
          <MetricPill 
            icon="heart" 
            label="HA" 
            value={patient.lastMeasurements.bp?.systolic ? `${patient.lastMeasurements.bp.systolic}/${patient.lastMeasurements.bp.diastolic}` : null} 
            color="#EF4444" 
          />
          <MetricPill 
            icon="pulse" 
            label="Nhịp tim" 
            value={patient.lastMeasurements.heartRate?.value || patient.lastMeasurements.bp?.pulse} 
            color="#EAB308" 
          />
          <MetricPill 
            icon="medical" 
            label="SpO2" 
            value={patient.lastMeasurements.spo2?.value} 
            color="#06B6D4" 
          />
          <MetricPill 
            icon="thermometer" 
            label="Nhiệt độ" 
            value={patient.lastMeasurements.temp?.value} 
            color="#F97316" 
          />
        </View>
      ) : (
        <View style={styles.emptyBody}>
          <Ionicons name="document-text-outline" size={16} color="#9CA3AF" />
          <Text style={styles.emptyBodyText}>Chưa có dữ liệu đo đạc</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.timeText}>
          Đo gần nhất: {formatRelativeTime(patient?.lastMeasurementAt)}
        </Text>
        <View style={styles.footerRight}>
          {hasAlert && (
            <View style={styles.alertCount}>
              <Ionicons name="notifications" size={14} color="#DC2626" />
              <Text style={styles.alertCountText}>{totalAlerts} cảnh báo</Text>
            </View>
          )}
          <View style={styles.chevronBtn}>
            <Text style={styles.chevronText}>Hồ sơ</Text>
            <Ionicons name="chevron-forward" size={16} color="#2563EB" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  cardNormal: { borderColor: "#E5E7EB" },
  cardHigh: { borderColor: "#FECACA", backgroundColor: "#FEF2F2", borderLeftWidth: 4, borderLeftColor: "#DC2626" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarNormal: { backgroundColor: "#DBEAFE" },
  avatarHigh: { backgroundColor: "#FEE2E2" },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#1D4ED8" },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 2 },
  code: { fontSize: 12, color: "#6B7280" },
  
  headerRight: { marginLeft: 8 },
  badgeNormal: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeNormalText: { color: "#16A34A", fontSize: 11, fontWeight: "700" },
  badgeMedium: { backgroundColor: "#FEF08A", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeMediumText: { color: "#A16207", fontSize: 11, fontWeight: "700" },
  badgeHigh: { backgroundColor: "#DC2626", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeHighText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

  body: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 16 },
  metricPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, gap: 4, borderWidth: 1, borderColor: "#F3F4F6", flexBasis: "48%" },
  metricLabel: { fontSize: 12, color: "#6B7280" },
  metricValue: { fontSize: 13, fontWeight: "700", color: "#111827" },
  metricUnit: { fontSize: 11, color: "#9CA3AF" },
  
  emptyBody: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 16, backgroundColor: "#F9FAFB", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed", justifyContent: "center" },
  emptyBodyText: { fontSize: 13, color: "#6B7280" },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12 },
  timeText: { fontSize: 12, color: "#6B7280", fontStyle: "italic" },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  alertCount: { flexDirection: "row", alignItems: "center", gap: 4 },
  alertCountText: { fontSize: 12, color: "#DC2626", fontWeight: "600" },
  chevronBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  chevronText: { fontSize: 13, color: "#2563EB", fontWeight: "600" },
});

export default NursePatientCard;

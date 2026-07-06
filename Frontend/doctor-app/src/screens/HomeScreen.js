import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getMyPatients, getAlerts } from "../api/patientApi";
import { colors, radius, spacing, typography, shadows, cards } from "../theme/rpmTheme";

function isAttentionAlert(alert) {
  return (alert.severity === "high" || alert.severity === "medium") && alert.status === "open";
}

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}p`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

const VIOLATION_LABEL = {
  temperature: "Nhiệt độ",
  heart_rate: "Nhịp tim",
  respiratory_rate: "Nhịp thở",
  spo2: "SpO2",
  blood_pressure_systolic: "HA tâm thu",
  blood_pressure_diastolic: "HA tâm trương",
  glucose: "Đường huyết",
};

const QUICK_ACTIONS = [
  { label: "Cấu hình ngưỡng",    icon: "options-outline",                color: "#2563EB", screen: "Thresholds" },
  { label: "Nhắc nhở",           icon: "alarm-outline",                  color: "#D97706", screen: "Reminders" },
  { label: "Tuân thủ thuốc",     icon: "checkmark-done-circle-outline",  color: "#16A34A", screen: "Compliance" },
  { label: "Đơn thuốc",          icon: "document-text-outline",          color: "#7C3AED", screen: "Prescriptions" },
];

export default function HomeScreen({ onNavigate }) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [assignments, setAssignments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [patientsRes, alertsRes] = await Promise.all([
        getMyPatients(),
        getAlerts({ limit: 50, sortOrder: "desc" }),
      ]);
      setAssignments(patientsRes.ok ? (patientsRes.body?.data || []) : []);
      setAlerts(alertsRes.ok ? (alertsRes.body?.data || []) : []);
    } catch {
      setError("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("NEW_ALERT", () => {
      loadData();
    });
    return () => sub.remove();
  }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const patientIds = new Set(assignments.map((a) => a.patientId));
  const myAlerts = alerts.filter((a) => patientIds.has(a.patientId));

  const latestByPatient = new Map();
  [...myAlerts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((a) => { if (!latestByPatient.has(a.patientId)) latestByPatient.set(a.patientId, a); });

  const attentionAlerts = [...latestByPatient.values()].filter(isAttentionAlert);
  const attention = attentionAlerts.length;
  const total = assignments.length;
  const stable = Math.max(total - attention, 0);

  const recentAlerts = [...myAlerts]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  const TAB_MAP = {
    Patients: "PatientsTab",
    Alerts: "AlertsTab",
    Chat: "ChatTab",
    Thresholds: "Thresholds",
    Reminders: "Reminders",
    Compliance: "Compliance",
    Prescriptions: "Prescriptions",
    Settings: "Settings",
  };

  const handleNavigate = (screen) => {
    if (onNavigate) {
      onNavigate(screen);
    } else {
      const mapped = TAB_MAP[screen];
      if (Array.isArray(mapped)) {
        navigation.navigate(mapped[0], { screen: mapped[1] });
      } else if (mapped) {
        navigation.navigate(mapped);
      } else {
        navigation.navigate(screen);
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Greeting card */}
      <View style={styles.greetingCard}>
        <View style={styles.greetingHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingHello}>{greeting} 👋</Text>
            <Text style={styles.greetingName}>{user?.name || user?.username || "Bác sĩ"}</Text>
            <Text style={styles.greetingDate}>
              {now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
            </Text>
          </View>
          <View style={styles.greetingAvatar}>
            <Ionicons name="medkit" size={24} color={colors.primary} />
          </View>
        </View>
        {attention > 0 ? (
          <View style={styles.greetingAlertBox}>
            <Ionicons name="warning" size={16} color={colors.danger} />
            <Text style={styles.greetingAlertText}>Có {attention} bệnh nhân cần chú ý</Text>
          </View>
        ) : (
          <View style={[styles.greetingAlertBox, { backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.greetingAlertText, { color: colors.success }]}>Tất cả bệnh nhân đang ổn định</Text>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* KPI row */}
      <View style={styles.kpiRow}>
        {[
          { label: "Bệnh nhân", value: loading ? "…" : total,     icon: "people-outline",            color: "#2563EB", screen: "Patients" },
          { label: "Ổn định",   value: loading ? "…" : stable,    icon: "checkmark-circle-outline",  color: "#16A34A", screen: "Patients" },
          { label: "Cần chú ý", value: loading ? "…" : attention, icon: "warning-outline",           color: "#DC2626", screen: "Alerts" },
        ].map((k) => (
          <TouchableOpacity
            key={k.label}
            style={[styles.kpiCard, { borderLeftColor: k.color }]}
            onPress={() => handleNavigate(k.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.kpiIconWrap, { backgroundColor: k.color + "12" }]}>
              <Ionicons name={k.icon} size={15} color={k.color} />
            </View>
            <Text style={styles.kpiValue}>{k.value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={styles.quickCard}
            onPress={() => handleNavigate(a.screen)}
            activeOpacity={0.75}
          >
            <View style={[styles.quickIcon, { backgroundColor: a.color + "12" }]}>
              <Ionicons name={a.icon} size={22} color={a.color} />
            </View>
            <Text style={styles.quickLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent alerts */}
      <Text style={styles.sectionTitle}>Cảnh báo gần đây</Text>
      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
        ) : recentAlerts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#16A34A" />
            <Text style={styles.emptyText}>Không có cảnh báo</Text>
          </View>
        ) : (
          recentAlerts.map((alert, idx) => {
            const isHigh = alert.severity === "high";
            const isMedium = alert.severity === "medium";
            return (
              <TouchableOpacity
                key={alert.id}
                style={[styles.alertRow, idx < recentAlerts.length - 1 && styles.rowBorder]}
                onPress={() => handleNavigate("Alerts")}
                activeOpacity={0.7}
              >
                <View style={[styles.alertIcon, { backgroundColor: isHigh ? "#FEF2F2" : isMedium ? "#FFFBEB" : "#EFF6FF" }]}>
                  <Ionicons
                    name={isHigh ? "warning-outline" : isMedium ? "warning-outline" : "information-circle-outline"}
                    size={16}
                    color={isHigh ? "#DC2626" : isMedium ? "#D97706" : "#2563EB"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.alertTopRow}>
                    <Text style={styles.alertPatient} numberOfLines={1}>
                      {alert.patientName || "Bệnh nhân"}
                    </Text>
                    <Text style={styles.alertTime}>{timeAgo(alert.createdAt)}</Text>
                  </View>
                  <Text style={styles.alertDetail} numberOfLines={1}>
                    {alert.violations?.map((v) => `${VIOLATION_LABEL[v.type] ?? v.type}: ${v.observed}`).join(" · ")}
                  </Text>
                </View>
                <View style={[styles.alertDot, { backgroundColor: alert.status === "ack" ? "#16A34A" : "#DC2626" }]} />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.screen },
  // Greeting card (matches patient HomeScreen greetingCard)
  greetingCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius["2xl"],
    marginBottom: spacing.lg,
    ...shadows.cardElevated,
  },
  greetingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  greetingHello: { fontSize: 14, color: colors.textSecondary },
  greetingName: { ...typography.screenTitle, marginTop: 2 },
  greetingDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  greetingAvatar: { width: 48, height: 48, backgroundColor: colors.surfaceSoftBlue, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  greetingAlertBox: { flexDirection: "row", alignItems: "center", backgroundColor: colors.dangerSoftAlt, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.dangerBorder, gap: 8 },
  greetingAlertText: { fontSize: 13, fontWeight: "600", color: colors.danger, flex: 1 },
  // Error
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.dangerSoftAlt, borderRadius: radius.md, padding: 14, marginBottom: spacing.lg },
  errorText: { flex: 1, fontSize: 13, color: colors.danger },
  retryText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  // KPI row
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: spacing.section },
  kpiCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 12, alignItems: "flex-start", borderLeftWidth: 4, ...shadows.card },
  kpiIconWrap: { width: 28, height: 28, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  kpiValue: { fontSize: 20, fontWeight: "800", color: colors.text },
  kpiLabel: { ...typography.hint, fontWeight: "600", marginTop: 2 },
  // Quick actions
  quickRow: { flexDirection: "row", gap: 10, marginBottom: spacing.section },
  quickCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 12, alignItems: "center", borderWidth: 1, borderColor: colors.borderSoft, ...shadows.card },
  quickIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quickLabel: { fontSize: 11, fontWeight: "600", color: colors.textHint, textAlign: "center" },
  // Section
  sectionTitle: { ...typography.cardTitle, marginBottom: 12 },
  // Alert card
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden", marginBottom: spacing.section, borderWidth: 1, borderColor: colors.borderSoft, ...shadows.card },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  emptyBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { ...typography.caption },
  alertRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  alertIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  alertTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertPatient: { fontSize: 13, fontWeight: "600", color: colors.text, flex: 1, marginRight: 8 },
  alertTime: { ...typography.hint },
  alertDetail: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  alertDot: { width: 7, height: 7, borderRadius: 4 },
});

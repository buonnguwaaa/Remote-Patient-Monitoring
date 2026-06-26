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
  { label: "Bệnh nhân",  icon: "people-outline",              color: "#2563EB", screen: "Patients" },
  { label: "Cảnh báo",  icon: "warning-outline",             color: "#DC2626", screen: "Alerts" },
  { label: "Tin nhắn",  icon: "chatbubble-ellipses-outline",  color: "#7C3AED", screen: "Chat" },
  { label: "Nhắc nhở",  icon: "alarm-outline",               color: "#D97706", screen: "Reminders" },
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

  const handleNavigate = (screen) => {
    if (onNavigate) {
      onNavigate(screen);
    } else {
      navigation.navigate(screen);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
    >
      {/* Greeting banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerGreeting}>{greeting},</Text>
          <Text style={styles.bannerName}>{user?.name || user?.username || "Bác sĩ"}</Text>
          <Text style={styles.bannerDate}>
            {now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
          </Text>
        </View>
        <View style={styles.bannerIcon}>
          <Ionicons name="pulse-outline" size={30} color="#fff" />
        </View>
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
          <ActivityIndicator color="#2563EB" style={{ padding: 20 }} />
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
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  banner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E3A8A",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bannerGreeting: { fontSize: 13, color: "#93C5FD", fontWeight: "500" },
  bannerName: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 2 },
  bannerDate: { fontSize: 12, color: "#BFDBFE", marginTop: 4 },
  bannerIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: "#DC2626" },
  retryText: { fontSize: 13, color: "#2563EB", fontWeight: "600" },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "flex-start",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  kpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kpiValue: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  kpiLabel: { fontSize: 11, fontWeight: "600", color: "#6B7280", marginTop: 2 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  quickCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickLabel: { fontSize: 11, fontWeight: "600", color: "#4B5563", textAlign: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  emptyBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: "#6B7280" },
  alertRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  alertIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  alertTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertPatient: { fontSize: 13, fontWeight: "600", color: "#1E293B", flex: 1, marginRight: 8 },
  alertTime: { fontSize: 11, color: "#9CA3AF" },
  alertDetail: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  alertDot: { width: 7, height: 7, borderRadius: 4 },
});

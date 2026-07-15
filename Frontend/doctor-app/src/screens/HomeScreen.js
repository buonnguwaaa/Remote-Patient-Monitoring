import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter,
  TouchableOpacity,
  Text
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getMyPatients, getAlerts } from "../api/patientApi";
import { normalizeAlerts, normalizeAlertSeverity } from "../utils/alertSeverity";

import { StaffScreenContainer } from "../components/staff/StaffScreenContainer";
import { StaffSummaryCard } from "../components/staff/StaffSummaryCard";
import { StaffStatCard } from "../components/staff/StaffStatCard";
import { StaffQuickActionCard } from "../components/staff/StaffQuickActionCard";
import { StaffSectionHeader } from "../components/staff/StaffSectionHeader";
import { StaffAlertItem } from "../components/staff/StaffAlertItem";
import { StaffEmptyState } from "../components/staff/StaffEmptyState";

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins || 1} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

const VIOLATION_LABEL = {
  temperature: "Nhiệt độ",
  heart_rate: "Nhịp tim",
  heartRate: "Nhịp tim",
  respiratory_rate: "Nhịp thở",
  respiratoryRate: "Nhịp thở",
  spo2: "SpO2",
  spO2: "SpO2",
  blood_pressure_systolic: "HA tâm thu",
  bloodPressureSystolic: "HA tâm thu",
  blood_pressure_diastolic: "HA tâm trương",
  bloodPressureDiastolic: "HA tâm trương",
  glucose: "Đường huyết",
};

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
      // Normalize severity ngay tại đây để hỗ trợ dữ liệu legacy
      const rawAlerts = alertsRes.ok ? (alertsRes.body?.data || []) : [];
      setAlerts(normalizeAlerts(rawAlerts));
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

  const handleNavigate = useCallback((screen) => {
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
  }, [onNavigate, navigation]);

  const patientIds = useMemo(() => new Set(assignments.map((a) => a.patientId)), [assignments]);
  const myAlerts = useMemo(() => alerts.filter((a) => patientIds.has(a.patientId)), [alerts, patientIds]);

  // high > info > none; bệnh nhân với high open thì vào "Ưu tiên cao", chỉ info thì vào "Cần theo dõi"
  const { attention, needsMonitoring, stable, total } = useMemo(() => {
    const highPriorityPatients = new Set();
    const monitoringPatients = new Set();
    myAlerts.forEach((a) => {
      if (a.status !== "open") return;
      const sev = normalizeAlertSeverity(a.severity);
      if (sev === "high") {
        highPriorityPatients.add(a.patientId);
      } else {
        monitoringPatients.add(a.patientId);
      }
    });
    // Bệnh nhân có high không đếm vào monitoring
    monitoringPatients.forEach((pid) => {
      if (highPriorityPatients.has(pid)) monitoringPatients.delete(pid);
    });
    const highCount = highPriorityPatients.size;
    const monitorCount = monitoringPatients.size;
    const totalCount = assignments.length;
    const stableCount = Math.max(totalCount - highCount - monitorCount, 0);
    return {
      attention: highCount,
      needsMonitoring: monitorCount,
      total: totalCount,
      stable: stableCount,
    };
  }, [myAlerts, assignments]);

  const recentAlerts = useMemo(() => {
    return [...myAlerts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [myAlerts]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const dateString = now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  const QUICK_ACTIONS = useMemo(() => [
    { label: "Cấu hình ngưỡng", subtitle: "Thiết lập chỉ số", icon: "options-outline", color: "#2563EB", onPress: () => handleNavigate("Thresholds") },
    { label: "Nhắc nhở", subtitle: "Lịch chăm sóc", icon: "alarm-outline", color: "#D97706", onPress: () => handleNavigate("Reminders") },
    { label: "Tuân thủ thuốc", subtitle: "Theo dõi dùng thuốc", icon: "checkmark-done-circle-outline", color: "#16A34A", onPress: () => handleNavigate("Compliance") },
    { label: "Đơn thuốc", subtitle: "Quản lý kê đơn", icon: "document-text-outline", color: "#7C3AED", onPress: () => handleNavigate("Prescriptions") },
  ], [handleNavigate]);

  const statItems = useMemo(() => [
    { label: "Tổng BN", value: loading ? "…" : total, subtitle: "Đang theo dõi", icon: "people", color: "#3B82F6", onPress: () => handleNavigate("Patients") },
    { label: "Ưu tiên cao", value: loading ? "…" : attention, subtitle: "Cần xử lý ngay", icon: "warning", color: "#EF4444", onPress: () => handleNavigate("Alerts") },
    { label: "Cần theo dõi", value: loading ? "…" : needsMonitoring, subtitle: "Có alert info", icon: "information-circle", color: "#2563EB", onPress: () => handleNavigate("Alerts") },
    { label: "Ổn định", value: loading ? "…" : stable, subtitle: total > 0 ? `${Math.round((stable / total) * 100)}%` : "0%", icon: "checkmark-circle", color: "#10B981", onPress: () => handleNavigate("Patients") },
  ], [loading, total, attention, needsMonitoring, stable, handleNavigate]);

  return (
    <StaffScreenContainer style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <StaffSummaryCard
          greeting={greeting}
          name={user?.name || user?.username || "Bác sĩ"}
          dateString={dateString}
          attentionCount={attention}
          onPressAttention={() => handleNavigate("Alerts")}
          onPressStable={() => handleNavigate("Patients")}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadData}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ marginTop: 24 }}>
          <StaffStatCard items={statItems} />
        </View>

        <View style={{ marginTop: 8 }}>
          <StaffSectionHeader title="Truy cập nhanh" />
          <StaffQuickActionCard actions={QUICK_ACTIONS} />
        </View>

        <View style={{ marginTop: 8 }}>
          <StaffSectionHeader title="Cảnh báo gần đây" />
          {loading ? (
            <ActivityIndicator color="#2563EB" style={{ padding: 40 }} />
          ) : recentAlerts.length === 0 ? (
            <StaffEmptyState
              iconName="shield-checkmark-outline"
              title="Không có cảnh báo mới"
              description="Tất cả bệnh nhân đều đang ổn định"
            />
          ) : (
            <>
              {recentAlerts.slice(0, 3).map((alert) => (
                <StaffAlertItem
                  key={alert.id}
                  alert={{
                    ...alert,
                    timeAgo: timeAgo(alert.createdAt),
                    detailText: alert.violations?.map((v) => {
                      const roundedObserved = typeof v.observed === "number" ? Math.round(v.observed * 10) / 10 : v.observed;
                      return `${VIOLATION_LABEL[v.type] ?? v.type}: ${roundedObserved}`;
                    }).join(" · "),
                  }}
                  onPress={() => handleNavigate("Alerts")}
                />
              ))}
              {recentAlerts.length > 3 && (
                <TouchableOpacity
                  style={{ alignItems: "center", paddingVertical: 12, marginTop: 8 }}
                  onPress={() => handleNavigate("Alerts")}
                >
                  <Text style={{ color: "#2563EB", fontSize: 14, fontWeight: "600" }}>Xem tất cả cảnh báo</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        
        {/* Additional useful section when empty */}
        {recentAlerts.length === 0 && !loading && (
           <View style={{ marginTop: 16 }}>
             <StaffSectionHeader title="Bệnh nhân ưu tiên hôm nay" subtitle="Các bệnh nhân mới cập nhật hoặc cần theo dõi thường xuyên" />
             <StaffEmptyState
                iconName="people-circle-outline"
                title="Chưa có bệnh nhân ưu tiên"
                description="Danh sách bệnh nhân ưu tiên hôm nay sẽ hiển thị tại đây"
              />
           </View>
        )}
      </ScrollView>
    </StaffScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
  },
  retryText: {
    fontSize: 13,
    color: "#B91C1C",
    fontWeight: "600",
  },
});

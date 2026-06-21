import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getAlerts, acknowledgeAlert, getMyPatients } from "../api/patientApi";

export default function AlertsScreen() {
  const navigation = useNavigation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("all"); // 'all' | 'high' | 'open' | 'ack'

  // Acknowledge Confirmation modal
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [patientsRes, alertsRes] = await Promise.all([
        getMyPatients(),
        getAlerts({ limit: 200 }),
      ]);

      const assignmentMap = new Map();
      const assignments = patientsRes.body?.data || [];
      assignments.forEach((item) => {
        assignmentMap.set(item.patientId, item);
      });

      const alertList = alertsRes.body?.data || [];
      const formattedAlerts = alertList.map((item) => {
        const assignment = assignmentMap.get(item.patientId);
        return {
          ...item,
          patientName: item.patientName || assignment?.patientName || "Bệnh nhân",
        };
      });

      // Sort newest alerts first
      formattedAlerts.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setAlerts(formattedAlerts);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      Alert.alert("Lỗi", "Không thể tải danh sách cảnh báo");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async () => {
    if (!selectedAlert) return;
    setSubmitting(true);
    try {
      const res = await acknowledgeAlert(selectedAlert.id);
      if (res.ok) {
        // Update alert locally
        const updatedAlert = res.body?.data || {};
        setAlerts((prev) =>
          prev.map((item) =>
            item.id === selectedAlert.id
              ? { ...item, status: "ack", ...updatedAlert }
              : item
          )
        );
        setResolveModalVisible(false);
        setSelectedAlert(null);
      } else {
        Alert.alert("Lỗi", "Không thể xử lý cảnh báo: " + (res.body?.error || "Lỗi hệ thống"));
      }
    } catch (err) {
      console.error("Acknowledge error:", err);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi xử lý cảnh báo");
    } finally {
      setSubmitting(false);
    }
  };

  const getStats = () => {
    return {
      total: alerts.length,
      high: alerts.filter((item) => item.severity === "high").length,
      open: alerts.filter((item) => item.status === "open").length,
      ack: alerts.filter((item) => item.status === "ack").length,
    };
  };

  const getFilteredData = () => {
    switch (filterType) {
      case "high":
        return alerts.filter((item) => item.severity === "high");
      case "open":
        return alerts.filter((item) => item.status === "open");
      case "ack":
        return alerts.filter((item) => item.status === "ack");
      default:
        return alerts;
    }
  };

  const getViolationLabel = (type) => {
    const labels = {
      temperature: "Nhiệt độ",
      heart_rate: "Nhịp tim",
      respiratory_rate: "Nhịp thở",
      spo2: "SpO2",
      blood_pressure_systolic: "Huyết áp tâm thu",
      blood_pressure_diastolic: "Huyết áp tâm trương",
      glucose: "Đường huyết",
    };
    return labels[type] || type;
  };

  const getUnit = (type) => {
    const units = {
      temperature: "°C",
      heart_rate: "bpm",
      respiratory_rate: "nhịp/phút",
      spo2: "%",
      blood_pressure_systolic: "mmHg",
      blood_pressure_diastolic: "mmHg",
      glucose: "mmol/L",
    };
    return units[type] || "";
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    const dateObj = new Date(isoString);
    const timeStr = dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const dateStr = dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${timeStr} ${dateStr}`;
  };

  const renderAlertItem = ({ item }) => {
    return (
      <View style={styles.alertCard}>
        {/* Header */}
        <View style={styles.alertCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={styles.alertTime}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View
            style={[
              styles.severityBadge,
              item.severity === "high" ? styles.severityHigh : styles.severityInfo,
            ]}
          >
            <Ionicons
              name={item.severity === "high" ? "alert-circle" : "information-circle"}
              size={12}
              color={item.severity === "high" ? "#DC2626" : "#D97706"}
            />
            <Text
              style={[
                styles.severityText,
                { color: item.severity === "high" ? "#DC2626" : "#B45309" },
              ]}
            >
              {item.severity === "high" ? "Nguy kịch" : "Thông tin"}
            </Text>
          </View>
        </View>

        {/* Violations Block */}
        <View style={styles.violationsBlock}>
          {item.violations.map((violation, idx) => (
            <View key={idx} style={styles.violationRow}>
              <Text style={styles.violationLabel}>
                • {getViolationLabel(violation.type)}:
              </Text>
              <Text style={styles.violationValue}>
                {violation.observed} {getUnit(violation.type)}
              </Text>
              <Text style={styles.violationThreshold}>
                (Ngưỡng: {violation.threshold} {getUnit(violation.type)})
              </Text>
            </View>
          ))}
        </View>

        {/* Footer info/actions */}
        <View style={styles.alertCardFooter}>
          {item.status === "ack" ? (
            <View style={styles.processedWrapper}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.processedText}>
                Đã xử lý {item.acknowledgedByName ? `bởi ${item.acknowledgedByName}` : ""}
              </Text>
            </View>
          ) : (
            <Text style={styles.pendingText}>⚠️ Chờ xử lý</Text>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate("Chat", { patientId: item.patientId })}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color="#2563EB" />
              <Text style={styles.chatButtonText}>Nhắn tin</Text>
            </TouchableOpacity>

            {item.status === "open" && (
              <TouchableOpacity
                style={styles.resolveButton}
                onPress={() => {
                  setSelectedAlert(item);
                  setResolveModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                <Text style={styles.resolveButtonText}>Xử lý</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const stats = getStats();
  const filteredData = getFilteredData();

  return (
    <View style={styles.container}>
      {/* Stats & Filters Tabs Scrollable Header */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { key: "all", label: "Tất cả", count: stats.total, color: "#4B5563" },
            { key: "high", label: "Nguy kịch ⚠️", count: stats.high, color: "#DC2626" },
            { key: "open", label: "Chờ xử lý", count: stats.open, color: "#D97706" },
            { key: "ack", label: "Đã xử lý", count: stats.ack, color: "#059669" },
          ].map((tab) => {
            const isActive = filterType === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabItem,
                  isActive && { backgroundColor: tab.color, borderColor: tab.color },
                ]}
                onPress={() => setFilterType(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && { color: tab.color }]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải danh sách cảnh báo...</Text>
        </View>
      ) : filteredData.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAlerts(true)} />
          }
        >
          <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Không có cảnh báo nào phù hợp</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderAlertItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAlerts(true)} />
          }
        />
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={resolveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResolveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận xử lý</Text>
              <TouchableOpacity onPress={() => setResolveModalVisible(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBody}>
              Bạn có chắc chắn muốn xác nhận đã xử lý cảnh báo này cho bệnh nhân{" "}
              <Text style={{ fontWeight: "700" }}>{selectedAlert?.patientName}</Text>?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setResolveModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleAcknowledge}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  tabContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 10,
  },
  tabScroll: { paddingHorizontal: 16, gap: 8 },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F1F5F9",
    gap: 6,
  },
  tabLabel: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  tabLabelActive: { color: "#fff" },
  tabBadge: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeActive: { backgroundColor: "#fff" },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: "#4B5563" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { marginTop: 12, fontSize: 14, color: "#9CA3AF", fontWeight: "600" },
  listContent: { padding: 16, gap: 12 },
  alertCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  alertCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  patientName: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  timeContainer: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  alertTime: { fontSize: 11, color: "#6B7280" },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  severityHigh: { backgroundColor: "#FEE2E2" },
  severityInfo: { backgroundColor: "#FEF3C7" },
  severityText: { fontSize: 11, fontWeight: "700" },
  violationsBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginBottom: 16,
  },
  violationRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  violationLabel: { fontSize: 13, color: "#4B5563", fontWeight: "500", marginRight: 4 },
  violationValue: { fontSize: 13, color: "#DC2626", fontWeight: "700", marginRight: 6 },
  violationThreshold: { fontSize: 11, color: "#6B7280" },
  alertCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  processedWrapper: { flexDirection: "row", alignItems: "center", gap: 4 },
  processedText: { fontSize: 12, fontWeight: "600", color: "#059669" },
  pendingText: { fontSize: 12, fontWeight: "600", color: "#D97706" },
  actionRow: { flexDirection: "row", gap: 8 },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 8,
    gap: 4,
  },
  chatButtonText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
  resolveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 8,
    gap: 4,
  },
  resolveButtonText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "85%",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  modalBody: { fontSize: 14, color: "#4B5563", lineHeight: 20, marginBottom: 20 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  confirmBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  confirmBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
});

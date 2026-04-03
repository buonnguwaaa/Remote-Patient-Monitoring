import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { getMyAlerts } from "../../api/alertApi";

function extractData(response) {
  if (!response?.ok) return null;
  return response.body?.data || response.body || null;
}

function extractList(response) {
  const data = extractData(response);
  return Array.isArray(data) ? data : [];
}

function formatDateTime(iso) {
  if (!iso) return "Chưa có thời gian";

  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} • ${hh}:${mi}`;
}

function formatNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(1);
}

function getViolationLabel(type) {
  const labels = {
    temperature: "Nhiệt độ",
    heart_rate: "Nhịp tim",
    respiratory_rate: "Nhịp thở",
    spo2: "SpO2",
    blood_pressure_systolic: "Huyết áp tâm thu",
    blood_pressure_diastolic: "Huyết áp tâm trương",
    glucose: "Đường huyết",
  };

  return labels[type] || type || "Chỉ số";
}

function getViolationIcon(type) {
  switch (type) {
    case "temperature":
      return "thermometer-outline";
    case "heart_rate":
      return "heart-outline";
    case "respiratory_rate":
      return "pulse-outline";
    case "spo2":
      return "water-outline";
    case "blood_pressure_systolic":
    case "blood_pressure_diastolic":
      return "fitness-outline";
    case "glucose":
      return "flask-outline";
    default:
      return "alert-circle-outline";
  }
}

function buildAlertSummary(alert) {
  const violations = Array.isArray(alert?.violations) ? alert.violations : [];
  const primaryViolation = violations[0] || null;

  if (!primaryViolation) {
    return {
      title: "Cảnh báo sinh hiệu",
      iconName: "alert-circle-outline",
      summary: "Không có chi tiết vi phạm.",
    };
  }

  const extraCount = Math.max(0, violations.length - 1);
  return {
    title: getViolationLabel(primaryViolation.type),
    iconName: getViolationIcon(primaryViolation.type),
    summary:
      extraCount > 0
        ? `Và ${extraCount} chỉ số khác vượt ngưỡng`
        : primaryViolation.rule || "Vượt ngưỡng đã cấu hình",
  };
}

export default function AlertScreen() {
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAlerts = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await getMyAlerts();
      const nextAlerts = extractList(response);

      if (!response?.ok) {
        const message =
          response?.body?.error ||
          response?.error ||
          "Không thể tải dữ liệu cảnh báo.";
        throw new Error(message);
      }

      nextAlerts.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );

      setAlerts(nextAlerts);
    } catch (loadError) {
      console.error("Failed to load patient alerts", loadError);
      setError(loadError?.message || "Không thể tải dữ liệu cảnh báo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAlerts(false);
    }, [loadAlerts])
  );

  const openCount = useMemo(
    () => alerts.filter((item) => item.status === "open").length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (tab === "all") return true;
      return item.status === tab;
    });
  }, [alerts, tab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadAlerts(true)} />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Cảnh báo</Text>
          <View style={[styles.badgeNew, openCount === 0 && styles.badgeNeutral]}>
            <Text style={styles.badgeText}>
              {openCount > 0 ? `${openCount} chưa xác nhận` : "Không có cảnh báo mới"}
            </Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>
          Theo dõi các cảnh báo thật được tạo từ bản đo vượt ngưỡng của bạn.
        </Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabItem, tab === "all" && styles.tabActive]}
            onPress={() => setTab("all")}
          >
            <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, tab === "open" && styles.tabActive]}
            onPress={() => setTab("open")}
          >
            <Text style={[styles.tabText, tab === "open" && styles.tabTextActive]}>
              Chưa xác nhận
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, tab === "ack" && styles.tabActive]}
            onPress={() => setTab("ack")}
          >
            <Text style={[styles.tabText, tab === "ack" && styles.tabTextActive]}>
              Đã xác nhận
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.stateText}>Đang tải dữ liệu cảnh báo thật...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={22} color="#DC2626" />
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void loadAlerts(false)}
            >
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : filteredAlerts.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#15803D" />
            <Text style={styles.stateText}>
              {alerts.length === 0
                ? "Hiện chưa có cảnh báo nào từ hệ thống."
                : "Không có cảnh báo nào trong bộ lọc hiện tại."}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredAlerts.map((alert) => {
              const isHigh = alert.severity === "high";
              const isOpen = alert.status === "open";
              const summary = buildAlertSummary(alert);
              const acknowledgedBy =
                alert.acknowledgedByName || alert.acknowledgedBy || "Bác sĩ phụ trách";

              return (
                <View
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    isHigh ? styles.alertCardHigh : styles.alertCardInfo,
                    !isOpen && styles.alertCardAck,
                  ]}
                >
                  <View style={styles.alertHeaderRow}>
                    <View style={styles.alertTitleWrapper}>
                      <Ionicons
                        name={summary.iconName}
                        size={20}
                        color={isHigh ? "#DC2626" : "#1D4ED8"}
                      />
                      <Text style={styles.alertTypeText}>{summary.title}</Text>
                    </View>

                    <View
                      style={
                        isHigh
                          ? styles.alertSeverityPillHigh
                          : styles.alertSeverityPillInfo
                      }
                    >
                      <Text
                        style={
                          isHigh
                            ? styles.alertSeverityTextHigh
                            : styles.alertSeverityTextInfo
                        }
                      >
                        {isHigh ? "Nguy hiểm" : "Thông tin"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.alertSummaryText}>{summary.summary}</Text>

                  <View style={styles.violationList}>
                    {alert.violations?.map((violation, index) => (
                      <View key={`${alert.id}-${violation.type}-${index}`} style={styles.violationRow}>
                        <Text style={styles.violationLabel}>{getViolationLabel(violation.type)}</Text>
                        <Text style={styles.violationValue}>
                          {formatNumber(violation.observed)}
                          <Text style={styles.violationThreshold}>
                            {" "}
                            / ngưỡng {formatNumber(violation.threshold)}
                          </Text>
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.alertMetaRow}>
                    <View style={styles.alertMetaLeft}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color="#9CA3AF"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.alertMetaText}>
                        Tạo lúc {formatDateTime(alert.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.alertMetaRow}>
                    <View
                      style={
                        isOpen ? styles.alertStatusPillOpen : styles.alertStatusPillAck
                      }
                    >
                      <Text
                        style={
                          isOpen ? styles.alertStatusTextOpen : styles.alertStatusTextAck
                        }
                      >
                        {isOpen ? "Chờ bác sĩ xác nhận" : "Đã xác nhận"}
                      </Text>
                    </View>

                    {!isOpen && alert.acknowledgedAt ? (
                      <Text style={styles.alertMetaText}>
                        {acknowledgedBy} • {formatDateTime(alert.acknowledgedAt)}
                      </Text>
                    ) : (
                      <Text style={styles.alertMetaText}>Bác sĩ sẽ xem và phản hồi sớm.</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F6FF",
  },
  container: {
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },
  badgeNew: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeNeutral: {
    backgroundColor: "#1D4ED8",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#E5EDFF",
    padding: 4,
    borderRadius: 999,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#2563EB",
  },
  stateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    backgroundColor: "#2563EB",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    gap: 14,
  },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  alertCardHigh: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },
  alertCardInfo: {
    borderColor: "#BFDBFE",
    backgroundColor: "#F8FAFF",
  },
  alertCardAck: {
    opacity: 0.92,
  },
  alertHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  alertTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  alertTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  alertSeverityPillHigh: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  alertSeverityPillInfo: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  alertSeverityTextHigh: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 11,
  },
  alertSeverityTextInfo: {
    color: "#1D4ED8",
    fontWeight: "700",
    fontSize: 11,
  },
  alertSummaryText: {
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  violationList: {
    gap: 8,
  },
  violationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  violationLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  violationValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  violationThreshold: {
    fontWeight: "500",
    color: "#6B7280",
  },
  alertMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  alertMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertMetaText: {
    flex: 1,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
  },
  alertStatusPillOpen: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  alertStatusPillAck: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  alertStatusTextOpen: {
    color: "#B45309",
    fontWeight: "700",
    fontSize: 11,
  },
  alertStatusTextAck: {
    color: "#15803D",
    fontWeight: "700",
    fontSize: 11,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { getMyAlerts } from "../../api/alertApi";
import { normalizeAlertSeverity } from "../../utils/alertSeverity";

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
  if (Number.isNaN(d.getTime())) return "Chưa có thời gian";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} • ${hh}:${mi}`;
}

function formatClockTime(iso) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

const VIOLATION_LABELS = {
  temperature: "Nhiệt độ",
  heart_rate: "Nhịp tim",
  heartRate: "Nhịp tim",
  respiratory_rate: "Nhịp thở",
  respiratoryRate: "Nhịp thở",
  spo2: "SpO2",
  blood_pressure_systolic: "Huyết áp tâm thu",
  blood_pressure_diastolic: "Huyết áp tâm trương",
  bloodPressure: "Huyết áp",
  glucose: "Đường huyết",
  sys_max: "Huyết áp tâm thu",
  sys_min: "Huyết áp tâm thu",
  bp_diastolic_min: "Huyết áp tâm trương",
  bp_diastolic_max: "Huyết áp tâm trương",
  dia_max: "Huyết áp tâm trương",
  dia_min: "Huyết áp tâm trương",
  temperature_max: "Nhiệt độ",
  temperature_min: "Nhiệt độ",
  heart_rate_max: "Nhịp tim",
  heart_rate_min: "Nhịp tim",
  heartRate_max: "Nhịp tim",
  heartRate_min: "Nhịp tim",
  respiratoryRate_max: "Nhịp thở",
  respiratoryRate_min: "Nhịp thở",
  spo2_min: "SpO2",
  glucose_min: "Đường huyết",
  glucose_max: "Đường huyết",
};

function getViolationLabel(type) {
  if (!type) return "Chỉ số";
  const cleanType = type.replace(/_(max|min|high|low)$/, "");
  return VIOLATION_LABELS[cleanType] || VIOLATION_LABELS[type] || type || "Chỉ số";
}

function getViolationDirection(violation) {
  const rule = violation?.rule || "";
  const observed = violation?.observed ?? 0;
  const threshold = violation?.threshold ?? 0;
  if (rule.includes("_max") || rule.includes("_high") || observed > threshold) return "Cao";
  if (rule.includes("_min") || rule.includes("_low") || observed < threshold) return "Thấp";
  return "Cảnh báo";
}

function getViolationIcon(type) {
  switch (type) {
    case "temperature":
      return "thermometer-outline";
    case "heart_rate":
    case "heartRate":
      return "heart-outline";
    case "respiratory_rate":
    case "respiratoryRate":
      return "pulse-outline";
    case "spo2":
      return "water-outline";
    case "blood_pressure_systolic":
    case "blood_pressure_diastolic":
    case "bloodPressure":
      return "fitness-outline";
    case "glucose":
      return "flask-outline";
    default:
      return "alert-circle-outline";
  }
}

function getViolationUnit(type) {
  switch (type) {
    case "temperature":
      return "°C";
    case "heart_rate":
    case "heartRate":
      return "bpm";
    case "respiratory_rate":
    case "respiratoryRate":
      return "lần/phút";
    case "spo2":
      return "%";
    case "blood_pressure_systolic":
    case "blood_pressure_diastolic":
    case "bloodPressure":
      return "mmHg";
    case "glucose":
      return "mg/dL";
    default:
      return "";
  }
}

function getViolations(alert) {
  return Array.isArray(alert?.violations) ? alert.violations : [];
}

function formatViolationReading(violation, field) {
  const value = formatNumber(violation?.[field]);
  const unit = getViolationUnit(violation?.type);
  return unit ? `${value} ${unit}` : value;
}

function buildAlertSummary(alert) {
  const violations = getViolations(alert);
  const labels = [...new Set(violations.map((item) => getViolationLabel(item?.type)).filter(Boolean))];
  if (labels.length === 0) {
    return {
      title: "Cảnh báo sinh hiệu",
      iconName: "alert-circle-outline",
      summary: "Không có chi tiết vi phạm.",
      labels: [],
    };
  }
  if (labels.length === 1) {
    const dir = getViolationDirection(violations[0]);
    const summaryText = dir === "Cao" ? "Chỉ số quá cao so với ngưỡng" : (dir === "Thấp" ? "Chỉ số quá thấp so với ngưỡng" : "Chỉ số vượt ngưỡng an toàn");
    return {
      title: labels[0],
      iconName: getViolationIcon(violations[0]?.type),
      summary: summaryText,
      labels,
    };
  }
  return {
    title: `${labels.length} chỉ số vượt ngưỡng`,
    iconName: "alert-circle-outline",
    summary: `Gồm: ${labels.join(", ")}`,
    labels,
  };
}

function getStatusMeta(alert) {
  const isOpen = alert?.status === "open";
  return {
    isOpen,
    label: isOpen ? "Chờ bác sĩ xác nhận" : "Đã xác nhận",
    helper: isOpen
      ? "Bác sĩ sẽ xem và phản hồi sớm."
      : `${alert?.acknowledgedByName || alert?.acknowledgedBy || "Bác sĩ phụ trách"} • ${formatDateTime(alert?.acknowledgedAt)}`,
  };
}

function buildDayMeta(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { key: "unknown", title: "Không rõ ngày", subtitle: "Thiếu thời gian tạo cảnh báo" };
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const subtitle = date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  if (diffDays === 0) return { key, title: "Hôm nay", subtitle };
  if (diffDays === 1) return { key, title: "Hôm qua", subtitle };
  return {
    key,
    title: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),
    subtitle,
  };
}

function groupAlertsByDay(alerts) {
  const groups = [];
  alerts.forEach((alert) => {
    const meta = buildDayMeta(alert?.createdAt);
    const last = groups[groups.length - 1];
    if (!last || last.key !== meta.key) {
      groups.push({ ...meta, items: [alert] });
      return;
    }
    last.items.push(alert);
  });
  return groups;
}

export default function AlertScreen({ isEmbedded }) {
  const navigation = useNavigation();
  const route = useRoute();
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(null);

  const loadAlerts = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await getMyAlerts();
      const nextAlerts = extractList(response);

      if (!response?.ok) {
        throw new Error(
          response?.body?.error || response?.error || "Không thể tải dữ liệu cảnh báo."
        );
      }

      // Normalize severity tại API boundary ngay khi nhận dữ liệu
      const normalized = nextAlerts.map((alert) => ({
        ...alert,
        severity: normalizeAlertSeverity(alert.severity),
        violations: (alert.violations || []).map((v) => ({
          ...v,
          severity: normalizeAlertSeverity(v.severity),
        })),
      }));

      normalized.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
      setAlerts(normalized);
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

  const filteredAlerts = useMemo(
    () => alerts.filter((item) => (tab === "all" ? true : item.status === tab)),
    [alerts, tab]
  );

  const groupedAlerts = useMemo(() => groupAlertsByDay(filteredAlerts), [filteredAlerts]);
  const selectedSummary = selectedAlert ? buildAlertSummary(selectedAlert) : null;
  const selectedStatus = selectedAlert ? getStatusMeta(selectedAlert) : null;

  useEffect(() => {
    const selectedAlertId = route?.params?.selectedAlertId;
    if (!selectedAlertId || alerts.length === 0) return;

    const matchedAlert = alerts.find((item) => item.id === selectedAlertId);
    if (matchedAlert) {
      setTab("all");
      setSelectedAlert(matchedAlert);
    }

    navigation.setParams({ selectedAlertId: undefined });
  }, [alerts, navigation, route?.params?.selectedAlertId]);

  const Container = isEmbedded ? View : SafeAreaView;
  const canGoBack = navigation.canGoBack();

  return (
    <Container style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadAlerts(true)} />
        }
      >
        {canGoBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#2563EB" />
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Cảnh báo</Text>
          <View style={[styles.badge, openCount === 0 && styles.badgeNeutral]}>
            <Text style={styles.badgeText}>
              {openCount > 0 ? `${openCount} chưa xác nhận` : "Không có cảnh báo mới"}
            </Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Cảnh báo được nhóm theo từng ngày. Chạm vào từng item để xem chi tiết rõ
          hơn về lần vượt ngưỡng đó.
        </Text>

        <View style={styles.tabs}>
          {[
            ["all", "Tất cả"],
            ["open", "Chưa xác nhận"],
            ["ack", "Đã xác nhận"],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tabItem, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
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
            <TouchableOpacity style={styles.retryButton} onPress={() => void loadAlerts(false)}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : groupedAlerts.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#15803D" />
            <Text style={styles.stateText}>
              {alerts.length === 0
                ? "Hiện chưa có cảnh báo nào từ hệ thống."
                : "Không có cảnh báo nào trong bộ lọc hiện tại."}
            </Text>
          </View>
        ) : (
          <View style={styles.groupList}>
            {groupedAlerts.map((group) => (
              <View key={group.key} style={styles.dayGroup}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayAccent} />
                  <View style={styles.dayTextWrap}>
                    <Text style={styles.dayTitle}>{group.title}</Text>
                    <Text style={styles.daySubtitle}>{group.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.list}>
                  {group.items.map((alert) => {
                    const summary = buildAlertSummary(alert);
                    const statusMeta = getStatusMeta(alert);
                    const isHigh = normalizeAlertSeverity(alert.severity) === "high";

                    return (
                      <TouchableOpacity
                        key={alert.id}
                        activeOpacity={0.92}
                        style={[
                          styles.alertCard,
                          statusMeta.isOpen 
                            ? (isHigh ? styles.alertCardHigh : styles.alertCardInfo) 
                            : styles.alertCardAck,
                        ]}
                        onPress={() => setSelectedAlert(alert)}
                      >
                        <View style={styles.alertHeader}>
                          <View style={styles.alertTitleWrap}>
                            <View
                              style={[
                                styles.iconBadge,
                                statusMeta.isOpen 
                                  ? (isHigh ? styles.iconBadgeHigh : styles.iconBadgeInfo) 
                                  : styles.iconBadgeAck,
                              ]}
                            >
                              <Ionicons
                                name={summary.iconName}
                                size={18}
                                color={statusMeta.isOpen ? (isHigh ? "#DC2626" : "#1D4ED8") : "#6B7280"}
                              />
                            </View>
                            <View style={styles.alertTextWrap}>
                              <Text style={styles.alertTitle}>{summary.title}</Text>
                              <Text style={styles.alertDesc}>{summary.summary}</Text>
                            </View>
                          </View>

                          <View style={styles.alertRight}>
                            <Text style={styles.timePill}>{formatClockTime(alert.createdAt)}</Text>
                            <View
                              style={statusMeta.isOpen ? (isHigh ? styles.levelPillHigh : styles.levelPillInfo) : styles.levelPillAck}
                            >
                              <Text style={statusMeta.isOpen ? (isHigh ? styles.levelTextHigh : styles.levelTextInfo) : styles.levelTextAck}>
                                {isHigh ? "Ưu tiên cao" : "Cần theo dõi"}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {summary.labels.length > 1 ? (
                          <View style={styles.fieldWrap}>
                            {summary.labels.map((label) => (
                              <View key={`${alert.id}-${label}`} style={styles.fieldChip}>
                                <Text style={styles.fieldChipText}>{label}</Text>
                              </View>
                            ))}
                          </View>
                        ) : null}

                        <View style={styles.violationList}>
                          {getViolations(alert).map((violation, index) => {
                            const dir = getViolationDirection(violation);
                            const isOver = dir === "Cao";
                            const rowLabel = summary.labels.length === 1 ? "Kết quả đo" : getViolationLabel(violation.type);
                            return (
                              <View key={`${alert.id}-${violation.type}-${index}`} style={styles.violationRow}>
                                <View style={styles.violationInfo}>
                                  <Text style={styles.violationLabel}>{rowLabel}</Text>
                                  <Text style={styles.violationThresholdInline}>
                                    Ngưỡng: {formatViolationReading(violation, "threshold")}
                                  </Text>
                                </View>
                                <View style={styles.violationSide}>
                                  <View style={[styles.violationDirBadge, isOver ? styles.violationDirHigh : styles.violationDirLow]}>
                                    <Text style={[styles.violationDirText, isOver ? styles.violationDirTextHigh : styles.violationDirTextLow]}>
                                      {dir}: {formatViolationReading(violation, "observed")}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>

                        <View style={styles.cardFooter}>
                          <View style={statusMeta.isOpen ? styles.statusPillOpen : styles.statusPillAck}>
                            <Text style={statusMeta.isOpen ? styles.statusTextOpen : styles.statusTextAck}>
                              {statusMeta.label}
                            </Text>
                          </View>
                          <View style={styles.detailHint}>
                            <Text style={styles.detailHintText}>Xem chi tiết</Text>
                            <Ionicons name="chevron-forward-outline" size={14} color="#6B7280" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={Boolean(selectedAlert)} transparent animationType="slide" onRequestClose={() => setSelectedAlert(null)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedAlert(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedSummary?.title || "Chi tiết cảnh báo"}</Text>
                <Text style={styles.modalDesc}>{selectedSummary?.summary || "Không có chi tiết vi phạm."}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedAlert(null)}>
                <Ionicons name="close-outline" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thông tin cảnh báo</Text>
                <View style={styles.metaCard}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Thời điểm tạo</Text>
                    <Text style={styles.metaValue}>{formatDateTime(selectedAlert?.createdAt)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Mức độ</Text>
                    <Text style={[styles.metaValue, normalizeAlertSeverity(selectedAlert?.severity) === "high" ? styles.metaHigh : styles.metaInfo]}>
                      {normalizeAlertSeverity(selectedAlert?.severity) === "high" ? "Ưu tiên cao" : "Cần theo dõi"}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Trạng thái</Text>
                    <Text style={styles.metaValue}>{selectedStatus?.label || "Chưa xác định"}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Theo dõi</Text>
                    <Text style={styles.metaValue}>{selectedStatus?.helper || "Chưa có cập nhật mới."}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Các chỉ số vi phạm</Text>
                <View style={styles.modalViolationList}>
                  {getViolations(selectedAlert).map((violation, index) => {
                    const dir = getViolationDirection(violation);
                    const isOver = dir === "Cao";
                    return (
                      <View key={`${selectedAlert?.id}-${violation.type}-${index}`} style={styles.modalViolationCard}>
                        <View style={styles.modalViolationTop}>
                          <View style={styles.modalViolationTitleWrap}>
                            <Ionicons name={getViolationIcon(violation.type)} size={16} color="#DC2626" />
                            <Text style={styles.modalViolationTitle}>{getViolationLabel(violation.type)}</Text>
                          </View>
                          <View style={[styles.violationDirBadge, isOver ? styles.violationDirHigh : styles.violationDirLow]}>
                            <Text style={[styles.violationDirText, isOver ? styles.violationDirTextHigh : styles.violationDirTextLow]}>
                              {dir}: {formatViolationReading(violation, "observed")}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.modalViolationBottom}>
                          <Text style={styles.modalThreshold}>Ngưỡng: {formatViolationReading(violation, "threshold")}</Text>
                          <Text style={[styles.modalSeverity, normalizeAlertSeverity(violation.severity) === "high" ? styles.metaHigh : styles.metaInfo]}>
                            {isOver ? "Quá cao" : "Quá thấp"}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F6FF" },
  container: { flex: 1, paddingHorizontal: 20 },
  contentContainer: { paddingTop: 20, paddingBottom: 32 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, alignSelf: "flex-start", paddingVertical: 4 },
  backButtonText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 12 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: "#111827" },
  subtitle: { marginBottom: 16, fontSize: 13, lineHeight: 19, color: "#6B7280" },
  badge: { backgroundColor: "#DC2626", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeNeutral: { backgroundColor: "#1D4ED8" },
  badgeText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  tabs: { flexDirection: "row", backgroundColor: "#E5EDFF", padding: 4, borderRadius: 999, marginBottom: 20 },
  tabItem: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: "center" },
  tabActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tabText: { color: "#6B7280", fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: "#2563EB" },
  stateCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center", gap: 10 },
  stateText: { color: "#4B5563", fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: { marginTop: 4, backgroundColor: "#2563EB", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  retryButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  groupList: { gap: 18 },
  dayGroup: { gap: 12 },
  dayHeader: { flexDirection: "row", gap: 10 },
  dayAccent: { width: 4, borderRadius: 999, backgroundColor: "#2563EB" },
  dayTextWrap: { flex: 1 },
  dayTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  daySubtitle: { marginTop: 2, fontSize: 12, color: "#6B7280", textTransform: "capitalize" },
  list: { gap: 12 },
  alertCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  alertCardHigh: { borderColor: "#FECACA", backgroundColor: "#FFF6F6" },
  alertCardMedium: { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  alertCardInfo: { borderColor: "#BFDBFE", backgroundColor: "#F8FAFF" },
  alertCardAck: { borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", opacity: 0.94 },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  alertTitleWrap: { flexDirection: "row", gap: 10, flex: 1 },
  iconBadge: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconBadgeHigh: { backgroundColor: "#FEE2E2" },
  iconBadgeMedium: { backgroundColor: "#FEF3C7" },
  iconBadgeInfo: { backgroundColor: "#DBEAFE" },
  iconBadgeAck: { backgroundColor: "#F3F4F6" },
  alertTextWrap: { flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  alertDesc: { marginTop: 3, fontSize: 12, lineHeight: 18, color: "#6B7280" },
  alertRight: { alignItems: "flex-end", gap: 8 },
  timePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: "700", color: "#111827" },
  levelPillHigh: { backgroundColor: "#FEE2E2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  levelPillMedium: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  levelPillInfo: { backgroundColor: "#DBEAFE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  levelPillAck: { backgroundColor: "#E5E7EB", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  levelTextHigh: { color: "#B91C1C", fontWeight: "700", fontSize: 11 },
  levelTextMedium: { color: "#D97706", fontWeight: "700", fontSize: 11 },
  levelTextInfo: { color: "#1D4ED8", fontWeight: "700", fontSize: 11 },
  levelTextAck: { color: "#6B7280", fontWeight: "700", fontSize: 11 },
  fieldWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  fieldChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "rgba(148,163,184,0.18)" },
  fieldChipText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  violationList: { gap: 8, marginTop: 12 },
  violationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.82)", paddingHorizontal: 12, paddingVertical: 10 },
  violationInfo: { flex: 1 },
  violationLabel: { fontSize: 12, fontWeight: "700", color: "#374151" },
  violationThresholdInline: { marginTop: 3, fontSize: 11, color: "#6B7280" },
  violationSide: { alignItems: "flex-end" },
  violationDirBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  violationDirHigh: { backgroundColor: "#FEE2E2" },
  violationDirLow: { backgroundColor: "#DBEAFE" },
  violationDirText: { fontSize: 12, fontWeight: "700" },
  violationDirTextHigh: { color: "#B91C1C" },
  violationDirTextLow: { color: "#1D4ED8" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 12 },
  statusPillOpen: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusPillAck: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusTextOpen: { color: "#B45309", fontWeight: "700", fontSize: 11 },
  statusTextAck: { color: "#15803D", fontWeight: "700", fontSize: 11 },
  detailHint: { flexDirection: "row", alignItems: "center", gap: 3 },
  detailHintText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.35)" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "82%", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 22 },
  modalHandle: { alignSelf: "center", width: 44, height: 4, borderRadius: 999, backgroundColor: "#D1D5DB", marginBottom: 14 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalDesc: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#6B7280" },
  closeButton: { width: 34, height: 34, borderRadius: 999, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  modalScroll: { marginTop: 16 },
  modalScrollContent: { paddingBottom: 12, gap: 18 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  metaCard: { backgroundColor: "#F8FAFC", borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  metaLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: "#6B7280" },
  metaValue: { flex: 1.4, fontSize: 12, lineHeight: 18, fontWeight: "600", color: "#111827", textAlign: "right" },
  metaHigh: { color: "#B91C1C" },
  metaMedium: { color: "#D97706" },
  metaInfo: { color: "#1D4ED8" },
  modalViolationList: { gap: 10 },
  modalViolationCard: { backgroundColor: "#FFF7F7", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#FECACA", gap: 8 },
  modalViolationTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  modalViolationTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  modalViolationTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  modalObserved: { fontSize: 13, fontWeight: "700", color: "#B91C1C" },
  modalRule: { fontSize: 12, lineHeight: 18, color: "#6B7280" },
  modalViolationBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  modalThreshold: { flex: 1, fontSize: 12, color: "#374151" },
  modalSeverity: { fontSize: 11, fontWeight: "700" },
});

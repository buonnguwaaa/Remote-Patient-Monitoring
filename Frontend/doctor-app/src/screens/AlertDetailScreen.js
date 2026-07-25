import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getAlertById, getPatientById, acknowledgeAlert } from "../api/patientApi";
import { useToast } from "../context/ToastContext";
import { colors, radius, spacing, shadows } from "../theme/rpmTheme";
import { normalizeAlertSeverity } from "../utils/alertSeverity";

const VIOLATION_LABELS = {
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
  sys: "HA tâm thu",
  bp_diastolic: "HA tâm trương",
};

const UNITS = {
  temperature: "°C",
  heart_rate: "bpm",
  heartRate: "bpm",
  respiratory_rate: "nhịp/phút",
  respiratoryRate: "nhịp/phút",
  spo2: "%",
  spO2: "%",
  blood_pressure_systolic: "mmHg",
  bloodPressureSystolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
  bloodPressureDiastolic: "mmHg",
  glucose: "mg/dL",
  sys: "mmHg",
  bp_diastolic: "mmHg",
};

function getViolationLabel(type) {
  if (!type) return "Chỉ số";
  const clean = type.replace(/_(max|min|high|low)$/, "");
  return VIOLATION_LABELS[clean] || VIOLATION_LABELS[type] || type;
}

function getUnit(type) {
  const clean = type?.replace(/_(max|min|high|low)$/, "");
  return UNITS[clean] || "";
}

function getViolationIcon(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("temp")) return { name: "thermometer-outline", color: "#F59E0B" };
  if (t.includes("pulse") || t.includes("heart")) return { name: "heart-outline", color: "#EF4444" };
  if (t.includes("respir")) return { name: "pulse-outline", color: "#10B981" };
  if (t.includes("spo2")) return { name: "speedometer-outline", color: "#3B82F6" };
  if (t.includes("pressure") || t.includes("sys") || t.includes("diastolic")) return { name: "trending-up-outline", color: "#8B5CF6" };
  if (t.includes("glucose")) return { name: "water-outline", color: "#EC4899" };
  return { name: "medical-outline", color: "#6B7280" };
}

function getViolationDirection(rule) {
  if (!rule) return { label: "Vi phạm ngưỡng", isHigh: true };
  if (rule.endsWith("_max")) return { label: "Vượt ngưỡng tối đa", isHigh: true };
  if (rule.endsWith("_min")) return { label: "Dưới ngưỡng tối thiểu", isHigh: false };
  return { label: "Vi phạm ngưỡng", isHigh: true };
}

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) +
    " " + d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatGender(gender) {
  if (gender === "M" || gender === "Nam") return "Nam";
  if (gender === "F" || gender === "Nữ") return "Nữ";
  if (gender === "O" || gender === "Khác") return "Khác";
  return "Chưa cập nhật";
}

function formatDob(dobString) {
  if (!dobString) return "Chưa cập nhật";
  try {
    const date = new Date(dobString);
    if (isNaN(date.getTime())) return "Chưa cập nhật";
    return date.toLocaleDateString("vi-VN");
  } catch (e) {
    return "Chưa cập nhật";
  }
}

function formatPhone(phone) {
  return phone || "Chưa cập nhật";
}

export default function AlertDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { showToast } = useToast();
  const alertId = route.params?.alertId;
  const insets = useSafeAreaInsets();

  const [alertData, setAlertData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!alertId) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const alertRes = await getAlertById(alertId);
      if (alertRes.ok && alertRes.body?.data) {
        const fetchedAlert = alertRes.body.data;
        setAlertData(fetchedAlert);
        if (fetchedAlert.patientId) {
          const patientRes = await getPatientById(fetchedAlert.patientId);
          if (patientRes.ok) {
            setPatientData(patientRes.body?.data || null);
          }
        }
      } else {
        showToast("Không thể tải thông tin chi tiết cảnh báo", "error");
      }
    } catch (err) {
      console.error("Error loading alert detail:", err);
      showToast("Có lỗi xảy ra khi tải dữ liệu", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [alertId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolve = async () => {
    if (!alertId || submitting) return;
    Alert.alert(
      "Xác nhận xử lý",
      "Bạn có chắc chắn muốn xác nhận xử lý cảnh báo này? Hệ thống sẽ ghi nhận bạn là người xử lý.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await acknowledgeAlert(alertId);
              if (res.ok) {
                showToast("Xác nhận xử lý cảnh báo thành công", "success");
                loadData();
              } else {
                showToast("Không thể xử lý cảnh báo", "error");
              }
            } catch (err) {
              console.error("Error acking alert:", err);
              showToast("Có lỗi xảy ra khi xử lý cảnh báo", "error");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleChat = () => {
    if (!alertData?.patientId) return;
    navigation.navigate("MainTabs", {
      screen: "ChatTab",
      params: {
        screen: "Chat",
        params: { patientId: alertData.patientId },
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải chi tiết cảnh báo...</Text>
      </View>
    );
  }

  if (!alertData) {
    return (
      <View style={styles.centerBox}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorText}>Không tìm thấy thông tin cảnh báo.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isHigh = normalizeAlertSeverity(alertData.severity) === "high";
  const isResolved = alertData.status === "ack";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={colors.primary} />
        }
      >
        {/* Severity & Status Header Banner */}
        <View style={[styles.headerBanner, isHigh ? styles.bannerHigh : styles.bannerInfo]}>
          <View style={styles.bannerRow}>
            <View style={styles.badgeRow}>
              <View style={[styles.severityBadge, isHigh ? styles.badgeHigh : styles.badgeInfo]}>
                <Text style={[styles.badgeText, isHigh ? styles.textHigh : styles.textInfo]}>
                  {isHigh ? "Ưu tiên cao" : "Cần theo dõi"}
                </Text>
              </View>
              <View style={[styles.statusBadge, isResolved ? styles.statusAck : styles.statusOpen]}>
                <Text style={[styles.badgeText, isResolved ? styles.textAck : styles.textOpen]}>
                  {isResolved ? "Đã xử lý" : "Chưa xử lý"}
                </Text>
              </View>
            </View>
            <Ionicons
              name={isHigh ? "alert-circle" : "warning"}
              size={32}
              color={isHigh ? colors.danger : colors.warning}
            />
          </View>
          <Text style={styles.bannerTitle}>Cảnh báo chỉ số sinh hiệu vượt ngưỡng</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.timeText}>Phát hiện lúc: {formatDate(alertData.createdAt)}</Text>
          </View>
        </View>

        {/* Patient Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Thông tin bệnh nhân</Text>
          </View>
          <View style={styles.patientRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {patientData?.name ? patientData.name.split(" ").pop().slice(0, 2).toUpperCase() : "BN"}
              </Text>
            </View>
            <View style={styles.patientMeta}>
              <Text style={styles.patientName}>{patientData?.name || alertData.patientName || "Bệnh nhân"}</Text>
              <Text style={styles.patientCode}>
                Mã BN: {patientData?.userPublicId || patientData?.patientCode || alertData.patientCode || `PAT-${alertData.patientId?.substring(0, 6).toUpperCase()}`}
              </Text>
            </View>
          </View>
          <View style={styles.patientInfoGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Giới tính</Text>
              <Text style={styles.gridValue}>{formatGender(patientData?.gender)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Ngày sinh</Text>
              <Text style={styles.gridValue}>{formatDob(patientData?.dob)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Số điện thoại</Text>
              <Text style={styles.gridValue}>{formatPhone(patientData?.phone)}</Text>
            </View>
          </View>
        </View>

        {/* Violations Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pulse-outline" size={20} color={colors.danger} />
            <Text style={styles.cardTitle}>Chi tiết chỉ số vượt ngưỡng</Text>
          </View>
          <View style={styles.violationsList}>
            {alertData.violations?.map((v, idx) => {
              const icon = getViolationIcon(v.type);
              const dir = getViolationDirection(v.rule);
              const isViolationHigh = normalizeAlertSeverity(v.severity) === "high";

              return (
                <View key={idx} style={[styles.violationItem, isViolationHigh ? styles.violationBorderHigh : styles.violationBorderInfo]}>
                  <View style={styles.violationHead}>
                    <View style={styles.violationTitleRow}>
                      <View style={[styles.iconContainer, { backgroundColor: icon.color + "15" }]}>
                        <Ionicons name={icon.name} size={18} color={icon.color} />
                      </View>
                      <Text style={styles.violationName}>{getViolationLabel(v.type)}</Text>
                    </View>
                    <View style={[styles.dirBadge, dir.isHigh ? styles.dirMax : styles.dirMin]}>
                      <Text style={[styles.dirText, dir.isHigh ? styles.textDirMax : styles.textDirMin]}>
                        {dir.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.valuesGrid}>
                    <View style={styles.valueBlock}>
                      <Text style={styles.valueLabel}>Đo được</Text>
                      <Text style={[styles.observedValue, isViolationHigh ? styles.textHigh : styles.textWarning]}>
                        {v.observed} {getUnit(v.type)}
                      </Text>
                    </View>
                    <View style={styles.valueBlock}>
                      <Text style={styles.valueLabel}>Ngưỡng giới hạn</Text>
                      <Text style={styles.thresholdValue}>
                        {v.threshold} {getUnit(v.type)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Resolution Details */}
        {isResolved && (
          <View style={[styles.card, styles.resolvedCard]}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
              <Text style={[styles.cardTitle, { color: colors.successDark }]}>Thông tin xử lý</Text>
            </View>
            <View style={styles.resolvedBody}>
              <Text style={styles.resolvedText}>
                Cảnh báo đã được xác nhận xử lý thành công bởi:
              </Text>
              <Text style={styles.resolverName}>
                {alertData.acknowledgedByName || "Bác sĩ phụ trách"}
              </Text>
              <Text style={styles.resolvedTime}>
                Thời gian xử lý: {formatDate(alertData.updatedAt)}
              </Text>
            </View>
          </View>
        )}

        {/* System Message Log */}
        {alertData.content ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.cardTitle}>Nội dung cảnh báo chi tiết</Text>
            </View>
            <Text style={styles.alertContentText}>{alertData.content}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer Action Buttons */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {!isResolved && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleResolve} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Xác nhận xử lý</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleChat}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.secondaryBtnText}>Nhắn tin trao đổi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.card, gap: 12, paddingBottom: 24 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  errorText: { fontSize: 16, color: colors.textSecondary, marginTop: 12, textAlign: "center", marginBottom: 20 },
  backBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.md },
  backBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // Header Banner
  headerBanner: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  bannerHigh: { backgroundColor: colors.dangerSoftAlt, borderColor: colors.dangerBorder },
  bannerInfo: { backgroundColor: colors.warningBg, borderColor: colors.warningSoft },
  bannerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badgeRow: { flexDirection: "row", gap: 6 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeHigh: { backgroundColor: colors.dangerSoft },
  badgeInfo: { backgroundColor: colors.warningSoft },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  statusOpen: { backgroundColor: "#FFE5E5" },
  statusAck: { backgroundColor: "#E4FFE9" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  textHigh: { color: colors.dangerDark },
  textInfo: { color: colors.warningDark },
  textOpen: { color: "#D63031" },
  textAck: { color: "#1A8F4A" },
  bannerTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 12 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  timeText: { fontSize: 12, color: colors.textSecondary },

  // Card styles
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.cardSubtle,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.textDark },

  // Patient Card
  patientRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSoftBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  patientMeta: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: "700", color: colors.text },
  patientCode: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  patientInfoGrid: { flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: 14 },
  gridItem: { flex: 1 },
  gridLabel: { fontSize: 11, color: colors.textMuted },
  gridValue: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 4 },

  // Violations List
  violationsList: { gap: 12 },
  violationItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surfaceMuted,
  },
  violationBorderHigh: { borderColor: colors.dangerBorder },
  violationBorderInfo: { borderColor: colors.border },
  violationHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  violationTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconContainer: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  violationName: { fontSize: 13, fontWeight: "700", color: colors.text },
  dirBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xs },
  dirMax: { backgroundColor: colors.dangerSoft },
  dirMin: { backgroundColor: colors.surfaceSoftBlue },
  dirText: { fontSize: 10, fontWeight: "700" },
  textDirMax: { color: colors.dangerDark },
  textDirMin: { color: colors.primaryDark },
  valuesGrid: { flexDirection: "row", gap: 12 },
  valueBlock: { flex: 1, backgroundColor: colors.surface, padding: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSoft },
  valueLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  observedValue: { fontSize: 14, fontWeight: "800" },
  textWarning: { color: colors.warning },
  thresholdValue: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },

  // Resolved Card
  resolvedCard: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
  resolvedBody: { gap: 4 },
  resolvedText: { fontSize: 13, color: colors.successDark },
  resolverName: { fontSize: 14, fontWeight: "700", color: colors.successDark },
  resolvedTime: { fontSize: 12, color: colors.successDark, opacity: 0.8 },

  // Content text
  alertContentText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Footer Actions
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
});

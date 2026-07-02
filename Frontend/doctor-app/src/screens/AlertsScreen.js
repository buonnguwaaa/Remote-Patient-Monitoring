import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getAlerts, acknowledgeAlert, getMyPatients } from "../api/patientApi";
import { useToast } from "../context/ToastContext";
import { colors, radius, spacing, typography, shadows } from "../theme/rpmTheme";

const TABS = [
  { key: "PENDING", label: "Cần xử lý" },
  { key: "ALL", label: "Tất cả" },
  { key: "RESOLVED", label: "Đã xử lý" },
];

const SEVERITY_OPTIONS = [
  { key: "ALL", label: "Tất cả" },
  { key: "high", label: "Nguy hiểm" },
  { key: "medium", label: "Cảnh báo" },
  { key: "low", label: "Nhẹ" },
];

const VIOLATION_LABELS = {
  temperature: "Nhiệt độ",
  heart_rate: "Nhịp tim",
  respiratory_rate: "Nhịp thở",
  spo2: "SpO2",
  blood_pressure_systolic: "HA tâm thu",
  blood_pressure_diastolic: "HA tâm trương",
  glucose: "Đường huyết",
  sys: "HA tâm thu",
  bp_diastolic: "HA tâm trương",
};

const UNITS = {
  temperature: "°C",
  heart_rate: "bpm",
  respiratory_rate: "nhịp/phút",
  spo2: "%",
  blood_pressure_systolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
  glucose: "mmol/L",
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

function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) +
    " " + d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function timeAgo(isoString) {
  if (!isoString) return "";
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

export default function AlertsScreen() {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [expandedPatients, setExpandedPatients] = useState(new Set());

  // Resolve modal
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [alertsToResolve, setAlertsToResolve] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [patientsRes, alertsRes] = await Promise.all([
        getMyPatients(),
        getAlerts({ limit: 500 }),
      ]);

      const assignmentMap = new Map();
      (patientsRes.body?.data || []).forEach((item) => {
        assignmentMap.set(item.patientId, item);
      });

      const alertList = (alertsRes.body?.data || []).map((item) => {
        const assignment = assignmentMap.get(item.patientId);
        return {
          ...item,
          patientName: item.patientName || assignment?.patientName || "Bệnh nhân",
          patientCode: assignment?.patientCode || assignment?.patientPublicId || `PAT-${(item.patientId || "").substring(0, 6).toUpperCase()}`,
        };
      });

      alertList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAlerts(alertList);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      Alert.alert("Lỗi", "Không thể tải danh sách cảnh báo");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("NEW_ALERT", () => fetchAlerts(true));
    return () => sub.remove();
  }, [fetchAlerts]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchAlerts(true), 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Stats
  const stats = useMemo(() => {
    const pending = alerts.filter((a) => a.status === "open");
    return {
      pendingTotal: pending.length,
      pendingHigh: pending.filter((a) => a.severity === "high").length,
    };
  }, [alerts]);

  // Filtered alerts for ALL/RESOLVED tabs
  const filteredAlerts = useMemo(() => {
    let list = [...alerts];

    if (activeTab === "PENDING") {
      list = list.filter((a) => a.status === "open");
    } else if (activeTab === "RESOLVED") {
      list = list.filter((a) => a.status === "ack");
    }

    if (severityFilter !== "ALL") {
      list = list.filter((a) => a.severity === severityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          (a.patientName || "").toLowerCase().includes(q) ||
          (a.patientCode || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [alerts, activeTab, severityFilter, searchQuery]);

  // Grouped pending alerts by patient
  const groupedPending = useMemo(() => {
    if (activeTab !== "PENDING") return [];

    const groups = new Map();
    filteredAlerts.forEach((alert) => {
      const pid = alert.patientId;
      if (!groups.has(pid)) {
        groups.set(pid, {
          patientId: pid,
          patientName: alert.patientName,
          patientCode: alert.patientCode,
          alerts: [],
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          latestAlert: null,
        });
      }
      const group = groups.get(pid);
      group.alerts.push(alert);
      if (alert.severity === "high") group.highCount++;
      else if (alert.severity === "medium") group.mediumCount++;
      else group.lowCount++;

      if (!group.latestAlert || new Date(alert.createdAt) > new Date(group.latestAlert.createdAt)) {
        group.latestAlert = alert;
      }
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.highCount !== b.highCount) return b.highCount - a.highCount;
      if (a.mediumCount !== b.mediumCount) return b.mediumCount - a.mediumCount;
      return b.alerts.length - a.alerts.length;
    });
  }, [filteredAlerts, activeTab]);

  const toggleExpanded = (patientId) => {
    setExpandedPatients((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const openResolveModal = (alertsArr) => {
    const arr = Array.isArray(alertsArr) ? alertsArr : [alertsArr];
    setAlertsToResolve(arr);
    setResolveModalVisible(true);
  };

  const handleResolveConfirm = async () => {
    if (alertsToResolve.length === 0) return;
    setSubmitting(true);
    try {
      for (const alert of alertsToResolve) {
        await acknowledgeAlert(alert.id);
      }
      // Update locally
      const resolvedIds = new Set(alertsToResolve.map((a) => a.id));
      setAlerts((prev) =>
        prev.map((item) =>
          resolvedIds.has(item.id) ? { ...item, status: "ack" } : item
        )
      );
      setResolveModalVisible(false);
      setAlertsToResolve([]);
      showToast(`Đã xử lý thành công ${resolvedIds.size} cảnh báo`, "success");
    } catch (err) {
      console.error("Resolve error:", err);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi xử lý cảnh báo");
    } finally {
      setSubmitting(false);
    }
  };

  // --- RENDER HELPERS ---

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <View style={styles.statIconWrap}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.statLabel}>Chờ xử lý</Text>
          <Text style={styles.statValue}>{stats.pendingTotal}</Text>
        </View>
      </View>
      <View style={[styles.statCard, styles.statCardDanger]}>
        <View style={[styles.statIconWrap, { backgroundColor: colors.dangerSoftAlt }]}>
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
        </View>
        <View>
          <Text style={[styles.statLabel, { color: colors.danger }]}>Nguy hiểm</Text>
          <Text style={[styles.statValue, { color: colors.dangerAccent }]}>{stats.pendingHigh}</Text>
        </View>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabRow}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderFilters = () => {
    if (activeTab === "PENDING") return null;
    return (
      <View style={styles.filterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            placeholder="Tìm bệnh nhân..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.severityRow}>
          {SEVERITY_OPTIONS.map((opt) => {
            const isActive = severityFilter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.severityChip, isActive && styles.severityChipActive]}
                onPress={() => setSeverityFilter(opt.key)}
              >
                <Text style={[styles.severityChipText, isActive && styles.severityChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Pending tab: grouped by patient
  const renderPendingItem = ({ item: group }) => {
    const isExpanded = expandedPatients.has(group.patientId);

    return (
      <View style={styles.groupCard}>
        {/* Group Header */}
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => toggleExpanded(group.patientId)}
          activeOpacity={0.7}
        >
          <View style={styles.groupAvatar}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupName}>{group.patientName}</Text>
            <View style={styles.groupBadges}>
              <Text style={styles.groupAlertCount}>{group.alerts.length} cảnh báo:</Text>
              {group.highCount > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.dangerSoftAlt }]}>
                  <Text style={[styles.countBadgeText, { color: colors.danger }]}>
                    {group.highCount} Nguy hiểm
                  </Text>
                </View>
              )}
              {group.mediumCount > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.warningSoftBg }]}>
                  <Text style={[styles.countBadgeText, { color: colors.warningAccent }]}>
                    {group.mediumCount} Cảnh báo
                  </Text>
                </View>
              )}
              {group.lowCount > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.primarySoftBg }]}>
                  <Text style={[styles.countBadgeText, { color: colors.primaryAccent }]}>
                    {group.lowCount} Nhẹ
                  </Text>
                </View>
              )}
            </View>
            {group.latestAlert && (
              <Text style={styles.groupTime}>
                Mới nhất: {timeAgo(group.latestAlert.createdAt)}
              </Text>
            )}
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Group Actions */}
        <View style={styles.groupActions}>
          <TouchableOpacity
            style={styles.resolveAllBtn}
            onPress={() => openResolveModal(group.alerts)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done" size={14} color={colors.surface} />
            <Text style={styles.resolveAllBtnText}>Xử lý tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => navigation.navigate("ChatTab", { screen: "Chat", params: { patientId: group.patientId } })}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
            <Text style={styles.chatBtnText}>Nhắn tin</Text>
          </TouchableOpacity>
        </View>

        {/* Expanded Alerts */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            {group.alerts.map((alert) => (
              <View key={alert.id} style={styles.alertItem}>
                <View style={styles.alertItemHeader}>
                  <View style={[
                    styles.severityBadge,
                    alert.severity === "high" ? styles.sevHigh :
                      alert.severity === "medium" ? styles.sevMed : styles.sevLow,
                  ]}>
                    <Text style={[
                      styles.severityBadgeText,
                      { color: alert.severity === "high" ? colors.danger : alert.severity === "medium" ? colors.warningAccent : colors.primaryAccent },
                    ]}>
                      {alert.severity === "high" ? "Nguy hiểm" : alert.severity === "medium" ? "Cảnh báo" : "Nhẹ"}
                    </Text>
                  </View>
                  <Text style={styles.alertItemTime}>{formatDate(alert.createdAt)}</Text>
                </View>
                <View style={styles.violationsBlock}>
                  {alert.violations.map((v, i) => (
                    <Text key={i} style={styles.violationText}>
                      • {getViolationLabel(v.type)}: <Text style={styles.violationObserved}>{v.observed} {getUnit(v.type)}</Text>
                      <Text style={styles.violationThreshold}> (Ngưỡng: {v.threshold} {getUnit(v.type)})</Text>
                    </Text>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.resolveOneBtn}
                  onPress={() => openResolveModal(alert)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resolveOneBtnText}>Xác nhận xử lý</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // All/Resolved tab: flat list
  const renderFlatItem = ({ item }) => (
    <View style={styles.flatCard}>
      <View style={styles.flatHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.flatName}>{item.patientName}</Text>
          <Text style={styles.flatCode}>{item.patientCode}</Text>
        </View>
        <View style={[
          styles.severityBadge,
          item.severity === "high" ? styles.sevHigh :
            item.severity === "medium" ? styles.sevMed : styles.sevLow,
        ]}>
          <Text style={[
            styles.severityBadgeText,
            { color: item.severity === "high" ? colors.danger : item.severity === "medium" ? colors.warningAccent : colors.primaryAccent },
          ]}>
            {item.severity === "high" ? "Nguy hiểm" : item.severity === "medium" ? "Cảnh báo" : "Nhẹ"}
          </Text>
        </View>
      </View>

      <View style={styles.violationsBlock}>
        {item.violations.map((v, i) => (
          <Text key={i} style={styles.violationText}>
            • {getViolationLabel(v.type)}: <Text style={styles.violationObserved}>{v.observed} {getUnit(v.type)}</Text>
            <Text style={styles.violationThreshold}> (Ngưỡng: {v.threshold} {getUnit(v.type)})</Text>
          </Text>
        ))}
      </View>

      <View style={styles.flatFooter}>
        <View style={styles.flatTimeRow}>
          <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.flatTime}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.status === "ack" ? (
          <View style={styles.resolvedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.resolvedText}>
              Đã xử lý{item.acknowledgedByName ? ` • ${item.acknowledgedByName}` : ""}
            </Text>
          </View>
        ) : (
          <View style={styles.flatActions}>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => navigation.navigate("ChatTab", { screen: "Chat", params: { patientId: item.patientId } })}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary} />
              <Text style={styles.chatBtnText}>Nhắn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resolveAllBtn}
              onPress={() => openResolveModal(item)}
            >
              <Ionicons name="checkmark-circle-outline" size={13} color={colors.surface} />
              <Text style={styles.resolveAllBtnText}>Xử lý</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải cảnh báo...</Text>
        </View>
      );
    }

    if (activeTab === "PENDING") {
      if (groupedPending.length === 0) {
        return (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} />
            <Text style={styles.emptyTitle}>Tuyệt vời!</Text>
            <Text style={styles.emptyText}>Không có cảnh báo nào cần xử lý</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={groupedPending}
          keyExtractor={(item) => item.patientId}
          renderItem={renderPendingItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAlerts(true)} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        />
      );
    }
 
    if (filteredAlerts.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Không có cảnh báo nào</Text>
        </View>
      );
    }
 
    return (
      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => item.id}
        renderItem={renderFlatItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAlerts(true)} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderStats()}
      {renderTabs()}
      {renderFilters()}
      {renderContent()}

      {/* Resolve Confirmation Modal */}
      <Modal
        visible={resolveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setResolveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Xác nhận xử lý</Text>
              <TouchableOpacity onPress={() => !submitting && setResolveModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textHint} />
              </TouchableOpacity>
            </View>
 
            <Text style={styles.modalBody}>
              Bạn đang xác nhận xử lý{" "}
              <Text style={{ fontWeight: "700" }}>{alertsToResolve.length}</Text> cảnh báo.
              Hệ thống sẽ ghi nhận bạn là người xử lý.
            </Text>
 
            <View style={styles.modalAlertList}>
              {alertsToResolve.slice(0, 5).map((a) => (
                <View key={a.id} style={styles.modalAlertItem}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.modalAlertText} numberOfLines={1}>
                    {a.patientName}: {a.violations.map((v) => getViolationLabel(v.type)).join(", ")}
                  </Text>
                </View>
              ))}
              {alertsToResolve.length > 5 && (
                <Text style={styles.modalMoreText}>...và {alertsToResolve.length - 5} cảnh báo khác</Text>
              )}
            </View>
 
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setResolveModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleResolveConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
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
  container: { flex: 1, backgroundColor: colors.background },

  // Stats
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: spacing.card, paddingTop: 12, paddingBottom: 8 },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.cardSubtle,
  },
  statCardDanger: { borderColor: colors.dangerBorder },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoftBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: { fontSize: 11, fontWeight: "500", color: colors.textSecondary },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 2 },

  // Tabs
  tabRow: {
    flexDirection: "row",
    marginHorizontal: spacing.card,
    backgroundColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: 8,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: radius.sm },
  tabBtnActive: { backgroundColor: colors.surface, ...shadows.cardSubtle },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabBtnTextActive: { color: colors.primary },

  // Filters
  filterContainer: { paddingHorizontal: spacing.card, marginBottom: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 8,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.text },
  severityRow: { flexDirection: "row", gap: 8 },
  severityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.borderSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  severityChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  severityChipText: { fontSize: 12, fontWeight: "600", color: colors.textHint },
  severityChipTextActive: { color: colors.surface },

  // Center/Empty
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, textAlign: "center" },
  listContent: { padding: spacing.card, gap: 12, paddingBottom: 32 },

  // Grouped Pending
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
    ...shadows.card,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.card,
    gap: 12,
  },
  groupAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSoftBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: { fontSize: 15, fontWeight: "700", color: colors.text },
  groupBadges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
  groupAlertCount: { fontSize: 12, fontWeight: "500", color: colors.textHint },
  countBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs },
  countBadgeText: { fontSize: 10, fontWeight: "700" },
  groupTime: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  groupActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.card,
    paddingBottom: 12,
  },
  resolveAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.sm,
    gap: 4,
  },
  resolveAllBtnText: { fontSize: 12, fontWeight: "600", color: colors.surface },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSoftBlue,
    borderWidth: 1,
    borderColor: colors.primarySoftBg,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.sm,
    gap: 4,
  },
  chatBtnText: { fontSize: 12, fontWeight: "600", color: colors.primary },

  // Expanded alerts
  expandedContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    padding: 12,
    gap: 10,
  },
  alertItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  alertItemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  alertItemTime: { fontSize: 11, color: colors.textSecondary },
  resolveOneBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginTop: 8,
  },
  resolveOneBtnText: { fontSize: 12, fontWeight: "600", color: colors.textHint },

  // Severity badges
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs },
  sevHigh: { backgroundColor: colors.dangerSoftAlt },
  sevMed: { backgroundColor: colors.warningSoftBg },
  sevLow: { backgroundColor: colors.primarySoftBg },
  severityBadgeText: { fontSize: 11, fontWeight: "700" },

  // Violations
  violationsBlock: { gap: 4 },
  violationText: { fontSize: 13, color: colors.textHint, lineHeight: 18 },
  violationObserved: { fontWeight: "700", color: colors.danger },
  violationThreshold: { fontSize: 11, color: colors.textMuted },

  // Flat card (All/Resolved)
  flatCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.card,
  },
  flatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  flatName: { fontSize: 14, fontWeight: "700", color: colors.text },
  flatCode: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  flatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  flatTimeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  flatTime: { fontSize: 11, color: colors.textSecondary },
  flatActions: { flexDirection: "row", gap: 8 },
  resolvedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  resolvedText: { fontSize: 11, fontWeight: "600", color: colors.success },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlayLight, justifyContent: "center", alignItems: "center" },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius["3xl"],
    width: "88%",
    padding: 20,
    ...shadows.cardElevated,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  modalBody: { fontSize: 14, color: colors.textHint, lineHeight: 20, marginBottom: 12 },
  modalAlertList: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  modalAlertItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalAlertText: { fontSize: 12, color: colors.textHint, flex: 1 },
  modalMoreText: { fontSize: 12, color: colors.textSecondary, fontStyle: "italic" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: colors.textHint },
  confirmBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  confirmBtnText: { fontSize: 13, fontWeight: "600", color: colors.surface },
});

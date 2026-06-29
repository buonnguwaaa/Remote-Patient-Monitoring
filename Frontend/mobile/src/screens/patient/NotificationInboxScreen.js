import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
} from "../../api/notificationsApi";
import { recordMedicationIntake } from "../../api/medicationIntakeApi";
import { subscribeNotificationEvents } from "../../services/notificationEvents";
import { useSnackbar } from "../../hooks/useSnackbar";

function extractData(response) {
  if (!response?.ok) return null;
  return response.body?.data || response.body || null;
}

function extractList(response) {
  const data = extractData(response);
  return Array.isArray(data) ? data : [];
}

function normalizeNotification(item) {
  return {
    ...item,
    data: item?.data || {},
    isRead: Boolean(item?.isRead),
  };
}

function formatDateTime(iso) {
  if (!iso) return "Chưa có thời gian";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildNotificationMeta(item) {
  if (item?.type === "alert") {
    return {
      iconName: "alert-circle-outline",
      iconColor: "#DC2626",
      pillText: "Cảnh báo",
      title: item?.title || "Cảnh báo sức khỏe",
      subtitle: item?.body || "Có chỉ số vượt ngưỡng an toàn.",
    };
  }

  return {
    iconName: item?.data?.reminderKind === "measure" ? "timer-outline" : "medical-outline",
    iconColor: item?.data?.reminderKind === "measure" ? "#2563EB" : "#7C3AED",
    pillText: item?.data?.reminderKind === "measure" ? "Nhắc đo" : "Nhắc uống thuốc",
    title: item?.title || "Nhắc nhở sức khỏe",
    subtitle: item?.body || "Bạn có một nhắc nhở mới.",
  };
}

export default function NotificationInboxScreen({ isEmbedded }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { showSuccess, showError } = useSnackbar();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [filterMode, setFilterMode] = useState("all"); // "all" | "measure" | "medicine"
  const [takingMedicationForNotificationId, setTakingMedicationForNotificationId] = useState(null);
  const handledSelectedIdRef = useRef(null);

  const filteredNotifications = useMemo(() => {
    if (filterMode === "measure") {
      return notifications.filter((item) => item?.data?.reminderKind === "measure");
    }
    if (filterMode === "medicine") {
      return notifications.filter(
        (item) => item?.type === "reminder" && item?.data?.reminderKind !== "measure"
      );
    }
    return notifications;
  }, [notifications, filterMode]);

  const updateNotificationInState = useCallback((nextItem) => {
    setNotifications((current) =>
      current.map((item) => (item.id === nextItem.id ? { ...item, ...nextItem } : item))
    );
  }, []);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [listResponse, unreadResponse] = await Promise.all([
        getMyNotifications(),
        getUnreadNotificationCount(),
      ]);

      if (!listResponse?.ok) {
        throw new Error(listResponse?.body?.error || listResponse?.error || "Không thể tải thông báo.");
      }

      const list = extractList(listResponse)
        .map(normalizeNotification)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
      setNotifications(list);
      setUnreadCount(Number(extractData(unreadResponse)?.count || 0));
    } catch (loadError) {
      console.error("Failed to load notifications", loadError);
      setError(loadError?.message || "Không thể tải thông báo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications(false);
    }, [loadNotifications])
  );

  useEffect(() => {
    return subscribeNotificationEvents(() => {
      void loadNotifications(true);
    });
  }, [loadNotifications]);

  const handleOpenNotification = useCallback(
    async (item, options = {}) => {
      if (!item?.id) return;

      let nextItem = item;
      if (!item.isRead) {
        const response = await markNotificationRead(item.id);
        const updated = extractData(response);
        if (response?.ok && updated) {
          nextItem = normalizeNotification(updated);
          updateNotificationInState(nextItem);
          setUnreadCount((current) => Math.max(0, current - 1));
        }
      }

      const data = nextItem.data || {};
      if (options.fromDeepLink) {
        handledSelectedIdRef.current = nextItem.id;
      }
      if (nextItem.type === "alert" && data.alertId) {
        navigation.navigate("PatientAlerts", {
          selectedAlertId: data.alertId,
          notificationId: nextItem.id,
        });
        return;
      }

      if (nextItem.type === "reminder" && (data.targetScreen === "InputMeasurementPatientScreen" || data.reminderKind === "measure")) {
        navigation.navigate("InputMeasurementPatientScreen", {
          selectedReminderId: data.reminderId,
          reminderKind: data.reminderKind,
          reminderMessage: nextItem.body,
          notificationId: nextItem.id,
        });
        return;
      }

      setSelectedNotification(nextItem);
    },
    [navigation, updateNotificationInState]
  );

  const handleTakeMedicationFromNotification = useCallback(
    async (item) => {
      if (!item?.id || !item?.data) return;
      
      const { prescriptionId, drugName, dose } = item.data;
      if (!prescriptionId || !drugName || !dose) {
        showError("Thông tin thuốc không đầy đủ");
        return;
      }

      try {
        setTakingMedicationForNotificationId(item.id);
        await recordMedicationIntake({
          prescriptionId,
          drugName,
          dose,
          takenAt: new Date().toISOString(),
        });
        showSuccess(`Đã ghi nhận uống ${drugName}`);
        
        // Mark as read
        if (!item.isRead) {
          const response = await markNotificationRead(item.id);
          const updated = extractData(response);
          if (response?.ok && updated) {
            updateNotificationInState(normalizeNotification(updated));
            setUnreadCount((current) => Math.max(0, current - 1));
          }
        }
      } catch (err) {
        showError(err.message || "Không thể ghi nhận uống thuốc");
      } finally {
        setTakingMedicationForNotificationId(null);
      }
    },
    [updateNotificationInState, showSuccess, showError]
  );

  useEffect(() => {
    const selectedNotificationId = route?.params?.selectedNotificationId;
    if (!selectedNotificationId || notifications.length === 0) return;
    if (handledSelectedIdRef.current === selectedNotificationId) return;

    const matched = notifications.find((item) => item.id === selectedNotificationId);
    if (matched) {
      void handleOpenNotification(matched, { fromDeepLink: true });
    }
  }, [route?.params?.selectedNotificationId, notifications, handleOpenNotification]);

  const summary = useMemo(() => {
    if (notifications.length === 0) {
      return "Chưa có thông báo nào được ghi nhận.";
    }
    if (unreadCount === 0) {
      return `Bạn đã xem hết ${notifications.length} thông báo.`;
    }
    return `Bạn có ${unreadCount} thông báo chưa đọc.`;
  }, [notifications.length, unreadCount]);

  const Container = isEmbedded ? View : SafeAreaView;

  return (
    <Container style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadNotifications(true)} />}
      >
        <View style={styles.headerCard}>
          <Text style={styles.title}>Trung tâm thông báo</Text>
          <Text style={styles.subtitle}>{summary}</Text>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === "all" && styles.filterTabActive]}
            onPress={() => setFilterMode("all")}
          >
            <Text style={[styles.filterText, filterMode === "all" && styles.filterTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === "measure" && styles.filterTabActive]}
            onPress={() => setFilterMode("measure")}
          >
            <Text style={[styles.filterText, filterMode === "measure" && styles.filterTextActive]}>
              Nhắc đo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterMode === "medicine" && styles.filterTabActive]}
            onPress={() => setFilterMode("medicine")}
          >
            <Text style={[styles.filterText, filterMode === "medicine" && styles.filterTextActive]}>
              Nhắc uống thuốc
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.stateText}>Đang tải thông báo…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={24} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void loadNotifications(false)}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="notifications-off-outline" size={28} color="#9CA3AF" />
            <Text style={styles.stateText}>
              {filterMode === "all"
                ? "Chưa có thông báo trong hộp thư."
                : filterMode === "measure"
                ? "Không có nhắc nhở đo nào."
                : "Không có nhắc nhở uống thuốc nào."}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((item) => {
            const meta = buildNotificationMeta(item);
            const isMedicineReminder = item.type === "reminder" && item?.data?.reminderKind !== "measure";
            const isLoading = takingMedicationForNotificationId === item.id;

            return (
              <View
                key={item.id}
                style={[styles.notificationCard, !item.isRead && styles.notificationCardUnread]}
              >
                <TouchableOpacity
                  style={styles.notificationMainContent}
                  activeOpacity={0.85}
                  onPress={() => void handleOpenNotification(item)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${meta.iconColor}15` }]}> 
                    <Ionicons name={meta.iconName} size={22} color={meta.iconColor} />
                  </View>
                  <View style={styles.notificationBody}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.notificationTitle}>{meta.title}</Text>
                      {!item.isRead ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text style={styles.notificationSubtitle}>{meta.subtitle}</Text>
                    <View style={styles.rowBetween}>
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{meta.pillText}</Text>
                      </View>
                      <Text style={styles.timestamp}>{formatDateTime(item.createdAt)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {isMedicineReminder && item?.data?.prescriptionId && item?.data?.drugName && item?.data?.dose && (
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => void handleTakeMedicationFromNotification(item)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.quickActionButtonText}>Uống</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal transparent animationType="fade" visible={Boolean(selectedNotification)} onRequestClose={() => setSelectedNotification(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedNotification(null)} />
          {selectedNotification ? (
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{selectedNotification.title}</Text>
              <Text style={styles.modalTime}>{formatDateTime(selectedNotification.createdAt)}</Text>
              <Text style={styles.modalBody}>{selectedNotification.body}</Text>
              <TouchableOpacity style={styles.modalButton} onPress={() => setSelectedNotification(null)}>
                <Text style={styles.modalButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F6FF" },
  contentContainer: { padding: 16, paddingBottom: 32 },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: { marginTop: 6, fontSize: 13, lineHeight: 20, color: "#6B7280" },
  stateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateText: { fontSize: 14, color: "#4B5563", textAlign: "center" },
  errorText: { fontSize: 14, color: "#991B1B", textAlign: "center" },
  retryButton: {
    marginTop: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  notificationMainContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  notificationCardUnread: {
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBody: { flex: 1 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  notificationTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111827" },
  notificationSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 20, color: "#4B5563" },
  unreadDot: { width: 9, height: 9, borderRadius: 999, backgroundColor: "#2563EB" },
  pill: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: "700", color: "#1D4ED8" },
  timestamp: { marginTop: 12, fontSize: 11, color: "#6B7280" },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    marginTop: 12,
  },
  quickActionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.45)",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalTime: { marginTop: 6, fontSize: 12, color: "#6B7280" },
  modalBody: { marginTop: 14, fontSize: 14, lineHeight: 22, color: "#374151" },
  modalButton: {
    marginTop: 18,
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  modalButtonText: { color: "#FFFFFF", fontWeight: "700" },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#E5EDFF",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterTextActive: {
    color: "#2563EB",
  },
});

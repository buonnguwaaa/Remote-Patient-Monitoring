/**
 * ActivityHistoryList.js
 *
 * Component hiển thị danh sách "Lịch sử hoạt động" dành cho Bác sĩ & Y tá sử dụng FlatList.
 * API: GET /activity-logs/me
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import request from "../api/httpClient";
import { colors, radius, spacing, shadows } from "../theme/rpmTheme";

const PAGE_SIZE = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fmtKey = (d) => d.toISOString().slice(0, 10);
  if (dateStr === fmtKey(today)) return "Hôm nay";
  if (dateStr === fmtKey(yesterday)) return "Hôm qua";

  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;

  return dateObj.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getResourceIcon(resource, action) {
  if (action?.includes("Đăng nhập") || action?.includes("Đăng xuất")) return "log-in-outline";
  switch (resource) {
    case "prescriptions":
    case "medication-intakes":
      return "medical-outline";
    case "measurements":
      return "pulse-outline";
    case "reminders":
      return "notifications-outline";
    case "follow-up-appointments":
      return "calendar-outline";
    case "alerts":
      return "warning-outline";
    case "thresholds":
      return "settings-outline";
    case "patients":
    case "doctors":
    case "nurses":
      return "person-outline";
    default:
      return "time-outline";
  }
}

function getResourceColor(resource, action) {
  if (action?.includes("Đăng nhập") || action?.includes("Đăng xuất")) return "#3B82F6";
  if (action?.includes("Xóa")) return colors.danger;
  if (action?.includes("Tạo") || action?.includes("Ghi nhận") || action?.includes("Thêm")) return colors.success;
  if (action?.includes("Cập nhật") || action?.includes("Kích hoạt") || action?.includes("Vô hiệu"))
    return colors.warning;
  switch (resource) {
    case "prescriptions":
    case "medication-intakes":
      return "#7C3AED";
    case "measurements":
      return "#0891B2";
    case "reminders":
      return "#EA580C";
    case "follow-up-appointments":
      return "#0284C7";
    case "alerts":
      return colors.danger;
    default:
      return colors.primary;
  }
}

function getResourceBg(resource, action) {
  if (action?.includes("Đăng nhập") || action?.includes("Đăng xuất")) return "#EFF6FF";
  if (action?.includes("Xóa")) return "#FEE2E2";
  if (action?.includes("Tạo") || action?.includes("Ghi nhận") || action?.includes("Thêm")) return "#DCFCE7";
  if (action?.includes("Cập nhật") || action?.includes("Kích hoạt") || action?.includes("Vô hiệu"))
    return "#FEF3C7";
  switch (resource) {
    case "prescriptions":
    case "medication-intakes":
      return "#EDE9FE";
    case "measurements":
      return "#ECFEFF";
    case "reminders":
      return "#FFEDD5";
    case "follow-up-appointments":
      return "#E0F2FE";
    case "alerts":
      return "#FEE2E2";
    default:
      return colors.primaryTint;
  }
}

function buildSections(items) {
  const result = [];
  let lastDate = null;
  for (const item of items) {
    if (item.date !== lastDate) {
      result.push({ type: "header", date: item.date, key: `header-${item.date}` });
      lastDate = item.date;
    }
    result.push({ type: "item", ...item, key: `item-${item.id}` });
  }
  return result;
}

// ─── Sub-Components (Memoized) ────────────────────────────────────────────────
const DateHeader = React.memo(({ date }) => (
  <View style={styles.dateHeader}>
    <Text style={styles.dateHeaderText}>{formatDateLabel(date)}</Text>
    <View style={styles.dateHeaderLine} />
  </View>
));

const ActivityRow = React.memo(({ item }) => {
  const iconName = getResourceIcon(item.resource, item.action);
  const iconColor = getResourceColor(item.resource, item.action);
  const iconBg = getResourceBg(item.resource, item.action);

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={15} color={iconColor} />
      </View>

      <View style={styles.activityContent}>
        <Text style={styles.activityAction} numberOfLines={2}>
          {item.action}
        </Text>
        {item.patientId ? (
          <Text style={styles.activityMeta}>
            {item.patientName ? `Bệnh nhân: ${item.patientName}` : "Có liên quan bệnh nhân"}
          </Text>
        ) : null}
      </View>

      <Text style={styles.activityTime}>{item.timestamp}</Text>
    </View>
  );
});

const EmptyState = React.memo(() => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name="time-outline" size={32} color={colors.textMuted} />
    </View>
    <Text style={styles.emptyTitle}>Chưa có hoạt động</Text>
    <Text style={styles.emptyDesc}>Các thao tác lâm sàng của bạn sẽ xuất hiện tại đây</Text>
  </View>
));

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ActivityHistoryList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(async (p, isRefresh = false, isLoadMore = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const res = await request(`/activity-logs/me?page=${p}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) {
        const errorMsg = res.body?.error || res.error || `HTTP ${res.status}: Lỗi tải dữ liệu`;
        throw new Error(errorMsg);
      }

      const body = res.body || {};
      const newItems = body.data || [];

      setItems((prev) => (p === 1 ? newItems : [...prev, ...newItems]));
      setTotalPages(body.totalPages || 1);
      setTotal(body.total || 0);
      setPage(body.page || p);
      setError(null);
    } catch (err) {
      setError(err.message || "Không thể tải lịch sử hoạt động.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const handleRefresh = useCallback(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  const handleLoadMore = useCallback(() => {
    if (page < totalPages && !loadingMore && !loading && !refreshing) {
      fetchPage(page + 1, false, true);
    }
  }, [page, totalPages, loadingMore, loading, refreshing, fetchPage]);

  const sections = buildSections(items);

  const renderItem = useCallback(({ item }) => {
    if (item.type === "header") {
      return <DateHeader date={item.date} />;
    }
    return <ActivityRow item={item} />;
  }, []);

  const keyExtractor = useCallback((item) => item.key, []);

  if (loading && !refreshing && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Đang tải lịch sử hoạt động...</Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchPage(1)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {total > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>Tổng cộng {total} hoạt động</Text>
        </View>
      )}

      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.footerLoaderText}>Đang tải thêm...</Text>
            </View>
          ) : null
        }
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.screen,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing["4xl"],
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: 8,
    gap: 10,
    ...shadows.cardSubtle,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 18,
  },
  activityMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  activityTime: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
    marginTop: 2,
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorWrap: {
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerSoftAlt,
    borderRadius: radius.xl,
    padding: 20,
    maxWidth: 300,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: colors.surfaceSoftBlue,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 24,
    ...shadows.card,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius["3xl"],
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textHint,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});

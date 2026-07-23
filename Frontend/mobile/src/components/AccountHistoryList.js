/**
 * AccountHistoryList.js
 *
 * Component hiển thị danh sách "Lịch sử tài khoản" dành cho Bệnh nhân sử dụng FlatList.
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
import { request } from "../api/httpClient";

const PAGE_SIZE = 15;

const COLORS = {
  primary: "#2563EB",
  primaryTint: "#EEF2FF",
  primarySoftBg: "#DBEAFE",
  primaryDark: "#1D4ED8",
  surface: "#FFFFFF",
  background: "#F2F6FF",
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textHint: "#4B5563",
  border: "#E5E7EB",
  borderSoft: "#F3F4F6",
  danger: "#DC2626",
  dangerSoftAlt: "#FEF2F2",
  success: "#16A34A",
  warning: "#D97706",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const key = (d) => d.toISOString().slice(0, 10);
  if (dateStr === key(today)) return "Hôm nay";
  if (dateStr === key(yesterday)) return "Hôm qua";

  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;

  return dateObj.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getActorIcon(actorRole, action) {
  if (action?.includes("Đăng nhập") || action?.includes("Đăng xuất")) return "log-in-outline";
  if (actorRole?.toLowerCase().includes("bác sĩ") || actorRole === "doctor") return "medkit-outline";
  if (actorRole?.toLowerCase().includes("điều dưỡng") || actorRole?.toLowerCase().includes("y tá") || actorRole === "nurse") return "person-add-outline";
  if (actorRole?.toLowerCase().includes("bạn") || actorRole === "patient") return "person-outline";
  return "time-outline";
}

function getActionColor(action) {
  if (action?.includes("Xóa")) return { bg: "#FEE2E2", icon: COLORS.danger };
  if (action?.includes("Tạo") || action?.includes("Ghi nhận") || action?.includes("Thêm"))
    return { bg: "#DCFCE7", icon: COLORS.success };
  if (action?.includes("Cập nhật") || action?.includes("Kích hoạt"))
    return { bg: "#FEF3C7", icon: COLORS.warning };
  if (action?.includes("Đăng nhập") || action?.includes("Đăng xuất"))
    return { bg: "#EFF6FF", icon: COLORS.primary };
  return { bg: COLORS.primaryTint, icon: COLORS.primary };
}

function buildSections(items) {
  const rows = [];
  let lastDate = null;
  for (const item of items) {
    if (item.date !== lastDate) {
      rows.push({ type: "header", date: item.date, key: `h-${item.date}` });
      lastDate = item.date;
    }
    rows.push({ type: "item", ...item, key: `item-${item.id}` });
  }
  return rows;
}

// ─── Sub-Components (Memoized) ────────────────────────────────────────────────
const DateHeader = React.memo(({ date }) => (
  <View style={styles.dateHeader}>
    <Text style={styles.dateHeaderText}>{formatDateLabel(date)}</Text>
    <View style={styles.dateHeaderLine} />
  </View>
));

const ActivityRow = React.memo(({ item }) => {
  const iconName = getActorIcon(item.actorRole, item.action);
  const { bg, icon: iconColor } = getActionColor(item.action);

  const isSelf = item.actorName === "Bạn";
  const actorLabel = isSelf
    ? "Bạn"
    : `${item.actorRole ? item.actorRole + " " : ""}${item.actorName || ""}`.trim();

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: bg }]}>
        <Ionicons name={iconName} size={15} color={iconColor} />
      </View>

      <View style={styles.activityContent}>
        <Text style={styles.activityAction} numberOfLines={2}>
          {item.action}
        </Text>
        {actorLabel ? (
          <Text style={styles.activityActor} numberOfLines={1}>
            Người thực hiện: {actorLabel}
          </Text>
        ) : null}
      </View>

      <Text style={styles.activityTime}>{item.timestamp}</Text>
    </View>
  );
});

const EmptyState = React.memo(() => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name="time-outline" size={32} color={COLORS.textMuted} />
    </View>
    <Text style={styles.emptyTitle}>Chưa có lịch sử</Text>
    <Text style={styles.emptyDesc}>
      Các hoạt động trên tài khoản của bạn sẽ xuất hiện tại đây
    </Text>
  </View>
));

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AccountHistoryList() {
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
      if (!res.ok) throw new Error(res.body?.error || "Không thể tải lịch sử tài khoản.");

      const body = res.body || {};
      const newItems = body.data || [];

      setItems((prev) => (p === 1 ? newItems : [...prev, ...newItems]));
      setTotalPages(body.totalPages || 1);
      setTotal(body.total || 0);
      setPage(body.page || p);
      setError(null);
    } catch (err) {
      setError(err.message || "Không thể tải lịch sử tài khoản.");
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải lịch sử tài khoản...</Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={36} color={COLORS.danger} />
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
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={COLORS.primary} />
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
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
    color: COLORS.textSecondary,
    textTransform: "capitalize",
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
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
    color: COLORS.text,
    lineHeight: 18,
  },
  activityActor: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textMuted,
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
    color: COLORS.textSecondary,
  },
  errorWrap: {
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.dangerSoftAlt,
    borderRadius: 16,
    padding: 20,
    maxWidth: 300,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 24,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textHint,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});

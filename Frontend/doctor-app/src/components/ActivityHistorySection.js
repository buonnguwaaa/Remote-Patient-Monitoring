/**
 * ActivityHistorySection.js
 *
 * Shared component dùng chung cho ProfileScreen (Bác sĩ) và NurseProfileScreen (Y tá).
 * Hiển thị lịch sử hoạt động lâm sàng của user đang đăng nhập, group theo ngày,
 * với icon phân loại và nút "Xem thêm" (load 10 mục / lần).
 *
 * API: GET /activity-logs/me
 * Response cho doctor/nurse: ClinicalHistoryListResponse
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import request from "../api/httpClient";
import { colors, radius, spacing, typography, shadows } from "../theme/rpmTheme";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateLabel(dateStr) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fmtKey = (d) => d.toISOString().slice(0, 10);
  if (dateStr === fmtKey(today)) return "Hôm nay";
  if (dateStr === fmtKey(yesterday)) return "Hôm qua";

  return new Date(dateStr).toLocaleDateString("vi-VN", {
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

/**
 * Group flat list items thành sections theo ngày để dùng với FlatList.
 * Returns mảng kiểu: [ {type:'header', date}, {type:'item', ...item}, ... ]
 */
function buildSections(items) {
  const result = [];
  let lastDate = null;
  for (const item of items) {
    if (item.date !== lastDate) {
      result.push({ type: "header", date: item.date, key: `header-${item.date}` });
      lastDate = item.date;
    }
    result.push({ type: "item", ...item, key: item.id });
  }
  return result;
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
function DateHeader({ date }) {
  return (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{formatDateLabel(date)}</Text>
      <View style={styles.dateHeaderLine} />
    </View>
  );
}

function ActivityRow({ item }) {
  const iconName = getResourceIcon(item.resource, item.action);
  const iconColor = getResourceColor(item.resource, item.action);
  const iconBg = getResourceBg(item.resource, item.action);

  return (
    <View style={styles.activityRow}>
      {/* Icon */}
      <View style={[styles.activityIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={15} color={iconColor} />
      </View>

      {/* Content */}
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

      {/* Time */}
      <Text style={styles.activityTime}>{item.timestamp}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="time-outline" size={28} color={colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Chưa có hoạt động</Text>
      <Text style={styles.emptyDesc}>Các thao tác lâm sàng của bạn sẽ xuất hiện tại đây</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ActivityHistorySection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(async (p, append = false) => {
    try {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await request(`/activity-logs/me?page=${p}&pageSize=${PAGE_SIZE}`);
      if (!res.ok) {
        const errorMsg = res.body?.error || res.error || `HTTP ${res.status}: Lỗi tải dữ liệu`;
        throw new Error(errorMsg);
      }

      const body = res.body;
      setItems((prev) => (append ? [...prev, ...(body.data || [])] : body.data || []));
      setTotalPages(body.totalPages || 1);
      setTotal(body.total || 0);
      setPage(body.page || p);
      setError(null);
    } catch (err) {
      setError(err.message || "Không thể tải lịch sử hoạt động.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const toggleExpanded = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    if (nextState && items.length === 0 && !error) {
      fetchPage(1);
    }
  };

  // Tải lại mỗi khi tab Profile được focus nếu đang mở
  useFocusEffect(
    useCallback(() => {
      if (isExpanded) {
        fetchPage(1);
      }
    }, [fetchPage, isExpanded])
  );

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchPage(page + 1, true);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const sections = buildSections(items);

  return (
    <View style={styles.container}>
      {/* Section Title Toggle */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={toggleExpanded}
      >
        <Text style={styles.sectionTitle}>LỊCH SỬ HOẠT ĐỘNG</Text>
        {total > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{total}</Text>
          </View>
        )}
        <Ionicons 
          name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} 
          size={16} 
          color={colors.textMuted} 
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>

      {isExpanded && (
        <>
          {/* Loading */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : error ? (
            /* Error */
            <View style={styles.errorWrap}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => fetchPage(1)} style={styles.retryBtn}>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : items.length === 0 ? (
            /* Empty */
            <EmptyState />
          ) : (
            /* List */
            <View style={styles.card}>
              {sections.map((row) =>
                row.type === "header" ? (
                  <DateHeader key={row.key} date={row.date} />
                ) : (
                  <ActivityRow key={row.key} item={row} />
                )
              )}

              {/* Load More */}
              {page < totalPages && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={handleLoadMore}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="chevron-down-outline" size={14} color={colors.primary} />
                      <Text style={styles.loadMoreText}>Xem thêm</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: colors.primarySoftBg,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },

  // Date header inside card
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSoft,
  },

  // Activity row
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 10,
  },
  activityIcon: {
    width: 32,
    height: 32,
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
    fontWeight: "500",
    color: colors.text,
    lineHeight: 18,
  },
  activityMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    flexShrink: 0,
    marginTop: 2,
  },

  // Load more
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 14,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },

  // States
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorWrap: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.dangerSoftAlt,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 4,
    backgroundColor: colors.surfaceSoftBlue,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },

  emptyContainer: {
    paddingVertical: 28,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...shadows.card,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius["3xl"],
    backgroundColor: colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textHint,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 18,
  },
});

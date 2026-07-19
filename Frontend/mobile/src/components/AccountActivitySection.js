/**
 * AccountActivitySection.js
 *
 * Component hiển thị "Lịch sử tài khoản" dành cho bệnh nhân.
 * Bệnh nhân thấy được:
 *   - Ai (bác sĩ/y tá/bản thân) đã làm gì trên hồ sơ của họ
 *   - Các thao tác của chính họ (cập nhật hồ sơ, nhập chỉ số, v.v.)
 *
 * API: GET /activity-logs/me (role=patient)
 * Response: AccountActivityListResponse { data: AccountActivityItem[] }
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { request } from "../api/httpClient";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

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
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const key = (d) => d.toISOString().slice(0, 10);
  if (dateStr === key(today)) return "Hôm nay";
  if (dateStr === key(yesterday)) return "Hôm qua";

  return new Date(dateStr).toLocaleDateString("vi-VN", {
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
    rows.push({ type: "item", ...item, key: item.id });
  }
  return rows;
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
  const iconName = getActorIcon(item.actorRole, item.action);
  const { bg, icon: iconColor } = getActionColor(item.action);

  const isSelf = item.actorName === "Bạn";
  const actorLabel = isSelf
    ? "Bạn"
    : `${item.actorRole ? item.actorRole + " " : ""}${item.actorName || ""}`.trim();

  return (
    <View style={styles.activityRow}>
      {/* Actor icon */}
      <View style={[styles.activityIcon, { backgroundColor: bg }]}>
        <Ionicons name={iconName} size={15} color={iconColor} />
      </View>

      {/* Content */}
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

      {/* Time */}
      <Text style={styles.activityTime}>{item.timestamp}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="time-outline" size={26} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Chưa có lịch sử</Text>
      <Text style={styles.emptyDesc}>
        Các hoạt động trên tài khoản của bạn sẽ xuất hiện tại đây
      </Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AccountActivitySection() {
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
      if (!res.ok) throw new Error(res.body?.error || "Lỗi tải dữ liệu");

      const body = res.body;
      setItems((prev) => (append ? [...prev, ...(body.data || [])] : body.data || []));
      setTotalPages(body.totalPages || 1);
      setTotal(body.total || 0);
      setPage(body.page || p);
      setError(null);
    } catch (err) {
      setError(err.message || "Không thể tải lịch sử tài khoản.");
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

  useFocusEffect(
    useCallback(() => {
      // Tải lại khi quay lại nếu đang mở
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

  const sections = buildSections(items);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={toggleExpanded}
      >
        <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.sectionTitle}>LỊCH SỬ TÀI KHOẢN</Text>
        {total > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{total}</Text>
          </View>
        )}
        <Ionicons 
          name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} 
          size={16} 
          color={COLORS.textMuted} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <>
          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator color={COLORS.primary} size="small" />
            </View>
          ) : error ? (
            <View style={styles.errorWrap}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => fetchPage(1)} style={styles.retryBtn}>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
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
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <Ionicons name="chevron-down-outline" size={13} color={COLORS.primary} />
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
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    flex: 1,
  },
  countBadge: {
    backgroundColor: COLORS.primarySoftBg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderSoft,
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
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
    color: COLORS.text,
    lineHeight: 18,
  },
  activityActor: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    flexShrink: 0,
    marginTop: 2,
  },

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
    color: COLORS.primary,
  },

  stateWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorWrap: {
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.dangerSoftAlt,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.danger,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },

  emptyWrap: {
    paddingVertical: 28,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 20,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textHint,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 18,
  },
});

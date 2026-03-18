import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

const alerts = [
  {
    id: "a1",
    patientId: "p1",
    doctorId: "d1",
    measurementId: "m1",
    type: "bp",
    rule: "SYS > 150",
    observed: 165,
    thresholdAtTime: 150,
    severity: "high",
    status: "open",
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: "2025-11-24T14:30:00Z",
    updatedAt: "2025-11-24T14:31:00Z",
  },
  {
    id: "a2",
    patientId: "p1",
    doctorId: "d1",
    measurementId: "m2",
    type: "glucose",
    rule: "GLUCOSE > 130",
    observed: 145,
    thresholdAtTime: 130,
    severity: "high",
    status: "open",
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: "2025-11-24T08:15:00Z",
    updatedAt: "2025-11-24T08:16:00Z",
  },
  {
    id: "a3",
    patientId: "p1",
    doctorId: "d1",
    measurementId: "m3",
    type: "bp",
    rule: "SYS between 90-140",
    observed: 118,
    thresholdAtTime: 140,
    severity: "info",
    status: "ack",
    acknowledgedBy: "d1",
    acknowledgedAt: "2025-11-24T07:20:00Z",
    createdAt: "2025-11-24T07:10:00Z",
    updatedAt: "2025-11-24T07:20:00Z",
  },
  {
    id: "a4",
    patientId: "p1",
    doctorId: "d1",
    measurementId: "m4",
    type: "glucose",
    rule: "GLUCOSE > 130",
    observed: 132,
    thresholdAtTime: 130,
    severity: "info",
    status: "ack",
    acknowledgedBy: "d1",
    acknowledgedAt: "2025-11-23T15:30:00Z",
    createdAt: "2025-11-23T15:20:00Z",
    updatedAt: "2025-11-23T15:30:00Z",
  },
];

function formatDateTime(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} • ${hh}:${mi}`;
}

export default function AlertScreen() {
  const [tab, setTab] = useState("all");

  const openCount = alerts.filter((a) => a.status === "open").length;

  const filteredAlerts = alerts.filter((a) => {
    if (tab === "all") return true;
    return a.status === tab;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Cảnh báo</Text>

          <View style={styles.badgeNew}>
            <Text style={styles.badgeText}>{openCount} chưa xác nhận</Text>
          </View>
        </View>

        {/* TABS (all / open / ack) */}
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

        {/* ALERT LIST */}
        <View style={styles.list}>
          {filteredAlerts.map((alert) => {
            const isHigh = alert.severity === "high";
            const isOpen = alert.status === "open";

            const typeLabel =
              alert.type === "bp"
                ? "Huyết áp"
                : alert.type === "glucose"
                  ? "Đường huyết"
                  : "Sinh hiệu";

            const iconName =
              alert.type === "bp"
                ? "fitness"
                : alert.type === "glucose"
                  ? "water"
                  : "pulse";

            return (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  isHigh ? styles.alertCardHigh : styles.alertCardInfo,
                  !isOpen && styles.alertCardAck,
                ]}
              >
                {/* Header: icon + type + severity */}
                <View style={styles.alertHeaderRow}>
                  <View style={styles.alertTitleWrapper}>
                    <Ionicons
                      name={iconName}
                      size={20}
                      color={isHigh ? "#DC2626" : "#1D4ED8"}
                    />
                    <Text style={styles.alertTypeText}>{typeLabel}</Text>
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

                {/* Observed + threshold + rule */}
                <Text style={styles.alertMainValue}>
                  Giá trị đo:{" "}
                  <Text style={styles.alertMainValueNumber}>{alert.observed}</Text>
                </Text>

                <Text style={styles.alertThresholdText}>
                  Ngưỡng tại lúc đo:{" "}
                  <Text style={styles.alertThresholdNumber}>
                    {alert.thresholdAtTime}
                  </Text>{" "}
                  · Quy tắc: {alert.rule}
                </Text>

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

                  {alert.status === "ack" && alert.acknowledgedAt && (
                    <Text style={styles.alertMetaText}>
                      Đã xác nhận: {formatDateTime(alert.acknowledgedAt)}
                    </Text>
                  )}
                </View>

                {/* Status + action */}
                <View style={styles.alertMetaRow}>
                  <View
                    style={
                      isOpen
                        ? styles.alertStatusPillOpen
                        : styles.alertStatusPillAck
                    }
                  >
                    <Text
                      style={
                        isOpen
                          ? styles.alertStatusTextOpen
                          : styles.alertStatusTextAck
                      }
                    >
                      {isOpen ? "Chưa xác nhận" : "Đã xác nhận"}
                    </Text>
                  </View>

                  {isOpen && (
                    <TouchableOpacity style={styles.actionBtnPrimary}>
                      <Text style={styles.actionBtnText}>Đánh dấu đã xác nhận</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1, color: "#111827" },
  badgeNew: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },

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
  tabText: { color: "#6B7280", fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: "#2563EB" },

  list: { gap: 14 },

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
    backgroundColor: "#F3F4FF",
  },
  alertCardAck: {
    opacity: 0.9,
  },

  alertHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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

  alertMainValue: {
    marginTop: 4,
    fontSize: 13,
    color: "#374151",
  },
  alertMainValueNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  alertThresholdText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  alertThresholdNumber: {
    fontWeight: "600",
    color: "#111827",
  },

  alertMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  alertMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertMetaText: {
    fontSize: 11,
    color: "#9CA3AF",
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

  actionBtnPrimary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});

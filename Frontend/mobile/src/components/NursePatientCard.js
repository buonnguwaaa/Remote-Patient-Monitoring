import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

function formatRelativeTime(iso) {
  if (!iso) return "Chưa có dữ liệu";

  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) {
    return "Chưa có dữ liệu";
  }

  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function getInitials(name) {
  return (
    String(name || "")
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "BN"
  );
}

function NursePatientCard({ patient, onPress }) {
  const initials = getInitials(patient?.user?.name);
  const hasHighAlert = patient?.alertsSummary?.high > 0;
  const hasMediumAlert = patient?.alertsSummary?.medium > 0;
  const hasLowAlert = patient?.alertsSummary?.low > 0;
  const bp = patient?.lastMeasurements?.bp;
  const glucose = patient?.lastMeasurements?.glucose;
  const spo2 = patient?.lastMeasurements?.spo2;
  const temp = patient?.lastMeasurements?.temp;
  const hr = patient?.lastMeasurements?.heartRate;
  const rr = patient?.lastMeasurements?.respiratoryRate;

  return (
    <TouchableOpacity style={styles.patientItem} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.patientItemTop}>
        <View style={styles.patientLeft}>
          <View style={styles.patientAvatarCircle}>
            <Text style={styles.patientAvatarInitial}>{initials}</Text>
          </View>
          <View style={styles.patientContent}>
            <View style={styles.patientNameRow}>
              <Text style={styles.patientNameText}>{patient?.user?.name}</Text>
              {!patient?.user?.isActive ? (
                <View style={styles.statusBadgeInactive}>
                  <Text style={styles.statusBadgeInactiveText}>Ngừng kích hoạt</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.patientInfoLine}>
              Mã hồ sơ: {patient?.patientCode || "Chưa có mã"}
            </Text>
            <Text style={styles.patientInfoLine}>
              BHYT: {patient?.patientInfo?.insuranceNumber || "Chưa cập nhật"}
            </Text>
            <Text style={styles.patientInfoLineSmall}>
              CCCD: {patient?.patientInfo?.CCCD || "Chưa cập nhật"}
            </Text>
          </View>
        </View>

        <View style={styles.rightArrowBox}>
          {hasHighAlert ? (
            <View style={styles.alertBadgeHigh}>
              <Ionicons
                name="alert-circle"
                size={14}
                color="#B91C1C"
                style={styles.badgeIcon}
              />
              <Text style={styles.alertBadgeHighText}>Nguy hiểm</Text>
            </View>
          ) : hasMediumAlert ? (
            <View style={styles.alertBadgeMedium}>
              <Ionicons
                name="warning"
                size={14}
                color="#B45309"
                style={styles.badgeIcon}
              />
              <Text style={styles.alertBadgeMediumText}>Cảnh báo</Text>
            </View>
          ) : hasLowAlert ? (
            <View style={styles.alertBadgeLow}>
              <Ionicons
                name="information-circle"
                size={14}
                color="#1D4ED8"
                style={styles.badgeIcon}
              />
              <Text style={styles.alertBadgeLowText}>Cần lưu ý</Text>
            </View>
          ) : (
            <View style={styles.alertBadgeNormal}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#16A34A"
                style={styles.badgeIcon}
              />
              <Text style={styles.alertBadgeNormalText}>Ổn định</Text>
            </View>
          )}

          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" style={styles.chevron} />
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons name="heart-outline" size={14} color="#EF4444" style={styles.metricIcon} />
            <Text style={styles.metricLabel}>HA</Text>
          </View>
          {bp ? (
            <Text style={styles.metricValue}>
              {bp.systolic}/{bp.diastolic}
            </Text>
          ) : (
            <Text style={styles.metricPlaceholder}>-</Text>
          )}
          <Text style={styles.metricUnit}>mmHg</Text>
        </View>

        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons name="water-outline" size={14} color="#2563EB" style={styles.metricIcon} />
            <Text style={styles.metricLabel}>ĐH</Text>
          </View>
          {glucose ? (
            <Text style={styles.metricValue}>{glucose.value}</Text>
          ) : (
            <Text style={styles.metricPlaceholder}>-</Text>
          )}
          <Text style={styles.metricUnit}>{glucose ? "mg/dL" : ""}</Text>
        </View>

        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons name="pulse-outline" size={14} color="#10B981" style={styles.metricIcon} />
            <Text style={styles.metricLabel}>SpO2</Text>
          </View>
          {spo2 ? (
            <Text style={styles.metricValue}>{spo2.value}</Text>
          ) : (
            <Text style={styles.metricPlaceholder}>-</Text>
          )}
          <Text style={styles.metricUnit}>{spo2 ? "%" : ""}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <MaterialIcons
              name="device-thermostat"
              size={14}
              color="#F97316"
              style={styles.metricIcon}
            />
            <Text style={styles.metricLabel}>NĐ</Text>
          </View>
          {temp ? (
            <Text style={styles.metricValue}>{temp.value}</Text>
          ) : (
            <Text style={styles.metricPlaceholder}>-</Text>
          )}
          <Text style={styles.metricUnit}>{temp ? "°C" : ""}</Text>
        </View>

        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons
              name="fitness-outline"
              size={14}
              color="#EC4899"
              style={styles.metricIcon}
            />
            <Text style={styles.metricLabel}>Nhịp tim</Text>
          </View>
          {hr ? (
            <Text style={styles.metricValue}>{hr.value}</Text>
          ) : (
            <Text style={styles.metricPlaceholder}>-</Text>
          )}
          <Text style={styles.metricUnit}>{hr ? "lần/phút" : ""}</Text>
        </View>

        <View style={styles.metricBox}>
          <View style={styles.metricHeader}>
            <Ionicons name="cloud-outline" size={14} color="#0EA5E9" style={styles.metricIcon} />
            <Text style={styles.metricLabel}>Nhịp thở</Text>
          </View>
          {rr ? (
            <Text style={styles.metricValue}>{rr.value}</Text>
          ) : (
            <Text style={styles.metricPlaceholder}>-</Text>
          )}
          <Text style={styles.metricUnit}>{rr ? "lần/phút" : ""}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.bottomLeft}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" style={styles.badgeIcon} />
          <Text style={styles.bottomText}>
            Lần đo gần nhất: {formatRelativeTime(patient?.lastMeasurementAt)}
          </Text>
        </View>

        <View style={styles.bottomRight}>
          <Ionicons
            name="notifications-outline"
            size={14}
            color="#F97316"
            style={styles.badgeIcon}
          />
          <Text style={styles.bottomText}>
            Cảnh báo: {(patient?.alertsSummary?.high || 0) + (patient?.alertsSummary?.medium || 0) + (patient?.alertsSummary?.low || 0)}/{patient?.alertsSummary?.total || 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  patientItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  patientItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  patientLeft: {
    flexDirection: "row",
    flex: 1,
    marginRight: 8,
  },
  patientContent: {
    flex: 1,
  },
  patientAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  patientAvatarInitial: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  patientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    flexWrap: "wrap",
  },
  patientNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginRight: 6,
  },
  patientInfoLine: {
    fontSize: 12,
    color: "#4B5563",
  },
  patientInfoLineSmall: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  statusBadgeInactive: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },
  statusBadgeInactiveText: {
    fontSize: 10,
    color: "#B91C1C",
    fontWeight: "600",
  },
  rightArrowBox: {
    alignItems: "flex-end",
  },
  alertBadgeHigh: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  alertBadgeHighText: {
    fontSize: 11,
    color: "#B91C1C",
    fontWeight: "600",
  },
  alertBadgeMedium: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  alertBadgeMediumText: {
    fontSize: 11,
    color: "#B45309",
    fontWeight: "600",
  },
  alertBadgeLow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  alertBadgeLowText: {
    fontSize: 11,
    color: "#1E3A8A",
    fontWeight: "600",
  },
  alertBadgeNormal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  alertBadgeNormalText: {
    fontSize: 11,
    color: "#15803D",
    fontWeight: "600",
  },
  badgeIcon: {
    marginRight: 4,
  },
  chevron: {
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 6,
  },
  metricBox: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    padding: 6,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricIcon: {
    marginRight: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  metricPlaceholder: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D1D5DB",
    marginTop: 2,
  },
  metricUnit: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  bottomLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 4,
  },
  bottomRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomText: {
    fontSize: 11,
    color: "#6B7280",
  },
});

export default memo(NursePatientCard);

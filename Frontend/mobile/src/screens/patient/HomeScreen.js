import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import { useAuth } from "../../hooks/useAuth";
import { getMeasurements } from "../../api/measurementApi";
import { getMyPatientProfile } from "../../api/profileApi";

function extractData(response) {
  if (!response?.ok) return null;
  return response.body?.data || response.body || null;
}

function extractList(response) {
  const data = extractData(response);
  return Array.isArray(data) ? data : [];
}

function formatRelativeTime(iso) {
  if (!iso) return "Chưa có thời gian";

  const now = Date.now();
  const target = new Date(iso).getTime();
  const diffMinutes = Math.max(1, Math.round((now - target) / (1000 * 60)));

  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function formatTodayLabel() {
  return new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimingLabel(timing) {
  if (!timing) return "Chưa ghi chú";
  if (timing === "pre") return "Trước ăn";
  if (timing === "post") return "Sau ăn";
  return timing;
}

function getLatestMeasurement(measurements, predicate) {
  return measurements
    .filter(predicate)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0] || null;
}

const alertPreviewItems = [
  {
    id: "preview-high",
    typeLabel: "Đường huyết",
    observed: "145 mg/dL",
    severityText: "Cao",
    statusText: "Mới",
    rule: "Glucose > 130 mg/dL",
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    iconName: "water",
    isHigh: true,
  },
  {
    id: "preview-normal",
    typeLabel: "Huyết áp",
    observed: "120/80 mmHg",
    severityText: "Bình thường",
    statusText: "Đã xử lý",
    rule: "BP tâm thu > 150",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    iconName: "fitness",
    isHigh: false,
  },
];

export default function HomeScreen() {
  const { user } = useAuth() || {};

  const [profile, setProfile] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadHomeData = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const profileResponse = await getMyPatientProfile();
      const profileData = extractData(profileResponse);

      if (!profileResponse?.ok || !profileData) {
        throw new Error("Không thể tải hồ sơ bệnh nhân.");
      }

      setProfile(profileData);

      const patientId = profileData.id || user?._id || user?.id;
      if (!patientId) {
        setMeasurements([]);
        return;
      }

      const measurementResponse = await getMeasurements(patientId);
      if (!measurementResponse?.ok) {
        throw new Error("Không thể tải dữ liệu đo gần đây.");
      }

      setMeasurements(extractList(measurementResponse));
    } catch (fetchError) {
      setError(fetchError?.message || "Không thể tải dữ liệu trang chủ.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadHomeData();
    }, [loadHomeData])
  );

  const latestBp = useMemo(
    () =>
      getLatestMeasurement(
        measurements,
        (m) =>
          Number(m?.bloodPressure?.systolic) > 0 ||
          Number(m?.bloodPressure?.diastolic) > 0
      ),
    [measurements]
  );

  const latestGlucose = useMemo(
    () => getLatestMeasurement(measurements, (m) => Number(m?.glucose) > 0),
    [measurements]
  );

  const latestSpo2 = useMemo(
    () => getLatestMeasurement(measurements, (m) => Number(m?.spo2) > 0),
    [measurements]
  );

  const latestTemp = useMemo(
    () => getLatestMeasurement(measurements, (m) => Number(m?.temperature) > 0),
    [measurements]
  );

  const latestHeartRate = useMemo(
    () => getLatestMeasurement(measurements, (m) => Number(m?.heartRate) > 0),
    [measurements]
  );

  const latestResp = useMemo(
    () =>
      getLatestMeasurement(measurements, (m) => Number(m?.respiratoryRate) > 0),
    [measurements]
  );

  const displayName = profile?.name || user?.name || user?.username || "Bệnh nhân";
  const insuranceNumber = profile?.insuranceNumber || "Chưa cập nhật";
  const emergencyName = profile?.emergencyContactName || "Chưa cập nhật";
  const emergencyPhone = profile?.emergencyContactPhone || "Chưa cập nhật";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F4FF" }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHomeData(true)}
            tintColor="#316BFF"
          />
        }
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="heart" size={26} color="#316BFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Trang chủ bệnh nhân</Text>
              <Text style={styles.headerSub}>Mã BHYT: {insuranceNumber}</Text>
            </View>
          </View>
          <View style={styles.headerBottomRow}>
            <Text style={styles.chipPrimary}>Theo dõi từ xa</Text>
            <Text style={styles.chipLight}>Đồng bộ dữ liệu thật</Text>
          </View>
        </View>

        <View style={styles.greetingBox}>
          <Text style={styles.greeting}>Xin chào, {displayName}</Text>
          <Text style={styles.date}>{formatTodayLabel()}</Text>
          <Text style={styles.subInfo}>
            Người liên hệ khẩn cấp: {emergencyName} · {emergencyPhone}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#316BFF" />
            <Text style={styles.loadingText}>Đang tải dữ liệu sức khỏe...</Text>
          </View>
        ) : (
          <>
            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Không thể tải trang chủ</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => loadHomeData()}
                >
                  <Text style={styles.retryButtonText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tổng quan sinh hiệu mới nhất</Text>
              <View style={styles.vitalGrid}>
                <View style={styles.vitalCard}>
                  <View style={styles.vitalHeader}>
                    <Ionicons name="fitness" size={18} color="#316BFF" />
                    <Text style={styles.vitalTitle}>Huyết áp</Text>
                  </View>
                  {latestBp ? (
                    <>
                      <Text style={styles.vitalMainValue}>
                        {latestBp.bloodPressure?.systolic || 0}/
                        {latestBp.bloodPressure?.diastolic || 0}
                      </Text>
                      <Text style={styles.vitalUnit}>
                        mmHg · {latestBp.heartRate || 0} bpm
                      </Text>
                      <Text style={styles.vitalMeta}>
                        {formatTimingLabel(latestBp.timing)} ·{" "}
                        {formatRelativeTime(latestBp.createdAt)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
                  )}
                </View>

                <View style={styles.vitalCard}>
                  <View style={styles.vitalHeader}>
                    <Ionicons name="water" size={18} color="#2C9F5A" />
                    <Text style={styles.vitalTitle}>Đường huyết</Text>
                  </View>
                  {latestGlucose ? (
                    <>
                      <Text style={styles.vitalMainValue}>{latestGlucose.glucose}</Text>
                      <Text style={styles.vitalUnit}>
                        mg/dL · {formatTimingLabel(latestGlucose.timing)}
                      </Text>
                      <Text style={styles.vitalMeta}>
                        {formatRelativeTime(latestGlucose.createdAt)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
                  )}
                </View>

                <View style={styles.vitalCard}>
                  <View style={styles.vitalHeader}>
                    <Ionicons name="pulse" size={18} color="#EA4C89" />
                    <Text style={styles.vitalTitle}>SpO₂</Text>
                  </View>
                  {latestSpo2 ? (
                    <>
                      <Text style={styles.vitalMainValue}>{latestSpo2.spo2}%</Text>
                      <Text style={styles.vitalUnit}>Độ bão hòa oxy</Text>
                      <Text style={styles.vitalMeta}>
                        {formatRelativeTime(latestSpo2.createdAt)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
                  )}
                </View>

                <View style={styles.vitalCard}>
                  <View style={styles.vitalHeader}>
                    <Ionicons name="thermometer" size={18} color="#FF9933" />
                    <Text style={styles.vitalTitle}>Nhiệt độ</Text>
                  </View>
                  {latestTemp ? (
                    <>
                      <Text style={styles.vitalMainValue}>{latestTemp.temperature}</Text>
                      <Text style={styles.vitalUnit}>°C</Text>
                      <Text style={styles.vitalMeta}>
                        {formatRelativeTime(latestTemp.createdAt)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
                  )}
                </View>

                <View style={styles.vitalCard}>
                  <View style={styles.vitalHeader}>
                    <Ionicons
                      name="heart-circle-outline"
                      size={18}
                      color="#EF4444"
                    />
                    <Text style={styles.vitalTitle}>Nhịp tim</Text>
                  </View>
                  {latestHeartRate ? (
                    <>
                      <Text style={styles.vitalMainValue}>{latestHeartRate.heartRate}</Text>
                      <Text style={styles.vitalUnit}>bpm</Text>
                      <Text style={styles.vitalMeta}>
                        {formatRelativeTime(latestHeartRate.createdAt)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
                  )}
                </View>

                <View style={styles.vitalCard}>
                  <View style={styles.vitalHeader}>
                    <MaterialIcons name="air" size={20} color="#10B981" />
                    <Text style={styles.vitalTitle}>Nhịp thở</Text>
                  </View>
                  {latestResp ? (
                    <>
                      <Text style={styles.vitalMainValue}>
                        {latestResp.respiratoryRate}
                      </Text>
                      <Text style={styles.vitalUnit}>lần/phút</Text>
                      <Text style={styles.vitalMeta}>
                        {formatRelativeTime(latestResp.createdAt)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.alertSectionCard}>
              <Text style={styles.sectionTitle}>Cảnh báo gần đây</Text>

              {alertPreviewItems.map((alert) => (
                <View
                  key={alert.id}
                  style={[
                    styles.warningItem,
                    alert.isHigh && styles.warningItemHigh,
                  ]}
                >
                  <View style={styles.alertHeaderRow}>
                    <View style={styles.alertTitleWrapper}>
                      <Ionicons
                        name={alert.iconName}
                        size={18}
                        color={alert.isHigh ? "#D63031" : "#1A8F4A"}
                      />
                      <Text style={styles.warnLabel}>
                        {alert.typeLabel} · {alert.observed}
                      </Text>
                    </View>

                    <View
                      style={
                        alert.isHigh
                          ? styles.alertStatusPillHigh
                          : styles.alertStatusPillNormal
                      }
                    >
                      <Text
                        style={
                          alert.isHigh
                            ? styles.alertStatusTextHigh
                            : styles.alertStatusTextNormal
                        }
                      >
                        {alert.severityText}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.alertRuleRow}>
                    <Text style={styles.alertRuleText}>Quy tắc: {alert.rule}</Text>
                    <Text style={styles.alertRuleText}>{alert.statusText}</Text>
                  </View>

                  <View style={styles.alertTimeRow}>
                    <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.alertTimeText}>
                      {formatRelativeTime(alert.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  headerIcon: {
    width: 52,
    height: 52,
    backgroundColor: "#E5EDFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: "#121826",
  },
  headerSub: {
    marginTop: 4,
    color: "#7A8194",
    fontSize: 12,
  },
  headerBottomRow: {
    flexDirection: "row",
    gap: 8,
  },
  chipPrimary: {
    backgroundColor: "#316BFF",
    color: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    overflow: "hidden",
  },
  chipLight: {
    backgroundColor: "#EEF2FF",
    color: "#4C5A7D",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    overflow: "hidden",
  },
  greetingBox: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    color: "#121826",
  },
  date: {
    color: "#7A8194",
    marginTop: 4,
    fontSize: 13,
  },
  subInfo: {
    color: "#4C5A7D",
    marginTop: 6,
    fontSize: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 15,
    color: "#1A2740",
  },
  vitalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  vitalCard: {
    width: "48%",
    backgroundColor: "#F6F7FF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  vitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  vitalTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2740",
  },
  vitalMainValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  vitalUnit: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  vitalMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  vitalEmpty: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 13,
  },
  errorCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "700",
  },
  errorText: {
    color: "#7F1D1D",
    marginTop: 6,
    fontSize: 13,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#EF4444",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#1A2740",
  },
  alertSectionCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
  },
  warningItem: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  warningItemHigh: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },
  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  alertTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  warnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
  },
  alertStatusPillNormal: {
    backgroundColor: "#E4FFE9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  alertStatusPillHigh: {
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  alertStatusTextNormal: {
    color: "#1A8F4A",
    fontWeight: "700",
    fontSize: 11,
  },
  alertStatusTextHigh: {
    color: "#D63031",
    fontWeight: "700",
    fontSize: 11,
  },
  alertRuleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  alertRuleText: {
    fontSize: 11,
    color: "#6B7280",
    flexShrink: 1,
  },
  alertTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  alertTimeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});

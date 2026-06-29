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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import { getMyAlerts } from "../../api/alertApi";
import { useAuth } from "../../hooks/useAuth";
import { getMeasurements } from "../../api/measurementApi";
import { getMyPatientProfile } from "../../api/profileApi";
import { getMedicationAdherence } from "../../api/prescriptionApi";
import { getThresholds } from "../../api/thresholdApi";
import {
  buildAlertPreviewItems,
  extractData,
  extractList,
  sortAlertsByCreatedAt,
} from "../../utils/patientAlertUtils";

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
  if (timing === "pre" || timing === "pre_meal") return "Trước ăn";
  if (timing === "post" || timing === "post_meal") return "Sau ăn";
  return timing;
}

function getCurrentTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "noon";
  return "evening";
}

function getTimeOfDayLabel(timeOfDay) {
  if (timeOfDay === "morning") return "Sáng";
  if (timeOfDay === "noon") return "Trưa";
  if (timeOfDay === "evening") return "Tối";
  return timeOfDay;
}

function hasPositiveNumber(value) {
  return Number(value) > 0;
}

function hasBloodPressure(measurement) {
  return (
    hasPositiveNumber(measurement?.bloodPressure?.systolic) ||
    hasPositiveNumber(measurement?.bloodPressure?.diastolic)
  );
}

// threshold is a single object with fields like sysMin, sysMax, glucoseMin, etc.
// Mirror the same logic as PatientDetailModal.js in doctor-app
function isBloodPressureAlert(bp, threshold) {
  if (!bp || !threshold) return false;
  const sys = parseFloat(bp.systolic);
  const dia = parseFloat(bp.diastolic);
  if (threshold.sysMin !== undefined && sys < threshold.sysMin) return true;
  if (threshold.sysMax !== undefined && sys > threshold.sysMax) return true;
  if (threshold.diaMin !== undefined && dia < threshold.diaMin) return true;
  if (threshold.diaMax !== undefined && dia > threshold.diaMax) return true;
  return false;
}

function isGlucoseAlert(glucose, threshold) {
  if (glucose === null || glucose === undefined || !threshold) return false;
  const val = parseFloat(glucose);
  if (threshold.glucoseMin !== undefined && threshold.glucoseMin !== null && val < threshold.glucoseMin) return true;
  if (threshold.glucoseMax !== undefined && threshold.glucoseMax !== null && val > threshold.glucoseMax) return true;
  return false;
}

function isSpo2Alert(spo2, threshold) {
  if (spo2 === null || spo2 === undefined || !threshold) return false;
  const val = parseFloat(spo2);
  if (threshold.spo2Min !== undefined && val < threshold.spo2Min) return true;
  return false;
}

function isTemperatureAlert(temp, threshold) {
  if (temp === null || temp === undefined || !threshold) return false;
  const val = parseFloat(temp);
  if (threshold.temperatureMin !== undefined && val < threshold.temperatureMin) return true;
  if (threshold.temperatureMax !== undefined && val > threshold.temperatureMax) return true;
  return false;
}

function isHeartRateAlert(hr, threshold) {
  if (hr === null || hr === undefined || !threshold) return false;
  const val = parseFloat(hr);
  if (threshold.heartRateMin !== undefined && val < threshold.heartRateMin) return true;
  if (threshold.heartRateMax !== undefined && val > threshold.heartRateMax) return true;
  return false;
}

function isRespiratoryRateAlert(rr, threshold) {
  if (rr === null || rr === undefined || !threshold) return false;
  const val = parseFloat(rr);
  if (threshold.respiratoryRateMin !== undefined && val < threshold.respiratoryRateMin) return true;
  if (threshold.respiratoryRateMax !== undefined && val > threshold.respiratoryRateMax) return true;
  return false;
}

function isWithinRecentDays(value, days = 5) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

export default function HomeScreen() {
  const { user } = useAuth() || {};
  const navigation = useNavigation();

  const [profile, setProfile] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [medications, setMedications] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [alertError, setAlertError] = useState("");
  const [medicationError, setMedicationError] = useState("");

  const loadHomeData = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      setAlertError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const profileResponse = await getMyPatientProfile();
      const profileData = extractData(profileResponse);

      if (!profileResponse?.ok || !profileData) {
        setProfile(null);
        setMeasurements([]);
        setAlerts([]);
        throw new Error("Không thể tải hồ sơ bệnh nhân.");
      }

      setProfile(profileData);

      const patientId = profileData.id || user?._id || user?.id;
      const [measurementResult, alertResult, adherenceResult, thresholdResult] = await Promise.allSettled([
        patientId ? getMeasurements({ patientId }) : Promise.resolve(null),
        getMyAlerts(),
        patientId ? getMedicationAdherence(1) : Promise.resolve(null),
        patientId ? getThresholds({ patientId, latest: true }) : Promise.resolve(null),
      ]);

      let nextError = "";

      // Handle measurements
      if (measurementResult.status === "fulfilled") {
        const measurementResponse = measurementResult.value;
        if (!patientId) {
          setMeasurements([]);
        } else if (!measurementResponse?.ok) {
          setMeasurements([]);
          nextError = "Không thể tải dữ liệu đo gần đây.";
        } else {
          setMeasurements(extractList(measurementResponse));
        }
      } else {
        setMeasurements([]);
        nextError = "Không thể tải dữ liệu đo gần đây.";
      }

      // Handle alerts
      if (alertResult.status === "fulfilled") {
        const alertResponse = alertResult.value;
        if (!alertResponse?.ok) {
          setAlerts([]);
          setAlertError(
            alertResponse?.body?.error ||
              alertResponse?.error ||
              "Không thể tải cảnh báo gần đây."
          );
        } else {
          setAlerts(sortAlertsByCreatedAt(extractList(alertResponse)));
        }
      } else {
        setAlerts([]);
        setAlertError("Không thể tải cảnh báo gần đây.");
      }

      // Handle medications
      if (adherenceResult.status === "fulfilled") {
        setMedications(adherenceResult.value);
        setMedicationError("");
      } else {
        setMedications(null);
        setMedicationError("Lỗi: " + (adherenceResult.reason?.message || adherenceResult.reason));
      }

      // Handle thresholds
      if (thresholdResult.status === "fulfilled") {
        const thresholdResponse = thresholdResult.value;
        if (thresholdResponse?.ok) {
          // API returns an array, take the first (latest) entry
          const data = thresholdResponse.body?.data;
          setThresholds(Array.isArray(data) ? (data[0] || null) : (data || null));
        } else {
          setThresholds(null);
        }
      } else {
        setThresholds(null);
      }

      // (removed to accommodate Promise.allSettled logic above)

      if (nextError) {
        throw new Error(nextError);
      }
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

  const latestVitals = useMemo(() => {
    const latest = {
      bp: null,
      glucose: null,
      spo2: null,
      temperature: null,
      heartRate: null,
      respiratoryRate: null,
    };

    const sortedMeasurements = [...measurements].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

    for (const measurement of sortedMeasurements) {
      if (!latest.bp && hasBloodPressure(measurement)) {
        latest.bp = measurement;
      }
      if (!latest.glucose) {
        const glucVal = measurement?.glucose ? (typeof measurement.glucose === "object" ? measurement.glucose.bloodGlucose : measurement.glucose) : null;
        if (hasPositiveNumber(glucVal)) {
          latest.glucose = measurement;
        }
      }
      if (!latest.spo2 && hasPositiveNumber(measurement?.spo2)) {
        latest.spo2 = measurement;
      }
      if (!latest.temperature && hasPositiveNumber(measurement?.temperature)) {
        latest.temperature = measurement;
      }
      if (!latest.heartRate && hasPositiveNumber(measurement?.heartRate)) {
        latest.heartRate = measurement;
      }
      if (
        !latest.respiratoryRate &&
        hasPositiveNumber(measurement?.respiratoryRate)
      ) {
        latest.respiratoryRate = measurement;
      }

      if (
        latest.bp &&
        latest.glucose &&
        latest.spo2 &&
        latest.temperature &&
        latest.heartRate &&
        latest.respiratoryRate
      ) {
        break;
      }
    }

    return latest;
  }, [measurements]);

  const recentAlerts = useMemo(
    () => alerts.filter((item) => isWithinRecentDays(item?.createdAt, 5)),
    [alerts]
  );

  const alertPreviewItems = useMemo(
    () => buildAlertPreviewItems(recentAlerts, 5),
    [recentAlerts]
  );

  const openAlertCount = useMemo(
    () => recentAlerts.filter((item) => item.status === "open").length,
    [recentAlerts]
  );

  // Compare latest vital values directly against threshold — same logic as doctor app PatientDetailModal
  const vitalAlerts = useMemo(() => {
    const t = thresholds;
    const v = latestVitals;
    if (!t) return {};

    const check = (val, min, max) => {
      const n = parseFloat(val);
      if (isNaN(n)) return false;
      if (min !== undefined && n < min) return true;
      if (max !== undefined && n > max) return true;
      return false;
    };

    const sys = parseFloat(v.bp?.bloodPressure?.systolic);
    const dia = parseFloat(v.bp?.bloodPressure?.diastolic);
    const bpAlert =
      (!isNaN(sys) && (check(sys, t.sysMin, t.sysMax))) ||
      (!isNaN(dia) && (check(dia, t.diaMin, t.diaMax)));

    const rawGluc = v.glucose?.glucose;
    const glucVal = rawGluc ? (typeof rawGluc === "object" ? rawGluc.bloodGlucose : rawGluc) : null;

    return {
      bp: bpAlert,
      glucose: check(glucVal, t.glucoseMin, t.glucoseMax),
      spo2: t.spo2Min !== undefined && parseFloat(v.spo2?.spo2) < t.spo2Min,
      temperature: check(v.temperature?.temperature, t.temperatureMin, t.temperatureMax),
      heartRate: check(v.heartRate?.heartRate, t.heartRateMin, t.heartRateMax),
      respiratoryRate: check(v.respiratoryRate?.respiratoryRate, t.respiratoryRateMin, t.respiratoryRateMax),
    };
  }, [thresholds, latestVitals]);

  const displayName = profile?.name || user?.name || user?.username || "Bệnh nhân";
  const insuranceNumber = profile?.insuranceNumber || "Chưa cập nhật";
  const emergencyName = profile?.emergencyContactName || "Chưa cập nhật";
  const emergencyPhone = profile?.emergencyContactPhone || "Chưa cập nhật";

  const currentTimeOfDay = useMemo(() => getCurrentTimeOfDay(), []);

  const currentSessionMedications = useMemo(() => {
    const todayStr = medications?.to;
    const todayData = medications?.days?.find(d => d.date === todayStr);
    if (!todayData) return { taken: 0, expected: 0, medications: [] };

    let taken = 0;
    let expected = 0;
    const sessionMeds = [];

    todayData.medications.forEach((med) => {
      const sessionSlots = med.slots.filter(slot => slot.timeOfDay === currentTimeOfDay);
      if (sessionSlots.length > 0) {
        const takenCount = sessionSlots.filter(s => s.status === "taken").length;
        taken += takenCount;
        expected += sessionSlots.length;
        sessionMeds.push({
          ...med,
          slots: sessionSlots,
          taken: takenCount,
          expected: sessionSlots.length,
        });
      }
    });

    return { taken, expected, medications: sessionMeds };
  }, [medications, currentTimeOfDay]);

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
        {/* ---- GREETING CARD ---- */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingHello}>Xin chào 👋</Text>
              <Text style={styles.greetingName}>{displayName}</Text>
              <Text style={styles.greetingDate}>{formatTodayLabel()}</Text>
            </View>
            <View style={styles.greetingAvatar}>
              <Ionicons name="person" size={24} color="#316BFF" />
            </View>
          </View>
          
          {openAlertCount > 0 ? (
            <View style={styles.greetingAlertBox}>
              <Ionicons name="warning" size={16} color="#DC2626" />
              <Text style={styles.greetingAlertText}>Hôm nay bạn có {openAlertCount} cảnh báo cần chú ý</Text>
            </View>
          ) : (
            <View style={[styles.greetingAlertBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={[styles.greetingAlertText, { color: '#16A34A' }]}>Sức khỏe của bạn đang ổn định</Text>
            </View>
          )}
        </View>

        {/* ---- Medication Card ---- */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate("PatientMedications", { timeOfDay: currentTimeOfDay })}
          style={styles.headerCard}
        >
          <View style={styles.headerTopRow}>
            <View style={[styles.headerIcon, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="medical" size={26} color="#2563EB" />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.headerTitle}>Thuốc buổi {getTimeOfDayLabel(currentTimeOfDay)}</Text>
              {medicationError ? (
                <Text style={[styles.headerSub, { color: "#EF4444" }]}>
                  {medicationError}
                </Text>
              ) : currentSessionMedications.expected > 0 ? (
                <View style={{ marginTop: 4 }}>
                  <View style={styles.progressRow}>
                    <Text style={styles.headerSub}>
                      {currentSessionMedications.taken} / {currentSessionMedications.expected} liều đã uống
                    </Text>
                    <Text style={styles.progressPct}>
                      {Math.min(100, Math.round((currentSessionMedications.taken / currentSessionMedications.expected) * 100))}%
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { 
                      width: `${Math.min(100, Math.round((currentSessionMedications.taken / currentSessionMedications.expected) * 100))}%` 
                    }]} />
                  </View>
                  {currentSessionMedications.medications.length > 0 && (
                    <Text style={[styles.headerSub, { marginTop: 8 }]}>
                      {currentSessionMedications.medications.map(m => m.drugName).join(", ")}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.headerSub}>Không có thuốc buổi {getTimeOfDayLabel(currentTimeOfDay).toLowerCase()}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

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

                {/* Huyết áp */}
                {(() => {
                  const bpVal = latestVitals.bp?.bloodPressure;
                  const alert = vitalAlerts.bp;
                  return (
                    <View style={[styles.vitalCard, alert && styles.vitalCardAlert]}>
                      <View style={styles.vitalHeader}>
                        <Ionicons name="fitness" size={18} color="#316BFF" />
                        <Text style={styles.vitalTitle}>Huyết áp</Text>
                        {alert && <Ionicons name="warning" size={14} color="#DC2626" style={{ marginLeft: 4 }} />}
                      </View>
                      {latestVitals.bp ? (
                        <>
                          <Text style={[styles.vitalMainValue, alert && styles.vitalMainValueAlert]}>
                            {Math.round(bpVal?.systolic || 0)}/{Math.round(bpVal?.diastolic || 0)}
                          </Text>
                          <Text style={styles.vitalUnit}>mmHg · {Math.round(latestVitals.bp.heartRate || 0)} bpm</Text>
                          <Text style={styles.vitalMeta}>
                            {latestVitals.bp.mealTiming ? formatTimingLabel(latestVitals.bp.mealTiming) + " · " : ""}
                            {formatRelativeTime(latestVitals.bp.createdAt)}
                          </Text>
                        </>
                      ) : <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>}
                    </View>
                  );
                })()}

                {/* Đường huyết */}
                {(() => {
                  const rawGluc = latestVitals.glucose?.glucose;
                  const glucVal = rawGluc ? (typeof rawGluc === "object" ? rawGluc.bloodGlucose : rawGluc) : null;
                  const alert = vitalAlerts.glucose;
                  return (
                    <View style={[styles.vitalCard, alert && styles.vitalCardAlert]}>
                      <View style={styles.vitalHeader}>
                        <Ionicons name="water" size={18} color="#2C9F5A" />
                        <Text style={styles.vitalTitle}>Đường huyết</Text>
                        {alert && <Ionicons name="warning" size={14} color="#DC2626" style={{ marginLeft: 4 }} />}
                      </View>
                      {latestVitals.glucose ? (
                        <>
                          <Text style={[styles.vitalMainValue, alert && styles.vitalMainValueAlert]}>
                            {Math.round(glucVal || 0)}
                          </Text>
                          <Text style={styles.vitalUnit}>
                            mg/dL{latestVitals.glucose.mealTiming ? " · " + formatTimingLabel(latestVitals.glucose.mealTiming) : ""}
                          </Text>
                          <Text style={styles.vitalMeta}>{formatRelativeTime(latestVitals.glucose.createdAt)}</Text>
                        </>
                      ) : <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>}
                    </View>
                  );
                })()}

                {/* SpO2 */}
                {(() => {
                  const spo2Val = latestVitals.spo2?.spo2;
                  const alert = vitalAlerts.spo2;
                  return (
                    <View style={[styles.vitalCard, alert && styles.vitalCardAlert]}>
                      <View style={styles.vitalHeader}>
                        <Ionicons name="pulse" size={18} color="#EA4C89" />
                        <Text style={styles.vitalTitle}>SpO₂</Text>
                        {alert && <Ionicons name="warning" size={14} color="#DC2626" style={{ marginLeft: 4 }} />}
                      </View>
                      {latestVitals.spo2 ? (
                        <>
                          <Text style={[styles.vitalMainValue, alert && styles.vitalMainValueAlert]}>
                            {Math.round(spo2Val)}%
                          </Text>
                          <Text style={styles.vitalUnit}>Độ bão hòa oxy</Text>
                          <Text style={styles.vitalMeta}>{formatRelativeTime(latestVitals.spo2.createdAt)}</Text>
                        </>
                      ) : <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>}
                    </View>
                  );
                })()}

                {/* Nhiệt độ */}
                {(() => {
                  const tempVal = latestVitals.temperature?.temperature;
                  const alert = vitalAlerts.temperature;
                  return (
                    <View style={[styles.vitalCard, alert && styles.vitalCardAlert]}>
                      <View style={styles.vitalHeader}>
                        <Ionicons name="thermometer" size={18} color="#FF9933" />
                        <Text style={styles.vitalTitle}>Nhiệt độ</Text>
                        {alert && <Ionicons name="warning" size={14} color="#DC2626" style={{ marginLeft: 4 }} />}
                      </View>
                      {latestVitals.temperature ? (
                        <>
                          <Text style={[styles.vitalMainValue, alert && styles.vitalMainValueAlert]}>
                            {Number(tempVal).toFixed(1)}
                          </Text>
                          <Text style={styles.vitalUnit}>°C</Text>
                          <Text style={styles.vitalMeta}>{formatRelativeTime(latestVitals.temperature.createdAt)}</Text>
                        </>
                      ) : <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>}
                    </View>
                  );
                })()}

                {/* Nhịp tim */}
                {(() => {
                  const hrVal = latestVitals.heartRate?.heartRate;
                  const alert = vitalAlerts.heartRate;
                  return (
                    <View style={[styles.vitalCard, alert && styles.vitalCardAlert]}>
                      <View style={styles.vitalHeader}>
                        <Ionicons name="heart-circle-outline" size={18} color="#EF4444" />
                        <Text style={styles.vitalTitle}>Nhịp tim</Text>
                        {alert && <Ionicons name="warning" size={14} color="#DC2626" style={{ marginLeft: 4 }} />}
                      </View>
                      {latestVitals.heartRate ? (
                        <>
                          <Text style={[styles.vitalMainValue, alert && styles.vitalMainValueAlert]}>
                            {Math.round(hrVal)}
                          </Text>
                          <Text style={styles.vitalUnit}>bpm</Text>
                          <Text style={styles.vitalMeta}>{formatRelativeTime(latestVitals.heartRate.createdAt)}</Text>
                        </>
                      ) : <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>}
                    </View>
                  );
                })()}

                {/* Nhịp thở */}
                {(() => {
                  const rrVal = latestVitals.respiratoryRate?.respiratoryRate;
                  const alert = vitalAlerts.respiratoryRate;
                  return (
                    <View style={[styles.vitalCard, alert && styles.vitalCardAlert]}>
                      <View style={styles.vitalHeader}>
                        <MaterialIcons name="air" size={20} color="#10B981" />
                        <Text style={styles.vitalTitle}>Nhịp thở</Text>
                        {alert && <Ionicons name="warning" size={14} color="#DC2626" style={{ marginLeft: 4 }} />}
                      </View>
                      {latestVitals.respiratoryRate ? (
                        <>
                          <Text style={[styles.vitalMainValue, alert && styles.vitalMainValueAlert]}>
                            {Math.round(rrVal)}
                          </Text>
                          <Text style={styles.vitalUnit}>lần/phút</Text>
                          <Text style={styles.vitalMeta}>{formatRelativeTime(latestVitals.respiratoryRate.createdAt)}</Text>
                        </>
                      ) : <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>}
                    </View>
                  );
                })()}

              </View>
            </View>

            <View style={styles.alertSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Cảnh báo 5 ngày gần nhất</Text>
                <Text style={styles.sectionBadge}>
                  {openAlertCount > 0
                    ? `${openAlertCount} chưa xác nhận`
                    : alertPreviewItems.length > 0
                      ? `${alertPreviewItems.length} mục mới nhất`
                      : "Chưa có cảnh báo"}
                </Text>
              </View>

              {alertError ? (
                <View style={styles.sectionStateCard}>
                  <Text style={styles.sectionStateText}>{alertError}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => void loadHomeData()}
                  >
                    <Text style={styles.retryButtonText}>Tải lại cảnh báo</Text>
                  </TouchableOpacity>
                </View>
              ) : alertPreviewItems.length === 0 ? (
                <View style={styles.sectionStateCard}>
                  <Text style={styles.sectionStateText}>
                    Hiện chưa có cảnh báo nào được tạo từ hệ thống.
                  </Text>
                </View>
              ) : (
                alertPreviewItems.map((alert) => (
                  <TouchableOpacity
                    key={alert.id}
                    activeOpacity={0.92}
                    style={[
                      styles.warningItem,
                      alert.isHigh && styles.warningItemHigh,
                    ]}
                    onPress={() =>
                      navigation.navigate("PatientAlerts", {
                        selectedAlertId: alert.alertId || alert.id,
                      })
                    }
                  >
                    <View style={styles.alertHeaderRow}>
                      <View style={styles.alertTitleWrapper}>
                        <Ionicons
                          name={alert.iconName}
                          size={18}
                          color={alert.isHigh ? "#D63031" : "#1A8F4A"}
                        />
                        <Text style={styles.warnLabel}>
                          {alert.title} · {alert.observedText}
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

                    {alert.additionalSummary ? (
                      <Text style={styles.alertExtraText}>{alert.additionalSummary}</Text>
                    ) : null}

                    <View style={styles.alertRuleRow}>
                      <View style={{ flex: 1 }} />
                      <Text
                        style={[
                          styles.alertRuleText,
                          alert.isAcknowledged
                            ? styles.alertRuleTextAcknowledged
                            : styles.alertRuleTextPending,
                        ]}
                      >
                        {alert.statusText}
                      </Text>
                    </View>

                    <View style={styles.alertTimeRow}>
                      <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                      <Text style={styles.alertTimeText}>
                        {formatRelativeTime(alert.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
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
  greetingCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  greetingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greetingHello: {
    fontSize: 14,
    color: "#6B7280",
  },
  greetingName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  greetingDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  greetingAvatar: {
    width: 48,
    height: 48,
    backgroundColor: "#EFF6FF",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 8,
  },
  greetingAlertText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
    flex: 1,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressPct: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    marginTop: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 999,
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
  vitalCardAlert: {
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FCA5A5",
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
  vitalMainValueAlert: {
    color: "#DC2626",
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionBadge: {
    color: "#316BFF",
    backgroundColor: "#E5EDFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  alertSectionCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
  },
  sectionStateCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 14,
    gap: 10,
  },
  sectionStateText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
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
  alertRuleTextPending: {
    color: "#D97706",
    fontWeight: "700",
  },
  alertRuleTextAcknowledged: {
    color: "#15803D",
    fontWeight: "700",
  },
  alertExtraText: {
    marginTop: 6,
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 17,
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

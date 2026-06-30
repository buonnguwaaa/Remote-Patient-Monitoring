import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getMyPatients, getAdherence } from "../api/patientApi";
import PatientSelectorModal from "../components/PatientSelectorModal";
import { useSidebar } from "../navigation/AppNavigator";

const RANGE_OPTIONS = [
  { label: "7 ngày", value: 7 },
  { label: "14 ngày", value: 14 },
  { label: "30 ngày", value: 30 },
];

export default function ComplianceScreen() {
  const { openSidebar } = useSidebar();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientName, setSelectedPatientName] = useState("");
  const [selectorVisible, setSelectorVisible] = useState(false);

  const [daysCount, setDaysCount] = useState(7);
  const [adherenceData, setAdherenceData] = useState(null);

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingAdherence, setLoadingAdherence] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [expandedDays, setExpandedDays] = useState({});

  // 1. Fetch patients
  const fetchPatients = useCallback(async () => {
    try {
      setLoadingPatients(true);
      const res = await getMyPatients();
      if (res.ok) {
        const list = res.body?.data || [];
        setPatients(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedPatientId(first.patientId || first.id);
          setSelectedPatientName(first.patientName || first.name);
        }
      }
    } catch (err) {
      console.error("Error fetching patients in ComplianceScreen:", err);
    } finally {
      setLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // 2. Fetch compliance adherence data
  const fetchAdherence = useCallback(async () => {
    if (!selectedPatientId) return;
    try {
      setLoadingAdherence(true);
      const res = await getAdherence({
        patientId: selectedPatientId,
        days: daysCount,
      });
      if (res.ok) {
        const rawData = res.body?.data || null;
        if (rawData && rawData.days) {
          // Reverse the days list to show the newest day first
          rawData.days = [...rawData.days].reverse();
        }
        setAdherenceData(rawData);
        // Expand the newest day (the first one now) by default
        const days = rawData?.days || [];
        if (days.length > 0) {
          setExpandedDays({ [days[0].date]: true });
        } else {
          setExpandedDays({});
        }
      }
    } catch (err) {
      console.error("Error fetching adherence data:", err);
    } finally {
      setLoadingAdherence(false);
    }
  }, [selectedPatientId, daysCount]);

  useEffect(() => {
    fetchAdherence();
  }, [fetchAdherence]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAdherence();
    setRefreshing(false);
  };

  const handleSelectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    const p = patients.find((item) => (item.patientId || item.id) === patientId);
    if (p) {
      setSelectedPatientName(p.patientName || p.name);
    }
    setSelectorVisible(false);
  };

  const toggleDayExpanded = (dateStr) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  // Helper to format date label
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getAdherenceColor = (rate) => {
    if (rate >= 80) return "#10B981"; // Green
    if (rate >= 50) return "#F59E0B"; // Yellow/Orange
    return "#EF4444"; // Red
  };

  const getMealTimingLabel = (timing) => {
    switch (timing) {
      case "before_meal":
        return "Trước ăn";
      case "after_meal":
        return "Sau ăn";
      case "with_meal":
        return "Trong bữa ăn";
      default:
        return "Không chỉ định";
    }
  };

  return (
    <View style={styles.container}>

      {/* Patient Selector trigger */}
      <TouchableOpacity
        style={styles.patientSelectorTrigger}
        onPress={() => setSelectorVisible(true)}
        disabled={loadingPatients}
      >
        <View style={styles.patientIconWrap}>
          <Ionicons name="person" size={18} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientLabel}>Bệnh nhân theo dõi</Text>
          <Text style={styles.patientName} numberOfLines={1}>
            {loadingPatients ? "Đang tải danh sách..." : selectedPatientName || "Chọn bệnh nhân"}
          </Text>
        </View>
        <Ionicons name="chevron-down-outline" size={18} color="#4B5563" />
      </TouchableOpacity>

      {/* Time Range Selector */}
      <View style={styles.rangeRow}>
        {RANGE_OPTIONS.map((opt) => {
          const isSelected = daysCount === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.rangeTab, isSelected && styles.rangeTabActive]}
              onPress={() => setDaysCount(opt.value)}
            >
              <Text style={[styles.rangeTabText, isSelected && styles.rangeTabTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loadingAdherence && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loaderText}>Đang phân tích dữ liệu tuân thủ...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />
          }
        >
          {adherenceData ? (
            <>
              {/* Summary Dashboard Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryTop}>
                  <View>
                    <Text style={styles.summaryLabel}>Tỷ lệ tuân thủ</Text>
                    <Text
                      style={[
                        styles.summaryRateText,
                        { color: getAdherenceColor((adherenceData.summary?.adherenceRate || 0) * 100) },
                      ]}
                    >
                      {adherenceData.summary?.adherenceRate !== undefined
                        ? `${Math.round(adherenceData.summary.adherenceRate * 100)}%`
                        : "N/A"}
                    </Text>
                  </View>
                  <View style={styles.summaryBadge}>
                    <Text style={styles.summaryBadgeText}>
                      {(adherenceData.summary?.adherenceRate || 0) * 100 >= 80
                        ? "Tốt"
                        : (adherenceData.summary?.adherenceRate || 0) * 100 >= 50
                        ? "Trung bình"
                        : "Cần cải thiện"}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryStatsRow}>
                  <View style={styles.statCol}>
                    <View style={[styles.statDot, { backgroundColor: "#10B981" }]} />
                    <Text style={styles.statVal}>{adherenceData.summary?.taken || 0}</Text>
                    <Text style={styles.statLabel}>Đã uống</Text>
                  </View>
                  <View style={styles.statCol}>
                    <View style={[styles.statDot, { backgroundColor: "#EF4444" }]} />
                    <Text style={styles.statVal}>{adherenceData.summary?.missed || 0}</Text>
                    <Text style={styles.statLabel}>Bỏ lỡ</Text>
                  </View>
                  <View style={styles.statCol}>
                    <View style={[styles.statDot, { backgroundColor: "#9CA3AF" }]} />
                    <Text style={styles.statVal}>{adherenceData.summary?.expected || 0}</Text>
                    <Text style={styles.statLabel}>Tổng liều</Text>
                  </View>
                </View>
              </View>

              {/* Days List */}
              <Text style={styles.sectionTitle}>Nhật ký chi tiết các ngày</Text>
              {adherenceData.days?.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>Không tìm thấy lịch dùng thuốc.</Text>
                </View>
              ) : (
                adherenceData.days.map((day) => {
                  const isExpanded = expandedDays[day.date];
                  const dayRate = day.expected > 0 ? (day.taken / day.expected) * 100 : 0;
                  return (
                    <View key={day.date} style={styles.dayCard}>
                      <TouchableOpacity
                        style={styles.dayHeader}
                        onPress={() => toggleDayExpanded(day.date)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dayTitle}>{formatDateLabel(day.date)}</Text>
                          <Text style={styles.daySubtitle}>
                            Đã uống: {day.taken}/{day.expected} liều
                          </Text>
                        </View>
                        <View style={styles.dayRight}>
                          <Text style={[styles.dayRate, { color: getAdherenceColor(dayRate) }]}>
                            {day.expected > 0 ? `${Math.round(dayRate)}%` : "-"}
                          </Text>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color="#6B7280"
                            style={{ marginLeft: 6 }}
                          />
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.dayBody}>
                          {day.medications?.length === 0 ? (
                            <Text style={styles.emptyDayText}>Không có lịch dùng thuốc cho ngày này.</Text>
                          ) : (
                            day.medications.map((med, idx) => (
                              <View key={`${med.prescriptionId}-${idx}`} style={styles.medBlock}>
                                <View style={styles.medHeader}>
                                  <Ionicons name="medkit-outline" size={16} color="#4F46E5" />
                                  <Text style={styles.medName}>{med.drugName}</Text>
                                  <Text style={styles.medDosage}>({med.dosage})</Text>
                                </View>

                                <View style={styles.slotsContainer}>
                                  {med.slots?.map((slot, sIdx) => {
                                    let statusColor = "#9CA3AF";
                                    let statusText = "Chờ uống";
                                    let iconName = "ellipse-outline";

                                    if (slot.status === "taken") {
                                      statusColor = "#10B981";
                                      statusText = "Đã uống";
                                      iconName = "checkmark-circle";
                                    } else if (slot.status === "missed") {
                                      statusColor = "#EF4444";
                                      statusText = "Bỏ lỡ";
                                      iconName = "close-circle";
                                    }

                                    return (
                                      <View key={sIdx} style={styles.slotRow}>
                                        <View style={styles.slotLeft}>
                                          <Ionicons name={iconName} size={16} color={statusColor} />
                                          <Text style={styles.slotTime}>{slot.time}</Text>
                                          <Text style={styles.slotTiming}>
                                            • {getMealTimingLabel(slot.mealTiming)}
                                          </Text>
                                        </View>
                                        <View style={styles.slotRight}>
                                          <Text style={styles.slotPill}>
                                            {slot.pillCount} viên
                                          </Text>
                                          <View
                                            style={[
                                              styles.statusBadge,
                                              { backgroundColor: statusColor + "1A" },
                                            ]}
                                          >
                                            <Text
                                              style={[styles.statusBadgeText, { color: statusColor }]}
                                            >
                                              {statusText}
                                            </Text>
                                          </View>
                                        </View>
                                      </View>
                                    );
                                  })}
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>Chưa có thông tin tuân thủ cho bệnh nhân này.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Patient Selector Modal */}
      <PatientSelectorModal
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        patients={patients}
        selectedPatientId={selectedPatientId}
        onSelect={handleSelectPatient}
        loading={loadingPatients}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  hamburger: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  patientSelectorTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  patientIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  patientLabel: { fontSize: 11, color: "#6B7280", fontWeight: "500" },
  patientName: { fontSize: 14, color: "#111827", fontWeight: "700", marginTop: 2 },
  rangeRow: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  rangeTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  rangeTabActive: { backgroundColor: "#FFF" },
  rangeTabText: { fontSize: 13, color: "#4B5563", fontWeight: "600" },
  rangeTabTextActive: { color: "#2563EB" },
  loaderContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loaderText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  summaryLabel: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  summaryRateText: { fontSize: 36, fontWeight: "800", marginTop: 4 },
  summaryBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  summaryBadgeText: { fontSize: 12, color: "#2563EB", fontWeight: "700" },
  summaryStatsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 16,
  },
  statCol: { flex: 1, alignItems: "center" },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  statVal: { fontSize: 18, fontWeight: "700", color: "#111827" },
  statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { marginTop: 10, fontSize: 14, color: "#6B7280" },
  dayCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
  },
  dayTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  daySubtitle: { fontSize: 12, color: "#6B7280", marginTop: 3 },
  dayRight: { flexDirection: "row", alignItems: "center" },
  dayRate: { fontSize: 15, fontWeight: "700" },
  dayBody: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 16,
  },
  emptyDayText: { fontSize: 12, color: "#9CA3AF", fontStyle: "italic", textAlign: "center" },
  medBlock: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  medHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  medName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  medDosage: { fontSize: 12, color: "#6B7280" },
  slotsContainer: { gap: 10 },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
  },
  slotLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  slotTime: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
  slotTiming: { fontSize: 12, color: "#6B7280" },
  slotRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  slotPill: { fontSize: 12, color: "#4B5563" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
});

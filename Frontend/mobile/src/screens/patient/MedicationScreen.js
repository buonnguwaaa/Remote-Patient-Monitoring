import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { getMyPrescriptions, getMedicationAdherence } from "../../api/prescriptionApi";
import { recordMedicationIntake } from "../../api/medicationIntakeApi";
import { useSnackbar } from "../../hooks/useSnackbar";

// ---- Helpers ----
const formatTime = (h, m) => {
  if (h === undefined || m === undefined) return "";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const renderTimeOfDayLabel = (tod) => {
  if (tod === "morning") return "Sáng";
  if (tod === "noon") return "Trưa";
  if (tod === "evening") return "Tối";
  return tod;
};

const renderMealTimingLabel = (mt) => {
  if (mt === "pre_meal") return "Trước ăn";
  if (mt === "post_meal") return "Sau ăn";
  return "";
};

export default function MedicationScreen({ navigation, route }) {
  const { showSuccess, showError, showInfo } = useSnackbar();
  const [prescriptions, setPrescriptions] = useState([]);
  const [adherence, setAdherence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recordingId, setRecordingId] = useState(null);

  // Tabs: "today" | "history" | "prescriptions"
  const [activeTab, setActiveTab] = useState("today");
  
  // Time of day filter: "all" | "morning" | "noon" | "evening"
  const [timeOfDayFilter, setTimeOfDayFilter] = useState("all");

  // Get timeOfDay from navigation params
  useEffect(() => {
    if (route?.params?.timeOfDay) {
      setTimeOfDayFilter(route.params.timeOfDay);
      setActiveTab("today");
    }
  }, [route?.params?.timeOfDay]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [presList, adhData] = await Promise.all([
        getMyPrescriptions("active"),
        getMedicationAdherence(7), // last 7 days
      ]);
      setPrescriptions(presList || []);
      setAdherence(adhData);
    } catch (err) {
      console.error(err);
      showError("Không thể tải dữ liệu thuốc: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleTakeMedication = async (prescId, drugName, slot) => {
    // Only send valid fields from the slot
    const dosePayload = {
      timeOfDay: slot.timeOfDay,
      pillCount: slot.pillCount,
    };
    if (slot.hour !== undefined && slot.minute !== undefined) {
      dosePayload.hour = slot.hour;
      dosePayload.minute = slot.minute;
    }
    if (slot.mealTiming) {
      dosePayload.mealTiming = slot.mealTiming;
    }

    try {
      setRecordingId(`${prescId}_${drugName}_${slot.timeOfDay}`);
      await recordMedicationIntake({
        prescriptionId: prescId,
        drugName: drugName,
        dose: dosePayload,
        takenAt: new Date().toISOString(),
      });
      showSuccess(`Đã ghi nhận uống ${drugName}`);
      await loadData();
    } catch (err) {
      showError(err.message || "Không thể ghi nhận uống thuốc");
    } finally {
      setRecordingId(null);
    }
  };

  const handleTakeAllInSession = async (timeOfDay) => {
    const todayStr = adherence?.to;
    const todayData = adherence?.days?.find(d => d.date === todayStr);
    if (!todayData) return;

    // Count untaken medications in this session
    let untakenCount = 0;
    todayData.medications.forEach((med) => {
      untakenCount += med.slots.filter(
        slot => slot.timeOfDay === timeOfDay && slot.status !== "taken"
      ).length;
    });

    if (untakenCount === 0) {
      showInfo("Bạn đã uống hết thuốc cho buổi này");
      return;
    }

    try {
      const promises = [];
      todayData.medications.forEach((med) => {
        med.slots
          .filter(slot => slot.timeOfDay === timeOfDay && slot.status !== "taken")
          .forEach(slot => {
            const dosePayload = {
              timeOfDay: slot.timeOfDay,
              pillCount: slot.pillCount,
            };
            if (slot.hour !== undefined && slot.minute !== undefined) {
              dosePayload.hour = slot.hour;
              dosePayload.minute = slot.minute;
            }
            if (slot.mealTiming) {
              dosePayload.mealTiming = slot.mealTiming;
            }
            promises.push(
              recordMedicationIntake({
                prescriptionId: med.prescriptionId,
                drugName: med.drugName,
                dose: dosePayload,
                takenAt: new Date().toISOString(),
              })
            );
          });
      });

      await Promise.all(promises);
      showSuccess("Đã ghi nhận uống hết tất cả thuốc");
      await loadData();
    } catch (err) {
      showError(err.message || "Không thể ghi nhận uống thuốc");
    }
  };

  // ---- Renderers ----
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {[
        { id: "today", label: "Hôm nay" },
        { id: "history", label: "Lịch sử" },
        { id: "prescriptions", label: "Đơn thuốc" },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderToday = () => {
    // Use the "to" date returned by the backend which perfectly matches the prescription's timezone
    const todayStr = adherence?.to;
    const todayData = adherence?.days?.find(d => d.date === todayStr);

    if (!todayData || todayData.medications.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>Hôm nay không có thuốc cần uống.</Text>
        </View>
      );
    }

    // Filter medications by timeOfDay if not "all"
    let filteredMedications = todayData.medications;
    if (timeOfDayFilter !== "all") {
      filteredMedications = todayData.medications
        .map(med => ({
          ...med,
          slots: med.slots.filter(slot => slot.timeOfDay === timeOfDayFilter),
        }))
        .filter(med => med.slots.length > 0)
        .map(med => ({
          ...med,
          taken: med.slots.filter(s => s.status === "taken").length,
          expected: med.slots.length,
        }));
    }

    if (filteredMedications.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>
            Không có thuốc nào cho buổi {renderTimeOfDayLabel(timeOfDayFilter)}.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        {timeOfDayFilter !== "all" && (() => {
          // Check if all medications in this session are taken
          const todayStr = adherence?.to;
          const todayData = adherence?.days?.find(d => d.date === todayStr);
          let untakenCount = 0;
          if (todayData) {
            todayData.medications.forEach((med) => {
              untakenCount += med.slots.filter(
                slot => slot.timeOfDay === timeOfDayFilter && slot.status !== "taken"
              ).length;
            });
          }
          const allTaken = untakenCount === 0;

          return (
            <TouchableOpacity
              style={[
                styles.takeAllButton,
                allTaken && styles.takeAllButtonDisabled
              ]}
              onPress={() => handleTakeAllInSession(timeOfDayFilter)}
              disabled={allTaken}
            >
              <Ionicons 
                name={allTaken ? "checkmark-done-circle" : "checkmark-done-circle-outline"} 
                size={22} 
                color="#FFFFFF" 
              />
              <Text style={styles.takeAllButtonText}>
                {allTaken 
                  ? "Bạn đã uống hết thuốc cho buổi này"
                  : `Đã uống hết buổi ${renderTimeOfDayLabel(timeOfDayFilter)}`
                }
              </Text>
            </TouchableOpacity>
          );
        })()}

        {filteredMedications.map((med, mi) => (
          <View key={mi} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.medIconContainer}>
                <Ionicons name="medical" size={20} color="#2563EB" />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.drugName}</Text>
                <Text style={styles.medDosage}>{med.dosage}</Text>
              </View>
              <View style={styles.medStatusBadge}>
                <Text style={styles.medStatusText}>
                  {med.taken}/{med.expected}
                </Text>
              </View>
            </View>

            <View style={styles.slotsContainer}>
              {med.slots.map((slot, si) => {
                const isTaken = slot.status === "taken";
                const isRecording = recordingId === `${med.prescriptionId}_${med.drugName}_${slot.timeOfDay}`;

                const timeStr = slot.time || formatTime(slot.hour, slot.minute);
                let label = renderTimeOfDayLabel(slot.timeOfDay);
                if (timeStr) label += ` ${timeStr}`;
                const meal = renderMealTimingLabel(slot.mealTiming);
                if (meal) label += ` · ${meal}`;

                return (
                  <View key={si} style={styles.slotRow}>
                    <View style={styles.slotDetails}>
                      <Text style={styles.slotTime}>{label}</Text>
                      <Text style={styles.slotCount}>{slot.pillCount} viên</Text>
                      {isTaken && slot.takenAt && (
                        <Text style={styles.slotTakenAt}>
                          Đã uống: {new Date(slot.takenAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      )}
                    </View>

                    {isTaken ? (
                      <View style={[styles.actionBtn, styles.takenBtn]}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.takenText}>Đã uống</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.takeBtn]}
                        onPress={() => handleTakeMedication(med.prescriptionId, med.drugName, slot)}
                        disabled={isRecording}
                      >
                        {isRecording ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.takeBtnText}>Uống</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderHistory = () => {
    if (!adherence || !adherence.days || adherence.days.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có dữ liệu lịch sử.</Text>
        </View>
      );
    }

    const { summary, days } = adherence;
    const rate = Math.round(summary.adherenceRate * 100);

    return (
      <View style={styles.section}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tuân thủ 7 ngày qua</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{rate}%</Text>
              <Text style={styles.summaryLabel}>Tỉ lệ</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: "#10B981" }]}>{summary.taken}</Text>
              <Text style={styles.summaryLabel}>Đã uống</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: "#EF4444" }]}>{summary.missed}</Text>
              <Text style={styles.summaryLabel}>Bỏ lỡ</Text>
            </View>
          </View>
        </View>

        {[...days].reverse().map((day) => {
          const dateStr = new Date(day.date).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
          return (
            <View key={day.date} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyDate}>{dateStr}</Text>
                <Text style={styles.historyStats}>
                  {day.taken}/{day.expected} liều
                </Text>
              </View>
              {day.medications.map((med, mi) => (
                <View key={mi} style={styles.historyMed}>
                  <Text style={styles.historyMedName}>• {med.drugName}</Text>
                  <View style={styles.historySlots}>
                    {med.slots.map((slot, si) => (
                      <Ionicons
                        key={si}
                        name={slot.status === "taken" ? "checkmark-circle" : slot.status === "missed" ? "close-circle" : "time"}
                        size={16}
                        color={slot.status === "taken" ? "#10B981" : slot.status === "missed" ? "#EF4444" : "#94A3B8"}
                        style={{ marginRight: 4 }}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderPrescriptions = () => {
    if (prescriptions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bạn không có đơn thuốc đang hiệu lực.</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        {prescriptions.map((pres) => (
          <View key={pres.id} style={styles.card}>
            <View style={styles.prescHeader}>
              <Text style={styles.prescTitle}>Đơn thuốc</Text>
              <Text style={styles.prescDate}>
                {new Date(pres.startDate).toLocaleDateString("vi-VN")}
                {pres.endDate ? ` - ${new Date(pres.endDate).toLocaleDateString("vi-VN")}` : ""}
              </Text>
            </View>
            <View style={styles.divider} />
            {pres.medications.map((med, mi) => (
              <View key={mi} style={styles.prescMed}>
                <Text style={styles.prescMedName}>💊 {med.drugName}</Text>
                <Text style={styles.prescMedDosage}>{med.dosage}</Text>
                {med.instructions && <Text style={styles.prescMedInst}>{med.instructions}</Text>}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn thuốc của tôi</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderTabs()}

      {activeTab === "today" && (
        <View style={styles.timeOfDayFilterContainer}>
          {[
            { id: "all", label: "Tất cả" },
            { id: "morning", label: "Sáng" },
            { id: "noon", label: "Trưa" },
            { id: "evening", label: "Tối" },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.timeOfDayFilterTab,
                timeOfDayFilter === filter.id && styles.timeOfDayFilterTabActive,
              ]}
              onPress={() => setTimeOfDayFilter(filter.id)}
            >
              <Text
                style={[
                  styles.timeOfDayFilterText,
                  timeOfDayFilter === filter.id && styles.timeOfDayFilterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === "today" && renderToday()}
          {activeTab === "history" && renderHistory()}
          {activeTab === "prescriptions" && renderPrescriptions()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#2563EB",
  },
  timeOfDayFilterContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  timeOfDayFilterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  timeOfDayFilterTabActive: {
    backgroundColor: "#2563EB",
  },
  timeOfDayFilterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  timeOfDayFilterTextActive: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    gap: 16,
  },
  takeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  takeAllButtonDisabled: {
    backgroundColor: "#6B7280",
    opacity: 0.7,
  },
  takeAllButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 16,
    color: "#94A3B8",
    fontSize: 15,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  medIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  medDosage: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  medStatusBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  slotsContainer: {
    gap: 12,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  slotDetails: {
    flex: 1,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  slotCount: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  slotTakenAt: {
    fontSize: 11,
    color: "#10B981",
    marginTop: 4,
    fontWeight: "500",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  takeBtn: {
    backgroundColor: "#2563EB",
  },
  takeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  takenBtn: {
    backgroundColor: "#ECFDF5",
    gap: 4,
  },
  takenText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
  },
  missedBtn: {
    backgroundColor: "#FEF2F2",
    gap: 4,
  },
  missedText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  summaryTitle: {
    color: "#DBEAFE",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  summaryLabel: {
    color: "#DBEAFE",
    fontSize: 12,
    marginTop: 4,
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  historyStats: {
    fontSize: 13,
    color: "#64748B",
  },
  historyMed: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  historyMedName: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
  },
  historySlots: {
    flexDirection: "row",
  },
  prescHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prescTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  prescDate: {
    fontSize: 12,
    color: "#64748B",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  prescMed: {
    marginBottom: 12,
  },
  prescMedName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  prescMedDosage: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    marginLeft: 20,
  },
  prescMedInst: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
    marginLeft: 20,
    fontStyle: "italic",
  },
});

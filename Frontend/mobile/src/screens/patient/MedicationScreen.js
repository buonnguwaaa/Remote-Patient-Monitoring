import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
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

  // Modal states for prescription details
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Tabs: "today" | "history" | "prescriptions"
  const [activeTab, setActiveTab] = useState("today");
  const [expandedDate, setExpandedDate] = useState(null);
  
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
                  : "Đánh dấu đã uống hết"
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

  const groupSlotsByTimeOfDay = (medications) => {
    const groups = {};
    medications.forEach(med => {
      med.slots.forEach(slot => {
        const t = slot.timeOfDay || "other";
        if (!groups[t]) groups[t] = [];
        groups[t].push({ drugName: med.drugName, ...slot });
      });
    });
    return groups;
  };

  const getTimeLabel = (t) => {
    switch(t) {
      case "morning": return "Buổi sáng";
      case "afternoon": return "Buổi trưa";
      case "evening": return "Buổi tối";
      case "night": return "Trước khi ngủ";
      default: return "Khác";
    }
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
    
    // Dynamic styles for summary
    let summaryBg = "#EEF2FF";
    let summaryIconColor = "#4F46E5";
    if (rate < 50) {
      summaryBg = "#FEF2F2";
      summaryIconColor = "#EF4444";
    } else if (rate === 100) {
      summaryBg = "#ECFDF5";
      summaryIconColor = "#10B981";
    } else {
      summaryBg = "#FFFBEB";
      summaryIconColor = "#F59E0B";
    }

    return (
      <View style={styles.section}>
        <View style={[styles.newSummaryCard, { backgroundColor: summaryBg }]}>
          <View style={styles.newSummaryHeader}>
             <Ionicons name="stats-chart" size={20} color={summaryIconColor} />
             <Text style={[styles.newSummaryTitle, { color: summaryIconColor }]}>Tổng quan 7 ngày qua</Text>
          </View>
          <View style={styles.newSummaryRow}>
            <View style={styles.newSummaryItem}>
              <Text style={styles.newSummaryValue}>{summary.taken}/{summary.expected}</Text>
              <Text style={styles.newSummaryLabel}>Liều đã uống</Text>
            </View>
            <View style={styles.newSummaryItem}>
              <Text style={styles.newSummaryValue}>{summary.missed}</Text>
              <Text style={styles.newSummaryLabel}>Liều bỏ lỡ</Text>
            </View>
            <View style={styles.newSummaryItem}>
              <Text style={[styles.newSummaryValue, { color: summaryIconColor }]}>{rate}%</Text>
              <Text style={styles.newSummaryLabel}>Tuân thủ</Text>
            </View>
          </View>
        </View>

        {[...days].reverse().map((day) => {
          const dateStr = new Date(day.date).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
          const dayRate = day.expected > 0 ? Math.round((day.taken / day.expected) * 100) : 0;
          
          let badgeText = "Tốt";
          let badgeStyle = styles.badgeGood;
          let badgeTextStyle = styles.badgeTextGood;
          if (dayRate < 50) {
            badgeText = "Bỏ lỡ nhiều";
            badgeStyle = styles.badgeBad;
            badgeTextStyle = styles.badgeTextBad;
          } else if (dayRate < 100) {
            badgeText = "Cần chú ý";
            badgeStyle = styles.badgeWarn;
            badgeTextStyle = styles.badgeTextWarn;
          }

          const isExpanded = expandedDate === day.date;
          
          return (
            <View key={day.date} style={styles.newHistoryCard}>
              <TouchableOpacity 
                style={styles.newHistoryHeader}
                activeOpacity={0.7}
                onPress={() => setExpandedDate(isExpanded ? null : day.date)}
              >
                <View style={styles.newHistoryHeaderLeft}>
                  <Text style={styles.newHistoryDate}>{dateStr}</Text>
                  <Text style={styles.newHistoryStats}>
                    Đã uống {day.taken}/{day.expected} liều • {dayRate}%
                  </Text>
                </View>
                <View style={styles.newHistoryHeaderRight}>
                  <View style={[styles.statusBadge, badgeStyle]}>
                    <Text style={[styles.statusBadgeText, badgeTextStyle]}>{badgeText}</Text>
                  </View>
                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#64748B" 
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.historyExpandedContent}>
                  <View style={styles.historyDivider} />
                  {(() => {
                    const groups = groupSlotsByTimeOfDay(day.medications);
                    const timeKeys = ["morning", "afternoon", "evening", "night", "other"];
                    return timeKeys.map(tk => {
                      if (!groups[tk] || groups[tk].length === 0) return null;
                      return (
                        <View key={tk} style={styles.timeGroupContainer}>
                          <Text style={styles.timeGroupTitle}>{getTimeLabel(tk)}</Text>
                          {groups[tk].map((slot, idx) => {
                            let slotBadgeStyle = styles.slotBadgePending;
                            let slotBadgeTextStyle = styles.slotBadgeTextPending;
                            let slotBadgeText = "Chờ uống";
                            if (slot.status === "taken") {
                                slotBadgeStyle = styles.slotBadgeTaken;
                                slotBadgeTextStyle = styles.slotBadgeTextTaken;
                                slotBadgeText = "Đã uống";
                            } else if (slot.status === "missed") {
                                slotBadgeStyle = styles.slotBadgeMissed;
                                slotBadgeTextStyle = styles.slotBadgeTextMissed;
                                slotBadgeText = "Bỏ lỡ";
                            }
                            return (
                              <View key={idx} style={styles.medRow}>
                                <View style={styles.medRowInfo}>
                                  <Text style={styles.medRowName}>{slot.drugName}</Text>
                                  <Text style={styles.medRowDosage}>{slot.pillCount} viên</Text>
                                </View>
                                <View style={[styles.slotBadge, slotBadgeStyle]}>
                                  <Text style={[styles.slotBadgeText, slotBadgeTextStyle]}>{slotBadgeText}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      );
                    });
                  })()}
                </View>
              )}
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
        {prescriptions.map((pres) => {
          const medCount = pres.medications.length;
          const topMeds = pres.medications.slice(0, 2);
          
          let statusColor = "#10B981";
          let statusText = "Đang hiệu lực";
          if (pres.status === "completed" || pres.status === "expired") {
            statusColor = "#94A3B8";
            statusText = "Đã hết hạn";
          } else if (pres.status === "stopped") {
            statusColor = "#EF4444";
            statusText = "Đã dừng";
          }

          return (
            <View key={pres.id} style={styles.newPrescCard}>
              <View style={styles.newPrescHeader}>
                <View style={[styles.prescStatusBadge, { backgroundColor: statusColor + "1A" }]}>
                  <Text style={[styles.prescStatusText, { color: statusColor }]}>{statusText}</Text>
                </View>
                <Text style={styles.newPrescDate}>
                  {new Date(pres.startDate).toLocaleDateString("vi-VN")}
                  {pres.endDate ? ` - ${new Date(pres.endDate).toLocaleDateString("vi-VN")}` : ""}
                </Text>
              </View>
              
              <Text style={styles.prescMedCount}>{medCount} loại thuốc</Text>
              
              <View style={styles.prescChips}>
                {topMeds.map((med, idx) => (
                  <View key={idx} style={styles.prescChip}>
                    <Text style={styles.prescChipText}>• {med.drugName}</Text>
                  </View>
                ))}
                {medCount > 2 && (
                  <View style={styles.prescChip}>
                    <Text style={[styles.prescChipText, { color: "#64748B" }]}>+{medCount - 2} thuốc khác</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={styles.viewDetailsBtn}
                onPress={() => {
                  setSelectedPrescription(pres);
                  setIsModalVisible(true);
                }}
              >
                <Text style={styles.viewDetailsText}>Xem chi tiết</Text>
                <Ionicons name="arrow-forward" size={16} color="#2563EB" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderPrescriptionModal = () => {
    if (!selectedPrescription) return null;

    const groups = { morning: [], noon: [], evening: [], other: [] };
    selectedPrescription.medications.forEach(med => {
      if (med.schedule && med.schedule.length > 0) {
        med.schedule.forEach(slot => {
          let t = slot.timeOfDay;
          if (t === "afternoon") t = "noon";
          if (!groups[t]) groups.other.push({ ...med, slot });
          else groups[t].push({ ...med, slot });
        });
      } else {
        groups.other.push({ ...med, slot: null });
      }
    });

    const timeKeys = [
      { key: "morning", label: "Buổi sáng" },
      { key: "noon", label: "Buổi trưa" },
      { key: "evening", label: "Buổi tối" },
      { key: "other", label: "Khác" }
    ];

    return (
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết đơn thuốc</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalDateRange}>
                Áp dụng: {new Date(selectedPrescription.startDate).toLocaleDateString("vi-VN")}
                {selectedPrescription.endDate ? ` - ${new Date(selectedPrescription.endDate).toLocaleDateString("vi-VN")}` : ""}
              </Text>
              
              {timeKeys.map(({ key, label }) => {
                if (groups[key].length === 0) return null;
                return (
                  <View key={key} style={styles.modalTimeGroup}>
                    <Text style={styles.modalTimeTitle}>{label}</Text>
                    {groups[key].map((item, idx) => (
                      <View key={idx} style={styles.modalMedRow}>
                        <View style={styles.modalMedHeader}>
                          <Text style={styles.modalMedName}>{item.drugName}</Text>
                          <Text style={styles.modalMedDosage}>{item.dosage}</Text>
                        </View>
                        {item.slot && (
                          <View style={styles.modalMedDetails}>
                            <Text style={styles.modalMedDetailText}>
                              <Ionicons name="medical" size={12} color="#64748B" /> {item.slot.pillCount} viên
                            </Text>
                            {item.slot.time && (
                              <Text style={styles.modalMedDetailText}>
                                <Ionicons name="time" size={12} color="#64748B" /> {item.slot.time}
                              </Text>
                            )}
                            {item.slot.mealTiming && (
                              <Text style={styles.modalMedDetailText}>
                                <Ionicons name="restaurant" size={12} color="#64748B" /> {renderMealTimingLabel(item.slot.mealTiming)}
                              </Text>
                            )}
                          </View>
                        )}
                        {item.instructions && (
                          <Text style={styles.modalMedInst}>Ghi chú: {item.instructions}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
      
      {renderPrescriptionModal()}
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
  newSummaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  newSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  newSummaryTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  newSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  newSummaryItem: {
    alignItems: "center",
  },
  newSummaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
  },
  newSummaryLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  newHistoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  newHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  newHistoryHeaderLeft: {
    flex: 1,
  },
  newHistoryHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  newHistoryDate: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  newHistoryStats: {
    fontSize: 13,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgeGood: { backgroundColor: "#ECFDF5" },
  badgeTextGood: { color: "#10B981" },
  badgeWarn: { backgroundColor: "#FFFBEB" },
  badgeTextWarn: { color: "#F59E0B" },
  badgeBad: { backgroundColor: "#FEF2F2" },
  badgeTextBad: { color: "#EF4444" },
  historyDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  historyExpandedContent: {
    paddingBottom: 12,
  },
  timeGroupContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  timeGroupTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  medRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  medRowInfo: {
    flex: 1,
  },
  medRowName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
  },
  medRowDosage: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  slotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  slotBadgeTaken: { backgroundColor: "#ECFDF5" },
  slotBadgeTextTaken: { color: "#10B981" },
  slotBadgeMissed: { backgroundColor: "#FEF2F2" },
  slotBadgeTextMissed: { color: "#EF4444" },
  slotBadgePending: { backgroundColor: "#F1F5F9" },
  slotBadgeTextPending: { color: "#64748B" },
  newPrescCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  newPrescHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  prescStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  prescStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  newPrescDate: {
    fontSize: 13,
    color: "#64748B",
  },
  prescMedCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  prescChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  prescChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  prescChipText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  closeBtn: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 16,
  },
  modalContentContainer: {
    paddingTop: 16,
    paddingBottom: 56,
  },
  modalDateRange: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
    fontStyle: "italic",
  },
  modalTimeGroup: {
    marginBottom: 20,
  },
  modalTimeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modalMedRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  modalMedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  modalMedName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  modalMedDosage: {
    fontSize: 13,
    fontWeight: "500",
    color: "#059669",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  modalMedDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 6,
  },
  modalMedDetailText: {
    fontSize: 13,
    color: "#475569",
  },
  modalMedInst: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  }
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { getMeasurements } from "../../api/measurementApi";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width - 40;

function formatDate(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

function formatShortLabel(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function matchesTab(measurement, tab) {
  if (tab === "bp") {
    return (
      Number(measurement?.bloodPressure?.systolic) > 0 ||
      Number(measurement?.bloodPressure?.diastolic) > 0
    );
  }
  if (tab === "glucose") return Number(measurement?.glucose) > 0;
  if (tab === "spo2") return Number(measurement?.spo2) > 0;
  if (tab === "temp") return Number(measurement?.temperature) > 0;
  if (tab === "heartRate") return Number(measurement?.heartRate) > 0;
  if (tab === "respiratoryRate") return Number(measurement?.respiratoryRate) > 0;
  return false;
}

function getAccentStyle(tab, styles) {
  if (tab === "bp") return styles.recordCardBp;
  if (tab === "glucose") return styles.recordCardGlucose;
  if (tab === "spo2") return styles.recordCardSpo2;
  return styles.recordCardTemp;
}

export default function HistoryScreen({ route, isEmbedded }) {
  const { user } = useAuth() || {};
  const patientId = route?.params?.patientId || user?._id || user?.id || "p1";

  const [tab, setTab] = useState("bp");
  const [showMore, setShowMore] = useState(false);
  const [measurements, setMeasurements] = useState([]);

  const fetchMeasurements = async () => {
    const res = await getMeasurements(patientId);
    if (res.ok && res.body.data) {
      setMeasurements(res.body.data);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMeasurements();
    }, [patientId])
  );

  const activeMeasurements = measurements
    .filter((m) => matchesTab(m, tab))
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  let chartLabels = [];
  let chartDatasets = [];
  let legend = [];

  if (activeMeasurements.length > 0) {
    chartLabels = activeMeasurements.map((m) => formatShortLabel(m.createdAt));

    if (tab === "bp") { 
      const systolicArr = activeMeasurements.map((m) => m.bloodPressure?.systolic || m.systolic || 0);
      const diastolicArr = activeMeasurements.map((m) => m.bloodPressure?.diastolic || m.diastolic || 0);
      chartDatasets = [
        {
          data: systolicArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(220, 38, 38, ${opacity})`,
        },
        {
          data: diastolicArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        },
      ];
      legend = ["Tâm thu", "Tâm trương"];
    } else if (tab === "glucose") {
      const glucoseArr = activeMeasurements.map((m) => m.glucose || 0);
      chartDatasets = [
        {
          data: glucoseArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
        },
      ];
      legend = ["Đường huyết (mg/dL)"];
    } else if (tab === "spo2") {
      const spo2Arr = activeMeasurements.map((m) => m.spo2 || 0);
      chartDatasets = [
        {
          data: spo2Arr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        },
      ];
      legend = ["SpO₂ (%)"];
    } else if (tab === "temp") {
      const tempArr = activeMeasurements.map((m) => m.temperature || 0);
      chartDatasets = [
        {
          data: tempArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        },
      ];
      legend = ["Nhiệt độ (°C)"];
    } else if (tab === "heartRate") {
      const heartRateArr = activeMeasurements.map((m) => m.heartRate || 0);
      chartDatasets = [
        {
          data: heartRateArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        },
      ];
      legend = ["Nhịp tim (bpm)"];
    } else if (tab === "respiratoryRate") {
      const respiratoryRateArr = activeMeasurements.map((m) => m.respiratoryRate || 0);
      chartDatasets = [
        {
          data: respiratoryRateArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
        },
      ];
      legend = ["Nhịp thở (lần/ph)"];
    }
  }

  const visibleMeasurements = activeMeasurements
    .slice()
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, showMore ? 5 : 1);

  const Container = isEmbedded ? View : SafeAreaView;

  return (
    <Container style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Lịch sử đo</Text>
            <Text style={styles.headerSub}>Theo dõi chi tiết các bản ghi đo lường</Text>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          {/* Row 1 */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => {
                setTab("bp");
                setShowMore(false);
              }}
              style={[styles.tabItem, tab === "bp" && styles.tabActive]}
            >
              <Ionicons
                name="heart"
                size={16}
                color={tab === "bp" ? "#2563EB" : "#6B7280"}
              />
              <Text style={[styles.tabText, tab === "bp" && styles.tabTextActive]}>
                Huyết áp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTab("glucose");
                setShowMore(false);
              }}
              style={[styles.tabItem, tab === "glucose" && styles.tabActive]}
            >
              <Ionicons
                name="water"
                size={16}
                color={tab === "glucose" ? "#2563EB" : "#6B7280"}
              />
              <Text
                style={[styles.tabText, tab === "glucose" && styles.tabTextActive]}
              >
                Đường huyết
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTab("spo2");
                setShowMore(false);
              }}
              style={[styles.tabItem, tab === "spo2" && styles.tabActive]}
            >
              <Ionicons
                name="pulse"
                size={16}
                color={tab === "spo2" ? "#2563EB" : "#6B7280"}
              />
              <Text style={[styles.tabText, tab === "spo2" && styles.tabTextActive]}>
                SpO₂
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => {
                setTab("temp");
                setShowMore(false);
              }}
              style={[styles.tabItem, tab === "temp" && styles.tabActive]}
            >
              <Ionicons
                name="thermometer"
                size={16}
                color={tab === "temp" ? "#2563EB" : "#6B7280"}
              />
              <Text style={[styles.tabText, tab === "temp" && styles.tabTextActive]}>
                Nhiệt độ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTab("heartRate");
                setShowMore(false);
              }}
              style={[styles.tabItem, tab === "heartRate" && styles.tabActive]}
            >
              <Ionicons
                name="fitness"
                size={16}
                color={tab === "heartRate" ? "#2563EB" : "#6B7280"}
              />
              <Text style={[styles.tabText, tab === "heartRate" && styles.tabTextActive]}>
                Nhịp tim
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTab("respiratoryRate");
                setShowMore(false);
              }}
              style={[styles.tabItem, tab === "respiratoryRate" && styles.tabActive]}
            >
              <Ionicons
                name="cloud"
                size={16}
                color={tab === "respiratoryRate" ? "#2563EB" : "#6B7280"}
              />
              <Text style={[styles.tabText, tab === "respiratoryRate" && styles.tabTextActive]}>
                Nhịp thở
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TREND CARD */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Xu hướng gần đây</Text>
            <TouchableOpacity>
              <Text style={styles.detailBtn}>Xem chi tiết</Text>
            </TouchableOpacity>
          </View>

          {activeMeasurements.length === 0 ? (
            <View style={styles.emptyChartBox}>
              <Ionicons name="stats-chart" size={22} color="#9CA3AF" />
              <Text style={styles.emptyChartText}>Chưa có dữ liệu để hiển thị</Text>
            </View>
          ) : (
            <LineChart
              data={{
                labels: chartLabels,
                datasets: chartDatasets,
                legend,
              }}
              width={screenWidth}
              height={200}
              yAxisLabel=""
              chartConfig={{
                backgroundColor: "#FFFFFF",
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                propsForDots: {
                  r: "4",
                },
                propsForBackgroundLines: {
                  strokeDasharray: "4",
                },
              }}
              bezier
              style={{ marginTop: 12, borderRadius: 12 }}
            />
          )}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Bản ghi đo</Text>
          {activeMeasurements.length > 1 && !showMore && (
            <TouchableOpacity
              style={styles.sectionMoreBtn}
              onPress={() => setShowMore(true)}
            >
              <Text style={styles.sectionMoreText}>Xem thêm</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* RECORD LIST */}
        {visibleMeasurements.map((m) => {
          const dateStr = formatDate(m.createdAt);
          const timeStr = formatTime(m.createdAt);

          const accentStyle = getAccentStyle(tab, styles);

          return (
            <View key={m.id} style={[styles.recordCard, accentStyle]}>
              <View style={styles.recordHeader}>
                <View style={styles.dateRow}>
                  <FontAwesome5 name="calendar-alt" size={14} color="#6B7280" />
                  <Text style={styles.recordDateText}>{dateStr}</Text>
                  <Text style={styles.recordTimeText}>· {timeStr}</Text>
                </View>

                {tab === "glucose" && m.timing && (
                  <View style={styles.timingBadge}>
                    <Text style={styles.timingBadgeText}>{m.timing}</Text>
                  </View>
                )}
              </View>

              <View style={styles.recordValuesRow}>
                {tab === "bp" && (
                  <>
                    <View style={styles.recordValueBox}>
                      <Text style={styles.recordValueNumber}>{m.bloodPressure?.systolic || m.systolic}</Text>
                      <Text style={styles.recordValueUnit}>mmHg</Text>
                      <Text style={styles.recordValueLabel}>Tâm thu</Text>
                    </View>
                    <View style={styles.recordValueBox}>
                      <Text style={styles.recordValueNumber}>{m.bloodPressure?.diastolic || m.diastolic}</Text>
                      <Text style={styles.recordValueUnit}>mmHg</Text>
                      <Text style={styles.recordValueLabel}>Tâm trương</Text>
                    </View>
                    <View style={styles.recordValueBox}>
                      <Text style={styles.recordValueNumber}>{m.heartRate || m.pulse}</Text>
                      <Text style={styles.recordValueUnit}>bpm</Text>
                      <Text style={styles.recordValueLabel}>Mạch</Text>
                    </View>
                  </>
                )}

                {tab === "glucose" && (
                  <View style={styles.recordValueBox}>
                    <Text style={styles.recordValueNumber}>{m.glucose}</Text>
                    <Text style={styles.recordValueUnit}>mg/dL</Text>
                    <Text style={styles.recordValueLabel}>Đường huyết</Text>
                  </View>
                )}

                {tab === "spo2" && (
                  <View style={styles.recordValueBox}>
                    <Text style={styles.recordValueNumber}>{m.spo2}</Text>
                    <Text style={styles.recordValueUnit}>%</Text>
                    <Text style={styles.recordValueLabel}>SpO₂</Text>
                  </View>
                )}

                {tab === "temp" && (
                  <View style={styles.recordValueBox}>
                    <Text style={styles.recordValueNumber}>{m.temperature}</Text>
                    <Text style={styles.recordValueUnit}>°C</Text>
                    <Text style={styles.recordValueLabel}>Nhiệt độ</Text>
                  </View>
                )}

                {tab === "heartRate" && (
                  <View style={styles.recordValueBox}>
                    <Text style={styles.recordValueNumber}>{m.heartRate}</Text>
                    <Text style={styles.recordValueUnit}>bpm</Text>
                    <Text style={styles.recordValueLabel}>Nhịp tim</Text>
                  </View>
                )}

                {tab === "respiratoryRate" && (
                  <View style={styles.recordValueBox}>
                    <Text style={styles.recordValueNumber}>{m.respiratoryRate}</Text>
                    <Text style={styles.recordValueUnit}>lần/phút</Text>
                    <Text style={styles.recordValueLabel}>Nhịp thở</Text>
                  </View>
                )}
              </View>

              <View style={styles.recordMetaRow}>
                <Text style={styles.recordMetaText}>
                  Thiết bị: {m.device || "Không rõ"}
                </Text>
                <Text style={styles.recordMetaText}>
                  Người đo: {m.recordedBy || "Không rõ"}
                </Text>
              </View>
            </View>
          );
        })}

        {activeMeasurements.length === 0 && (
          <View style={styles.emptyListBox}>
            <Ionicons name="clipboard-outline" size={22} color="#9CA3AF" />
            <Text style={styles.emptyListText}>Chưa có bản ghi cho loại này</Text>
          </View>
        )}
      </ScrollView>
    </Container>
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
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 4 },

  tabsContainer: {
    marginBottom: 20,
    gap: 8,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#E5EDFF",
    padding: 4,
    borderRadius: 999,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
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

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  detailBtn: { color: "#2563EB", fontWeight: "600", fontSize: 13 },

  emptyChartBox: {
    marginTop: 20,
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyChartText: { fontSize: 13, color: "#6B7280" },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sectionMoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sectionMoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },

  recordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  recordCardBp: {
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  recordCardGlucose: {
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  recordCardSpo2: {
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  recordCardTemp: {
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },

  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recordDateText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  recordTimeText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  timingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  timingBadgeText: {
    fontSize: 11,
    color: "#4F46E5",
    fontWeight: "600",
  },

  recordValuesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  recordValueBox: {
    flex: 1,
    alignItems: "center",
  },
  recordValueNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  recordValueUnit: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  recordValueLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },

  recordMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  recordMetaText: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  emptyListBox: {
    marginTop: 20,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyListText: {
    fontSize: 13,
    color: "#6B7280",
  },
});

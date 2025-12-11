import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width - 40;

// Mock data theo schema Measurements
// type: "bp", "glucose", "spo2", "temp"
const measurements = [
  {
    id: "m1",
    patientId: "p1",
    type: "bp",
    systolic: 132,
    diastolic: 86,
    pulse: 78,
    device: "BP_MONITOR_01",
    timing: "sáng",
    recordedBy: "u1",
    measuredAt: "2025-10-18T08:30:00",
    createdAt: "2025-10-18T08:30:05",
    updatedAt: "2025-10-18T08:30:05",
  },
  {
    id: "m2",
    patientId: "p1",
    type: "bp",
    systolic: 140,
    diastolic: 90,
    pulse: 82,
    device: "BP_MONITOR_01",
    timing: "chiều",
    recordedBy: "u1",
    measuredAt: "2025-10-19T16:10:00",
    createdAt: "2025-10-19T16:10:05",
    updatedAt: "2025-10-19T16:10:05",
  },
  {
    id: "m3",
    patientId: "p1",
    type: "bp",
    systolic: 126,
    diastolic: 80,
    pulse: 74,
    device: "BP_MONITOR_01",
    timing: "sáng",
    recordedBy: "u1",
    measuredAt: "2025-10-20T07:45:00",
    createdAt: "2025-10-20T07:45:05",
    updatedAt: "2025-10-20T07:45:05",
  },
  {
    id: "m4",
    patientId: "p1",
    type: "glucose",
    glucose: 95,
    timing: "lúc đói",
    device: "GLUCOSE_METER_01",
    recordedBy: "u1",
    measuredAt: "2025-10-18T07:00:00",
    createdAt: "2025-10-18T07:00:05",
    updatedAt: "2025-10-18T07:00:05",
  },
  {
    id: "m5",
    patientId: "p1",
    type: "glucose",
    glucose: 132,
    timing: "sau ăn",
    device: "GLUCOSE_METER_01",
    recordedBy: "u1",
    measuredAt: "2025-10-19T12:30:00",
    createdAt: "2025-10-19T12:30:05",
    updatedAt: "2025-10-19T12:30:05",
  },
  {
    id: "m6",
    patientId: "p1",
    type: "glucose",
    glucose: 110,
    timing: "lúc đói",
    device: "GLUCOSE_METER_01",
    recordedBy: "u1",
    measuredAt: "2025-10-20T06:50:00",
    createdAt: "2025-10-20T06:50:05",
    updatedAt: "2025-10-20T06:50:05",
  },
  // SpO2 – nhiều bản ghi
  {
    id: "m7",
    patientId: "p1",
    type: "spo2",
    spo2: 97,
    device: "SPO2_01",
    recordedBy: "u1",
    measuredAt: "2025-10-18T09:15:00",
    createdAt: "2025-10-18T09:15:05",
    updatedAt: "2025-10-18T09:15:05",
  },
  {
    id: "m8",
    patientId: "p1",
    type: "spo2",
    spo2: 96,
    device: "SPO2_01",
    recordedBy: "u1",
    measuredAt: "2025-10-19T09:20:00",
    createdAt: "2025-10-19T09:20:05",
    updatedAt: "2025-10-19T09:20:05",
  },
  {
    id: "m9",
    patientId: "p1",
    type: "spo2",
    spo2: 98,
    device: "SPO2_01",
    recordedBy: "u1",
    measuredAt: "2025-10-20T09:25:00",
    createdAt: "2025-10-20T09:25:05",
    updatedAt: "2025-10-20T09:25:05",
  },
  // Nhiệt độ – nhiều bản ghi
  {
    id: "m10",
    patientId: "p1",
    type: "temp",
    temperature: 36.7,
    device: "THERMO_01",
    recordedBy: "u1",
    measuredAt: "2025-10-18T21:00:00",
    createdAt: "2025-10-18T21:00:05",
    updatedAt: "2025-10-18T21:00:05",
  },
  {
    id: "m11",
    patientId: "p1",
    type: "temp",
    temperature: 37.2,
    device: "THERMO_01",
    recordedBy: "u1",
    measuredAt: "2025-10-19T21:10:00",
    createdAt: "2025-10-19T21:10:05",
    updatedAt: "2025-10-19T21:10:05",
  },
  {
    id: "m12",
    patientId: "p1",
    type: "temp",
    temperature: 36.8,
    device: "THERMO_01",
    recordedBy: "u1",
    measuredAt: "2025-10-20T21:05:00",
    createdAt: "2025-10-20T21:05:05",
    updatedAt: "2025-10-20T21:05:05",
  },
];

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

export default function HistoryScreen() {
  const [tab, setTab] = useState("bp"); // "bp" | "glucose" | "spo2" | "temp"
  const [showMore, setShowMore] = useState(false); // false: 1 bản ghi, true: 5 bản ghi

  const activeMeasurements = measurements
    .filter((m) => m.type === tab)
    .sort(
      (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
    );

  let chartLabels = [];
  let chartDatasets = [];
  let legend = [];

  if (activeMeasurements.length > 0) {
    chartLabels = activeMeasurements.map((m) => formatShortLabel(m.measuredAt));

    if (tab === "bp") {
      const systolicArr = activeMeasurements.map((m) => m.systolic);
      const diastolicArr = activeMeasurements.map((m) => m.diastolic);
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
      const glucoseArr = activeMeasurements.map((m) => m.glucose);
      chartDatasets = [
        {
          data: glucoseArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
        },
      ];
      legend = ["Đường huyết (mg/dL)"];
    } else if (tab === "spo2") {
      const spo2Arr = activeMeasurements.map((m) => m.spo2);
      chartDatasets = [
        {
          data: spo2Arr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        },
      ];
      legend = ["SpO₂ (%)"];
    } else if (tab === "temp") {
      const tempArr = activeMeasurements.map((m) => m.temperature);
      chartDatasets = [
        {
          data: tempArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        },
      ];
      legend = ["Nhiệt độ (°C)"];
    }
  }

  const visibleMeasurements = activeMeasurements
    .slice()
    .sort(
      (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
    )
    .slice(0, showMore ? 5 : 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Lịch sử đo</Text>
            <Text style={styles.headerSub}>Theo dõi chi tiết các bản ghi đo lường</Text>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
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

        {/* HEADER BẢN GHI + NÚT XEM THÊM */}
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
          const dateStr = formatDate(m.measuredAt);
          const timeStr = formatTime(m.measuredAt);

          const accentStyle =
            m.type === "bp"
              ? styles.recordCardBp
              : m.type === "glucose"
              ? styles.recordCardGlucose
              : m.type === "spo2"
              ? styles.recordCardSpo2
              : styles.recordCardTemp;

          return (
            <View key={m.id} style={[styles.recordCard, accentStyle]}>
              {/* Header: ngày/giờ + timing */}
              <View style={styles.recordHeader}>
                <View style={styles.dateRow}>
                  <FontAwesome5 name="calendar-alt" size={14} color="#6B7280" />
                  <Text style={styles.recordDateText}>{dateStr}</Text>
                  <Text style={styles.recordTimeText}>· {timeStr}</Text>
                </View>

                {m.timing && (
                  <View style={styles.timingBadge}>
                    <Text style={styles.timingBadgeText}>{m.timing}</Text>
                  </View>
                )}
              </View>

              {/* Giá trị chính theo type */}
              <View style={styles.recordValuesRow}>
                {m.type === "bp" && (
                  <>
                    <View style={styles.recordValueBox}>
                      <Text style={styles.recordValueNumber}>{m.systolic}</Text>
                      <Text style={styles.recordValueUnit}>mmHg</Text>
                      <Text style={styles.recordValueLabel}>Tâm thu</Text>
                    </View>
                    <View style={styles.recordValueBox}>
                      <Text style={styles.recordValueNumber}>{m.diastolic}</Text>
                      <Text style={styles.recordValueUnit}>mmHg</Text>
                      <Text style={styles.recordValueLabel}>Tâm trương</Text>
                    </View>
                    <View style={styles.recordValueBox}>
                      <Text style={styles.recordValueNumber}>{m.pulse}</Text>
                      <Text style={styles.recordValueUnit}>bpm</Text>
                      <Text style={styles.recordValueLabel}>Mạch</Text>
                    </View>
                  </>
                )}

                {m.type === "glucose" && (
                  <View style={styles.recordValueBox}>
                    <Text style={styles.recordValueNumber}>{m.glucose}</Text>
                    <Text style={styles.recordValueUnit}>mg/dL</Text>
                    <Text style={styles.recordValueLabel}>Đường huyết</Text>
                  </View>
                )}

                {m.type === "spo2" && (
                  <View style={styles.recordValueBox}>
                    <Text style={styles.recordValueNumber}>{m.spo2}</Text>
                    <Text style={styles.recordValueUnit}>%</Text>
                    <Text style={styles.recordValueLabel}>SpO₂</Text>
                  </View>
                )}

                {m.type === "temp" && (
                  <View style={styles.recordValueBox}>
                    <Text style={styles.recordValueNumber}>{m.temperature}</Text>
                    <Text style={styles.recordValueUnit}>°C</Text>
                    <Text style={styles.recordValueLabel}>Nhiệt độ</Text>
                  </View>
                )}
              </View>

              {/* Meta: thiết bị + recordedBy */}
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

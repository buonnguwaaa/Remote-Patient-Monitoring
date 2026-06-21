import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { getMeasurements } from "../../api/measurementApi";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { LineChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;
const chartWidth = screenWidth - 60; // Account for padding and margins

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
  if (tab === "glucose") {
    const glucVal = measurement?.glucose ? (typeof measurement.glucose === "object" ? measurement.glucose.bloodGlucose : measurement.glucose) : null;
    return Number(glucVal) > 0;
  }
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
  const [showChartModal, setShowChartModal] = useState(false);
  const [timeRangeType, setTimeRangeType] = useState("week"); // "week" or "month"
  const [timeRangeValue, setTimeRangeValue] = useState(1); // number of weeks/months
  const [selectedDataPoint, setSelectedDataPoint] = useState(null); // For tooltip

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

  // Filter data based on time range
  const now = new Date();
  const cutoffDate = new Date(now);
  
  if (timeRangeType === "week") {
    cutoffDate.setDate(now.getDate() - (timeRangeValue * 7));
  } else {
    cutoffDate.setMonth(now.getMonth() - timeRangeValue);
  }

  // For small chart: use selected time range
  const recentMeasurements = activeMeasurements.filter(
    (m) => new Date(m.createdAt) >= cutoffDate
  );

  // For modal chart: use same data but with better spacing
  const extendedMeasurements = recentMeasurements;

  let chartLabels = [];
  let chartDatasets = [];
  let legend = [];
  let dynamicChartWidth = chartWidth; // Default width for small chart

  if (recentMeasurements.length > 0) {
    // Calculate dynamic width based on data points
    // Minimum 60px per data point for comfortable spacing
    const minPixelsPerPoint = 60;
    const calculatedWidth = Math.max(chartWidth, recentMeasurements.length * minPixelsPerPoint);
    dynamicChartWidth = calculatedWidth;
    
    // Show ALL labels since we have horizontal scroll
    chartLabels = recentMeasurements.map((m) => formatShortLabel(m.createdAt));

    if (tab === "bp") { 
      const systolicArr = recentMeasurements.map((m) => m.bloodPressure?.systolic || m.systolic || 0);
      const diastolicArr = recentMeasurements.map((m) => m.bloodPressure?.diastolic || m.diastolic || 0);
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
      const glucoseArr = recentMeasurements.map((m) => {
        const glucVal = m.glucose ? (typeof m.glucose === "object" ? m.glucose.bloodGlucose : m.glucose) : null;
        return glucVal || 0;
      });
      chartDatasets = [
        {
          data: glucoseArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
        },
      ];
      legend = ["Đường huyết (mg/dL)"];
    } else if (tab === "spo2") {
      const spo2Arr = recentMeasurements.map((m) => m.spo2 || 0);
      chartDatasets = [
        {
          data: spo2Arr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        },
      ];
      legend = ["SpO₂ (%)"];
    } else if (tab === "temp") {
      const tempArr = recentMeasurements.map((m) => m.temperature || 0);
      chartDatasets = [
        {
          data: tempArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        },
      ];
      legend = ["Nhiệt độ (°C)"];
    } else if (tab === "heartRate") {
      const heartRateArr = recentMeasurements.map((m) => m.heartRate || 0);
      chartDatasets = [
        {
          data: heartRateArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        },
      ];
      legend = ["Nhịp tim (bpm)"];
    } else if (tab === "respiratoryRate") {
      const respiratoryRateArr = recentMeasurements.map((m) => m.respiratoryRate || 0);
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

  // Prepare data for modal chart
  let modalChartLabels = [];
  let modalChartDatasets = [];
  let modalChartWidth = screenWidth - 40;

  if (extendedMeasurements.length > 0) {
    // For modal: calculate width based on data points to ensure proper spacing
    // Minimum 70px per data point for comfortable viewing in fullscreen
    const minPixelsPerPoint = 70;
    const calculatedWidth = Math.max(screenWidth - 40, extendedMeasurements.length * minPixelsPerPoint);
    modalChartWidth = calculatedWidth;
    
    // Show ALL labels since we have horizontal scroll
    modalChartLabels = extendedMeasurements.map((m) => formatShortLabel(m.createdAt));

    if (tab === "bp") { 
      const systolicArr = extendedMeasurements.map((m) => m.bloodPressure?.systolic || m.systolic || 0);
      const diastolicArr = extendedMeasurements.map((m) => m.bloodPressure?.diastolic || m.diastolic || 0);
      modalChartDatasets = [
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
    } else if (tab === "glucose") {
      const glucoseArr = extendedMeasurements.map((m) => {
        const glucVal = m.glucose ? (typeof m.glucose === "object" ? m.glucose.bloodGlucose : m.glucose) : null;
        return glucVal || 0;
      });
      modalChartDatasets = [
        {
          data: glucoseArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
        },
      ];
    } else if (tab === "spo2") {
      const spo2Arr = extendedMeasurements.map((m) => m.spo2 || 0);
      modalChartDatasets = [
        {
          data: spo2Arr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        },
      ];
    } else if (tab === "temp") {
      const tempArr = extendedMeasurements.map((m) => m.temperature || 0);
      modalChartDatasets = [
        {
          data: tempArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        },
      ];
    } else if (tab === "heartRate") {
      const heartRateArr = extendedMeasurements.map((m) => m.heartRate || 0);
      modalChartDatasets = [
        {
          data: heartRateArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
        },
      ];
    } else if (tab === "respiratoryRate") {
      const respiratoryRateArr = extendedMeasurements.map((m) => m.respiratoryRate || 0);
      modalChartDatasets = [
        {
          data: respiratoryRateArr,
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
        },
      ];
    }
  }

  const visibleMeasurements = activeMeasurements
    .slice()
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, showMore ? 5 : 1);

  // Handle data point click (for modal chart)
  const handleDataPointClick = (data) => {
    const { index } = data;
    const measurement = extendedMeasurements[index];
    if (measurement) {
      setSelectedDataPoint({
        measurement,
        index
      });
    }
  };

  // Format tooltip content
  const getTooltipContent = () => {
    if (!selectedDataPoint) return null;
    const m = selectedDataPoint.measurement;
    
    let content = {
      date: formatDate(m.createdAt),
      time: formatTime(m.createdAt),
      values: []
    };

    if (tab === "bp") {
      content.values = [
        { label: "Tâm thu", value: `${m.bloodPressure?.systolic || m.systolic} mmHg` },
        { label: "Tâm trương", value: `${m.bloodPressure?.diastolic || m.diastolic} mmHg` },
        { label: "Mạch", value: `${m.heartRate || m.pulse} bpm` }
      ];
    } else if (tab === "glucose") {
      content.values = [
        { label: "Đường huyết", value: `${m.glucose ? (typeof m.glucose === "object" ? m.glucose.bloodGlucose : m.glucose) : 0} mg/dL` },
        ...(m.timing ? [{ label: "Thời điểm", value: m.timing }] : [])
      ];
    } else if (tab === "spo2") {
      content.values = [{ label: "SpO₂", value: `${m.spo2}%` }];
    } else if (tab === "temp") {
      content.values = [{ label: "Nhiệt độ", value: `${m.temperature}°C` }];
    } else if (tab === "heartRate") {
      content.values = [{ label: "Nhịp tim", value: `${m.heartRate} bpm` }];
    } else if (tab === "respiratoryRate") {
      content.values = [{ label: "Nhịp thở", value: `${m.respiratoryRate} lần/phút` }];
    }

    return content;
  };

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

        {/* TIME RANGE FILTER */}
        <View style={styles.filterContainer}>
          <View style={styles.filterTypeSelector}>
            <TouchableOpacity
              onPress={() => setTimeRangeType("week")}
              style={[
                styles.filterTypeBtn,
                timeRangeType === "week" && styles.filterTypeBtnActive
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={timeRangeType === "week" ? "#FFFFFF" : "#6B7280"}
              />
              <Text style={[
                styles.filterTypeText,
                timeRangeType === "week" && styles.filterTypeTextActive
              ]}>
                Tuần
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTimeRangeType("month")}
              style={[
                styles.filterTypeBtn,
                timeRangeType === "month" && styles.filterTypeBtnActive
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={timeRangeType === "month" ? "#FFFFFF" : "#6B7280"}
              />
              <Text style={[
                styles.filterTypeText,
                timeRangeType === "month" && styles.filterTypeTextActive
              ]}>
                Tháng
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterValueSelector}>
            <TouchableOpacity
              onPress={() => setTimeRangeValue(Math.max(1, timeRangeValue - 1))}
              disabled={timeRangeValue <= 1}
              style={[styles.filterBtn, timeRangeValue <= 1 && styles.filterBtnDisabled]}
            >
              <Ionicons name="remove" size={18} color={timeRangeValue <= 1 ? "#D1D5DB" : "#6B7280"} />
            </TouchableOpacity>
            
            <Text style={styles.filterValueText}>{timeRangeValue}</Text>
            
            <TouchableOpacity
              onPress={() => {
                const max = timeRangeType === "week" ? 52 : 12;
                setTimeRangeValue(Math.min(max, timeRangeValue + 1));
              }}
              disabled={timeRangeValue >= (timeRangeType === "week" ? 52 : 12)}
              style={[
                styles.filterBtn,
                timeRangeValue >= (timeRangeType === "week" ? 52 : 12) && styles.filterBtnDisabled
              ]}
            >
              <Ionicons
                name="add"
                size={18}
                color={timeRangeValue >= (timeRangeType === "week" ? 52 : 12) ? "#D1D5DB" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* TREND CARD */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Xu hướng gần đây</Text>
            <TouchableOpacity onPress={() => setShowChartModal(true)}>
              <Text style={styles.detailBtn}>Xem chi tiết</Text>
            </TouchableOpacity>
          </View>

          {activeMeasurements.length === 0 ? (
            <View style={styles.emptyChartBox}>
              <Ionicons name="stats-chart" size={22} color="#9CA3AF" />
              <Text style={styles.emptyChartText}>Chưa có dữ liệu để hiển thị</Text>
            </View>
          ) : recentMeasurements.length === 0 ? (
            <View style={styles.emptyChartBox}>
              <Ionicons name="stats-chart" size={22} color="#9CA3AF" />
              <Text style={styles.emptyChartText}>
                Không có dữ liệu trong {timeRangeValue} {timeRangeType === "week" ? "tuần" : "tháng"} gần đây
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: chartDatasets,
                  legend,
                }}
                width={dynamicChartWidth}
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
            </ScrollView>
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
                    <Text style={styles.recordValueNumber}>
                      {m.glucose ? (typeof m.glucose === "object" ? m.glucose.bloodGlucose : m.glucose) : "--"}
                    </Text>
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

      {/* CHART MODAL */}
      <Modal
        visible={showChartModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Biểu đồ chi tiết</Text>
              <TouchableOpacity
                onPress={() => setShowChartModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              {activeMeasurements.length === 0 ? (
                <View style={[styles.emptyChartBox, { width: screenWidth - 40 }]}>
                  <Ionicons name="stats-chart" size={32} color="#9CA3AF" />
                  <Text style={styles.emptyChartText}>Chưa có dữ liệu để hiển thị</Text>
                </View>
              ) : extendedMeasurements.length === 0 ? (
                <View style={[styles.emptyChartBox, { width: screenWidth - 40 }]}>
                  <Ionicons name="stats-chart" size={32} color="#9CA3AF" />
                  <Text style={styles.emptyChartText}>
                    Không có dữ liệu trong {timeRangeValue} {timeRangeType === "week" ? "tuần" : "tháng"} gần đây
                  </Text>
                </View>
              ) : (
                <>
                  <LineChart
                    data={{
                      labels: modalChartLabels,
                      datasets: modalChartDatasets,
                      legend,
                    }}
                    width={modalChartWidth}
                    height={400}
                    yAxisLabel=""
                    chartConfig={{
                      backgroundColor: "#FFFFFF",
                      backgroundGradientFrom: "#FFFFFF",
                      backgroundGradientTo: "#FFFFFF",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(17, 24, 39, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                      propsForDots: {
                        r: "5",
                      },
                      propsForBackgroundLines: {
                        strokeDasharray: "4",
                      },
                    }}
                    bezier
                    style={{ marginVertical: 8, borderRadius: 12 }}
                    onDataPointClick={handleDataPointClick}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.modalHint}>
                <Ionicons name="information-circle" size={14} color="#6B7280" />
                {" "}Hiển thị dữ liệu {timeRangeValue} {timeRangeType === "week" ? "tuần" : "tháng"} gần nhất · Vuốt ngang để xem toàn bộ
              </Text>
            </View>

            {/* Tooltip - Fixed position overlay */}
            {selectedDataPoint && getTooltipContent() && (
              <TouchableOpacity
                style={styles.tooltipOverlay}
                activeOpacity={1}
                onPress={() => setSelectedDataPoint(null)}
              >
                <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.tooltip}>
                    <View style={styles.tooltipHeader}>
                      <Text style={styles.tooltipDate}>
                        {getTooltipContent().date} · {getTooltipContent().time}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedDataPoint(null)}>
                        <Ionicons name="close-circle" size={20} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                    {getTooltipContent().values.map((item, idx) => (
                      <View key={idx} style={styles.tooltipRow}>
                        <Text style={styles.tooltipLabel}>{item.label}:</Text>
                        <Text style={styles.tooltipValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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

  // Filter styles
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E5EDFF",
    borderRadius: 12,
    padding: 8,
    marginBottom: 20,
  },
  filterTypeSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 2,
  },
  filterTypeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  filterTypeBtnActive: {
    backgroundColor: "#3B82F6",
  },
  filterTypeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTypeTextActive: {
    color: "#FFFFFF",
  },
  filterValueSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 2,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  filterBtnDisabled: {
    opacity: 0.4,
  },
  filterValueText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: "center",
  },

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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: screenWidth - 40,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  
  // Tooltip styles
  tooltipOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  tooltip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    width: screenWidth - 80,
    maxWidth: 320,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tooltipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tooltipDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  tooltipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  tooltipLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
});

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { getMeasurements } from "../../api/measurementApi";
import { getThresholds } from "../../api/thresholdApi";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { LineChart } from "react-native-gifted-charts";
import DateTimePicker from "@react-native-community/datetimepicker";

const screenWidth = Dimensions.get("window").width;

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
    const glucVal = measurement?.glucose
      ? typeof measurement.glucose === "object"
        ? measurement.glucose.bloodGlucose
        : measurement.glucose
      : null;
    return Number(glucVal) > 0;
  }
  if (tab === "spo2") return Number(measurement?.spo2) > 0;
  if (tab === "temp") return Number(measurement?.temperature) > 0;
  if (tab === "heartRate") return Number(measurement?.heartRate) > 0;
  if (tab === "respiratoryRate") return Number(measurement?.respiratoryRate) > 0;
  return false;
}

function getGlucose(m) {
  if (!m.glucose) return 0;
  return (typeof m.glucose === "object" ? m.glucose.bloodGlucose : m.glucose) || 0;
}

function getMeasurementStatusColor(m, threshold, tab) {
  if (!threshold) return "#3B82F6";
  let status = "normal";
  if (tab === "bp") {
    const sys = m.bloodPressure?.systolic || m.systolic || 0;
    const dia = m.bloodPressure?.diastolic || m.diastolic || 0;
    if (sys > threshold.sysMax || dia > threshold.diaMax) status = "high";
    else if (sys < threshold.sysMin || dia < threshold.diaMin) status = "low";
  } else if (tab === "glucose") {
    const glucVal = getGlucose(m);
    if (glucVal > threshold.glucoseMax) status = "high";
    else if (glucVal < threshold.glucoseMin) status = "low";
  } else if (tab === "spo2") {
    if (m.spo2 < threshold.spo2Min) status = "high";
  } else if (tab === "temp") {
    if (m.temperature > threshold.temperatureMax) status = "high";
    else if (m.temperature < threshold.temperatureMin) status = "low";
  } else if (tab === "heartRate") {
    if (m.heartRate > threshold.heartRateMax) status = "high";
    else if (m.heartRate < threshold.heartRateMin) status = "low";
  } else if (tab === "respiratoryRate") {
    if (m.respiratoryRate > threshold.respiratoryRateMax) status = "high";
    else if (m.respiratoryRate < threshold.respiratoryRateMin) status = "low";
  }
  if (status === "high") return "#EF4444";
  if (status === "low") return "#F59E0B";
  return "#10B981";
}

// Series config per tab: which value(s) to plot + color + label
function getSeriesConfig(tab) {
  switch (tab) {
    case "bp":
      return [
        { key: "sys", label: "Tâm thu", color: "#DC2626", getValue: (m) => m.bloodPressure?.systolic || m.systolic || 0 },
        { key: "dia", label: "Tâm trương", color: "#2563EB", getValue: (m) => m.bloodPressure?.diastolic || m.diastolic || 0 },
      ];
    case "glucose":
      return [{ key: "gluc", label: "Đường huyết", unit: "mg/dL", color: "#F59E0B", getValue: getGlucose }];
    case "spo2":
      return [{ key: "spo2", label: "SpO₂", unit: "%", color: "#10B981", getValue: (m) => m.spo2 || 0 }];
    case "temp":
      return [{ key: "temp", label: "Nhiệt độ", unit: "°C", color: "#EF4444", getValue: (m) => m.temperature || 0 }];
    case "heartRate":
      return [{ key: "hr", label: "Nhịp tim", unit: "bpm", color: "#8B5CF6", getValue: (m) => m.heartRate || 0 }];
    case "respiratoryRate":
      return [{ key: "rr", label: "Nhịp thở", unit: "lần/ph", color: "#0EA5E9", getValue: (m) => m.respiratoryRate || 0 }];
    default:
      return [];
  }
}

// Threshold lines per tab: { value, color, label, dashed }
function getThresholdLines(tab, threshold) {
  if (!threshold) return [];
  const lines = [];
  const push = (val, color, label) => {
    if (val != null && !isNaN(val)) lines.push({ value: val, color, label });
  };
  if (tab === "bp") {
    push(threshold.sysMax, "#DC2626", "Tâm thu max");
    push(threshold.sysMin, "#F59E0B", "Tâm thu min");
    push(threshold.diaMax, "#60A5FA", "Tâm trương max");
    push(threshold.diaMin, "#93C5FD", "Tâm trương min");
  } else if (tab === "glucose") {
    push(threshold.glucoseMax, "#DC2626", "Max");
    push(threshold.glucoseMin, "#F59E0B", "Min");
  } else if (tab === "spo2") {
    push(threshold.spo2Min, "#DC2626", "Ngưỡng thấp");
  } else if (tab === "temp") {
    push(threshold.temperatureMax, "#DC2626", "Max");
    push(threshold.temperatureMin, "#F59E0B", "Min");
  } else if (tab === "heartRate") {
    push(threshold.heartRateMax, "#DC2626", "Max");
    push(threshold.heartRateMin, "#F59E0B", "Min");
  } else if (tab === "respiratoryRate") {
    push(threshold.respiratoryRateMax, "#DC2626", "Max");
    push(threshold.respiratoryRateMin, "#F59E0B", "Min");
  }
  return lines;
}

export default function HistoryScreen({ route, isEmbedded }) {
  const { user } = useAuth() || {};
  const patientId = route?.params?.patientId || user?._id || user?.id || "p1";

  const [tab, setTab] = useState("bp");
  const [showMore, setShowMore] = useState(false);
  const [measurements, setMeasurements] = useState([]);
  const [showChartModal, setShowChartModal] = useState(false);
  const [threshold, setThreshold] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(null);

  const fetchMeasurements = async () => {
    try {
      const res = await getMeasurements({ patientId });
      if (res.ok && res.body.data) setMeasurements(res.body.data);
      const tRes = await getThresholds({ patientId, latest: true });
      if (tRes.ok && tRes.body.data && tRes.body.data.length > 0) setThreshold(tRes.body.data[0]);
    } catch (e) {
      console.log(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMeasurements();
    }, [patientId])
  );

  const activeMeasurements = measurements
    .filter((m) => matchesTab(m, tab))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const sDate = new Date(startDate);
  sDate.setHours(0, 0, 0, 0);
  const eDate = new Date(endDate);
  eDate.setHours(23, 59, 59, 999);

  const recentMeasurements = activeMeasurements.filter((m) => {
    const d = new Date(m.createdAt);
    return d >= sDate && d <= eDate;
  });

  const isSameDay =
    sDate.getFullYear() === eDate.getFullYear() &&
    sDate.getMonth() === eDate.getMonth() &&
    sDate.getDate() === eDate.getDate();

  const series = getSeriesConfig(tab);
  const thresholdLines = getThresholdLines(tab, threshold);

  // Build chart data per series. gifted-charts wants array of { value, label, ... }
  const buildSeriesData = (cfg, pointR) =>
    recentMeasurements.map((m) => ({
      value: cfg.getValue(m),
      label: isSameDay ? formatTime(m.createdAt) : formatShortLabel(m.createdAt),
      labelTextStyle: { color: "#9CA3AF", fontSize: 10 },
      dataPointColor: cfg.color,
      dataPointRadius: pointR,
      // attach raw measurement for tooltip
      _raw: m,
    }));

  // Compute max value across series + thresholds for nice top padding
  const allValues = [];
  series.forEach((cfg) => recentMeasurements.forEach((m) => allValues.push(cfg.getValue(m))));
  thresholdLines.forEach((l) => allValues.push(l.value));
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const chartMaxValue = Math.ceil((maxValue * 1.15) / 10) * 10 || 100;

  // Spacing cố định để khi nhiều điểm, biểu đồ rộng hơn khung -> tự cuộn ngang
  const spacing = 60;

  const visibleMeasurements = activeMeasurements
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, showMore ? 5 : 1);

  // Tooltip renderer cho pointer (gifted-charts focus)
  const renderTooltip = (items) => {
    // items: array of focused points (one per dataset), each has _raw
    const raw = items?.[0]?._raw;
    if (!raw) return null;
    const rows = [];
    if (tab === "bp") {
      rows.push(["Tâm thu", `${raw.bloodPressure?.systolic || raw.systolic} mmHg`]);
      rows.push(["Tâm trương", `${raw.bloodPressure?.diastolic || raw.diastolic} mmHg`]);
      rows.push(["Mạch", `${raw.heartRate || raw.pulse || "--"} bpm`]);
    } else {
      series.forEach((cfg) => {
        rows.push([cfg.label, `${cfg.getValue(raw)} ${cfg.unit || ""}`]);
      });
      if (tab === "glucose" && raw.timing) rows.push(["Thời điểm", raw.timing]);
    }
    return (
      <View style={styles.pointerTooltip}>
        <Text style={styles.pointerTooltipDate}>
          {formatDate(raw.createdAt)} · {formatTime(raw.createdAt)}
        </Text>
        {rows.map(([label, value], i) => (
          <View key={i} style={styles.pointerTooltipRow}>
            <Text style={styles.pointerTooltipLabel}>{label}</Text>
            <Text style={styles.pointerTooltipValue}>{value}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderChart = (height) => {
    const primary = series[0];
    const pointR = height > 250 ? 5 : 4;
    const initialSpacing = 20;
    const endSpacing = 20;
    const data1 = buildSeriesData(primary, pointR);
    const data2 = series[1] ? buildSeriesData(series[1], pointR) : null;

    // Vẽ toàn bộ các đường đo và đường ngưỡng bằng dataSet để tất cả cuộn ngang đồng bộ
    // và được clip chuẩn bên trong container, không bị tràn hay cố định.
    const datasets = [
      {
        data: data1,
        color: primary.color,
        thickness: 2.5,
        ...(series.length === 1 ? {
          areaChart: true,
          startFillColor: primary.color,
          startOpacity: 0.18,
          endFillColor: primary.color,
          endOpacity: 0.01,
        } : {})
      },
      ...(data2 ? [{
        data: data2,
        color: series[1].color,
        thickness: 2.5,
      }] : []),
      ...thresholdLines.map((line) => ({
        data: recentMeasurements.map(() => ({
          value: line.value,
          hideDataPoint: true,
          hidePointer: true,
        })),
        color: line.color,
        thickness: 1.5,
        strokeDashArray: [5, 4],
        hideDataPoints: true,
      })),
    ];

    return (
      <LineChart
        dataSet={datasets}
        height={height}
        width={screenWidth - (height > 250 ? 96 : 84)}
        spacing={spacing}
        initialSpacing={initialSpacing}
        endSpacing={endSpacing}
        maxValue={chartMaxValue}
        noOfSections={5}
        yAxisColor="#E5E7EB"
        xAxisColor="#E5E7EB"
        yAxisThickness={1}
        xAxisThickness={1}
        yAxisTextStyle={{ color: "#9CA3AF", fontSize: 10 }}
        rulesType="dashed"
        rulesColor="#F3F4F6"
        curved
        disableScroll={false}
        scrollToEnd={true}
        pointerConfig={{
          pointerStripColor: "#9CA3AF",
          pointerStripWidth: 1,
          pointerColor: primary.color,
          radius: 5,
          pointerLabelWidth: 170,
          pointerLabelHeight: 130,
          activatePointersOnLongPress: false,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: renderTooltip,
        }}
      />
    );
  };

  const ChartLegend = () => {
    if (series.length === 0) return null;
    return (
      <View style={styles.legendBox}>
        {/* Data series row */}
        <View style={styles.legendRow}>
          {series.map((cfg) => (
            <View key={cfg.key} style={styles.legendItem}>
              <View style={[styles.legendSolidLine, { backgroundColor: cfg.color }]} />
              <Text style={styles.legendText}>{cfg.label}</Text>
            </View>
          ))}
        </View>
        {/* Threshold row */}
        {thresholdLines.length > 0 && (
          <View style={styles.legendRow}>
            {thresholdLines.map((line, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={styles.legendDashWrap}>
                  {[0, 1, 2].map((d) => (
                    <View key={d} style={[styles.legendDash, { backgroundColor: line.color }]} />
                  ))}
                </View>
                <Text style={styles.legendTextSm}>
                  {line.label} {line.value}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const Container = isEmbedded ? View : SafeAreaView;

  const TABS = [
    { key: "bp", label: "Huyết áp", icon: "heart" },
    { key: "glucose", label: "Đường huyết", icon: "water" },
    { key: "spo2", label: "SpO₂", icon: "pulse" },
    { key: "temp", label: "Nhiệt độ", icon: "thermometer" },
    { key: "heartRate", label: "Nhịp tim", icon: "fitness" },
    { key: "respiratoryRate", label: "Nhịp thở", icon: "cloud" },
  ];

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
          <View style={styles.tabsRow}>
            {TABS.slice(0, 3).map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => {
                  setTab(t.key);
                  setShowMore(false);
                }}
                style={[styles.tabItem, tab === t.key && styles.tabActive]}
              >
                <Ionicons name={t.icon} size={16} color={tab === t.key ? "#2563EB" : "#6B7280"} />
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.tabsRow}>
            {TABS.slice(3).map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => {
                  setTab(t.key);
                  setShowMore(false);
                }}
                style={[styles.tabItem, tab === t.key && styles.tabActive]}
              >
                <Ionicons name={t.icon} size={16} color={tab === t.key ? "#2563EB" : "#6B7280"} />
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* TIME RANGE FILTER */}
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity
            style={styles.filterDateBtn}
            onPress={() => setShowPicker("start")}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text style={{ fontSize: 14, color: "#4B5563", fontWeight: "500" }}>
                {formatDate(startDate)} - {formatDate(endDate)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={showPicker === "start" ? startDate : endDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                const currentPicker = showPicker;
                setShowPicker(null);
                if (event.type === "dismissed") return;
                if (selectedDate) {
                  if (currentPicker === "start") {
                    setStartDate(selectedDate);
                    setTimeout(() => setShowPicker("end"), 500);
                  } else {
                    setEndDate(selectedDate);
                  }
                }
              }}
            />
          )}
        </View>

        {/* TREND CARD */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Xu hướng gần đây</Text>
            {recentMeasurements.length > 0 && (
              <TouchableOpacity onPress={() => setShowChartModal(true)}>
                <Text style={styles.detailBtn}>Xem chi tiết</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeMeasurements.length === 0 ? (
            <View style={styles.emptyChartBox}>
              <Ionicons name="stats-chart" size={22} color="#9CA3AF" />
              <Text style={styles.emptyChartText}>Chưa có dữ liệu để hiển thị</Text>
            </View>
          ) : recentMeasurements.length === 0 ? (
            <View style={styles.emptyChartBox}>
              <Ionicons name="stats-chart" size={22} color="#9CA3AF" />
              <Text style={styles.emptyChartText}>Không có dữ liệu trong khoảng thời gian đã chọn</Text>
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              {renderChart(200)}
              <ChartLegend />
            </View>
          )}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Bản ghi đo</Text>
          {activeMeasurements.length > 1 && !showMore && (
            <TouchableOpacity style={styles.sectionMoreBtn} onPress={() => setShowMore(true)}>
              <Text style={styles.sectionMoreText}>Xem thêm</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* RECORD LIST */}
        {visibleMeasurements.map((m) => {
          const dateStr = formatDate(m.createdAt);
          const timeStr = formatTime(m.createdAt);
          const statusColor = getMeasurementStatusColor(m, threshold, tab);
          const dynamicBorderStyle = { borderLeftWidth: 4, borderLeftColor: statusColor };

          let sysAlert = false, diaAlert = false, hrAlert = false;
          let glucAlert = false, spo2Alert = false, tempAlert = false, rrAlert = false;

          if (threshold) {
            if (tab === "bp") {
              const sys = m.bloodPressure?.systolic || m.systolic || 0;
              const dia = m.bloodPressure?.diastolic || m.diastolic || 0;
              const hr = m.heartRate || m.pulse || 0;
              sysAlert = sys > threshold.sysMax || sys < threshold.sysMin;
              diaAlert = dia > threshold.diaMax || dia < threshold.diaMin;
              hrAlert = hr > threshold.heartRateMax || hr < threshold.heartRateMin;
            } else if (tab === "glucose") {
              const glucVal = getGlucose(m);
              glucAlert = glucVal > threshold.glucoseMax || glucVal < threshold.glucoseMin;
            } else if (tab === "spo2") {
              spo2Alert = m.spo2 < threshold.spo2Min;
            } else if (tab === "temp") {
              tempAlert = m.temperature > threshold.temperatureMax || m.temperature < threshold.temperatureMin;
            } else if (tab === "heartRate") {
              hrAlert = m.heartRate > threshold.heartRateMax || m.heartRate < threshold.heartRateMin;
            } else if (tab === "respiratoryRate") {
              rrAlert = m.respiratoryRate > threshold.respiratoryRateMax || m.respiratoryRate < threshold.respiratoryRateMin;
            }
          }

          return (
            <View key={m.id || m._id} style={[styles.recordCard, dynamicBorderStyle]}>
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
                      <View style={sysAlert ? styles.valueAlertBadge : null}>
                        <Text style={[styles.recordValueNumber, sysAlert && styles.recordValueNumberAlert]}>
                          {m.bloodPressure?.systolic || m.systolic}
                        </Text>
                      </View>
                      <Text style={styles.recordValueUnit}>mmHg</Text>
                      <Text style={styles.recordValueLabel}>Tâm thu</Text>
                    </View>
                    <View style={styles.recordValueBox}>
                      <View style={diaAlert ? styles.valueAlertBadge : null}>
                        <Text style={[styles.recordValueNumber, diaAlert && styles.recordValueNumberAlert]}>
                          {m.bloodPressure?.diastolic || m.diastolic}
                        </Text>
                      </View>
                      <Text style={styles.recordValueUnit}>mmHg</Text>
                      <Text style={styles.recordValueLabel}>Tâm trương</Text>
                    </View>
                    <View style={styles.recordValueBox}>
                      <View style={hrAlert ? styles.valueAlertBadge : null}>
                        <Text style={[styles.recordValueNumber, hrAlert && styles.recordValueNumberAlert]}>
                          {m.heartRate || m.pulse}
                        </Text>
                      </View>
                      <Text style={styles.recordValueUnit}>bpm</Text>
                      <Text style={styles.recordValueLabel}>Mạch</Text>
                    </View>
                  </>
                )}

                {tab === "glucose" && (
                  <View style={styles.recordValueBox}>
                    <View style={glucAlert ? styles.valueAlertBadge : null}>
                      <Text style={[styles.recordValueNumber, glucAlert && styles.recordValueNumberAlert]}>
                        {getGlucose(m) || "--"}
                      </Text>
                    </View>
                    <Text style={styles.recordValueUnit}>mg/dL</Text>
                    <Text style={styles.recordValueLabel}>Đường huyết</Text>
                  </View>
                )}

                {tab === "spo2" && (
                  <View style={styles.recordValueBox}>
                    <View style={spo2Alert ? styles.valueAlertBadge : null}>
                      <Text style={[styles.recordValueNumber, spo2Alert && styles.recordValueNumberAlert]}>{m.spo2}</Text>
                    </View>
                    <Text style={styles.recordValueUnit}>%</Text>
                    <Text style={styles.recordValueLabel}>SpO₂</Text>
                  </View>
                )}

                {tab === "temp" && (
                  <View style={styles.recordValueBox}>
                    <View style={tempAlert ? styles.valueAlertBadge : null}>
                      <Text style={[styles.recordValueNumber, tempAlert && styles.recordValueNumberAlert]}>{m.temperature}</Text>
                    </View>
                    <Text style={styles.recordValueUnit}>°C</Text>
                    <Text style={styles.recordValueLabel}>Nhiệt độ</Text>
                  </View>
                )}

                {tab === "heartRate" && (
                  <View style={styles.recordValueBox}>
                    <View style={hrAlert ? styles.valueAlertBadge : null}>
                      <Text style={[styles.recordValueNumber, hrAlert && styles.recordValueNumberAlert]}>{m.heartRate}</Text>
                    </View>
                    <Text style={styles.recordValueUnit}>bpm</Text>
                    <Text style={styles.recordValueLabel}>Nhịp tim</Text>
                  </View>
                )}

                {tab === "respiratoryRate" && (
                  <View style={styles.recordValueBox}>
                    <View style={rrAlert ? styles.valueAlertBadge : null}>
                      <Text style={[styles.recordValueNumber, rrAlert && styles.recordValueNumberAlert]}>{m.respiratoryRate}</Text>
                    </View>
                    <Text style={styles.recordValueUnit}>lần/phút</Text>
                    <Text style={styles.recordValueLabel}>Nhịp thở</Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.recordMetaRow,
                  {
                    display:
                      (m.device && m.device !== "Không rõ") ||
                      (m.recordedBy && m.recordedBy !== "Không rõ")
                        ? "flex"
                        : "none",
                  },
                ]}
              >
                {m.device && m.device !== "Không rõ" && (
                  <Text style={styles.recordMetaText}>Thiết bị: {m.device}</Text>
                )}
                {m.recordedBy && m.recordedBy !== "Không rõ" && (
                  <Text style={styles.recordMetaText}>Người đo: {m.recordedBy}</Text>
                )}
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
              <TouchableOpacity onPress={() => setShowChartModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {recentMeasurements.length === 0 ? (
              <View style={[styles.emptyChartBox, { width: screenWidth - 80 }]}>
                <Ionicons name="stats-chart" size={32} color="#9CA3AF" />
                <Text style={styles.emptyChartText}>Không có dữ liệu để hiển thị</Text>
              </View>
            ) : (
              <View style={{ marginTop: 8 }}>
                {renderChart(320)}
                <ChartLegend />
              </View>
            )}

            <View style={styles.modalFooter}>
              <Text style={styles.modalHint}>
                <Ionicons name="information-circle" size={14} color="#6B7280" /> Chạm vào biểu đồ để xem
                chi tiết từng điểm đo
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 4 },

  tabsContainer: { marginBottom: 20, gap: 8 },
  tabsRow: { flexDirection: "row", backgroundColor: "#E5EDFF", padding: 4, borderRadius: 999 },
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

  filterDateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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

  // Legend
  legendBox: { marginTop: 16, gap: 8 },
  legendRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendSolidLine: { width: 18, height: 3, borderRadius: 2, marginRight: 6 },
  legendText: { fontSize: 12, color: "#374151", fontWeight: "600" },
  legendTextSm: { fontSize: 11, color: "#6B7280" },
  legendDashWrap: { flexDirection: "row", alignItems: "center", marginRight: 6 },
  legendDash: { width: 4, height: 2.5, borderRadius: 1, marginRight: 2 },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  sectionMoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sectionMoreText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },

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
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dateRow: { flexDirection: "row", alignItems: "center" },
  recordDateText: { marginLeft: 6, fontSize: 13, color: "#374151", fontWeight: "600" },
  recordTimeText: { marginLeft: 4, fontSize: 12, color: "#6B7280" },
  timingBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#EEF2FF" },
  timingBadgeText: { fontSize: 11, color: "#4F46E5", fontWeight: "600" },

  recordValuesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  recordValueBox: { flex: 1, alignItems: "center" },
  recordValueNumber: { fontSize: 20, fontWeight: "700", color: "#111827" },
  recordValueUnit: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  recordValueLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },

  recordMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  recordMetaText: { fontSize: 11, color: "#9CA3AF" },

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
  emptyListText: { fontSize: 13, color: "#6B7280" },

  // Modal
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
    maxHeight: "85%",
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
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalFooter: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  modalHint: { fontSize: 12, color: "#6B7280", textAlign: "center" },

  // Pointer tooltip (gifted-charts)
  pointerTooltip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pointerTooltipDate: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pointerTooltipRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 2 },
  pointerTooltipLabel: { fontSize: 11, color: "#6B7280" },
  pointerTooltipValue: { fontSize: 11, fontWeight: "700", color: "#111827" },

  valueAlertBadge: {
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },
  recordValueNumberAlert: { color: "#DC2626" },
});

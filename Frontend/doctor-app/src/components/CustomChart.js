import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CustomChart({ chartType, measurements, threshold, startDate, endDate }) {
  // Helper inside chart component
  const checkVitalStatus = (type, value) => {
    if (value === null || value === undefined || !threshold) return { isOut: false, arrow: "" };

    const val = parseFloat(value);
    if (isNaN(val)) return { isOut: false, arrow: "" };

    switch (type) {
      case "systolic":
        if (threshold.sysMin !== undefined && val < threshold.sysMin) return { isOut: true, arrow: "↓" };
        if (threshold.sysMax !== undefined && val > threshold.sysMax) return { isOut: true, arrow: "↑" };
        break;
      case "diastolic":
        if (threshold.diaMin !== undefined && val < threshold.diaMin) return { isOut: true, arrow: "↓" };
        if (threshold.diaMax !== undefined && val > threshold.diaMax) return { isOut: true, arrow: "↑" };
        break;
      case "heartRate":
      case "pulse":
        if (threshold.heartRateMin !== undefined && val < threshold.heartRateMin) return { isOut: true, arrow: "↓" };
        if (threshold.heartRateMax !== undefined && val > threshold.heartRateMax) return { isOut: true, arrow: "↑" };
        break;
      case "temperature":
        if (threshold.temperatureMin !== undefined && val < threshold.temperatureMin) return { isOut: true, arrow: "↓" };
        if (threshold.temperatureMax !== undefined && val > threshold.temperatureMax) return { isOut: true, arrow: "↑" };
        break;
      case "spo2":
        if (threshold.spo2Min !== undefined && val < threshold.spo2Min) return { isOut: true, arrow: "↓" };
        break;
      case "respiratoryRate":
      case "respiratory":
        if (threshold.respiratoryRateMin !== undefined && val < threshold.respiratoryRateMin) return { isOut: true, arrow: "↓" };
        if (threshold.respiratoryRateMax !== undefined && val > threshold.respiratoryRateMax) return { isOut: true, arrow: "↑" };
        break;
      case "glucose":
        if (threshold.glucoseMin !== undefined && threshold.glucoseMin !== null && val < threshold.glucoseMin) return { isOut: true, arrow: "↓" };
        if (threshold.glucoseMax !== undefined && threshold.glucoseMax !== null && val > threshold.glucoseMax) return { isOut: true, arrow: "↑" };
        break;
    }
    return { isOut: false, arrow: "" };
  };

  const getFilteredMeasurements = () => {
    let filtered = [...measurements];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    filtered = filtered.filter((item) => {
      const date = new Date(item.createdAt);
      return date >= start && date <= end;
    });
    return filtered;
  };

  const getChartData = () => {
    const filtered = getFilteredMeasurements();
    filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const chartPoints = [];
    filtered.forEach((m) => {
      let value = null;
      let val2 = null; // diastolic
      
      const date = new Date(m.createdAt);
      const label = `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

      if (chartType === "bp") {
        const sys = m.systolic || m.bloodPressure?.systolic;
        const dia = m.diastolic || m.bloodPressure?.diastolic;
        if (sys !== undefined && sys !== null && dia !== undefined && dia !== null) {
          const sysNum = Number(sys);
          const diaNum = Number(dia);
          if (!isNaN(sysNum) && !isNaN(diaNum)) {
            value = sysNum;
            val2 = diaNum;
          }
        }
      } else if (chartType === "pulse") {
        const pulseVal = m.pulse || m.heartRate;
        if (pulseVal !== undefined && pulseVal !== null) {
          const num = Number(pulseVal);
          if (!isNaN(num)) value = num;
        }
      } else if (chartType === "temperature") {
        if (m.temperature !== undefined && m.temperature !== null) {
          const num = Number(m.temperature);
          if (!isNaN(num)) value = num;
        }
      } else if (chartType === "spo2") {
        if (m.spo2 !== undefined && m.spo2 !== null) {
          const num = Number(m.spo2);
          if (!isNaN(num)) value = num;
        }
      } else if (chartType === "respiratory") {
        if (m.respiratoryRate !== undefined && m.respiratoryRate !== null) {
          const num = Number(m.respiratoryRate);
          if (!isNaN(num)) value = num;
        }
      } else if (chartType === "glucose") {
        const rawGluc = m.glucose ? (typeof m.glucose === "object" ? m.glucose.bloodGlucose : m.glucose) : null;
        if (rawGluc !== undefined && rawGluc !== null) {
          const num = Number(rawGluc);
          if (!isNaN(num)) value = num;
        }
      }

      if (value !== null && value !== undefined && !isNaN(value)) {
        chartPoints.push({ value, val2, label });
      }
    });

    return chartPoints;
  };

  const points = getChartData();
  if (points.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <Ionicons name="bar-chart-outline" size={32} color="#9CA3AF" />
        <Text style={styles.chartEmptyText}>Không có dữ liệu trong thời gian này</Text>
      </View>
    );
  }

  let allVals = [];
  points.forEach((p) => {
    if (p.value !== null && p.value !== undefined && !isNaN(p.value)) {
      allVals.push(p.value);
    }
    if (p.val2 !== null && p.val2 !== undefined && !isNaN(p.val2)) {
      allVals.push(p.val2);
    }
  });

  if (threshold) {
    const pushIfValid = (val) => {
      if (val !== undefined && val !== null) {
        const num = Number(val);
        if (!isNaN(num) && isFinite(num)) {
          allVals.push(num);
        }
      }
    };
    if (chartType === "bp") {
      pushIfValid(threshold.sysMin);
      pushIfValid(threshold.sysMax);
      pushIfValid(threshold.diaMin);
      pushIfValid(threshold.diaMax);
    } else if (chartType === "pulse") {
      pushIfValid(threshold.heartRateMin);
      pushIfValid(threshold.heartRateMax);
    } else if (chartType === "temperature") {
      pushIfValid(threshold.temperatureMin);
      pushIfValid(threshold.temperatureMax);
    } else if (chartType === "spo2") {
      pushIfValid(threshold.spo2Min);
    } else if (chartType === "respiratory") {
      pushIfValid(threshold.respiratoryRateMin);
      pushIfValid(threshold.respiratoryRateMax);
    } else if (chartType === "glucose") {
      pushIfValid(threshold.glucoseMin);
      pushIfValid(threshold.glucoseMax);
    }
  }

  allVals = allVals.filter((v) => typeof v === "number" && !isNaN(v) && isFinite(v));

  let maxVal = 100;
  let minVal = 0;
  if (allVals.length > 0) {
    maxVal = Math.max(...allVals);
    minVal = Math.min(...allVals);
  }

  const diff = maxVal - minVal;
  if (diff === 0) {
    maxVal += 5;
    minVal = Math.max(0, minVal - 5);
  } else {
    maxVal += diff * 0.15;
    minVal = Math.max(0, minVal - diff * 0.15);
  }

  const chartHeight = 160;
  const spacing = 65;
  const chartContentWidth = Math.max(Dimensions.get("window").width - 80, points.length * spacing + 40);

  const getYCoord = (val) => {
    if (val === null || val === undefined) return 0;
    return chartHeight - ((val - minVal) / (maxVal - minVal)) * (chartHeight - 40) - 20;
  };

  const pointsWithCoords = points.map((p, idx) => {
    const x = idx * spacing + 24;
    const y = getYCoord(p.value);
    let y2 = null;
    if (p.val2 !== null) {
      y2 = getYCoord(p.val2);
    }
    return { ...p, x, y, y2 };
  });

  const connectionLines = [];
  if (chartType !== "bp") {
    for (let i = 0; i < pointsWithCoords.length - 1; i++) {
      const p1 = pointsWithCoords[i];
      const p2 = pointsWithCoords[i + 1];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      const centerX = p1.x + 4 + dx / 2;
      const centerY = p1.y + 4 + dy / 2;

      connectionLines.push(
        <View
          key={`line-${i}`}
          style={{
            position: "absolute",
            left: centerX - distance / 2,
            top: centerY - 1,
            width: distance,
            height: 2,
            backgroundColor: "#93C5FD",
            transform: [{ rotate: `${angle}deg` }],
          }}
        />
      );
    }
  }

  const bpVerticalRangeLines = [];
  if (chartType === "bp") {
    pointsWithCoords.forEach((p, idx) => {
      bpVerticalRangeLines.push(
        <View
          key={`bp-vline-${idx}`}
          style={{
            position: "absolute",
            left: p.x + 3,
            top: p.y + 4,
            width: 2,
            height: p.y2 - p.y,
            backgroundColor: "#BFDBFE",
          }}
        />
      );
    });
  }

  const renderThresholdLine = (val, color) => {
    if (val === null || val === undefined || val < minVal || val > maxVal) return null;
    const y = getYCoord(val);
    return (
      <View
        key={`threshold-line-${val}-${color}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y + 4,
          borderBottomWidth: 1,
          borderColor: color,
          borderStyle: "dashed",
          zIndex: 1,
        }}
      />
    );
  };

  const dotsAndLabels = [];
  pointsWithCoords.forEach((p, idx) => {
    let isOut = false;
    let isOut2 = false;
    if (chartType === "bp") {
      isOut = checkVitalStatus("systolic", p.value).isOut;
      isOut2 = checkVitalStatus("diastolic", p.val2).isOut;
    } else {
      isOut = checkVitalStatus(
        chartType === "pulse" ? "heartRate" : chartType === "respiratory" ? "respiratoryRate" : chartType,
        p.value
      ).isOut;
    }

    dotsAndLabels.push(
      <View key={`dot-systolic-${idx}`} style={{ position: "absolute", left: p.x - 21, top: p.y - 18, alignItems: "center", width: 50, zIndex: 12 }}>
        <Text style={[styles.barValueLabel, isOut && styles.textAbnormal]}>
          {p.value}
        </Text>
        <View style={[styles.chartDot, isOut ? styles.dotAbnormal : styles.dotNormal, { marginTop: 2 }]} />
      </View>
    );

    if (p.val2 !== null) {
      dotsAndLabels.push(
        <View key={`dot-diastolic-${idx}`} style={{ position: "absolute", left: p.x - 21, top: p.y2 - 1, alignItems: "center", width: 50, zIndex: 12 }}>
          <View style={[styles.chartDot, isOut2 ? styles.dotAbnormal : styles.dotNormal]} />
          <Text style={[styles.barValueLabel, isOut2 && styles.textAbnormal, { marginTop: 2 }]}>
            {p.val2}
          </Text>
        </View>
      );
    }

    dotsAndLabels.push(
      <Text key={`time-label-${idx}`} style={[styles.barTimeLabel, { position: "absolute", left: p.x - 20, top: chartHeight - 16 }]}>
        {p.label}
      </Text>
    );
  });

  const renderThresholdLegend = () => {
    if (!threshold) return null;

    const legendItems = [];
    if (chartType === "bp") {
      legendItems.push({ label: "Tâm thu Max", value: threshold.sysMax, color: "#EF4444" });
      legendItems.push({ label: "Tâm thu Min", value: threshold.sysMin, color: "#3B82F6" });
      legendItems.push({ label: "Tâm trương Max", value: threshold.diaMax, color: "#F59E0B" });
      legendItems.push({ label: "Tâm trương Min", value: threshold.diaMin, color: "#10B981" });
    } else {
      let maxValThr = null;
      let minValThr = null;
      let color = "#EF4444";
      let label = "Giới hạn";

      if (chartType === "pulse") {
        maxValThr = threshold.heartRateMax;
        minValThr = threshold.heartRateMin;
        label = "Nhịp tim";
      } else if (chartType === "temperature") {
        maxValThr = threshold.temperatureMax;
        minValThr = threshold.temperatureMin;
        label = "Nhiệt độ";
        color = "#F59E0B";
      } else if (chartType === "spo2") {
        minValThr = threshold.spo2Min;
        label = "SpO2";
        color = "#3B82F6";
      } else if (chartType === "respiratory") {
        maxValThr = threshold.respiratoryRateMax;
        minValThr = threshold.respiratoryRateMin;
        label = "Nhịp thở";
        color = "#10B981";
      } else if (chartType === "glucose") {
        maxValThr = threshold.glucoseMax;
        minValThr = threshold.glucoseMin;
        label = "Đường huyết";
        color = "#8B5CF6";
      }

      if (maxValThr !== null && maxValThr !== undefined) {
        legendItems.push({ label: `${label} Max`, value: maxValThr, color });
      }
      if (minValThr !== null && minValThr !== undefined) {
        legendItems.push({ label: `${label} Min`, value: minValThr, color: "#3B82F6" });
      }
    }

    return (
      <View style={styles.legendContainer}>
        {legendItems.map((item, idx) => (
          <View key={idx} style={styles.legendItem}>
            <View style={[styles.legendLine, { borderColor: item.color }]} />
            <Text style={styles.legendText}>
              {item.label}: <Text style={styles.legendVal}>{item.value}</Text>
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.chartWrapper}>
      <View style={styles.chartMainContainer}>
        <View style={styles.chartDrawingArea}>
          <View style={styles.chartYLabels}>
            <Text style={styles.chartYLabelText}>{maxVal.toFixed(1)}</Text>
            <Text style={styles.chartYLabelText}>{((maxVal + minVal) / 2).toFixed(1)}</Text>
            <Text style={styles.chartYLabelText}>{minVal.toFixed(1)}</Text>
          </View>

          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} contentContainerStyle={{ paddingRight: 32 }}>
            <View style={[styles.chartArea, { width: chartContentWidth }]}>
              <View style={styles.gridLines}>
                <View style={[styles.gridLine, { top: 20 }]} />
                <View style={[styles.gridLine, { top: (chartHeight - 40) / 2 + 20 }]} />
                <View style={[styles.gridLine, { bottom: 20 }]} />
              </View>

              {/* Threshold dashed lines */}
              {threshold && (() => {
                const lines = [];
                if (chartType === "bp") {
                  lines.push(renderThresholdLine(threshold.sysMax, "#EF4444"));
                  lines.push(renderThresholdLine(threshold.sysMin, "#3B82F6"));
                  lines.push(renderThresholdLine(threshold.diaMax, "#F59E0B"));
                  lines.push(renderThresholdLine(threshold.diaMin, "#10B981"));
                } else {
                  let maxValThr = null;
                  let minValThr = null;
                  let color = "#EF4444";

                  if (chartType === "pulse") {
                    maxValThr = threshold.heartRateMax;
                    minValThr = threshold.heartRateMin;
                  } else if (chartType === "temperature") {
                    maxValThr = threshold.temperatureMax;
                    minValThr = threshold.temperatureMin;
                    color = "#F59E0B";
                  } else if (chartType === "spo2") {
                    minValThr = threshold.spo2Min;
                    color = "#3B82F6";
                  } else if (chartType === "respiratory") {
                    maxValThr = threshold.respiratoryRateMax;
                    minValThr = threshold.respiratoryRateMin;
                    color = "#10B981";
                  } else if (chartType === "glucose") {
                    maxValThr = threshold.glucoseMax;
                    minValThr = threshold.glucoseMin;
                    color = "#8B5CF6";
                  }

                  if (maxValThr !== null && maxValThr !== undefined) {
                    lines.push(renderThresholdLine(maxValThr, color));
                  }
                  if (minValThr !== null && minValThr !== undefined) {
                    lines.push(renderThresholdLine(minValThr, "#3B82F6"));
                  }
                }
                return lines;
              })()}

              {connectionLines}
              {bpVerticalRangeLines}
              {dotsAndLabels}
            </View>
          </ScrollView>
        </View>

        {/* Legend container shown below the graph scroll area */}
        {renderThresholdLegend()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  chartMainContainer: {
    flexDirection: "column",
  },
  chartDrawingArea: {
    flexDirection: "row",
    height: 180,
  },
  chartYLabels: {
    width: 40,
    height: 180,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 6,
    paddingTop: 18,
  },
  chartYLabelText: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  chartArea: {
    height: 180,
    position: "relative",
  },
  gridLines: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  barValueLabel: {
    fontSize: 8,
    color: "#4B5563",
    fontWeight: "700",
    textAlign: "center",
  },
  barTimeLabel: {
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
    width: 44,
  },
  chartEmpty: {
    height: 160,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  chartEmptyText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
  textAbnormal: {
    color: "#DC2626",
    fontWeight: "800",
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
    zIndex: 10,
  },
  dotNormal: {
    backgroundColor: "#3B82F6",
  },
  dotAbnormal: {
    backgroundColor: "#EF4444",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendLine: {
    width: 14,
    height: 0,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  legendText: {
    fontSize: 10,
    color: "#4B5563",
    fontWeight: "500",
  },
  legendVal: {
    fontWeight: "700",
    color: "#1F2937",
  },
});

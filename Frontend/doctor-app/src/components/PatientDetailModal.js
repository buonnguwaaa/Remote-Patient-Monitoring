import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import CustomChart from "./CustomChart";
import { colors, radius, spacing, typography, shadows } from "../theme/rpmTheme";

export default function PatientDetailModal({
  visible,
  onClose,
  patient,
  detailedInfo,
  measurements,
  threshold,
  detailLoading,
  detailError,
  onActionChat,
  onActionReminder,
  onActionPrescription,
}) {
  const [activeModalTab, setActiveModalTab] = useState("profile"); // 'profile' | 'history' | 'charts'
  const [chartType, setChartType] = useState("bp");
  const [historyFilterType, setHistoryFilterType] = useState("all");

  // Default date range: Last 30 days
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);
    return past;
  });
  const [endDate, setEndDate] = useState(() => new Date());

  // Native DateTimePicker states
  const [showPicker, setShowPicker] = useState(false);
  const [pickerType, setPickerType] = useState("start"); // 'start' | 'end'
  const [tempDate, setTempDate] = useState(new Date());

  const formatDateString = (date) => {
    if (!date) return "--/--/----";
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `${d < 10 ? "0" + d : d}/${m < 10 ? "0" + m : m}/${y}`;
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (selectedDate) {
        if (pickerType === "start") {
          if (selectedDate > endDate) {
            setEndDate(selectedDate);
          }
          setStartDate(selectedDate);
        } else {
          if (selectedDate < startDate) {
            setStartDate(selectedDate);
          }
          setEndDate(selectedDate);
        }
      }
    } else {
      // iOS
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirmIOSDate = () => {
    if (pickerType === "start") {
      if (tempDate > endDate) {
        setEndDate(tempDate);
      }
      setStartDate(tempDate);
    } else {
      if (tempDate < startDate) {
        setStartDate(tempDate);
      }
      setEndDate(tempDate);
    }
    setShowPicker(false);
  };

  const getFilteredHistory = () => {
    let filtered = [...measurements];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    filtered = filtered.filter((item) => {
      const date = new Date(item.createdAt);
      return date >= start && date <= end;
    });

    // Sort descending (newest measurements first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  };

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

  const getLatestVital = (type) => {
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (type === "blood_pressure") {
      const found = sorted.find(
        (m) =>
          m.systolic ||
          m.diastolic ||
          (m.bloodPressure && (m.bloodPressure.systolic || m.bloodPressure.diastolic))
      );
      if (!found) return null;
      const sys = found.systolic || found.bloodPressure?.systolic || "--";
      const dia = found.diastolic || found.bloodPressure?.diastolic || "--";
      return `${sys}/${dia}`;
    }

    const key = type === "heartRate" ? "pulse" : type === "respiratoryRate" ? "respiratoryRate" : type;
    const found = sorted.find((m) => {
      if (key === "glucose") {
        return m.glucose !== undefined && m.glucose !== null;
      }
      return m[key] !== undefined && m[key] !== null;
    });
    if (!found) return null;
    if (key === "glucose") {
      return typeof found.glucose === "object" ? found.glucose.bloodGlucose : found.glucose;
    }
    return found[key];
  };

  const renderLatestVitalCard = (type, icon, label, unit, bg, color) => {
    let rawVal = null;
    let labelText = "--";
    let isOut = false;
    let arrowText = "";

    if (type === "blood_pressure") {
      rawVal = getLatestVital("blood_pressure");
      if (rawVal) {
        const parts = rawVal.split("/");
        const sys = parts[0];
        const dia = parts[1];
        const sysOut = checkVitalStatus("systolic", sys);
        const diaOut = checkVitalStatus("diastolic", dia);
        isOut = sysOut.isOut || diaOut.isOut;
        arrowText = sysOut.arrow || diaOut.arrow || "";
        labelText = `${rawVal} ${unit}`;
      }
    } else {
      const apiKey = type === "heartRate" ? "pulse" : type === "respiratoryRate" ? "respiratoryRate" : type;
      rawVal = getLatestVital(type);
      if (rawVal !== null && rawVal !== undefined) {
        const check = checkVitalStatus(apiKey, rawVal);
        isOut = check.isOut;
        arrowText = check.arrow;
        if (type === "temperature") {
          labelText = `${parseFloat(rawVal).toFixed(1)} ${unit}`;
        } else {
          labelText = `${rawVal} ${unit}`;
        }
      }
    }

    return (
      <View style={[styles.vitalCard, isOut && styles.vitalCardAbnormal]}>
        <View style={[styles.vitalIconWrap, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.vitalLabel}>{label}</Text>
        <Text style={[styles.vitalValue, isOut && styles.textAbnormal]}>
          {labelText} {arrowText}
        </Text>
      </View>
    );
  };

  const renderHistoryItem = (item) => {
    const dateObj = new Date(item.createdAt);
    const timeStr = dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const dateStr = dateObj.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

    const sysVal = item.systolic || item.bloodPressure?.systolic || null;
    const diaVal = item.diastolic || item.bloodPressure?.diastolic || null;
    const bpStatus = (sysVal !== null || diaVal !== null) ? (checkVitalStatus("systolic", sysVal).isOut || checkVitalStatus("diastolic", diaVal).isOut) : false;
    
    const hrVal = item.pulse || item.heartRate || null;
    const hrStatus = checkVitalStatus("heartRate", hrVal);

    const tempVal = item.temperature || null;
    const tempStatus = checkVitalStatus("temperature", tempVal);

    const spo2Val = item.spo2 || null;
    const spo2Status = checkVitalStatus("spo2", spo2Val);

    const rrVal = item.respiratoryRate || null;
    const rrStatus = checkVitalStatus("respiratoryRate", rrVal);

    const glucVal = item.glucose ? (typeof item.glucose === "object" ? item.glucose.bloodGlucose : item.glucose) : null;
    const glucStatus = checkVitalStatus("glucose", glucVal);

    const hasAbnormal = bpStatus || hrStatus.isOut || tempStatus.isOut || spo2Status.isOut || rrStatus.isOut || glucStatus.isOut;

    if (historyFilterType === "abnormal" && !hasAbnormal) return null;

    return (
      <View style={styles.historyRowCard} key={item.id}>
        <View style={styles.historyTimeSection}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {hasAbnormal && <View style={styles.inlineWarningDot} />}
            <Text style={styles.historyTimeText}>{timeStr}</Text>
          </View>
          <Text style={styles.historyDateText}>{dateStr}</Text>
        </View>
        <View style={styles.historyVitalsSection}>
          {sysVal !== null && (
            <View style={styles.historyVitalBadge}>
              <Text style={styles.historyVitalLabel}>Huyết áp: </Text>
              <Text style={[styles.historyVitalValue, bpStatus && styles.textAbnormal]}>
                {sysVal}/{diaVal || "--"}{bpStatus ? " ⚠️" : ""}
              </Text>
            </View>
          )}
          {hrVal !== null && (
            <View style={styles.historyVitalBadge}>
              <Text style={styles.historyVitalLabel}>Tim: </Text>
              <Text style={[styles.historyVitalValue, hrStatus.isOut && styles.textAbnormal]}>
                {hrVal} bpm {hrStatus.arrow}{hrStatus.isOut ? " ⚠️" : ""}
              </Text>
            </View>
          )}
          {spo2Val !== null && (
            <View style={styles.historyVitalBadge}>
              <Text style={styles.historyVitalLabel}>SpO2: </Text>
              <Text style={[styles.historyVitalValue, spo2Status.isOut && styles.textAbnormal]}>
                {spo2Val}% {spo2Status.arrow}{spo2Status.isOut ? " ⚠️" : ""}
              </Text>
            </View>
          )}
          {tempVal !== null && (
            <View style={styles.historyVitalBadge}>
              <Text style={styles.historyVitalLabel}>Nhiệt: </Text>
              <Text style={[styles.historyVitalValue, tempStatus.isOut && styles.textAbnormal]}>
                {tempVal.toFixed(1)}°C {tempStatus.arrow}{tempStatus.isOut ? " ⚠️" : ""}
              </Text>
            </View>
          )}
          {rrVal !== null && (
            <View style={styles.historyVitalBadge}>
              <Text style={styles.historyVitalLabel}>Thở: </Text>
              <Text style={[styles.historyVitalValue, rrStatus.isOut && styles.textAbnormal]}>
                {rrVal} l/p {rrStatus.arrow}{rrStatus.isOut ? " ⚠️" : ""}
              </Text>
            </View>
          )}
          {glucVal !== null && (
            <View style={styles.historyVitalBadge}>
              <Text style={styles.historyVitalLabel}>Đường: </Text>
              <Text style={[styles.historyVitalValue, glucStatus.isOut && styles.textAbnormal]}>
                {glucVal} mmol {glucStatus.arrow}{glucStatus.isOut ? " ⚠️" : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderNativeDatePicker = () => {
    if (!showPicker) return null;

    if (Platform.OS === "ios") {
      return (
        <Modal
          transparent
          animationType="fade"
          visible={showPicker}
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>
                  {pickerType === "start" ? "Chọn ngày bắt đầu" : "Chọn ngày kết thúc"}
                </Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Ionicons name="close" size={22} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: "center", marginVertical: 10 }}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  textColor="#1F2937"
                />
              </View>

              <TouchableOpacity
                style={styles.confirmButtonIOS}
                onPress={handleConfirmIOSDate}
              >
                <Text style={styles.confirmButtonTextIOS}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    }

    // Android Dialog
    return (
      <DateTimePicker
        value={pickerType === "start" ? startDate : endDate}
        mode="date"
        display="default"
        onChange={handleDateChange}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Chi tiết bệnh nhân</Text>
              <Text style={styles.modalSubtitle}>{patient?.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeModalButton}>
              <Ionicons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Modal Navigation Tabs */}
          {!detailLoading && !detailError && (
            <View style={styles.modalTabContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalTabScroll}>
                {[
                  { key: "profile", label: "Hồ sơ & Chỉ số", icon: "person-outline" },
                  { key: "history", label: "Lịch sử đo", icon: "list-outline" },
                  { key: "charts", label: "Biểu đồ xu hướng", icon: "trending-up-outline" },
                ].map((tab) => {
                  const isActive = activeModalTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.modalTab, isActive && styles.modalTabActive]}
                      onPress={() => setActiveModalTab(tab.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={tab.icon}
                        size={15}
                        color={isActive ? "#fff" : "#6B7280"}
                      />
                      <Text style={[styles.modalTabText, isActive && styles.modalTabTextActive]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {detailLoading ? (
            <View style={styles.modalCenterBox}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.modalLoadingText}>Đang tải thông tin chi tiết...</Text>
            </View>
          ) : detailError ? (
            <View style={styles.modalCenterBox}>
              <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
              <Text style={styles.modalErrorText}>{detailError}</Text>
            </View>
          ) : activeModalTab === "profile" ? (
            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalSectionTitle}>Hồ sơ hành chính</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Mã bệnh nhân</Text>
                  <Text style={styles.infoValue}>{detailedInfo?.userPublicId || detailedInfo?.patientCode || patient?.patientCode || patient?.userPublicId || "Không có dữ liệu"}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Ngày sinh</Text>
                  <Text style={styles.infoValue}>{detailedInfo?.dob ? new Date(detailedInfo.dob).toLocaleDateString("vi-VN") : patient?.dob}</Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Giới tính</Text>
                  <Text style={styles.infoValue}>{detailedInfo?.gender || patient?.gender}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Số điện thoại</Text>
                  <Text style={styles.infoValue}>{detailedInfo?.phone || patient?.phone}</Text>
                </View>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Liên hệ khẩn cấp</Text>
                <Text style={styles.infoValue}>
                  {detailedInfo?.emergencyContactName || "N/A"}{" "}
                  {detailedInfo?.emergencyContactPhone ? `(${detailedInfo.emergencyContactPhone})` : ""}
                </Text>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Loại bệnh đang theo dõi</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  {detailedInfo?.diseaseTypes?.bloodPressure ? (
                    <View style={styles.chipPrimary}><Text style={styles.chipPrimaryText}>Huyết áp</Text></View>
                  ) : null}
                  {detailedInfo?.diseaseTypes?.glucose ? (
                    <View style={styles.chipPrimary}><Text style={styles.chipPrimaryText}>Tiểu đường</Text></View>
                  ) : null}
                  {!detailedInfo?.diseaseTypes?.bloodPressure && !detailedInfo?.diseaseTypes?.glucose ? (
                    <Text style={styles.infoValue}>Chưa có thông tin</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Tiền sử y khoa</Text>
                <Text style={[styles.infoValue, styles.medicalHistoryText]}>
                  {detailedInfo?.medicalHistory || "Không có dữ liệu tiền sử bệnh lý."}
                </Text>
              </View>

              <Text style={styles.modalSectionTitle}>Chỉ số sinh tồn gần nhất</Text>
              <View style={styles.vitalsGrid}>
                {renderLatestVitalCard("temperature", "thermometer-outline", "Nhiệt độ", "°C", "#FEF3C7", "#D97706")}
                {renderLatestVitalCard("heartRate", "heart-outline", "Nhịp tim", "bpm", "#FEE2E2", "#DC2626")}
              </View>

              <View style={styles.vitalsGrid}>
                {renderLatestVitalCard("spo2", "water-outline", "SpO2", "%", "#E0F2FE", "#0284C7")}
                {renderLatestVitalCard("blood_pressure", "speedometer-outline", "Huyết áp", "mmHg", "#E0F2FE", "#2563EB")}
              </View>

              <View style={styles.vitalsGrid}>
                {renderLatestVitalCard("respiratoryRate", "git-commit-outline", "Nhịp thở", "lần/phút", "#ECFDF5", "#059669")}
                {renderLatestVitalCard("glucose", "analytics-outline", "Đường huyết", "mg/dL", "#F5F3FF", "#7C3AED")}
              </View>
            </ScrollView>
          ) : activeModalTab === "history" ? (
            <View style={styles.historyTabWrapper}>
              {/* Customizable Day Date Range Selector */}
              <View style={styles.rangeSelectorCard}>
                <Text style={styles.rangeSelectorTitle}>Khoảng thời gian:</Text>
                <View style={styles.rangeSelectorRow}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      setPickerType("start");
                      setTempDate(new Date(startDate));
                      setShowPicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerLabel}>Từ ngày:</Text>
                    <Text style={styles.pickerValue}>{formatDateString(startDate)}</Text>
                    <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      setPickerType("end");
                      setTempDate(new Date(endDate));
                      setShowPicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerLabel}>Đến ngày:</Text>
                    <Text style={styles.pickerValue}>{formatDateString(endDate)}</Text>
                    <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Filters */}
              <View style={styles.historyFilters}>
                <Text style={styles.filterGroupLabel}>Bộ lọc:</Text>
                <View style={styles.filterRow}>
                  <TouchableOpacity
                    style={[styles.miniFilterButton, historyFilterType === "all" && styles.miniFilterActive]}
                    onPress={() => setHistoryFilterType("all")}
                  >
                    <Text style={[styles.miniFilterText, historyFilterType === "all" && styles.miniFilterTextActive]}>Tất cả chỉ số</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.miniFilterButton, historyFilterType === "abnormal" && styles.miniFilterActive]}
                    onPress={() => setHistoryFilterType("abnormal")}
                  >
                    <Text style={[styles.miniFilterText, historyFilterType === "abnormal" && styles.miniFilterTextActive]}>Bất thường ⚠️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* List Scroll */}
              <ScrollView style={styles.historyScroll} contentContainerStyle={{ padding: 16 }}>
                {getFilteredHistory().length === 0 ? (
                  <Text style={styles.emptyText}>Chưa có lịch sử đo</Text>
                ) : (
                  getFilteredHistory().map(renderHistoryItem)
                )}
                {historyFilterType === "abnormal" && getFilteredHistory().filter(m => {
                  const sysVal = m.systolic || m.bloodPressure?.systolic || null;
                  const diaVal = m.diastolic || m.bloodPressure?.diastolic || null;
                  const bpOut = (sysVal !== null || diaVal !== null) ? (checkVitalStatus("systolic", sysVal).isOut || checkVitalStatus("diastolic", diaVal).isOut) : false;
                  return bpOut ||
                    checkVitalStatus("heartRate", m.pulse || m.heartRate).isOut ||
                    checkVitalStatus("temperature", m.temperature).isOut ||
                    checkVitalStatus("spo2", m.spo2).isOut ||
                    checkVitalStatus("respiratoryRate", m.respiratoryRate).isOut ||
                    checkVitalStatus("glucose", m.glucose ? (typeof m.glucose === "object" ? m.glucose.bloodGlucose : m.glucose) : null).isOut;
                }).length === 0 && (
                  <Text style={styles.emptyText}>Không tìm thấy chỉ số bất thường nào</Text>
                )}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.chartsTabWrapper}>
              {/* Vitals Selection scroll */}
              <View style={styles.chartConfigRow}>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.chartTypeScroll}>
                  {[
                    { key: "bp", label: "Huyết áp" },
                    { key: "pulse", label: "Nhịp tim" },
                    { key: "spo2", label: "SpO2" },
                    { key: "temperature", label: "Nhiệt độ" },
                    { key: "respiratory", label: "Nhịp thở" },
                    { key: "glucose", label: "Đường huyết" },
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[styles.chartTypeBtn, chartType === type.key && styles.chartTypeBtnActive]}
                      onPress={() => setChartType(type.key)}
                    >
                      <Text style={[styles.chartTypeBtnText, chartType === type.key && styles.chartTypeBtnTextActive]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Customizable Date Range Selector */}
              <View style={styles.rangeSelectorCard}>
                <Text style={styles.rangeSelectorTitle}>Khoảng thời gian:</Text>
                <View style={styles.rangeSelectorRow}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      setPickerType("start");
                      setTempDate(new Date(startDate));
                      setShowPicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerLabel}>Từ ngày:</Text>
                    <Text style={styles.pickerValue}>{formatDateString(startDate)}</Text>
                    <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      setPickerType("end");
                      setTempDate(new Date(endDate));
                      setShowPicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerLabel}>Đến ngày:</Text>
                    <Text style={styles.pickerValue}>{formatDateString(endDate)}</Text>
                    <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Chart Main Scroll */}
              <ScrollView style={styles.chartMainScroll} contentContainerStyle={{ padding: 16 }}>
                <CustomChart
                  chartType={chartType}
                  measurements={measurements}
                  threshold={threshold}
                  startDate={startDate}
                  endDate={endDate}
                />
                {threshold && (
                  <View style={styles.chartThresholdCard}>
                    <Ionicons name="information-circle-outline" size={16} color="#4B5563" />
                    <Text style={styles.chartThresholdText}>
                      Ngưỡng cá nhân:{" "}
                      {chartType === "bp" && `${threshold.sysMin}–${threshold.sysMax} / ${threshold.diaMin}–${threshold.diaMax} mmHg`}
                      {chartType === "pulse" && `${threshold.heartRateMin}–${threshold.heartRateMax} bpm`}
                      {chartType === "spo2" && `≥ ${threshold.spo2Min} %`}
                      {chartType === "temperature" && `${threshold.temperatureMin}–${threshold.temperatureMax} °C`}
                      {chartType === "respiratory" && `${threshold.respiratoryRateMin}–${threshold.respiratoryRateMax} nhịp/phút`}
                      {chartType === "glucose" && `${threshold.glucoseMin || "--"}–${threshold.glucoseMax || "--"} mg/dL`}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Bottom Actions */}
          <View style={styles.actionRowContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
              onPress={() => {
                onClose();
                onActionChat && onActionChat(patient?.id || patient?.patientId);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#2563EB" />
              <Text style={[styles.actionBtnText, { color: "#2563EB" }]}>Nhắn tin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}
              onPress={() => {
                onClose();
                onActionReminder && onActionReminder(patient?.id || patient?.patientId);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="alarm-outline" size={16} color="#D97706" />
              <Text style={[styles.actionBtnText, { color: "#D97706" }]}>Nhắc nhở</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}
              onPress={() => {
                onClose();
                onActionPrescription && onActionPrescription(patient?.id || patient?.patientId);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={16} color="#16A34A" />
              <Text style={[styles.actionBtnText, { color: "#16A34A" }]}>Đơn thuốc</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Day Calendar Picker Overlay */}
        {renderNativeDatePicker()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actionRowContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.card,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: { flex: 1, backgroundColor: colors.overlayLight, justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius["4xl"],
    borderTopRightRadius: radius["4xl"],
    height: "85%",
    ...shadows.cardElevated,
    position: "relative",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.card,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius["4xl"],
    borderTopRightRadius: radius["4xl"],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  modalTitle: { ...typography.cardTitle, color: colors.text },
  modalSubtitle: { ...typography.caption, marginTop: 2 },
  closeModalButton: { padding: 4 },
  modalCenterBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  modalLoadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  modalErrorText: { marginTop: 12, fontSize: 14, color: colors.danger, textAlign: "center" },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: spacing.card },
  modalSectionTitle: { ...typography.cardTitle, color: colors.text, marginBottom: 12, marginTop: 8 },
  infoGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  infoCol: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.borderSoft },
  infoBlock: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 12 },
  infoLabel: { ...typography.label, fontWeight: "600" },
  infoValue: { ...typography.value, marginTop: 4 },
  medicalHistoryText: { fontWeight: "500", color: colors.textHint, lineHeight: 18 },
  chipPrimary: {
    backgroundColor: colors.surfaceSoftBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.primarySoftBg,
  },
  chipPrimaryText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  vitalsGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  vitalCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  vitalIconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  vitalLabel: { ...typography.label, fontWeight: "600" },
  vitalValue: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 4 },
  modalFooter: { padding: spacing.card, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  closeButton: {
    backgroundColor: colors.borderSoft,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: { fontSize: 14, fontWeight: "600", color: colors.textHint },
  modalTabContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingHorizontal: spacing.card,
    paddingVertical: 8,
    gap: 8,
  },
  modalTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: 6,
  },
  modalTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  modalTabTextActive: {
    color: colors.surface,
  },
  historyTabWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  historyFilters: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.card,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 8,
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textHint,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
  },
  miniFilterButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.borderSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  miniFilterActive: {
    backgroundColor: colors.surfaceSoftBlue,
    borderColor: colors.primarySoftBg,
  },
  miniFilterText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textHint,
  },
  miniFilterTextActive: {
    color: colors.primary,
  },
  historyScroll: {
    flex: 1,
  },
  historyRowCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.cardSubtle,
  },
  historyTimeSection: {
    width: 65,
    borderRightWidth: 1,
    borderRightColor: colors.borderSoft,
    paddingRight: 6,
    justifyContent: "center",
  },
  historyTimeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  historyDateText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyVitalsSection: {
    flex: 1,
    paddingLeft: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  historyVitalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  historyVitalLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  historyVitalValue: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  textAbnormal: {
    color: colors.danger,
    fontWeight: "800",
  },
  vitalCardAbnormal: {
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    backgroundColor: colors.dangerSoftAlt,
  },
  chartsTabWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chartConfigRow: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: spacing.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  chartTypeScroll: {
    flexDirection: "row",
  },
  chartTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginRight: 6,
    backgroundColor: colors.borderSoft,
  },
  chartTypeBtnActive: {
    backgroundColor: colors.primary,
  },
  chartTypeBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textHint,
  },
  chartTypeBtnTextActive: {
    color: colors.surface,
  },
  chartMainScroll: {
    flex: 1,
  },
  chartThresholdCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  chartThresholdText: {
    fontSize: 11,
    color: colors.textHint,
    fontWeight: "500",
    flex: 1,
  },
  emptyText: { marginTop: 16, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  modalTabScroll: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
  },
  inlineWarningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  rangeSelectorCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.card,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rangeSelectorTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textHint,
    marginBottom: 8,
  },
  rangeSelectorRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.borderSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 38,
  },
  pickerLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  pickerValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
  },
  pickerModalOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.overlayLight,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  pickerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius["3xl"],
    width: "85%",
    padding: 16,
    ...shadows.cardElevated,
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingBottom: 10,
    marginBottom: 10,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  confirmButtonIOS: {
    backgroundColor: colors.primary,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  confirmButtonTextIOS: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 13,
  },
});

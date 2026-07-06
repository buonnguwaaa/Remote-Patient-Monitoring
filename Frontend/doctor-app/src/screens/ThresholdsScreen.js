import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import PatientSelectorModal from "../components/PatientSelectorModal";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  getMyPatients,
  getThresholds,
  createThreshold,
  updateThreshold,
} from "../api/patientApi";

const TABS = [
  { key: "MISSING", label: "Cần cấu hình" },
  { key: "ACTIVE", label: "Đã có ngưỡng" },
  { key: "HISTORY", label: "Lịch sử" },
];

const createDefaultFormData = (patientId = "") => ({
  patientId,
  temperatureMin: "36.0",
  temperatureMax: "37.5",
  systolicMin: "90",
  systolicMax: "135",
  diastolicMin: "60",
  diastolicMax: "85",
  pulseMin: "60",
  pulseMax: "100",
  glucoseMin: "4.0",
  glucoseMax: "7.0",
  spo2Min: "95",
  respiratoryRateMin: "12",
  respiratoryRateMax: "20",
  effectiveFrom: new Date().toISOString().split("T")[0],
  effectiveTo: "",
});

function formatDateTime(iso) {
  if (!iso) return "Không thời hạn";
  return new Date(iso).toLocaleString("vi-VN", {
    hour: "2-digit", minute: "2-digit",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

const toNumber = (val) => parseFloat(val || "0");

const checkIsActive = (threshold) => {
  const now = Date.now();
  const start = new Date(threshold.effectiveFrom).getTime();
  if (start > now) return false;
  if (!threshold.effectiveTo) return true;
  return new Date(threshold.effectiveTo).getTime() > now;
};

export default function ThresholdsScreen() {
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { showToast } = useToast();
  const doctorId = user?.id || user?._id;

  const [patients, setPatients] = useState([]);
  const [allThresholds, setAllThresholds] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingThresholds, setLoadingThresholds] = useState(false);

  const [activeTab, setActiveTab] = useState("MISSING");
  const [searchQuery, setSearchQuery] = useState("");

  // Form
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Patient picker in form
  const [showPatientModal, setShowPatientModal] = useState(false);

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState("effectiveFrom");
  const [currentPickerDate, setCurrentPickerDate] = useState(new Date());

  const loadData = useCallback(async () => {
    if (!doctorId) return;
    setLoadingPatients(true);
    setLoadingThresholds(true);
    try {
      const [patientsRes, thresholdsRes] = await Promise.all([
        getMyPatients(),
        getThresholds({}),
      ]);
      const ptList = patientsRes.body?.data || patientsRes.body || [];
      setPatients(ptList);

      const thList = thresholdsRes.body?.data || thresholdsRes.body || [];
      setAllThresholds(thList);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoadingPatients(false);
      setLoadingThresholds(false);
    }
  }, [doctorId]);

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, loadData]);

  // Computed data
  const activeThresholds = useMemo(() => {
    const map = new Map();
    allThresholds.forEach((t) => {
      if (checkIsActive(t)) {
        const existing = map.get(t.patientId);
        if (!existing || new Date(t.createdAt) > new Date(existing.createdAt)) {
          map.set(t.patientId, t);
        }
      }
    });
    return map;
  }, [allThresholds]);

  const missingPatients = useMemo(() => {
    return patients.filter((p) => !activeThresholds.has(p.patientId));
  }, [patients, activeThresholds]);

  const activePatients = useMemo(() => {
    return patients.filter((p) => activeThresholds.has(p.patientId));
  }, [patients, activeThresholds]);

  const archivedThresholds = useMemo(() => {
    return allThresholds
      .filter((t) => !checkIsActive(t))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }, [allThresholds]);

  // Filtered lists
  const filteredMissing = useMemo(() => {
    if (!searchQuery.trim()) return missingPatients;
    const q = searchQuery.toLowerCase();
    return missingPatients.filter(
      (p) => (p.patientName || "").toLowerCase().includes(q) || (p.patientCode || "").toLowerCase().includes(q)
    );
  }, [missingPatients, searchQuery]);

  const filteredActive = useMemo(() => {
    if (!searchQuery.trim()) return activePatients;
    const q = searchQuery.toLowerCase();
    return activePatients.filter(
      (p) => (p.patientName || "").toLowerCase().includes(q) || (p.patientCode || "").toLowerCase().includes(q)
    );
  }, [activePatients, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: patients.length,
    active: activePatients.length,
    missing: missingPatients.length,
  }), [patients, activePatients, missingPatients]);

  // Form actions
  const handleOpenCreate = (patientId = "") => {
    if (!patientId && missingPatients.length === 0) {
      showToast("Tất cả bệnh nhân đều đã có cấu hình ngưỡng.", "warning");
      return;
    }
    setFormData(createDefaultFormData(patientId));
    setEditingPatientId(null);
    setErrorMessage("");
    setIsFormVisible(true);
  };

  const handleCreateForAll = () => {
    if (missingPatients.length === 0) {
      showToast("Tất cả bệnh nhân đã có ngưỡng!", "warning");
      return;
    }
    Alert.alert(
      "Tạo cấu hình cho tất cả",
      `Bạn sẽ tạo cấu hình ngưỡng mặc định cho ${missingPatients.length} bệnh nhân chưa có ngưỡng. Tiếp tục?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Tạo tất cả",
          onPress: async () => {
            setSaving(true);
            let successCount = 0;
            const defaultData = createDefaultFormData();
            for (const pt of missingPatients) {
              try {
                const payload = {
                  patientId: pt.patientId,
                  doctorId,
                  temperatureMin: toNumber(defaultData.temperatureMin),
                  temperatureMax: toNumber(defaultData.temperatureMax),
                  heartRateMin: toNumber(defaultData.pulseMin),
                  heartRateMax: toNumber(defaultData.pulseMax),
                  respiratoryRateMin: toNumber(defaultData.respiratoryRateMin),
                  respiratoryRateMax: toNumber(defaultData.respiratoryRateMax),
                  spo2Min: toNumber(defaultData.spo2Min),
                  sysMin: toNumber(defaultData.systolicMin),
                  sysMax: toNumber(defaultData.systolicMax),
                  diaMin: toNumber(defaultData.diastolicMin),
                  diaMax: toNumber(defaultData.diastolicMax),
                  glucoseMin: toNumber(defaultData.glucoseMin),
                  glucoseMax: toNumber(defaultData.glucoseMax),
                  effectiveFrom: new Date().toISOString(),
                  effectiveTo: null,
                };
                const res = await createThreshold(payload);
                if (res.ok) successCount++;
              } catch (e) {
                // skip individual errors
              }
            }
            setSaving(false);
            showToast(`Đã tạo cấu hình cho ${successCount}/${missingPatients.length} bệnh nhân.`);
            loadData();
          },
        },
      ]
    );
  };

  const handleEdit = (threshold) => {
    setFormData({
      patientId: threshold.patientId,
      temperatureMin: String(threshold.temperatureMin ?? "36.0"),
      temperatureMax: String(threshold.temperatureMax ?? "37.5"),
      systolicMin: String(threshold.sysMin ?? "90"),
      systolicMax: String(threshold.sysMax ?? "135"),
      diastolicMin: String(threshold.diaMin ?? "60"),
      diastolicMax: String(threshold.diaMax ?? "85"),
      pulseMin: String(threshold.heartRateMin ?? "60"),
      pulseMax: String(threshold.heartRateMax ?? "100"),
      glucoseMin: threshold.glucoseMin != null ? String(threshold.glucoseMin) : "",
      glucoseMax: threshold.glucoseMax != null ? String(threshold.glucoseMax) : "",
      spo2Min: String(threshold.spo2Min ?? "95"),
      respiratoryRateMin: String(threshold.respiratoryRateMin ?? "12"),
      respiratoryRateMax: String(threshold.respiratoryRateMax ?? "20"),
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
    });
    setEditingPatientId(threshold.patientId);
    setErrorMessage("");
    setIsFormVisible(true);
  };

  const handleClone = (threshold) => {
    handleEdit(threshold);
    setEditingPatientId(null);
  };

  const handleStop = (threshold) => {
    Alert.alert(
      "Ngưng áp dụng",
      "Bạn có chắc muốn ngưng áp dụng ngưỡng hiện tại? Bệnh nhân sẽ không được giám sát.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Ngưng",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              const res = await updateThreshold(threshold.id, {
                ...threshold,
                effectiveTo: new Date().toISOString(),
              });
              if (res.ok) {
                showToast("Đã ngưng áp dụng thành công.");
                loadData();
              } else {
                Alert.alert("Lỗi", res.body?.error || "Không thể ngưng áp dụng.");
              }
            } catch (err) {
              Alert.alert("Lỗi", "Có lỗi hệ thống xảy ra.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const validateForm = () => {
    if (!formData.patientId) return "Vui lòng chọn bệnh nhân.";
    const tempMin = toNumber(formData.temperatureMin);
    const tempMax = toNumber(formData.temperatureMax);
    if (tempMin >= tempMax) return "Nhiệt độ tối thiểu phải nhỏ hơn tối đa.";
    const sysMin = toNumber(formData.systolicMin);
    const sysMax = toNumber(formData.systolicMax);
    if (sysMin >= sysMax) return "HA tâm thu tối thiểu phải nhỏ hơn tối đa.";
    const diaMin = toNumber(formData.diastolicMin);
    const diaMax = toNumber(formData.diastolicMax);
    if (diaMin >= diaMax) return "HA tâm trương tối thiểu phải nhỏ hơn tối đa.";
    const pulseMin = toNumber(formData.pulseMin);
    const pulseMax = toNumber(formData.pulseMax);
    if (pulseMin >= pulseMax) return "Nhịp tim tối thiểu phải nhỏ hơn tối đa.";
    const respMin = toNumber(formData.respiratoryRateMin);
    const respMax = toNumber(formData.respiratoryRateMax);
    if (respMin >= respMax) return "Nhịp thở tối thiểu phải nhỏ hơn tối đa.";
    if (formData.glucoseMin && formData.glucoseMax) {
      if (toNumber(formData.glucoseMin) >= toNumber(formData.glucoseMax))
        return "Đường huyết tối thiểu phải nhỏ hơn tối đa.";
    }
    return null;
  };

  const handleSave = async () => {
    setErrorMessage("");
    const err = validateForm();
    if (err) { setErrorMessage(err); return; }

    setSaving(true);
    const payload = {
      patientId: formData.patientId,
      doctorId,
      temperatureMin: toNumber(formData.temperatureMin),
      temperatureMax: toNumber(formData.temperatureMax),
      heartRateMin: toNumber(formData.pulseMin),
      heartRateMax: toNumber(formData.pulseMax),
      respiratoryRateMin: toNumber(formData.respiratoryRateMin),
      respiratoryRateMax: toNumber(formData.respiratoryRateMax),
      spo2Min: toNumber(formData.spo2Min),
      sysMin: toNumber(formData.systolicMin),
      sysMax: toNumber(formData.systolicMax),
      diaMin: toNumber(formData.diastolicMin),
      diaMax: toNumber(formData.diastolicMax),
      glucoseMin: formData.glucoseMin ? toNumber(formData.glucoseMin) : null,
      glucoseMax: formData.glucoseMax ? toNumber(formData.glucoseMax) : null,
      effectiveFrom: new Date(`${formData.effectiveFrom}T00:00:00`).toISOString(),
      effectiveTo: formData.effectiveTo ? new Date(`${formData.effectiveTo}T23:59:59`).toISOString() : null,
    };

    try {
      // If editing, archive current active threshold first
      if (editingPatientId) {
        const active = activeThresholds.get(editingPatientId);
        if (active) {
          await updateThreshold(active.id, { ...active, effectiveTo: new Date().toISOString() });
        }
      }

      const res = await createThreshold(payload);
      if (res.ok) {
        showToast(editingPatientId ? "Cập nhật ngưỡng thành công!" : "Tạo cấu hình ngưỡng thành công!");
        setIsFormVisible(false);
        loadData();
      } else {
        setErrorMessage(res.body?.error || "Lỗi khi lưu cấu hình.");
      }
    } catch (e) {
      setErrorMessage("Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  // Date picker
  const openDatePicker = (field) => {
    setDatePickerField(field);
    const dateStr = formData[field];
    let dateVal = new Date();
    if (dateStr) {
      const parts = dateStr.split("-");
      if (parts.length === 3) dateVal = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    }
    setCurrentPickerDate(isNaN(dateVal.getTime()) ? new Date() : dateVal);
    setShowDatePicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (selectedDate) {
        setFormData({ ...formData, [datePickerField]: selectedDate.toISOString().split("T")[0] });
      }
    } else if (selectedDate) {
      setCurrentPickerDate(selectedDate);
    }
  };

  const handleConfirmIOSDate = () => {
    setFormData({ ...formData, [datePickerField]: currentPickerDate.toISOString().split("T")[0] });
    setShowDatePicker(false);
  };

  // --- RENDER ---

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats.total}</Text>
        <Text style={styles.statLabel}>Bệnh nhân</Text>
      </View>
      <View style={[styles.statCard, { borderColor: "#D1FAE5" }]}>
        <Text style={[styles.statValue, { color: "#059669" }]}>{stats.active}</Text>
        <Text style={styles.statLabel}>Đã có ngưỡng</Text>
      </View>
      <View style={[styles.statCard, stats.missing > 0 && { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" }]}>
        <Text style={[styles.statValue, stats.missing > 0 && { color: "#D97706" }]}>{stats.missing}</Text>
        <Text style={[styles.statLabel, stats.missing > 0 && { color: "#92400E" }]}>Chưa có</Text>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabRow}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const badge = tab.key === "MISSING" && stats.missing > 0 ? stats.missing : null;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{tab.label}</Text>
            {badge && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{badge}</Text></View>}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderMissingCard = ({ item }) => (
    <View style={styles.missingCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.patientName || "Bệnh nhân"}</Text>
        {item.patientCode && <Text style={styles.cardCode}>Mã: {item.patientCode}</Text>}
        <View style={styles.missingBadge}>
          <Text style={styles.missingBadgeText}>Chưa có ngưỡng</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.createBtn} onPress={() => handleOpenCreate(item.patientId)}>
        <Ionicons name="add-circle-outline" size={16} color="#fff" />
        <Text style={styles.createBtnText}>Tạo ngưỡng</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveCard = ({ item }) => {
    const threshold = activeThresholds.get(item.patientId);
    if (!threshold) return null;
    return (
      <View style={styles.activeCard}>
        <View style={styles.activeCardHeader}>
          <View>
            <Text style={styles.cardName}>{item.patientName || "Bệnh nhân"}</Text>
            {item.patientCode && <Text style={styles.cardCode}>Mã: {item.patientCode}</Text>}
          </View>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>Đang áp dụng</Text>
          </View>
        </View>

        <View style={styles.vitalsGrid}>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>Huyết áp</Text>
            <Text style={styles.vitalVal}>{threshold.sysMin}-{threshold.sysMax}/{threshold.diaMin}-{threshold.diaMax}</Text>
            <Text style={styles.vitalUnit}>mmHg</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>Nhịp tim</Text>
            <Text style={styles.vitalVal}>{threshold.heartRateMin}-{threshold.heartRateMax}</Text>
            <Text style={styles.vitalUnit}>bpm</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>Nhiệt độ</Text>
            <Text style={styles.vitalVal}>{threshold.temperatureMin}-{threshold.temperatureMax}</Text>
            <Text style={styles.vitalUnit}>°C</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>SpO2</Text>
            <Text style={styles.vitalVal}>≥ {threshold.spo2Min}</Text>
            <Text style={styles.vitalUnit}>%</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>Nhịp thở</Text>
            <Text style={styles.vitalVal}>{threshold.respiratoryRateMin}-{threshold.respiratoryRateMax}</Text>
            <Text style={styles.vitalUnit}>nhịp/ph</Text>
          </View>
          <View style={styles.vitalBox}>
            <Text style={styles.vitalLabel}>Đường huyết</Text>
            <Text style={styles.vitalVal}>{threshold.glucoseMin != null ? `${threshold.glucoseMin}-${threshold.glucoseMax}` : "—"}</Text>
            <Text style={styles.vitalUnit}>mmol/L</Text>
          </View>
        </View>

        <View style={styles.activeFooter}>
          <Text style={styles.timeText}>Từ: {formatDateTime(threshold.effectiveFrom)}</Text>
          <View style={styles.activeActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleEdit(threshold)}>
              <Ionicons name="create-outline" size={18} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleStop(threshold)}>
              <Ionicons name="stop-circle-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderHistoryCard = ({ item }) => {
    const pt = patients.find((p) => p.patientId === item.patientId);
    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.cardName}>{pt?.patientName || "Bệnh nhân"}</Text>
          <TouchableOpacity style={styles.cloneBtn} onPress={() => handleClone(item)}>
            <Ionicons name="copy-outline" size={14} color="#2563EB" />
            <Text style={styles.cloneBtnText}>Sao chép</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.historyText}>
          HA: {item.sysMin}-{item.sysMax}/{item.diaMin}-{item.diaMax} | Tim: {item.heartRateMin}-{item.heartRateMax} | T°: {item.temperatureMin}-{item.temperatureMax}
        </Text>
        <Text style={styles.historyTime}>
          {formatDateTime(item.effectiveFrom)} → {formatDateTime(item.effectiveTo)}
        </Text>
      </View>
    );
  };

  const renderContent = () => {
    if (loadingPatients || loadingThresholds) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      );
    }

    if (activeTab === "MISSING") {
      if (filteredMissing.length === 0) {
        return (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
            <Text style={styles.emptyTitle}>Tuyệt vời!</Text>
            <Text style={styles.emptyText}>Tất cả bệnh nhân đều đã có ngưỡng.</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={filteredMissing}
          keyExtractor={(item) => item.patientId}
          renderItem={renderMissingCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    if (activeTab === "ACTIVE") {
      if (filteredActive.length === 0) {
        return (
          <View style={styles.emptyBox}>
            <Ionicons name="options-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Chưa có bệnh nhân nào được cấu hình.</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={filteredActive}
          keyExtractor={(item) => item.patientId}
          renderItem={renderActiveCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    // HISTORY
    if (archivedThresholds.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Ionicons name="time-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Không có dữ liệu lịch sử.</Text>
        </View>
      );
    }
    return (
      <FlatList
        data={archivedThresholds}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderFormField = (title, minKey, maxKey, placeholder) => (
    <View style={styles.formSection}>
      <Text style={styles.formSecTitle}>{title}</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.inputLabel}>Tối thiểu</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={placeholder}
            value={formData[minKey]}
            onChangeText={(val) => setFormData({ ...formData, [minKey]: val })}
          />
        </View>
        {maxKey && (
          <View style={styles.col}>
            <Text style={styles.inputLabel}>Tối đa</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder={placeholder}
              value={formData[maxKey]}
              onChangeText={(val) => setFormData({ ...formData, [maxKey]: val })}
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderDatePickerModal = () => {
    if (!showDatePicker) return null;
    if (Platform.OS === "ios") {
      return (
        <Modal transparent animationType="fade" visible onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  {datePickerField === "effectiveFrom" ? "Chọn ngày bắt đầu" : "Chọn ngày kết thúc"}
                </Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={22} color="#4B5563" />
                </TouchableOpacity>
              </View>
              <DateTimePicker value={currentPickerDate} mode="date" display="spinner" onChange={handleDateChange} textColor="#1F2937" />
              <TouchableOpacity style={styles.pickerConfirmBtn} onPress={handleConfirmIOSDate}>
                <Text style={styles.pickerConfirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    }
    return <DateTimePicker value={currentPickerDate} mode="date" display="default" onChange={handleDateChange} />;
  };

  const selectedFormPatient = patients.find((p) => p.patientId === formData.patientId);

  return (
    <View style={styles.container}>
      {renderStats()}
      {renderTabs()}

      {/* Search */}
      {activeTab !== "HISTORY" && (
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <TextInput
            placeholder="Tìm bệnh nhân..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionBtnsRow}>
        <TouchableOpacity style={styles.createFloatBtn} onPress={() => handleOpenCreate()}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.createFloatBtnText}>Tạo cấu hình</Text>
        </TouchableOpacity>
        {stats.missing > 0 && (
          <TouchableOpacity style={styles.createAllBtn} onPress={handleCreateForAll} disabled={saving}>
            <Ionicons name="people" size={16} color="#D97706" />
            <Text style={styles.createAllBtnText}>Tạo cho tất cả ({stats.missing})</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderContent()}

      {/* FORM MODAL */}
      <Modal visible={isFormVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setIsFormVisible(false)}>
        <SafeAreaView style={styles.formModal} edges={["top", "left", "right"]}>
          <View style={styles.formModalHeader}>
            <Text style={styles.formModalTitle}>
              {editingPatientId ? "Chỉnh sửa cấu hình" : "Tạo cấu hình mới"}
            </Text>
            <TouchableOpacity onPress={() => setIsFormVisible(false)}>
              <Ionicons name="close" size={24} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Patient Selector */}
              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>Bệnh nhân</Text>
                <TouchableOpacity
                  style={styles.patientPickerBtn}
                  onPress={() => setShowPatientModal(true)}
                  disabled={!!editingPatientId}
                  activeOpacity={0.7}
                >
                  <Text style={selectedFormPatient ? styles.patientPickerText : styles.patientPickerPlaceholder}>
                    {selectedFormPatient?.patientName || "Nhấn để chọn bệnh nhân..."}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#6B7280" />
                </TouchableOpacity>
                {editingPatientId && (
                  <Text style={styles.editNote}>Lưu cấu hình mới sẽ tự động ngưng cấu hình hiện tại.</Text>
                )}
              </View>

              {renderFormField("Nhiệt độ (°C)", "temperatureMin", "temperatureMax")}
              {renderFormField("HA tâm thu (mmHg)", "systolicMin", "systolicMax")}
              {renderFormField("HA tâm trương (mmHg)", "diastolicMin", "diastolicMax")}
              {renderFormField("Nhịp tim (bpm)", "pulseMin", "pulseMax")}
              {renderFormField("Nhịp thở (nhịp/ph)", "respiratoryRateMin", "respiratoryRateMax")}

              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>SpO2 tối thiểu (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={formData.spo2Min}
                  onChangeText={(val) => setFormData({ ...formData, spo2Min: val })}
                />
              </View>

              {renderFormField("Đường huyết (mmol/L)", "glucoseMin", "glucoseMax")}

              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>Thời gian hiệu lực</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Bắt đầu</Text>
                    <TouchableOpacity style={[styles.input, styles.dateBtn]} onPress={() => openDatePicker("effectiveFrom")}>
                      <Text style={styles.dateBtnText}>{formData.effectiveFrom || "Chọn"}</Text>
                      <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Kết thúc (tùy chọn)</Text>
                    <TouchableOpacity style={[styles.input, styles.dateBtn]} onPress={() => openDatePicker("effectiveTo")}>
                      <Text style={styles.dateBtnText}>{formData.effectiveTo || "Không hạn"}</Text>
                      <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsFormVisible(false)} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Lưu cấu hình</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Patient Selector Modal - inside form modal so it renders on top */}
          <PatientSelectorModal
            visible={showPatientModal}
            onClose={() => setShowPatientModal(false)}
            patients={missingPatients}
            selectedPatientId={formData.patientId}
            onSelect={(patientId) => {
              setFormData({ ...formData, patientId });
              setShowPatientModal(false);
            }}
            loading={loadingPatients}
          />
        </SafeAreaView>
      </Modal>

      {renderDatePickerModal()}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F6FF" },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: "#1F2937" },
  statLabel: { fontSize: 11, fontWeight: "500", color: "#6B7280", marginTop: 2 },

  // Tabs
  tabRow: { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#F1F5F9", borderRadius: 10, padding: 3, marginBottom: 8 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 8, gap: 4 },
  tabBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  tabBtnTextActive: { color: "#2563EB" },
  tabBadge: { backgroundColor: "#FEF3C7", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: "#D97706" },

  // Search
  searchContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    marginHorizontal: 16, borderRadius: 10, paddingHorizontal: 12, height: 38,
    borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 8,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: "#1F2937" },

  // Create button
  actionBtnsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  createFloatBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 10, gap: 6,
  },
  createFloatBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  createAllBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFBEB", borderRadius: 10, paddingVertical: 10, gap: 6,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  createAllBtnText: { fontSize: 12, fontWeight: "600", color: "#D97706" },

  // Lists
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginTop: 12 },
  emptyText: { fontSize: 14, color: "#6B7280", marginTop: 6, textAlign: "center" },

  // Missing card
  missingCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#FDE68A",
  },
  cardName: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  cardCode: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  missingBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6, alignSelf: "flex-start" },
  missingBadgeText: { fontSize: 10, fontWeight: "600", color: "#B45309" },
  createBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#D97706",
    paddingHorizontal: 12, height: 32, borderRadius: 8, gap: 4,
  },
  createBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },

  // Active card
  activeCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#D1FAE5", borderLeftWidth: 4, borderLeftColor: "#10B981" },
  activeCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  activeBadgeText: { fontSize: 10, fontWeight: "700", color: "#059669" },
  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  vitalBox: { width: "30%", backgroundColor: "#F8FAFC", borderRadius: 8, padding: 8, alignItems: "center" },
  vitalLabel: { fontSize: 10, color: "#6B7280", fontWeight: "500" },
  vitalVal: { fontSize: 13, fontWeight: "700", color: "#1F2937", marginTop: 2 },
  vitalUnit: { fontSize: 9, color: "#9CA3AF", marginTop: 1 },
  activeFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 10 },
  timeText: { fontSize: 11, color: "#6B7280" },
  activeActions: { flexDirection: "row", gap: 12 },
  iconBtn: { padding: 6, backgroundColor: "#F1F5F9", borderRadius: 8 },

  // History card
  historyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cloneBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "#EFF6FF" },
  cloneBtnText: { fontSize: 11, fontWeight: "600", color: "#2563EB" },
  historyText: { fontSize: 12, color: "#4B5563", lineHeight: 18 },
  historyTime: { fontSize: 11, color: "#9CA3AF", marginTop: 6 },

  // Form Modal
  formModal: { flex: 1, backgroundColor: "#fff" },
  formModalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  formModalTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  formBody: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  formSection: { marginBottom: 16 },
  formSecTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: "500", color: "#6B7280", marginBottom: 4 },
  input: {
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 14, color: "#1F2937",
  },
  dateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateBtnText: { fontSize: 13, color: "#4B5563" },
  patientPickerBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, paddingHorizontal: 12, height: 42,
  },
  patientPickerText: { fontSize: 14, color: "#1F2937", fontWeight: "500" },
  patientPickerPlaceholder: { fontSize: 14, color: "#9CA3AF" },
  editNote: { fontSize: 11, color: "#D97706", marginTop: 6 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF2F2", padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { fontSize: 12, color: "#DC2626", flex: 1 },
  formActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  saveBtn: { flex: 2, height: 44, borderRadius: 10, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Date picker modal
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  pickerContent: { backgroundColor: "#fff", borderRadius: 20, width: "85%", padding: 16 },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  pickerTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  pickerConfirmBtn: { backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  pickerConfirmText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});

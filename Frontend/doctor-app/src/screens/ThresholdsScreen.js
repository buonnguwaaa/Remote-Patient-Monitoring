import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import Toast from "../components/Toast";

import { useAuth } from "../context/AuthContext";
import {
  getMyPatients,
  getThresholds,
  createThreshold,
  updateThreshold,
} from "../api/patientApi";

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
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateOnly(iso) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

const toNumber = (val) => parseFloat(val || "0");

export default function ThresholdsScreen() {
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const doctorId = user?.id || user?._id;

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [activeThreshold, setActiveThreshold] = useState(null);
  const [historyThresholds, setHistoryThresholds] = useState([]);
  const [loadingThresholds, setLoadingThresholds] = useState(false);

  // Form states
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Patient Search Modal states
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");

  // Load patient list
  useEffect(() => {
    if (!isFocused) return;

    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const res = await getMyPatients();
        const list = res.body?.data || res.body || [];
        setPatients(list);
        if (list.length > 0 && !selectedPatientId) {
          setSelectedPatientId(list[0].patientId);
        }
      } catch (err) {
        console.error("Failed to load patients:", err);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, [isFocused]);

  // Load thresholds when patient changes
  const fetchThresholds = async (patientId) => {
    if (!patientId) {
      setActiveThreshold(null);
      setHistoryThresholds([]);
      return;
    }
    setLoadingThresholds(true);
    try {
      const [latestRes, historyRes] = await Promise.all([
        getThresholds({ patientId, latest: true }),
        getThresholds({ patientId }),
      ]);

      const latestList = latestRes.body?.data || latestRes.body || [];
      const historyList = historyRes.body?.data || historyRes.body || [];

      setActiveThreshold(latestList[0] || null);
      setHistoryThresholds(historyList);
    } catch (err) {
      console.error("Failed to load thresholds:", err);
    } finally {
      setLoadingThresholds(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId && isFocused) {
      fetchThresholds(selectedPatientId);
      setIsFormVisible(false);
      setEditingId(null);
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [selectedPatientId, isFocused]);

  const selectedPatientName = useMemo(() => {
    const found = patients.find((p) => p.patientId === selectedPatientId);
    return found?.patientName || found?.name || "Bệnh nhân";
  }, [patients, selectedPatientId]);

  const selectedPatientCode = useMemo(() => {
    const found = patients.find((p) => p.patientId === selectedPatientId);
    return found?.patientCode || found?.code || "";
  }, [patients, selectedPatientId]);

  const filteredPatients = useMemo(() => {
    const q = patientSearchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        (p.patientName || p.name || "").toLowerCase().includes(q) ||
        (p.patientCode || p.code || "").toLowerCase().includes(q)
    );
  }, [patients, patientSearchQuery]);

  const handleEdit = (threshold) => {
    setFormData({
      patientId: threshold.patientId,
      temperatureMin: String(threshold.temperatureMin),
      temperatureMax: String(threshold.temperatureMax),
      systolicMin: String(threshold.sysMin),
      systolicMax: String(threshold.sysMax),
      diastolicMin: String(threshold.diaMin),
      diastolicMax: String(threshold.diaMax),
      pulseMin: String(threshold.heartRateMin),
      pulseMax: String(threshold.heartRateMax),
      glucoseMin: threshold.glucoseMin != null ? String(threshold.glucoseMin) : "",
      glucoseMax: threshold.glucoseMax != null ? String(threshold.glucoseMax) : "",
      spo2Min: String(threshold.spo2Min),
      respiratoryRateMin: String(threshold.respiratoryRateMin),
      respiratoryRateMax: String(threshold.respiratoryRateMax),
      effectiveFrom: formatDateOnly(threshold.effectiveFrom) || new Date().toISOString().split("T")[0],
      effectiveTo: formatDateOnly(threshold.effectiveTo) || "",
    });
    setEditingId(threshold.id);
    setIsFormVisible(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleClone = (threshold) => {
    setFormData({
      patientId: threshold.patientId,
      temperatureMin: String(threshold.temperatureMin),
      temperatureMax: String(threshold.temperatureMax),
      systolicMin: String(threshold.sysMin),
      systolicMax: String(threshold.sysMax),
      diastolicMin: String(threshold.diaMin),
      diastolicMax: String(threshold.diaMax),
      pulseMin: String(threshold.heartRateMin),
      pulseMax: String(threshold.heartRateMax),
      glucoseMin: threshold.glucoseMin != null ? String(threshold.glucoseMin) : "",
      glucoseMax: threshold.glucoseMax != null ? String(threshold.glucoseMax) : "",
      spo2Min: String(threshold.spo2Min),
      respiratoryRateMin: String(threshold.respiratoryRateMin),
      respiratoryRateMax: String(threshold.respiratoryRateMax),
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
    });
    setEditingId(null);
    setIsFormVisible(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleStopValidity = async (threshold) => {
    Alert.alert(
      "Xác nhận ngưng áp dụng",
      "Bạn có chắc muốn ngưng áp dụng cấu hình ngưỡng hiện tại này không? Bệnh nhân sẽ quay về trạng thái không giám sát.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Ngưng áp dụng",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              const res = await updateThreshold(threshold.id, {
                ...threshold,
                effectiveTo: new Date().toISOString(),
              });
              if (res.ok) {
                setSuccessMessage("Đã ngưng áp dụng ngưỡng thành công.");
                fetchThresholds(selectedPatientId);
              } else {
                setErrorMessage(res.body?.error || "Lỗi không xác định khi ngưng áp dụng.");
              }
            } catch (err) {
              setErrorMessage("Có lỗi hệ thống xảy ra.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const validateForm = () => {
    if (!selectedPatientId) return "Vui lòng chọn một bệnh nhân.";

    const tempMin = toNumber(formData.temperatureMin);
    const tempMax = toNumber(formData.temperatureMax);
    if (tempMin >= tempMax) return "Nhiệt độ tối thiểu phải nhỏ hơn tối đa.";

    const sysMin = toNumber(formData.systolicMin);
    const sysMax = toNumber(formData.systolicMax);
    if (sysMin >= sysMax) return "Huyết áp tâm thu tối thiểu phải nhỏ hơn tối đa.";

    const diaMin = toNumber(formData.diastolicMin);
    const diaMax = toNumber(formData.diastolicMax);
    if (diaMin >= diaMax) return "Huyết áp tâm trương tối thiểu phải nhỏ hơn tối đa.";

    const pulseMin = toNumber(formData.pulseMin);
    const pulseMax = toNumber(formData.pulseMax);
    if (pulseMin >= pulseMax) return "Nhịp tim tối thiểu phải nhỏ hơn tối đa.";

    const respMin = toNumber(formData.respiratoryRateMin);
    const respMax = toNumber(formData.respiratoryRateMax);
    if (respMin >= respMax) return "Nhịp thở tối thiểu phải nhỏ hơn tối đa.";

    if (formData.glucoseMin && formData.glucoseMax) {
      const glucMin = toNumber(formData.glucoseMin);
      const glucMax = toNumber(formData.glucoseMax);
      if (glucMin >= glucMax) return "Đường huyết tối thiểu phải nhỏ hơn tối đa.";
    }

    const start = new Date(`${formData.effectiveFrom}T00:00:00`);
    if (formData.effectiveTo) {
      const end = new Date(`${formData.effectiveTo}T23:59:59`);
      if (end.getTime() < start.getTime()) {
        return "Ngày kết thúc không được nhỏ hơn ngày bắt đầu.";
      }
    }

    return null;
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    const payload = {
      patientId: selectedPatientId,
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
      let res;
      if (editingId) {
        res = await updateThreshold(editingId, payload);
      } else {
        res = await createThreshold(payload);
      }

      if (res.ok) {
        setSuccessMessage(
          editingId ? "Cập nhật ngưỡng thành công!" : "Thiết lập cấu hình ngưỡng mới thành công!"
        );
        setIsFormVisible(false);
        setEditingId(null);
        fetchThresholds(selectedPatientId);
      } else {
        setErrorMessage(res.body?.error || "Lỗi khi lưu cấu hình ngưỡng.");
      }
    } catch (err) {
      setErrorMessage("Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Patient Picker Selector */}
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>Bệnh nhân đang chọn</Text>
        <TouchableOpacity
          style={styles.pickerSelectorBtn}
          onPress={() => {
            setPatientSearchQuery("");
            setShowPatientModal(true);
          }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            {selectedPatientId ? (
              <View style={styles.selectedPatientRow}>
                <Text style={styles.pickerSelectedName}>{selectedPatientName}</Text>
                {selectedPatientCode ? (
                  <Text style={styles.pickerSelectedCode}>Mã HS: {selectedPatientCode}</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.pickerPlaceholderText}>Nhấp để chọn bệnh nhân</Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* Searchable Patient Picker Modal */}
      <Modal
        visible={showPatientModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPatientModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn bệnh nhân</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Tìm theo tên hoặc mã bệnh án..."
                placeholderTextColor="#9CA3AF"
                value={patientSearchQuery}
                onChangeText={setPatientSearchQuery}
              />
              {patientSearchQuery ? (
                <TouchableOpacity onPress={() => setPatientSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingPatients ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {filteredPatients.length === 0 ? (
                  <Text style={styles.modalEmptyText}>Không tìm thấy bệnh nhân nào.</Text>
                ) : (
                  filteredPatients.map((p, idx) => {
                    const isSelected = p.patientId === selectedPatientId;
                    return (
                      <TouchableOpacity
                        key={p.patientId || p.id || `patient-${idx}`}
                        style={[styles.modalItem, isSelected && styles.modalItemActive]}
                        onPress={() => {
                          setSelectedPatientId(p.patientId);
                          setShowPatientModal(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalItemName, isSelected && styles.modalItemNameActive]}>
                            {p.patientName || p.name}
                          </Text>
                          {p.patientCode ? (
                            <Text style={[styles.modalItemCode, isSelected && styles.modalItemCodeActive]}>
                              Mã HS: {p.patientCode}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark" size={18} color="#2563EB" />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>


        {/* Active Threshold View */}
        {!isFormVisible && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ngưỡng hiện tại</Text>
              {!activeThreshold && !loadingThresholds ? (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => {
                    setFormData(createDefaultFormData(selectedPatientId));
                    setEditingId(null);
                    setIsFormVisible(true);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.addBtnText}>Thiết lập</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingThresholds ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
            ) : activeThreshold ? (
              <View style={styles.activeCard}>
                <View style={styles.activeCardHeader}>
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>ĐANG ÁP DỤNG</Text>
                  </View>
                  <Text style={styles.cardVersion}>Cập nhật mới nhất</Text>
                </View>

                {/* Vitals limits Grid */}
                <View style={styles.vitalsGrid}>
                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>Huyết áp</Text>
                    <Text style={styles.vitalVal}>
                      {activeThreshold.sysMin}-{activeThreshold.sysMax} / {activeThreshold.diaMin}-{activeThreshold.diaMax}
                    </Text>
                    <Text style={styles.vitalUnit}>mmHg</Text>
                  </View>

                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>Nhịp tim</Text>
                    <Text style={styles.vitalVal}>
                      {activeThreshold.heartRateMin}-{activeThreshold.heartRateMax}
                    </Text>
                    <Text style={styles.vitalUnit}>bpm</Text>
                  </View>

                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>Nhiệt độ</Text>
                    <Text style={styles.vitalVal}>
                      {activeThreshold.temperatureMin}-{activeThreshold.temperatureMax}
                    </Text>
                    <Text style={styles.vitalUnit}>°C</Text>
                  </View>

                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>SpO2 tối thiểu</Text>
                    <Text style={styles.vitalVal}>&gt;= {activeThreshold.spo2Min}</Text>
                    <Text style={styles.vitalUnit}>%</Text>
                  </View>

                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>Nhịp thở</Text>
                    <Text style={styles.vitalVal}>
                      {activeThreshold.respiratoryRateMin}-{activeThreshold.respiratoryRateMax}
                    </Text>
                    <Text style={styles.vitalUnit}>nhịp/phút</Text>
                  </View>

                  <View style={styles.vitalBox}>
                    <Text style={styles.vitalLabel}>Đường huyết</Text>
                    <Text style={styles.vitalVal}>
                      {activeThreshold.glucoseMin != null ? `${activeThreshold.glucoseMin}-${activeThreshold.glucoseMax}` : "Chưa cấu hình"}
                    </Text>
                    <Text style={styles.vitalUnit}>mmol/L</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.timeLabel}>Thời gian hiệu lực:</Text>
                    <Text style={styles.timeVal}>
                      Từ: {formatDateTime(activeThreshold.effectiveFrom)}
                    </Text>
                    <Text style={styles.timeVal}>
                      Đến: {formatDateTime(activeThreshold.effectiveTo)}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionBtnIcon}
                      onPress={() => handleEdit(activeThreshold)}
                    >
                      <Ionicons name="create-outline" size={20} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtnIcon, { marginLeft: 12 }]}
                      onPress={() => handleStopValidity(activeThreshold)}
                    >
                      <Ionicons name="stop-circle-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="options-outline" size={40} color="#9CA3AF" />
                <Text style={styles.emptyText}>
                  Bệnh nhân {selectedPatientName} chưa được thiết lập ngưỡng cảnh báo vitals.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Add/Edit Config Form */}
        {isFormVisible && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingId ? "Cập nhật cấu hình" : "Thêm cấu hình mới"}
              </Text>
              <TouchableOpacity onPress={() => setIsFormVisible(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContent}>
              {/* Vitals Form Blocks */}
              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>Nhiệt độ cơ thể (°C)</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối thiểu</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.temperatureMin}
                      onChangeText={(val) => setFormData({ ...formData, temperatureMin: val })}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối đa</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.temperatureMax}
                      onChangeText={(val) => setFormData({ ...formData, temperatureMax: val })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>Huyết áp tâm thu (Systolic - mmHg)</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối thiểu</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.systolicMin}
                      onChangeText={(val) => setFormData({ ...formData, systolicMin: val })}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối đa</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.systolicMax}
                      onChangeText={(val) => setFormData({ ...formData, systolicMax: val })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>Huyết áp tâm trương (Diastolic - mmHg)</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối thiểu</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.diastolicMin}
                      onChangeText={(val) => setFormData({ ...formData, diastolicMin: val })}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối đa</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.diastolicMax}
                      onChangeText={(val) => setFormData({ ...formData, diastolicMax: val })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>Nhịp tim (Heart Rate - bpm)</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối thiểu</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.pulseMin}
                      onChangeText={(val) => setFormData({ ...formData, pulseMin: val })}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối đa</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.pulseMax}
                      onChangeText={(val) => setFormData({ ...formData, pulseMax: val })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>SpO2 tối thiểu (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={formData.spo2Min}
                  onChangeText={(val) => setFormData({ ...formData, spo2Min: val })}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>Nhịp thở (Respiratory - nhịp/phút)</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối thiểu</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.respiratoryRateMin}
                      onChangeText={(val) => setFormData({ ...formData, respiratoryRateMin: val })}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối đa</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.respiratoryRateMax}
                      onChangeText={(val) => setFormData({ ...formData, respiratoryRateMax: val })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>Đường huyết (Glucose - mmol/L)</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối thiểu</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="Trống"
                      value={formData.glucoseMin}
                      onChangeText={(val) => setFormData({ ...formData, glucoseMin: val })}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Tối đa</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder="Trống"
                      value={formData.glucoseMax}
                      onChangeText={(val) => setFormData({ ...formData, glucoseMax: val })}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSecTitle}>Thời gian áp dụng (YYYY-MM-DD)</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Bắt đầu từ</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      value={formData.effectiveFrom}
                      onChangeText={(val) => setFormData({ ...formData, effectiveFrom: val })}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Kết thúc lúc (Tùy chọn)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      value={formData.effectiveTo}
                      onChangeText={(val) => setFormData({ ...formData, effectiveTo: val })}
                    />
                  </View>
                </View>
              </View>

              {/* Submit Buttons */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsFormVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Lưu cấu hình</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* History Thresholds Section */}
        {!isFormVisible && historyThresholds.length > 1 && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Lịch sử cấu hình ({historyThresholds.length - 1})</Text>
            {historyThresholds
              .filter((item) => item.id !== activeThreshold?.id)
              .map((h, idx) => (
                <View key={h.id || `history-${idx}`} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyCardVer}>Phiên bản #{historyThresholds.length - 1 - idx}</Text>
                    <TouchableOpacity
                      style={styles.cloneBtn}
                      onPress={() => handleClone(h)}
                    >
                      <Ionicons name="copy-outline" size={14} color="#2563EB" />
                      <Text style={styles.cloneBtnText}>Sao chép</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.historyBody}>
                    <Text style={styles.historyText}>
                      • HA: {h.sysMin}-{h.sysMax} / {h.diaMin}-{h.diaMax} mmHg | Nhịp tim: {h.heartRateMin}-{h.heartRateMax} bpm
                    </Text>
                    <Text style={styles.historyText}>
                      • Nhiệt độ: {h.temperatureMin}-{h.temperatureMax} °C | SpO2 &gt;= {h.spo2Min}% | Nhịp thở: {h.respiratoryRateMin}-{h.respiratoryRateMax}
                    </Text>
                    {h.glucoseMin != null ? (
                      <Text style={styles.historyText}>
                        • Đường huyết: {h.glucoseMin}-{h.glucoseMax} mmol/L
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.historyTimeRange}>
                    <Text style={styles.historyTimeText}>
                      Hiệu lực: {formatDateOnly(h.effectiveFrom)} → {formatDateOnly(h.effectiveTo) || "Không thời hạn"}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      <Toast
        visible={!!successMessage}
        message={successMessage}
        type="success"
        onDismiss={() => setSuccessMessage("")}
      />
      <Toast
        visible={!!errorMessage}
        message={errorMessage}
        type="error"
        onDismiss={() => setErrorMessage("")}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F6FF" },
  pickerHeader: {
    backgroundColor: "#FFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pickerSelectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedPatientRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerSelectedName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  pickerSelectedCode: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickerPlaceholderText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
  },
  modalContent: {
    backgroundColor: "#FFF",
    marginTop: Platform.OS === "ios" ? 60 : 40,
    marginHorizontal: 16,
    borderRadius: 16,
    maxHeight: "65%",
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalCloseBtn: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    paddingVertical: 0,
  },
  modalList: {
    paddingHorizontal: 16,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemActive: {
    backgroundColor: "#F9FAFB",
  },
  modalItemName: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  modalItemNameActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  modalItemCode: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  modalItemCodeActive: {
    color: "#3B82F6",
  },
  modalEmptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginVertical: 24,
    fontSize: 14,
  },

  body: { flex: 1, padding: 16 },
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: "#FFF", marginLeft: 4 },

  activeCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  activeCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  activeTag: { backgroundColor: "#D1FAE5", px: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  activeTagText: { fontSize: 10, fontWeight: "700", color: "#065F46" },
  cardVersion: { fontSize: 11, color: "#6B7280", fontWeight: "600" },

  vitalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  vitalBox: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    padding: 12,
  },
  vitalLabel: { fontSize: 11, color: "#6B7280", fontWeight: "500" },
  vitalVal: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginVertical: 4 },
  vitalUnit: { fontSize: 10, color: "#94A3B8" },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  timeLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600" },
  timeVal: { fontSize: 11, color: "#4B5563", marginTop: 2 },

  cardActions: { flexDirection: "row", alignItems: "center" },
  actionBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 8, lineHeight: 18 },

  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    overflow: "hidden",
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  formTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  formContent: { padding: 16 },
  formSection: { marginBottom: 14 },
  formSecTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 },
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  inputLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1F2937",
  },
  formActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 13, fontWeight: "600", color: "#FFF" },
  saveBtnDisabled: { backgroundColor: "#93C5FD" },

  historyCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 8,
  },
  historyCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  historyCardVer: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  cloneBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  cloneBtnText: { fontSize: 11, fontWeight: "600", color: "#2563EB" },
  historyBody: { gap: 4 },
  historyText: { fontSize: 11, color: "#6B7280", lineHeight: 16 },
  historyTimeRange: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 6, marginTop: 8 },
  historyTimeText: { fontSize: 10, color: "#9CA3AF" },

  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: { fontSize: 12, color: "#EF4444", flex: 1 },
  successAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  successText: { fontSize: 12, color: "#065F46", flex: 1 },
});

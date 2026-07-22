import React, { useState, useEffect, useRef } from "react";
import { 
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, 
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DRUG_SUGGESTIONS, ROUTE_OPTIONS } from "../../../constants/drugSuggestions";
import { useToast } from "../../../context/ToastContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper components
const Section = ({ title, children, error }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const Chip = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);



function MedicationEditorCard({ med, medIdx, onChange, onRemove, canRemove, errors }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [customRouteInput, setCustomRouteInput] = useState("");

  const handleField = (k, v) => onChange(medIdx, k, v);
  
  const handleSelectSuggestion = (drug) => {
    handleField("drugName", drug.name);
    if (drug.dosage) handleField("dosage", drug.dosage);
    if (drug.route) handleField("route", drug.route);
    if (drug.schedule) handleField("schedule", [...drug.schedule]);
    setShowSuggestions(false);
  };

  const currentDrugQuery = med.drugName || "";
  const filteredDrugs = DRUG_SUGGESTIONS.filter(d => 
    d.name.toLowerCase().includes(currentDrugQuery.toLowerCase())
  );

  const nameError = errors[`med_${medIdx}_name`];
  const dosageError = errors[`med_${medIdx}_dosage`];

  return (
    <View style={[styles.medCard, { zIndex: 1000 - medIdx }]}>
      <View style={styles.medHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="medical" size={16} color="#2563EB" />
          <Text style={styles.medTitle}>Thuốc số {medIdx + 1}</Text>
        </View>
        {canRemove && (
          <TouchableOpacity onPress={() => onRemove(medIdx)} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Drug Name with Auto-Suggest */}
      <Text style={styles.label}>Tên thuốc *</Text>
      <View style={{ zIndex: 999 }}>
        <TextInput
          style={[styles.input, nameError && styles.inputError]}
          value={med.drugName}
          onChangeText={(v) => {
            handleField("drugName", v);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Nhập hoặc chọn tên thuốc (vd: Paracetamol)..."
          placeholderTextColor="#9CA3AF"
        />
        {nameError ? <Text style={styles.fieldErrorText}>{nameError}</Text> : null}

        {showSuggestions && filteredDrugs.length > 0 && (
          <View style={styles.suggestionsBox}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
              {filteredDrugs.map(d => (
                <TouchableOpacity 
                  key={d.name} 
                  style={styles.suggestionItem} 
                  onPress={() => handleSelectSuggestion(d)}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.suggestionName}>{d.name}</Text>
                    {d.dosage ? <Text style={styles.suggestionDosage}>({d.dosage})</Text> : null}
                  </View>
                  {d.route ? <Text style={styles.suggestionRoute}>Đường dùng: {d.route}</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeSuggestionsBtn} 
              onPress={() => setShowSuggestions(false)}
            >
              <Text style={styles.closeSuggestionsText}>Đóng danh sách gợi ý</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Dosage & Route of Administration */}
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Liều lượng *</Text>
          <TextInput 
            style={[styles.input, dosageError && styles.inputError]} 
            value={med.dosage} 
            onChangeText={(v) => handleField("dosage", v)} 
            placeholder="VD: 500mg, 1 viên" 
            placeholderTextColor="#9CA3AF" 
          />
          {dosageError ? <Text style={styles.fieldErrorText}>{dosageError}</Text> : null}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Đường dùng</Text>
          <TouchableOpacity 
            style={styles.routeSelectBox} 
            onPress={() => setShowRouteModal(true)}
          >
            <Text style={styles.routeSelectText} numberOfLines={1}>
              {med.route || "Đường uống"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Instructions */}
      <Text style={styles.label}>Chỉ dẫn thêm</Text>
      <TextInput 
        style={[styles.input, { height: 56, textAlignVertical: "top" }]} 
        value={med.instructions} 
        onChangeText={(v) => handleField("instructions", v)} 
        placeholder="VD: Uống sau ăn no, uống nhiều nước..." 
        placeholderTextColor="#9CA3AF" 
        multiline 
      />

      {/* Schedule Preset Slots (Morning / Noon / Evening) & Extra Custom Doses */}
      {(() => {
        const primaryMorning = med.schedule.find(d => d.timeOfDay === "morning");
        const primaryNoon = med.schedule.find(d => d.timeOfDay === "noon");
        const primaryEvening = med.schedule.find(d => d.timeOfDay === "evening");
        const presetDoses = [primaryMorning, primaryNoon, primaryEvening].filter(Boolean);
        const extraDoses = med.schedule.filter(d => !presetDoses.includes(d));

        return (
          <View>
            <Text style={[styles.label, { marginTop: 8 }]}>Lịch dùng trong ngày (Bật/Tắt các buổi & Thêm lịch khác)</Text>
            <View style={{ gap: 8 }}>
              {[
                { tod: "morning", label: "Sáng", defaultTime: "08:00", existingDose: primaryMorning },
                { tod: "noon", label: "Chiều", defaultTime: "12:00", existingDose: primaryNoon },
                { tod: "evening", label: "Tối", defaultTime: "20:00", existingDose: primaryEvening },
              ].map((slot) => {
                const existingDose = slot.existingDose;
                const enabled = !!existingDose;

                const handleToggleSlot = () => {
                  if (enabled) {
                    const actualIndex = med.schedule.indexOf(existingDose);
                    handleField("schedule", med.schedule.filter((_, idx) => idx !== actualIndex));
                  } else {
                    const newDose = { timeOfDay: slot.tod, customTime: slot.defaultTime, mealTiming: "post_meal", pillCount: 1 };
                    const next = [...med.schedule, newDose].sort((a, b) => {
                      const order = { morning: 1, noon: 2, evening: 3 };
                      return (order[a.timeOfDay] || 9) - (order[b.timeOfDay] || 9);
                    });
                    handleField("schedule", next);
                  }
                };

                const handleSlotChange = (field, value) => {
                  const actualIndex = med.schedule.indexOf(existingDose);
                  const next = [...med.schedule];
                  next[actualIndex] = { ...next[actualIndex], [field]: value };
                  handleField("schedule", next);
                };

                if (!enabled) {
                  return (
                    <TouchableOpacity 
                      key={slot.tod}
                      style={[styles.doseFormCard, { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", opacity: 0.8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 0 }]}
                      onPress={handleToggleSlot}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons name="square-outline" size={20} color="#9CA3AF" />
                          <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B" }}>Buổi {slot.label}</Text>
                        </View>
                        <View style={{ backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "#BFDBFE" }}>
                          <Text style={{ fontSize: 11, fontWeight: "600", color: "#2563EB" }}>+ Bật buổi này</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }

                return (
                  <View 
                    key={slot.tod}
                    style={[styles.doseFormCard, { borderColor: "#3B82F6", borderWidth: 1.5, backgroundColor: "#FFFFFF", marginBottom: 0 }]}
                  >
                    <TouchableOpacity 
                      style={[styles.doseCardHeader, { borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 8, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]} 
                      onPress={handleToggleSlot}
                    >
                      <Ionicons name="checkbox" size={20} color="#2563EB" />
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons 
                          name={slot.tod === "morning" ? "sunny-outline" : slot.tod === "noon" ? "partly-sunny-outline" : "moon-outline"} 
                          size={18} 
                          color="#2563EB" 
                        />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E3A8A" }}>Buổi {slot.label}</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Row 1: Giờ dùng & Số viên (cân bằng kích thước flex: 1) */}
                    <View style={styles.doseRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.doseFieldLabel}>Giờ dùng</Text>
                        <TextInput
                          style={styles.timeInput}
                          placeholder={slot.defaultTime}
                          placeholderTextColor="#9CA3AF"
                          value={existingDose.customTime}
                          onChangeText={(val) => handleSlotChange("customTime", val)}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.doseFieldLabel}>Số viên</Text>
                        <View style={styles.counterRow}>
                          <TouchableOpacity
                            style={styles.counterBtn}
                            onPress={() => handleSlotChange("pillCount", Math.max(0.5, Number(existingDose.pillCount || 1) - 0.5))}
                          >
                            <Text style={styles.counterBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.counterValueText}>{existingDose.pillCount || 1}</Text>
                          <TouchableOpacity
                            style={styles.counterBtn}
                            onPress={() => handleSlotChange("pillCount", Number(existingDose.pillCount || 1) + 0.5)}
                          >
                            <Text style={styles.counterBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Row 2: Thời điểm ăn (Icon tượng trưng + Bất kỳ thay cho K.Hạn) */}
                    <View style={{ marginTop: 4 }}>
                      <Text style={styles.doseFieldLabel}>Thời điểm ăn</Text>
                      <View style={styles.mealTimingRow}>
                        {[
                          { val: "", lbl: "Bất kỳ" },
                          { val: "pre_meal", lbl: "Trước ăn" },
                          { val: "post_meal", lbl: "Sau ăn" },
                        ].map((item) => {
                          const selected = (existingDose.mealTiming || "") === item.val;
                          return (
                            <TouchableOpacity
                              key={item.val}
                              style={[styles.mealTimingBtn, selected && styles.mealTimingBtnActive]}
                              onPress={() => handleSlotChange("mealTiming", item.val)}
                            >
                              <Text style={[styles.mealTimingText, selected && styles.mealTimingTextActive]}>
                                {item.lbl}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Extra Doses Outside the 3 Preset Sessions */}
              {extraDoses.length > 0 && (
                <View style={{ marginTop: 4, gap: 8 }}>
                  <Text style={[styles.doseFieldLabel, { color: "#64748B", fontSize: 12, fontWeight: "700" }]}>Lịch dùng bổ sung ngoài 3 buổi Sáng/Chiều/Tối:</Text>
                  {extraDoses.map((dose, extraIdx) => {
                    const actualIndex = med.schedule.indexOf(dose);
                    return (
                      <View 
                        key={actualIndex}
                        style={[styles.doseFormCard, { borderColor: "#CBD5E1", borderWidth: 1.5, backgroundColor: "#FFFFFF", marginBottom: 0 }]}
                      >
                        <View style={[styles.doseCardHeader, { borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingBottom: 8, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Ionicons name="time-outline" size={18} color="#2563EB" />
                            <Text style={{ fontSize: 13, fontWeight: "700", color: "#1E3A8A" }}>Buổi dùng bổ sung #{extraIdx + 1}</Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => handleField("schedule", med.schedule.filter((_, idx) => idx !== actualIndex))} 
                            style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            <Text style={{ fontSize: 12, color: "#EF4444", fontWeight: "600" }}>Xóa</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Row 1: Nhóm buổi & Giờ dùng */}
                        <View style={styles.doseRow}>
                          <View style={{ flex: 2 }}>
                            <Text style={styles.doseFieldLabel}>Nhóm buổi</Text>
                            <View style={styles.todSegmentContainer}>
                              {["morning", "noon", "evening"].map((tod) => {
                                const selected = dose.timeOfDay === tod;
                                return (
                                  <TouchableOpacity
                                    key={tod}
                                    style={[styles.todSegmentBtn, selected && styles.todSegmentBtnActive, { flexDirection: "row", gap: 3, paddingHorizontal: 2 }]}
                                    onPress={() => {
                                      const next = [...med.schedule];
                                      next[actualIndex] = { ...next[actualIndex], timeOfDay: tod };
                                      handleField("schedule", next);
                                    }}
                                  >
                                    <Ionicons
                                      name={tod === "morning" ? "sunny-outline" : tod === "noon" ? "partly-sunny-outline" : "moon-outline"}
                                      size={13}
                                      color={selected ? "#FFFFFF" : "#64748B"}
                                    />
                                    <Text style={[styles.todSegmentText, selected && styles.todSegmentTextActive]}>
                                      {tod === "morning" ? "Sáng" : tod === "noon" ? "Chiều" : "Tối"}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>

                          <View style={{ width: 85 }}>
                            <Text style={styles.doseFieldLabel}>Giờ dùng</Text>
                            <TextInput
                              style={styles.timeInput}
                              placeholder="21:30"
                              placeholderTextColor="#9CA3AF"
                              value={dose.customTime}
                              onChangeText={(val) => {
                                const next = [...med.schedule];
                                next[actualIndex] = { ...next[actualIndex], customTime: val };
                                handleField("schedule", next);
                              }}
                            />
                          </View>
                        </View>

                        {/* Row 2: Thời điểm ăn & Số viên */}
                        <View style={styles.doseRow}>
                          <View style={{ flex: 2 }}>
                            <Text style={styles.doseFieldLabel}>Thời điểm ăn</Text>
                            <View style={styles.mealTimingRow}>
                              {[
                                { val: "", lbl: "Bất kỳ" },
                                { val: "pre_meal", lbl: "Trước ăn" },
                                { val: "post_meal", lbl: "Sau ăn" },
                              ].map((item) => {
                                const selected = (dose.mealTiming || "") === item.val;
                                return (
                                  <TouchableOpacity
                                    key={item.val}
                                    style={[styles.mealTimingBtn, selected && styles.mealTimingBtnActive]}
                                    onPress={() => {
                                      const next = [...med.schedule];
                                      next[actualIndex] = { ...next[actualIndex], mealTiming: item.val };
                                      handleField("schedule", next);
                                    }}
                                  >
                                    <Text style={[styles.mealTimingText, selected && styles.mealTimingTextActive]}>
                                      {item.lbl}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>

                          <View style={{ width: 85 }}>
                            <Text style={styles.doseFieldLabel}>Số viên</Text>
                            <View style={styles.counterRow}>
                              <TouchableOpacity
                                style={styles.counterBtn}
                                onPress={() => {
                                  const next = [...med.schedule];
                                  next[actualIndex] = { ...next[actualIndex], pillCount: Math.max(0.5, Number(dose.pillCount || 1) - 0.5) };
                                  handleField("schedule", next);
                                }}
                              >
                                <Text style={styles.counterBtnText}>-</Text>
                              </TouchableOpacity>
                              <Text style={styles.counterValueText}>{dose.pillCount || 1}</Text>
                              <TouchableOpacity
                                style={styles.counterBtn}
                                onPress={() => {
                                  const next = [...med.schedule];
                                  next[actualIndex] = { ...next[actualIndex], pillCount: Number(dose.pillCount || 1) + 0.5 };
                                  handleField("schedule", next);
                                }}
                              >
                                <Text style={styles.counterBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity 
                style={[styles.addDoseBtn, { marginTop: 8, borderColor: "#3B82F6", backgroundColor: "#EFF6FF" }]} 
                onPress={() => handleField("schedule", [...med.schedule, { timeOfDay: "evening", customTime: "21:30", mealTiming: "post_meal", pillCount: 1 }])}
              >
                <Ionicons name="add-circle" size={16} color="#2563EB" />
                <Text style={[styles.addDoseText, { color: "#2563EB", fontWeight: "700" }]}>+ Thêm buổi dùng ngoài 3 buổi trên</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* Full Route Selector Modal */}
      <Modal visible={showRouteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.routeModalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn đường dùng thuốc</Text>
              <TouchableOpacity onPress={() => setShowRouteModal(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {ROUTE_OPTIONS.map(opt => (
                <TouchableOpacity 
                  key={opt} 
                  style={[styles.routeRow, med.route === opt && styles.routeRowSelected]}
                  onPress={() => {
                    handleField("route", opt);
                    setShowRouteModal(false);
                  }}
                >
                  <Text style={[styles.routeRowText, med.route === opt && styles.routeRowTextSelected]}>
                    {opt}
                  </Text>
                  {med.route === opt && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Custom Route Input */}
            <View style={styles.customRouteBox}>
              <Text style={styles.label}>Đường dùng khác:</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Gõ đường dùng tự do..."
                  value={customRouteInput}
                  onChangeText={setCustomRouteInput}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity 
                  style={styles.applyCustomRouteBtn}
                  onPress={() => {
                    if (customRouteInput.trim()) {
                      handleField("route", customRouteInput.trim());
                      setCustomRouteInput("");
                      setShowRouteModal(false);
                    }
                  }}
                >
                  <Text style={styles.applyCustomRouteText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}



export function PrescriptionFormModal({ visible, onClose, initialData, onSave, patients }) {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [topAlert, setTopAlert] = useState("");
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [searchPatient, setSearchPatient] = useState("");
  const [showDatePicker, setShowDatePicker] = useState({ show: false, field: "startDate" });
  const scrollViewRef = useRef(null);

  // Safe toast reference
  let toastContext = null;
  try {
    toastContext = useToast();
  } catch {
    toastContext = null;
  }

  useEffect(() => {
    if (visible) {
      if (initialData) setFormData(initialData);
      setTopAlert("");
      setErrors({});
    }
  }, [visible, initialData]);

  const validate = () => {
    const errs = {};
    if (!formData.patientId) {
      errs.patient = "Vui lòng chọn bệnh nhân.";
    }
    if (!formData.medications || formData.medications.length === 0) {
      errs.meds = "Cần ít nhất 1 loại thuốc trong đơn.";
    }
    if (!formData.daysOfWeek || formData.daysOfWeek.length === 0) {
      errs.days = "Vui lòng chọn ít nhất 1 ngày trong tuần.";
    }
    
    formData.medications.forEach((m, i) => {
      const name = (m.drugName || "").trim();
      const dosage = (m.dosage || "").trim();
      if (!name) {
        errs[`med_${i}_name`] = "Thiếu tên thuốc";
        if (!errs.meds) errs.meds = `Thuốc #${i+1} chưa có tên thuốc.`;
      }
      if (!dosage) {
        errs[`med_${i}_dosage`] = "Thiếu liều lượng";
        if (!errs.meds) errs.meds = `Thuốc #${i+1} chưa có liều lượng.`;
      }
      if (!m.schedule || m.schedule.length === 0) {
        if (!errs.meds) errs.meds = `Thuốc #${i+1} chưa chọn lịch dùng.`;
      }
    });

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstErrorMsg = Object.values(errs)[0];
      setTopAlert(firstErrorMsg);
      
      if (toastContext && toastContext.showToast) {
        toastContext.showToast(firstErrorMsg, "error");
      }

      // Scroll form to top so error is immediately visible above keyboard
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
      return false;
    }

    setTopAlert("");
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setTopAlert("");
    try {
      const res = await onSave(formData);
      setSaving(false);
      if (res && res.success === false) {
        const errMsg = res.error || "Không thể lưu đơn thuốc.";
        setTopAlert(errMsg);
        if (toastContext && toastContext.showToast) {
          toastContext.showToast(errMsg, "error");
        }
      }
    } catch (err) {
      setSaving(false);
      const errMsg = err?.message || "Đã xảy ra lỗi khi kết nối máy chủ.";
      setTopAlert(errMsg);
      if (toastContext && toastContext.showToast) {
        toastContext.showToast(errMsg, "error");
      }
    }
  };

  if (!visible) return null;

  const selectedPatientName = patients.find(p => 
    (p.user?._id || p.patientId || p.id) === formData.patientId
  )?.user?.name || patients.find(p => 
    (p.user?._id || p.patientId || p.id) === formData.patientId
  )?.patientName || "Chọn bệnh nhân...";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.flex} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {/* Header */}
          <View style={[
            styles.header, 
            { paddingTop: Platform.OS === "android" ? Math.max(insets.top, 16) : 14 }
          ]}>
            <TouchableOpacity onPress={onClose} style={styles.closeHeaderBtn}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>{formData.id ? "Sửa đơn thuốc" : "Kê đơn mới"}</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Floating Top Alert (Fix Toast UX so Keyboard never obscures errors) */}
          {topAlert ? (
            <View style={styles.topAlertBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.topAlertText}>{topAlert}</Text>
              <TouchableOpacity onPress={() => setTopAlert("")}>
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Form Content in ScrollView with generous bottom padding */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.body} 
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 120, 140) }} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Section title="1. Thông tin bệnh nhân *" error={errors.patient}>
              <TouchableOpacity style={styles.patientBox} onPress={() => setShowPatientPicker(true)}>
                <Ionicons name="person" size={20} color="#2563EB" />
                <Text style={styles.patientName}>{selectedPatientName}</Text>
                <Ionicons name="chevron-down" size={18} color="#2563EB" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
            </Section>

            <Section title="2. Thời gian điều trị *" error={errors.days}>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Ngày bắt đầu</Text>
                  <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker({ show: true, field: "startDate" })}>
                    <Ionicons name="calendar-outline" size={16} color="#2563EB" />
                    <Text style={styles.datePickerText}>{formData.startDate || "Chọn ngày"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Ngày kết thúc</Text>
                  <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker({ show: true, field: "endDate" })}>
                    <Ionicons name="calendar-outline" size={16} color="#2563EB" />
                    <Text style={styles.datePickerText}>{formData.endDate || "Không giới hạn"}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Ngày dùng trong tuần</Text>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {[{v:1, l:"T2"},{v:2, l:"T3"},{v:3, l:"T4"},{v:4, l:"T5"},{v:5, l:"T6"},{v:6, l:"T7"},{v:0, l:"CN"}].map(d => (
                  <Chip 
                    key={d.v} label={d.l} 
                    active={formData.daysOfWeek.includes(d.v)} 
                    onPress={() => {
                      const days = formData.daysOfWeek.includes(d.v) ? formData.daysOfWeek.filter(x => x !== d.v) : [...formData.daysOfWeek, d.v];
                      setFormData({...formData, daysOfWeek: days});
                    }}
                  />
                ))}
              </View>
            </Section>

            <Section title={`3. Danh sách thuốc trong đơn (${formData.medications.length})`} error={errors.meds}>
              {formData.medications.map((med, idx) => (
                <MedicationEditorCard 
                  key={idx} med={med} medIdx={idx} errors={errors}
                  onChange={(i, k, v) => {
                    setFormData(prev => {
                      const next = [...prev.medications];
                      next[i] = { ...next[i], [k]: v };
                      return { ...prev, medications: next };
                    });
                  }}
                  onRemove={(i) => setFormData(prev => ({...prev, medications: prev.medications.filter((_, index) => index !== i)}))}
                  canRemove={formData.medications.length > 1}
                />
              ))}
              <TouchableOpacity 
                style={styles.addMedBtn} 
                onPress={() => setFormData({
                  ...formData, 
                  medications: [
                    ...formData.medications, 
                    { drugName: "", dosage: "", route: "Đường uống", schedule: [
                      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
                      { timeOfDay: "noon", customTime: "12:00", mealTiming: "post_meal", pillCount: 1 },
                      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 }
                    ] }
                  ]
                })}
              >
                <Ionicons name="add-circle" size={20} color="#2563EB" />
                <Text style={styles.addMedText}>Thêm thuốc khác vào đơn</Text>
              </TouchableOpacity>
            </Section>
          </ScrollView>

          {/* Sticky Bottom Action Bar (Fix UI Overlap: Never obscured by keyboard or content) */}
          <View style={[
            styles.bottomActionBar, 
            { paddingBottom: Math.max(insets.bottom, 12) + 8 }
          ]}>
            <TouchableOpacity style={styles.bottomCancelBtn} onPress={onClose}>
              <Text style={styles.bottomCancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottomSaveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.bottomSaveText}>{formData.id ? "Lưu thay đổi" : "Kê đơn mới"}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Date Picker */}
        {showDatePicker.show && (
          <DateTimePicker
            value={formData[showDatePicker.field] ? new Date(formData[showDatePicker.field]) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker({ show: false, field: "" });
              if (selectedDate) {
                const dateStr = selectedDate.toISOString().slice(0, 10);
                setFormData({ ...formData, [showDatePicker.field]: dateStr });
              }
            }}
          />
        )}

        {/* Patient Selector Modal */}
        <Modal visible={showPatientPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.patientModalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn bệnh nhân</Text>
                <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                <TextInput 
                  style={styles.searchPatientInput} 
                  placeholder="Tìm tên bệnh nhân..." 
                  value={searchPatient} 
                  onChangeText={setSearchPatient} 
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <ScrollView style={{ maxHeight: 380 }}>
                {patients
                  .filter(p => (p.user?.name || p.patientName || "")?.toLowerCase().includes(searchPatient.toLowerCase()))
                  .map(p => {
                    const pid = p.user?._id || p.patientId || p.id;
                    const pname = p.user?.name || p.patientName || "Bệnh nhân #" + pid;
                    const selected = formData.patientId === pid;
                    return (
                      <TouchableOpacity 
                        key={pid} 
                        style={[styles.patientRow, selected && styles.patientRowSelected]} 
                        onPress={() => {
                          setFormData({ ...formData, patientId: pid });
                          setShowPatientPicker(false);
                        }}
                      >
                        <Ionicons name="person-circle" size={34} color={selected ? "#2563EB" : "#9CA3AF"} />
                        <Text style={[styles.patientRowName, selected && styles.patientRowNameSelected]}>{pname}</Text>
                        {selected && <Ionicons name="checkmark-circle" size={20} color="#2563EB" style={{ marginLeft: "auto" }} />}
                      </TouchableOpacity>
                    );
                  })
                }
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  flex: { flex: 1 },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: "#FFF", 
    borderBottomWidth: 1, 
    borderBottomColor: "#E5E7EB" 
  },
  closeHeaderBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  saveBtnHeader: { backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveTextHeader: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  body: { padding: 16 },
  section: { backgroundColor: "#FFF", padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 },
  errorText: { color: "#DC2626", fontSize: 12, marginTop: 4, fontWeight: "500" },
  fieldErrorText: { color: "#EF4444", fontSize: 11, marginTop: -8, marginBottom: 8, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", color: "#4B5563", marginBottom: 6 },
  input: { backgroundColor: "#F3F4F6", padding: 10, borderRadius: 8, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB", color: "#111827" },
  inputError: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  row: { flexDirection: "row" },
  chip: { height: 36, paddingHorizontal: 12, justifyContent: "center", alignItems: "center", borderRadius: 8, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  chipActive: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  chipText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },
  chipTextActive: { color: "#2563EB" },
  
  patientBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EFF6FF", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#BFDBFE" },
  patientName: { fontSize: 15, fontWeight: "600", color: "#1E40AF" },
  datePickerBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F3F4F6", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 },
  datePickerText: { fontSize: 14, color: "#111827" },

  routeSelectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  routeSelectText: { fontSize: 13, color: "#111827", fontWeight: "600" },
  quickRouteContainer: { marginBottom: 12 },
  quickRouteChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickRouteChipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  quickRouteText: { fontSize: 11, color: "#64748B", fontWeight: "500" },
  quickRouteTextActive: { color: "#1E40AF", fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  patientModalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  routeModalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  searchPatientInput: { backgroundColor: "#F3F4F6", padding: 10, borderRadius: 8, fontSize: 14, color: "#111827", marginBottom: 10 },
  patientRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 12 },
  patientRowSelected: { backgroundColor: "#EFF6FF" },
  patientRowName: { fontSize: 15, fontWeight: "500", color: "#111827" },
  patientRowNameSelected: { color: "#2563EB", fontWeight: "700" },

  routeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  routeRowSelected: { backgroundColor: "#EFF6FF" },
  routeRowText: { fontSize: 14, color: "#334155" },
  routeRowTextSelected: { color: "#2563EB", fontWeight: "700" },
  customRouteBox: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  applyCustomRouteBtn: { backgroundColor: "#2563EB", paddingHorizontal: 14, justifyContent: "center", borderRadius: 8 },
  applyCustomRouteText: { color: "#FFF", fontWeight: "700", fontSize: 13 },

  medCard: { backgroundColor: "#FAFAFA", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  medHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, alignItems: "center" },
  medTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  removeBtn: { padding: 4 },
  addMedBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderStyle: "dashed" },
  addMedText: { color: "#2563EB", fontWeight: "700" },
  
  doseFormCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  doseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 6,
  },
  doseCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  doseCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  removeDoseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  removeDoseText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "600",
  },
  doseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  todSegmentContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 1.5,
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    boxSizing: "border-box",
    alignItems: "stretch",
  },
  todSegmentBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  todSegmentBtnActive: {
    backgroundColor: "#2563EB",
  },
  todSegmentText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  todSegmentTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  timeInputContainer: {
    flex: 1,
  },
  doseFieldLabel: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 4,
    fontWeight: "600",
  },
  timeInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 0,
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    boxSizing: "border-box",
    fontSize: 14,
    color: "#1F2937",
    textAlign: "center",
    textAlignVertical: "center",
  },
  pillCounterContainer: {
    flex: 1,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    boxSizing: "border-box",
  },
  counterBtn: {
    width: 30,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#64748B",
  },
  counterValueText: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  mealTimingContainer: {
    flex: 1,
  },
  mealTimingRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 1.5,
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    boxSizing: "border-box",
    alignItems: "stretch",
  },
  mealTimingBtn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  mealTimingBtnActive: {
    backgroundColor: "#10B981",
  },
  mealTimingText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  mealTimingTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  addDoseBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 },
  addDoseText: { color: "#2563EB", fontSize: 13, fontWeight: "600" },

  suggestionsBox: { 
    position: "absolute", 
    top: 46, 
    left: 0, 
    right: 0, 
    backgroundColor: "#FFF", 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: "#CBD5E1", 
    maxHeight: 220, 
    zIndex: 1000, 
    elevation: 6, 
    shadowColor: "#000", 
    shadowOpacity: 0.15, 
    shadowRadius: 6 
  },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  suggestionName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  suggestionDosage: { fontSize: 13, fontWeight: "600", color: "#2563EB" },
  suggestionRoute: { fontSize: 11, color: "#64748B", marginTop: 2 },
  closeSuggestionsBtn: { padding: 10, backgroundColor: "#F8FAFC", alignItems: "center", borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  closeSuggestionsText: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  topAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderBottomWidth: 1,
    borderBottomColor: "#FCA5A5",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  topAlertText: {
    flex: 1,
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "700",
  },

  bottomActionBar: {
    flexDirection: "row",
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  bottomCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  bottomCancelText: { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  bottomSaveBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  bottomSaveText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});

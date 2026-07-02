import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, 
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { DRUG_SUGGESTIONS } from "../../../constants/drugSuggestions";

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

function MedicationEditorCard({ med, medIdx, onChange, onRemove, canRemove }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState(med.drugName);

  const handleField = (k, v) => onChange(medIdx, k, v);
  
  const handleSelectSuggestion = (drug) => {
    handleField("drugName", drug.name);
    handleField("dosage", drug.dosage);
    if (drug.route) handleField("route", drug.route);
    if (drug.schedule) handleField("schedule", [...drug.schedule]);
    setQuery(drug.name);
    setShowSuggestions(false);
  };

  const filteredDrugs = DRUG_SUGGESTIONS.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={[styles.medCard, { zIndex: 1000 - medIdx }]}>
      <View style={styles.medHeader}>
        <Text style={styles.medTitle}>Thuốc số {medIdx + 1}</Text>
        {canRemove && (
          <TouchableOpacity onPress={() => onRemove(medIdx)} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>Tên thuốc *</Text>
      <View style={{ zIndex: 999 }}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(v) => { setQuery(v); handleField("drugName", v); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Nhập tên thuốc..."
        />
        {showSuggestions && filteredDrugs.length > 0 && (
          <View style={styles.suggestionsBox}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
              {filteredDrugs.map(d => (
                <TouchableOpacity key={d.name} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(d)}>
                  <Text style={styles.suggestionName}>{d.name} <Text style={{ color: "#6B7280" }}>({d.dosage})</Text></Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Liều lượng *</Text>
          <TextInput style={styles.input} value={med.dosage} onChangeText={(v) => handleField("dosage", v)} placeholder="VD: 500mg" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Đường dùng</Text>
          <TextInput style={styles.input} value={med.route} onChangeText={(v) => handleField("route", v)} placeholder="Đường uống" />
        </View>
      </View>

      <Text style={styles.label}>Chỉ dẫn thêm</Text>
      <TextInput style={[styles.input, { height: 60, textAlignVertical: "top" }]} value={med.instructions} onChangeText={(v) => handleField("instructions", v)} placeholder="Ghi chú thêm..." multiline />

      <Text style={[styles.label, { marginTop: 12 }]}>Lịch uống</Text>
      {med.schedule.map((dose, doseIdx) => (
        <ScheduleEditorCard 
          key={doseIdx} dose={dose} 
          onChange={(k, v) => {
            const next = [...med.schedule];
            next[doseIdx] = { ...next[doseIdx], [k]: v };
            handleField("schedule", next);
          }}
          onRemove={() => {
            const next = med.schedule.filter((_, i) => i !== doseIdx);
            handleField("schedule", next);
          }}
          canRemove={med.schedule.length > 1}
        />
      ))}
      <TouchableOpacity 
        style={styles.addDoseBtn} 
        onPress={() => handleField("schedule", [...med.schedule, { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }])}
      >
        <Ionicons name="add" size={16} color="#2563EB" />
        <Text style={styles.addDoseText}>Thêm lịch uống</Text>
      </TouchableOpacity>
    </View>
  );
}

function ScheduleEditorCard({ dose, onChange, onRemove, canRemove }) {
  const TIMES = [{ id: "morning", label: "Sáng" }, { id: "noon", label: "Trưa" }, { id: "evening", label: "Tối" }];
  const MEALS = [{ id: "pre_meal", label: "Trước ăn" }, { id: "post_meal", label: "Sau ăn" }, { id: "", label: "Bất kỳ" }];

  return (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleRow}>
        <View style={{ flexDirection: "row", gap: 4, flex: 1 }}>
          {TIMES.map(t => (
            <Chip key={t.id} label={t.label} active={dose.timeOfDay === t.id} onPress={() => onChange("timeOfDay", t.id)} />
          ))}
        </View>
        {canRemove && (
          <TouchableOpacity onPress={onRemove}><Ionicons name="close-circle" size={20} color="#EF4444" /></TouchableOpacity>
        )}
      </View>
      <View style={styles.scheduleRow}>
        <TextInput 
          style={[styles.input, { flex: 1, marginBottom: 0, textAlign: "center" }]} 
          value={dose.customTime} onChangeText={(v) => onChange("customTime", v)} 
          placeholder="HH:mm" keyboardType="numbers-and-punctuation"
        />
        <View style={{ flexDirection: "row", gap: 4, flex: 2, marginLeft: 8 }}>
          {MEALS.map(m => (
            <Chip key={m.id} label={m.label} active={dose.mealTiming === m.id} onPress={() => onChange("mealTiming", m.id)} />
          ))}
        </View>
        <View style={styles.pillControl}>
          <TouchableOpacity onPress={() => onChange("pillCount", Math.max(0.5, (dose.pillCount || 1) - 0.5))}><Ionicons name="remove" size={16} color="#4B5563" /></TouchableOpacity>
          <Text style={styles.pillText}>{dose.pillCount || 1}v</Text>
          <TouchableOpacity onPress={() => onChange("pillCount", (dose.pillCount || 1) + 0.5)}><Ionicons name="add" size={16} color="#4B5563" /></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function PrescriptionFormModal({ visible, onClose, initialData, onSave, patients }) {
  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [searchPatient, setSearchPatient] = useState("");
  const [showDatePicker, setShowDatePicker] = useState({ show: false, field: "startDate" });

  useEffect(() => {
    if (visible && initialData) setFormData(initialData);
  }, [visible, initialData]);

  const validate = () => {
    const errs = {};
    if (!formData.patientId) errs.patient = "Vui lòng chọn bệnh nhân.";
    if (formData.medications.length === 0) errs.meds = "Cần ít nhất 1 loại thuốc.";
    if (formData.daysOfWeek.length === 0) errs.days = "Chọn ít nhất 1 ngày uống.";
    
    formData.medications.forEach((m, i) => {
      if (!m.drugName) errs.meds = `Thuốc #${i+1} thiếu tên.`;
      if (!m.dosage) errs.meds = `Thuốc #${i+1} thiếu liều lượng.`;
      if (m.schedule.length === 0) errs.meds = `Thuốc #${i+1} chưa có lịch uống.`;
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#111827" /></TouchableOpacity>
            <Text style={styles.title}>{formData.id ? "Sửa đơn thuốc" : "Kê đơn mới"}</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Lưu</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            
            <Section title="1. Thông tin bệnh nhân" error={errors.patient}>
              <TouchableOpacity style={styles.patientBox} onPress={() => setShowPatientPicker(true)}>
                <Ionicons name="person" size={20} color="#2563EB" />
                <Text style={styles.patientName}>
                  {patients.find(p => p.user?._id === formData.patientId)?.user?.name || "Chọn bệnh nhân..."}
                </Text>
              </TouchableOpacity>
            </Section>

            <Section title="2. Thời gian điều trị" error={errors.days}>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Bắt đầu</Text>
                  <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker({ show: true, field: "startDate" })}>
                    <Text style={styles.datePickerText}>{formData.startDate || "Chọn ngày"}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Kết thúc</Text>
                  <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker({ show: true, field: "endDate" })}>
                    <Text style={styles.datePickerText}>{formData.endDate || "Không giới hạn"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.label}>Ngày uống trong tuần</Text>
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

            <Section title={`3. Thuốc trong đơn (${formData.medications.length})`} error={errors.meds}>
              {formData.medications.map((med, idx) => (
                <MedicationEditorCard 
                  key={idx} med={med} medIdx={idx} 
                  onChange={(i, k, v) => {
                    const next = [...formData.medications];
                    next[i] = { ...next[i], [k]: v };
                    setFormData({...formData, medications: next});
                  }}
                  onRemove={(i) => setFormData({...formData, medications: formData.medications.filter((_, index) => index !== i)})}
                  canRemove={formData.medications.length > 1}
                />
              ))}
              <TouchableOpacity 
                style={styles.addMedBtn} 
                onPress={() => setFormData({...formData, medications: [...formData.medications, { drugName: "", dosage: "", schedule: [{ timeOfDay: "morning", customTime: "08:00", pillCount: 1 }] }]})}
              >
                <Ionicons name="add-circle" size={20} color="#2563EB" />
                <Text style={styles.addMedText}>Thêm thuốc khác</Text>
              </TouchableOpacity>
            </Section>

          </ScrollView>
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

        {/* Patient Picker Modal */}
        <Modal visible={showPatientPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.patientModalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn bệnh nhân</Text>
                <TouchableOpacity onPress={() => setShowPatientPicker(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
              </View>
              <TextInput 
                style={styles.searchPatientInput} 
                placeholder="Tìm tên bệnh nhân..." 
                value={searchPatient} 
                onChangeText={setSearchPatient} 
              />
              <ScrollView style={{ maxHeight: 400 }}>
                {patients.filter(p => p.user?.name?.toLowerCase().includes(searchPatient.toLowerCase())).map(p => (
                  <TouchableOpacity 
                    key={p.user?._id} 
                    style={styles.patientRow} 
                    onPress={() => {
                      setFormData({ ...formData, patientId: p.user?._id });
                      setShowPatientPicker(false);
                    }}
                  >
                    <Ionicons name="person-circle" size={32} color="#9CA3AF" />
                    <Text style={styles.patientRowName}>{p.user?.name}</Text>
                  </TouchableOpacity>
                ))}
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  title: { fontSize: 16, fontWeight: "700" },
  saveBtn: { backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  saveText: { color: "#FFF", fontWeight: "700" },
  body: { padding: 16 },
  section: { backgroundColor: "#FFF", padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 },
  errorText: { color: "#DC2626", fontSize: 12, marginTop: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#4B5563", marginBottom: 6 },
  input: { backgroundColor: "#F3F4F6", padding: 10, borderRadius: 8, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  row: { flexDirection: "row" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  chipActive: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  chipText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },
  chipTextActive: { color: "#2563EB" },
  
  patientBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#EFF6FF", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#BFDBFE" },
  patientName: { fontSize: 15, fontWeight: "600", color: "#1E40AF" },
  datePickerBtn: { backgroundColor: "#F3F4F6", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 12 },
  datePickerText: { fontSize: 14, color: "#111827" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  patientModalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 20 },
  searchPatientInput: { margin: 16, backgroundColor: "#F3F4F6", padding: 10, borderRadius: 8, fontSize: 14 },
  patientRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 12 },
  patientRowName: { fontSize: 15, fontWeight: "500", color: "#111827" },

  medCard: { backgroundColor: "#FAFAFA", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  medHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  medTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  removeBtn: { padding: 2 },
  addMedBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderStyle: "dashed" },
  addMedText: { color: "#2563EB", fontWeight: "700" },
  
  scheduleCard: { backgroundColor: "#FFF", borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  scheduleRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  pillControl: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F4F6", borderRadius: 6, paddingHorizontal: 4 },
  pillText: { marginHorizontal: 8, fontWeight: "700", fontSize: 13 },
  addDoseBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 },
  addDoseText: { color: "#2563EB", fontSize: 13, fontWeight: "600" },

  suggestionsBox: { position: "absolute", top: 45, left: 0, right: 0, backgroundColor: "#FFF", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", maxHeight: 150, zIndex: 100, elevation: 5, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  suggestionName: { fontSize: 14, fontWeight: "600", color: "#111827" },
});

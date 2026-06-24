import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";

import MeasurementDraftForm from "../../components/MeasurementDraftForm";
import { useAuth } from "../../hooks/useAuth";
import { useSnackbar } from "../../hooks/useSnackbar";
import { createMeasurement } from "../../api/measurementApi";
import {
  buildMeasurementPayload,
  createSavedMeasurementState,
  getMeasurementSectionLabel,
  getMeasurementValidationError,
  hasMeasurementSectionValue,
  hasMeasurementValue,
  hasAtLeastOneSavedSection,
  MEASUREMENT_SECTIONS,
} from "../../utils/measurementForm";

export default function InputMeasurementPatientScreen({ isEmbedded }) {
  const { user } = useAuth() || {};
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const { showSuccess, showError, showWarning, showInfo } = useSnackbar();
  const currentPatientUser = user || { _id: "u_patient_self_1", id: "p1", name: "Thong tin mau" };
  const [type, setType] = useState("bp");
  const [mealTiming, setMealTiming] = useState("pre_meal");
  const [device, setDevice] = useState("");
  const [note, setNote] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [glucose, setGlucose] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [savedSections, setSavedSections] = useState(createSavedMeasurementState);
  const [submitting, setSubmitting] = useState(false);
  const measurementValues = {
    systolic,
    diastolic,
    glucose,
    spo2,
    temperature,
    heartRate,
    respiratoryRate,
    height,
    weight,
    mealTiming,
    device,
    note,
  };

  const markEditing = (sectionKey) => {
    setSavedSections((prev) => {
      const next = { ...prev };
      let changed = false;
      if (prev[sectionKey]) {
        next[sectionKey] = false;
        changed = true;
      }
      if (
        sectionKey === "heartRate" &&
        (hasMeasurementValue(systolic) || hasMeasurementValue(diastolic)) &&
        prev.bp
      ) {
        next.bp = false;
        changed = true;
      }
      return changed ? next : prev;
    });
  };

  const handleMeasurementFieldChange = (field, value, sectionKey) => {
    if (field === "systolic") setSystolic(value);
    if (field === "diastolic") setDiastolic(value);
    if (field === "glucose") setGlucose(value);
    if (field === "spo2") setSpo2(value);
    if (field === "temperature") setTemperature(value);
    if (field === "heartRate") setHeartRate(value);
    if (field === "respiratoryRate") setRespiratoryRate(value);
    if (field === "height") setHeight(value);
    if (field === "weight") setWeight(value);
    if (field === "device") setDevice(value);
    if (field === "note") setNote(value);

    if (sectionKey) {
      markEditing(sectionKey);
    }
  };

  const ensurePatient = () => {
    if (!currentPatientUser || (!currentPatientUser._id && !currentPatientUser.id)) {
      showError("Không xác định được tài khoản bệnh nhân");
      return false;
    }
    return true;
  };

  const validateSection = (sectionKey) => {
    if (!ensurePatient()) return false;
    const validationError = getMeasurementValidationError(sectionKey, measurementValues);
    if (validationError) {
      showWarning(`${validationError.title}: ${validationError.message}`);
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setType("bp");
    setMealTiming("pre_meal");
    setDevice("");
    setNote("");
    setSystolic("");
    setDiastolic("");
    setGlucose("");
    setSpo2("");
    setTemperature("");
    setHeartRate("");
    setRespiratoryRate("");
    setHeight("");
    setWeight("");
    setSavedSections(createSavedMeasurementState());
  };

  const handleMealTimingChange = (nextTiming) => {
    setMealTiming(nextTiming);
    markEditing("glucose");
  };

  const saveCurrentSection = () => {
    if (!validateSection(type)) return;
    setSavedSections((prev) => ({ ...prev, [type]: true }));
    const label = getMeasurementSectionLabel(type);
    showInfo(`${label} đã được lưu trên màn hình. Bạn có thể nhập tiếp phần khác rồi gửi một lần.`);
  };

  const submitMeasurement = async () => {
    if (!ensurePatient()) return;

    // Logic mới: chỉ cần ít nhất 1 nhóm đã được lưu
    if (!hasAtLeastOneSavedSection(savedSections)) {
      showWarning("Bạn cần nhập và lưu ít nhất một nhóm chỉ số trước khi gửi.");
      return;
    }

    // Kiểm tra nếu đang nhập dở một nhóm mà chưa bấm lưu
    const unsavedKeys = MEASUREMENT_SECTIONS.filter(
      (item) => hasMeasurementSectionValue(item.key, measurementValues) && !savedSections[item.key]
    );
    if (unsavedKeys.length > 0) {
      showWarning(`Bạn còn ${unsavedKeys.length} phần đang nhập nhưng chưa bấm "Lưu thông tin".`);
      return;
    }

    // Validate các nhóm đã lưu
    const savedKeys = MEASUREMENT_SECTIONS.filter((item) => savedSections[item.key]).map((item) => item.key);
    for (const key of savedKeys) {
      if (!validateSection(key)) return;
    }

    const patientId = currentPatientUser.id || currentPatientUser._id;
    const payload = buildMeasurementPayload({
      patientId,
      values: measurementValues,
      emptyNumberValue: null,
    });
    try {
      setSubmitting(true);
      const response = await createMeasurement(payload);
      if (response.ok) {
        showSuccess("Đã gửi bản đo lên hệ thống");
        resetForm();
        return;
      }
      const errorMessage = response.body?.error || response.error || "Gửi dữ liệu lỗi, vui lòng thử lại.";
      showError(errorMessage);
    } catch (error) {
      showError("Không thể kết nối đến máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const Container = isEmbedded ? View : SafeAreaView;

  return (
    <Container style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
          {canGoBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#2563EB" />
              <Text style={styles.backButtonText}>Quay lại</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Tự nhập chỉ số sức khỏe</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.patientBar}>
            <View style={styles.patientLeft}>
              <View style={styles.patientAvatarSmall}><Ionicons name="person-circle-outline" size={20} color="#FFFFFF" /></View>
              <View>
                <Text style={styles.patientLabel}>Bệnh nhân</Text>
                <Text style={styles.patientNameBar}>{currentPatientUser.name}</Text>
              </View>
            </View>
            <View style={styles.patientTag}>
              <View style={styles.patientDot} />
              <Text style={styles.patientTagText}>Tự nhập liệu</Text>
            </View>
          </View>
          <MeasurementDraftForm
            type={type}
            mealTiming={mealTiming}
            values={measurementValues}
            savedSections={savedSections}
            submitting={submitting}
            onSelectType={setType}
            onFieldChange={handleMeasurementFieldChange}
            onMealTimingChange={handleMealTimingChange}
            onSaveSection={saveCurrentSection}
            onSubmit={submitMeasurement}
          />
          <View style={{ height: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  contentContainer: { paddingBottom: 32 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, alignSelf: "flex-start", paddingVertical: 4 },
  backButtonText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 },
  patientBar: { backgroundColor: "#EEF2FF", borderRadius: 16, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  patientLeft: { flexDirection: "row", alignItems: "center" },
  patientAvatarSmall: { width: 32, height: 32, borderRadius: 999, backgroundColor: "#4F46E5", alignItems: "center", justifyContent: "center", marginRight: 10 },
  patientLabel: { fontSize: 11, color: "#6B7280" },
  patientNameBar: { fontSize: 13, fontWeight: "600", color: "#111827" },
  patientTag: { flexDirection: "row", alignItems: "center", backgroundColor: "#DBEAFE", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  patientDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: "#2563EB", marginRight: 6 },
  patientTagText: { fontSize: 11, color: "#1D4ED8", fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: 4, marginBottom: 8, color: "#111827" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  helperText: { fontSize: 12, lineHeight: 18, color: "#6B7280", marginBottom: 12 },
  typeGridRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  typeTile: { width: "32%", minHeight: 96, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", paddingVertical: 10, paddingHorizontal: 8 },
  typeTileActive: { backgroundColor: "#EFF6FF", borderColor: "#2563EB", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  typeTileTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  typeTileIconWrapper: { width: 26, height: 26, borderRadius: 999, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  tileSavedBadge: { borderRadius: 999, backgroundColor: "#DCFCE7", paddingHorizontal: 6, paddingVertical: 2 },
  tileSavedBadgeText: { fontSize: 10, fontWeight: "700", color: "#15803D" },
  tileDraftBadge: { borderRadius: 999, backgroundColor: "#FEF3C7", paddingHorizontal: 6, paddingVertical: 2 },
  tileDraftBadgeText: { fontSize: 10, fontWeight: "700", color: "#B45309" },
  typeTileLabel: { fontSize: 12, fontWeight: "600", color: "#111827" },
  typeTileLabelActive: { color: "#2563EB" },
  typeTileDesc: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  fieldGroupTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 },
  fieldLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  fieldHint: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  fieldColumn: { flex: 1 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: "#111827", backgroundColor: "#F9FAFB" },
  textArea: { minHeight: 72, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  chipChoice: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  chipChoiceActive: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  chipChoiceText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  chipChoiceTextActive: { color: "#2563EB", fontWeight: "600" },
  secondaryBtn: { marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  secondaryBtnText: { color: "#2563EB", fontWeight: "700", fontSize: 14 },
  progressTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  progressSub: { marginTop: 6, fontSize: 12, lineHeight: 18, color: "#6B7280" },
  savedChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  savedChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  savedChipActive: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  savedChipInactive: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" },
  savedChipText: { fontSize: 12, fontWeight: "600" },
  savedChipTextActive: { color: "#15803D" },
  savedChipTextInactive: { color: "#6B7280" },
  progressFootnote: { marginTop: 12, fontSize: 12, color: "#374151" },
  progressWarning: { marginTop: 10, fontSize: 12, color: "#B45309", fontWeight: "600" },
  saveBtn: { backgroundColor: "#2563EB", paddingVertical: 12, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", marginTop: 4, marginBottom: 8 },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});

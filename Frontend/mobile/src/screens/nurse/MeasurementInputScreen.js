import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";

import MeasurementDraftForm from "../../components/MeasurementDraftForm";
import { useAuth } from "../../hooks/useAuth";
import { useSnackbar } from "../../hooks/useSnackbar";
import { createMeasurement } from "../../api/measurementApi";
import { getMyAssignments } from "../../api/assignmentApi";
import { getPatientById } from "../../api/patientApi";
import {
  buildMeasurementPayload,
  createSavedMeasurementState,
  getMeasurementSectionLabel,
  getMeasurementValidationError,
  hasMeasurementSectionValue,
  hasMeasurementValue,
  MEASUREMENT_SECTIONS,
} from "../../utils/measurementForm";

function getErrorMessage(response) {
  if (!response) return "Không thể kết nối tới máy chủ.";
  if (typeof response.error === "string" && response.error) return response.error;
  if (typeof response.body === "string" && response.body) return response.body;
  if (response.body?.error) return response.body.error;
  return "Đã xảy ra lỗi không xác định.";
}

function normalizeAssignmentPatient(item = {}) {
  return {
    assignmentId: item.id || "",
    patientId: item.patientId || "",
    patientCode: item.patientPublicId || item.patientCode || "",
    name: item.patientName || "Chưa rõ bệnh nhân",
  };
}

function normalizePatientProfile(profile = {}, fallback = {}) {
  return {
    patientId: profile.id || fallback.patientId || "",
    patientCode: profile.userPublicId || profile.patientCode || fallback.patientCode || "",
    name: profile.name || fallback.name || "Chưa rõ bệnh nhân",
    insuranceNumber: profile.insuranceNumber || "",
    cccd: profile.cccd || "",
    emergencyContactName: profile.emergencyContactName || "",
    emergencyContactPhone: profile.emergencyContactPhone || "",
  };
}

function getPatientInitials(name) {
  return (
    String(name || "")
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "BN"
  );
}

function getPatientSuccessLabel(patient = {}) {
  const name = String(patient.name || "").trim();
  const patientCode = String(patient.patientCode || "").trim();

  if (name && patientCode) {
    return `${name} (${patientCode})`;
  }

  return name || patientCode || "bệnh nhân đã chọn";
}

export default function MeasurementInputScreen() {
  const { user } = useAuth() || {};
  const { showSuccess, showError, showWarning, showInfo } = useSnackbar();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientSearchCode, setPatientSearchCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [type, setType] = useState("bp");
  const [timing, setTiming] = useState("pre");
  const [device, setDevice] = useState("");
  const [note, setNote] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [glucose, setGlucose] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [savedSections, setSavedSections] = useState(createSavedMeasurementState);
  const [submitting, setSubmitting] = useState(false);

  const currentNurseUser = user || { id: "", _id: "", name: "Điều dưỡng" };
  const measurementValues = {
    systolic,
    diastolic,
    glucose,
    spo2,
    temperature,
    heartRate,
    respiratoryRate,
    timing,
    device,
    note,
  };

  const resetMeasurementDraft = () => {
    setType("bp");
    setTiming("pre");
    setDevice("");
    setNote("");
    setSystolic("");
    setDiastolic("");
    setGlucose("");
    setSpo2("");
    setTemperature("");
    setHeartRate("");
    setRespiratoryRate("");
    setSavedSections(createSavedMeasurementState());
  };

  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    setAssignmentsError("");
    try {
      const response = await getMyAssignments();
      if (!response.ok) throw new Error(getErrorMessage(response));
      const nextAssignments = Array.isArray(response.body?.data)
        ? response.body.data.map(normalizeAssignmentPatient)
        : [];
      setAssignedPatients(nextAssignments);
      return nextAssignments;
    } catch (error) {
      setAssignedPatients([]);
      setAssignmentsError(error.message || "Không tải được danh sách bệnh nhân được phân công.");
      return [];
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, [loadAssignments])
  );

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
    if (field === "device") setDevice(value);
    if (field === "note") setNote(value);

    if (sectionKey) {
      markEditing(sectionKey);
    }
  };

  const ensureSelectedPatient = () => {
    if (!selectedPatient?.patientId) {
      showWarning("Hãy quét QR hoặc nhập mã hồ sơ để chọn bệnh nhân trước");
      return false;
    }
    return true;
  };

  const validateSection = (sectionKey) => {
    if (!ensureSelectedPatient()) return false;
    const validationError = getMeasurementValidationError(sectionKey, measurementValues);
    if (validationError) {
      showWarning(`${validationError.title}: ${validationError.message}`);
      return false;
    }
    return true;
  };

  const resolvePatientSelection = async (assignment) => {
    const fallbackPatient = normalizeAssignmentPatient(assignment);
    setLookupLoading(true);
    setLookupError("");
    try {
      const response = await getPatientById(fallbackPatient.patientId);
      if (!response.ok) throw new Error(getErrorMessage(response));
      const profile = normalizePatientProfile(response.body?.data || {}, fallbackPatient);
      setSelectedPatient(profile);
      setPatientSearchCode(profile.patientCode || fallbackPatient.patientCode);
      resetMeasurementDraft();
      return profile;
    } catch (error) {
      const partialPatient = normalizePatientProfile({}, fallbackPatient);
      setSelectedPatient(partialPatient);
      setPatientSearchCode(partialPatient.patientCode);
      setLookupError(error.message || "Không tải được hồ sơ chi tiết của bệnh nhân.");
      resetMeasurementDraft();
      showInfo("Đã nhận diện được bệnh nhân theo mã hồ sơ nhưng chưa tải đủ hồ sơ chi tiết");
      return partialPatient;
    } finally {
      setLookupLoading(false);
      setScannerVisible(false);
    }
  };

  const lookupPatientByCode = async (rawCode) => {
    const normalizedCode = String(rawCode || "").trim();
    if (!normalizedCode) {
      showWarning("Hãy nhập hoặc quét mã hồ sơ bệnh nhân");
      return;
    }
    const sourcePatients = assignedPatients.length > 0 ? assignedPatients : await loadAssignments();
    const matchedPatient = sourcePatients.find(
      (item) => item.patientCode.toLowerCase() === normalizedCode.toLowerCase()
    );
    if (!matchedPatient) {
      setScannerVisible(false);
      setLookupError("Không tìm thấy bệnh nhân phù hợp trong danh sách được phân công.");
      showError("Mã hồ sơ không thuộc danh sách bệnh nhân đang được phân công cho điều dưỡng này");
      return;
    }
    setPatientSearchCode(matchedPatient.patientCode);
    await resolvePatientSelection(matchedPatient);
  };

  const openScanner = async () => {
    if (Platform.OS === "web") {
      showWarning("Quét QR chỉ khả dụng trên thiết bị có camera");
      return;
    }
    let granted = cameraPermission?.granted;
    if (!granted) {
      const permission = await requestCameraPermission();
      granted = permission.granted;
    }
    if (!granted) {
      showError("Vui lòng cho phép ứng dụng sử dụng camera để quét QR");
      return;
    }
    setScannerLocked(false);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async ({ data }) => {
    if (scannerLocked || lookupLoading) return;
    setScannerLocked(true);
    await lookupPatientByCode(data);
  };

  const handleManualLookup = async () => {
    await lookupPatientByCode(patientSearchCode);
  };

  const selectSuggestedPatient = async (item) => {
    await resolvePatientSelection(item);
  };

  const handleTimingChange = (nextTiming) => {
    setTiming(nextTiming);
    markEditing("glucose");
  };

  const saveCurrentSection = () => {
    if (!validateSection(type)) return;
    setSavedSections((prev) => ({ ...prev, [type]: true }));
    const label = getMeasurementSectionLabel(type);
    showInfo(`${label} đã được lưu. Bạn có thể nhập tiếp nhóm chỉ số khác.`);
  };

  const submitMeasurement = async () => {
    if (!ensureSelectedPatient()) return;
    const missingSections = MEASUREMENT_SECTIONS.filter((item) => !savedSections[item.key]);
    if (missingSections.length > 0) {
      showWarning(`Bạn cần nhập và lưu đủ tất cả chỉ số trước khi gửi. Còn thiếu: ${missingSections.map((item) => item.label).join(", ")}.`);
      return;
    }
    const unsavedSections = MEASUREMENT_SECTIONS.filter(
      (item) => hasMeasurementSectionValue(item.key, measurementValues) && !savedSections[item.key]
    );
    if (unsavedSections.length > 0) {
      showWarning(`Bạn còn ${unsavedSections.length} nhóm chỉ số đang nhập nhưng chưa bấm "Lưu thông tin".`);
      return;
    }
    for (const section of MEASUREMENT_SECTIONS) {
      if (!validateSection(section.key)) return;
    }
    const payload = buildMeasurementPayload({
      patientId: selectedPatient.patientId,
      values: measurementValues,
      emptyNumberValue: 0,
    });
    try {
      setSubmitting(true);
      const response = await createMeasurement(payload);
      if (!response.ok) throw new Error(getErrorMessage(response));
      showSuccess(`Đã gửi bản đo lên hệ thống cho ${getPatientSuccessLabel(selectedPatient)}`);
      resetMeasurementDraft();
    } catch (error) {
      showError(error.message || "Gửi dữ liệu thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderPatientCard = () => {
    if (lookupLoading) {
      return (
        <View style={styles.patientEmptyCard}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.patientEmptyText}>Đang tải thông tin bệnh nhân...</Text>
          <Text style={styles.patientEmptySub}>Hệ thống đang lấy dữ liệu hồ sơ thật từ máy chủ.</Text>
        </View>
      );
    }
    if (!selectedPatient) {
      return (
        <View style={styles.patientEmptyCard}>
          <Ionicons name="qr-code-outline" size={26} color="#9CA3AF" style={styles.emptyIcon} />
          <Text style={styles.patientEmptyText}>Chưa có bệnh nhân được chọn</Text>
          <Text style={styles.patientEmptySub}>Quét mã QR hoặc nhập mã hồ sơ để tải thông tin bệnh nhân trước khi nhập liệu.</Text>
        </View>
      );
    }
    return (
      <View style={styles.patientCard}>
        <View style={styles.patientRow}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientAvatarText}>{getPatientInitials(selectedPatient.name)}</Text>
          </View>
          <View style={styles.patientContent}>
            <View style={styles.patientNameRow}>
              <Text style={styles.patientName}>{selectedPatient.name}</Text>
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>Đã chọn</Text>
              </View>
            </View>
            <Text style={styles.patientMeta}>Mã hồ sơ: {selectedPatient.patientCode || "Chưa có mã"}</Text>
            <Text style={styles.patientMeta}>BHYT: {selectedPatient.insuranceNumber || "Chưa cập nhật"}</Text>
            <Text style={styles.patientMetaSm}>CCCD: {selectedPatient.cccd || "Chưa cập nhật"} • ID: {selectedPatient.patientId}</Text>
          </View>
        </View>
        <View style={styles.patientInfoRow}>
          <View style={styles.patientInfoIconWrap}>
            <Ionicons name="call-outline" size={14} color="#6B7280" />
          </View>
          <Text style={styles.patientMetaSm}>
            Liên hệ khẩn cấp: {selectedPatient.emergencyContactName || "Chưa cập nhật"} · {selectedPatient.emergencyContactPhone || "Chưa cập nhật"}
          </Text>
        </View>
      </View>
    );
  };

  const normalizedSearch = patientSearchCode.trim().toLowerCase();
  const suggestedPatients = assignedPatients
    .filter((item) => !normalizedSearch || item.patientCode.toLowerCase().includes(normalizedSearch) || item.name.toLowerCase().includes(normalizedSearch))
    .slice(0, normalizedSearch ? 5 : 3);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal visible={scannerVisible} transparent animationType="slide" onRequestClose={() => setScannerVisible(false)}>
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerCard}>
            <View style={styles.scannerHeader}>
              <View style={styles.scannerHeaderContent}>
                <Text style={styles.scannerTitle}>Quét mã QR bệnh nhân</Text>
                <Text style={styles.scannerSubtitle}>Đưa camera vào mã QR trên hồ sơ hoặc vòng tay bệnh nhân.</Text>
              </View>
              <TouchableOpacity style={styles.scannerCloseButton} onPress={() => setScannerVisible(false)}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.cameraFrame}>
              <CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={handleBarcodeScanned} />
            </View>
            <Text style={styles.scannerFootnote}>
              {scannerLocked ? "Đã nhận mã, đang đối chiếu với dữ liệu bệnh nhân..." : "Chỉ quét bệnh nhân nằm trong danh sách được phân công."}
            </Text>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Nhập bản đo sinh hiệu</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.nurseBar}>
            <View style={styles.nurseLeft}>
              <View style={styles.nurseAvatar}>
                <FontAwesome5 name="user-nurse" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.nurseLabel}>Điều dưỡng</Text>
                <Text style={styles.nurseName}>{currentNurseUser.name || "Điều dưỡng"}</Text>
              </View>
            </View>
            <View style={styles.nurseTag}>
              <View style={styles.nurseDot} />
              <Text style={styles.nurseTagText}>Nhập liệu thật</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Thông tin bệnh nhân</Text>
          <View style={styles.card}>
            <View style={styles.lookupHero}>
              <View style={styles.lookupHeroLeft}>
                <View style={styles.lookupHeroIcon}>
                  <Ionicons name="qr-code-outline" size={20} color="#2563EB" />
                </View>
                <View style={styles.lookupHeroText}>
                  <Text style={styles.lookupHeroTitle}>Chọn bệnh nhân bằng QR hoặc mã hồ sơ</Text>
                  <Text style={styles.lookupHeroSub}>Quét trực tiếp mã QR hoặc nhập tay mã hồ sơ nếu không tiện dùng camera.</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.qrButton} onPress={openScanner}>
                <Ionicons name="scan-outline" size={16} color="#FFFFFF" style={styles.qrButtonIcon} />
                <Text style={styles.qrButtonText}>Quét QR</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchInputWrap}>
                <Ionicons name="search-outline" size={18} color="#6B7280" style={styles.searchIcon} />
                <TextInput style={styles.searchInput} value={patientSearchCode} onChangeText={setPatientSearchCode} placeholder="Nhập mã hồ sơ, ví dụ PAT-001" autoCapitalize="characters" autoCorrect={false} returnKeyType="search" onSubmitEditing={handleManualLookup} />
              </View>
              <TouchableOpacity style={[styles.searchButton, lookupLoading && styles.buttonDisabled]} onPress={handleManualLookup} disabled={lookupLoading}>
                {lookupLoading ? <ActivityIndicator size="small" color="#2563EB" /> : <Text style={styles.searchButtonText}>Tìm mã</Text>}
              </TouchableOpacity>
            </View>

            {assignmentsError ? (
              <View style={styles.inlineErrorCard}>
                <Ionicons name="warning-outline" size={16} color="#B91C1C" />
                <Text style={styles.inlineErrorText}>{assignmentsError}</Text>
              </View>
            ) : null}

            {lookupError ? (
              <View style={styles.inlineWarningCard}>
                <Ionicons name="information-circle-outline" size={16} color="#B45309" />
                <Text style={styles.inlineWarningText}>{lookupError}</Text>
              </View>
            ) : null}

            <View style={styles.quickListHeader}>
              <Text style={styles.quickListTitle}>Bệnh nhân được phân công</Text>
              <Text style={styles.quickListCount}>{assignmentsLoading ? "Đang tải..." : `${assignedPatients.length} bệnh nhân`}</Text>
            </View>

            {assignmentsLoading ? (
              <View style={styles.assignmentLoadingRow}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.assignmentLoadingText}>Đang tải danh sách phân công...</Text>
              </View>
            ) : suggestedPatients.length > 0 ? (
              <View style={styles.assignmentChipWrap}>
                {suggestedPatients.map((item) => (
                  <TouchableOpacity key={item.assignmentId || item.patientId} style={[styles.assignmentChip, selectedPatient?.patientId === item.patientId && styles.assignmentChipActive]} onPress={() => selectSuggestedPatient(item)}>
                    <Text style={[styles.assignmentChipCode, selectedPatient?.patientId === item.patientId && styles.assignmentChipCodeActive]}>{item.patientCode || "Chưa có mã"}</Text>
                    <Text style={[styles.assignmentChipName, selectedPatient?.patientId === item.patientId && styles.assignmentChipNameActive]} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.assignmentEmptyText}>Không có bệnh nhân phù hợp với mã hoặc tên bạn đang tìm.</Text>
            )}

            <View style={styles.patientCardWrap}>{renderPatientCard()}</View>
          </View>

          <MeasurementDraftForm
            type={type}
            timing={timing}
            values={measurementValues}
            savedSections={savedSections}
            submitting={submitting}
            onSelectType={setType}
            onFieldChange={handleMeasurementFieldChange}
            onTimingChange={handleTimingChange}
            onSaveSection={saveCurrentSection}
            onSubmit={submitMeasurement}
          />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F6FF" },
  screen: { flex: 1 },
  container: { padding: 20 },
  contentContainer: { paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#111827" },
  headerSpacer: { width: 40 },
  nurseBar: { backgroundColor: "#EFF6FF", borderRadius: 16, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  nurseLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  nurseAvatar: { width: 32, height: 32, borderRadius: 999, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", marginRight: 10 },
  nurseLabel: { fontSize: 11, color: "#6B7280" },
  nurseName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  nurseTag: { flexDirection: "row", alignItems: "center", backgroundColor: "#DCFCE7", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 12 },
  nurseDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: "#22C55E", marginRight: 6 },
  nurseTagText: { fontSize: 11, color: "#15803D", fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: 4, marginBottom: 8, color: "#111827" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 14, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  lookupHero: { borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", padding: 12 },
  lookupHeroLeft: { flexDirection: "row", alignItems: "flex-start" },
  lookupHeroIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", marginRight: 10 },
  lookupHeroText: { flex: 1 },
  lookupHeroTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  lookupHeroSub: { marginTop: 4, fontSize: 12, lineHeight: 18, color: "#6B7280" },
  qrButton: { marginTop: 12, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 },
  qrButtonIcon: { marginRight: 6 },
  qrButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  searchRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  searchInputWrap: { flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, backgroundColor: "#FFFFFF", paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: "#111827", paddingVertical: 10 },
  searchButton: { minWidth: 82, marginLeft: 10, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", paddingHorizontal: 12 },
  searchButtonText: { color: "#2563EB", fontSize: 13, fontWeight: "700" },
  buttonDisabled: { opacity: 0.7 },
  inlineErrorCard: { marginTop: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 12, padding: 10 },
  inlineErrorText: { flex: 1, marginLeft: 8, color: "#B91C1C", fontSize: 12, lineHeight: 18 },
  inlineWarningCard: { marginTop: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFBEB", borderRadius: 12, padding: 10 },
  inlineWarningText: { flex: 1, marginLeft: 8, color: "#B45309", fontSize: 12, lineHeight: 18 },
  quickListHeader: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quickListTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  quickListCount: { fontSize: 12, color: "#6B7280" },
  assignmentLoadingRow: { marginTop: 12, flexDirection: "row", alignItems: "center" },
  assignmentLoadingText: { marginLeft: 8, fontSize: 12, color: "#6B7280" },
  assignmentChipWrap: { marginTop: 12, gap: 8 },
  assignmentChip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#F8FAFC" },
  assignmentChipActive: { borderColor: "#93C5FD", backgroundColor: "#EFF6FF" },
  assignmentChipCode: { fontSize: 12, fontWeight: "700", color: "#1F2937" },
  assignmentChipCodeActive: { color: "#1D4ED8" },
  assignmentChipName: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  assignmentChipNameActive: { color: "#2563EB" },
  assignmentEmptyText: { marginTop: 12, fontSize: 12, color: "#6B7280" },
  patientCardWrap: { marginTop: 14 },
  patientEmptyCard: { borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", padding: 14, alignItems: "center" },
  emptyIcon: { marginBottom: 6 },
  patientEmptyText: { fontSize: 13, fontWeight: "600", color: "#111827", marginTop: 6, marginBottom: 2, textAlign: "center" },
  patientEmptySub: { fontSize: 12, color: "#6B7280", textAlign: "center", lineHeight: 18 },
  patientCard: { borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", padding: 12, backgroundColor: "#F9FAFB" },
  patientRow: { flexDirection: "row", alignItems: "center" },
  patientAvatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", marginRight: 10 },
  patientAvatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  patientContent: { flex: 1 },
  patientNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  patientName: { fontSize: 14, fontWeight: "700", color: "#111827", marginRight: 8 },
  selectedBadge: { backgroundColor: "#DCFCE7", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  selectedBadgeText: { fontSize: 10, fontWeight: "700", color: "#15803D" },
  patientMeta: { fontSize: 12, color: "#4B5563", marginTop: 2 },
  patientMetaSm: { flex: 1, fontSize: 11, color: "#6B7280", marginTop: 1, lineHeight: 18 },
  patientInfoRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 10 },
  patientInfoIconWrap: {
    width: 20,
    alignItems: "center",
    marginRight: 6,
    paddingTop: 2,
  },
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
  marginTopMedium: { marginTop: 12 },
  chipRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  chipChoice: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  chipChoiceActive: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  chipChoiceText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  chipChoiceTextActive: { color: "#2563EB", fontWeight: "600" },
  secondaryBtn: { marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  secondaryBtnIcon: { marginRight: 6 },
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
  saveIcon: { marginRight: 6 },
  saveText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  bottomSpacer: { height: 16 },
  scannerOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.86)", justifyContent: "center", paddingHorizontal: 20 },
  scannerCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18 },
  scannerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  scannerHeaderContent: { flex: 1, marginRight: 12 },
  scannerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  scannerSubtitle: { marginTop: 6, fontSize: 12, lineHeight: 18, color: "#6B7280" },
  scannerCloseButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  cameraFrame: { width: "100%", aspectRatio: 1, borderRadius: 20, overflow: "hidden", backgroundColor: "#111827" },
  camera: { flex: 1 },
  scannerFootnote: { marginTop: 14, fontSize: 12, lineHeight: 18, textAlign: "center", color: "#6B7280" },
});

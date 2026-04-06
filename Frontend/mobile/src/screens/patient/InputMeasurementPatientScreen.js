import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

import { useAuth } from "../../hooks/useAuth";
import { createMeasurement } from "../../api/measurementApi";

const SECTIONS = [
  { key: "bp", iconName: "heart-outline", label: "Huyết áp", description: "SYS / DIA / Mạch" },
  { key: "glucose", iconName: "water-outline", label: "Đường huyết", description: "mg/dL" },
  { key: "spo2", iconName: "pulse-outline", label: "SpO2", description: "% bão hòa O2" },
  { key: "temp", iconName: "thermometer-outline", label: "Nhiệt độ", description: "°C" },
  { key: "heartRate", iconName: "fitness-outline", label: "Nhịp tim", description: "lần/phút" },
  { key: "respiratoryRate", iconName: "cloud-outline", label: "Nhịp thở", description: "lần/phút" },
];

function createSavedState() {
  return SECTIONS.reduce((acc, section) => {
    acc[section.key] = false;
    return acc;
  }, {});
}

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function toOptionalNumber(value) {
  return hasValue(value) ? Number(value) : null;
}

function toOptionalText(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function buildPayload({ patientId, systolic, diastolic, heartRate, glucose, spo2, temperature, respiratoryRate, timing, device, note }) {
  const hasBp = Number(systolic) > 0 || Number(diastolic) > 0 || Number(heartRate) > 0;
  const hasGlucose = hasValue(glucose);
  return {
    patientId,
    type: hasBp || !hasGlucose ? "bp" : "glucose",
    temperature: toOptionalNumber(temperature),
    heartRate: toOptionalNumber(heartRate),
    respiratoryRate: toOptionalNumber(respiratoryRate),
    spo2: toOptionalNumber(spo2),
    bloodPressure: {
      systolic: toOptionalNumber(systolic),
      diastolic: toOptionalNumber(diastolic),
    },
    glucose: hasGlucose ? Number(glucose) : null,
    timing: hasGlucose ? timing : null,
    device: toOptionalText(device),
    note: toOptionalText(note),
  };
}

function TypeTile({ active, isSaved, isDraft, item, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.typeTile, active && styles.typeTileActive]}>
      <View style={styles.typeTileTopRow}>
        <View style={styles.typeTileIconWrapper}>
          <Ionicons name={item.iconName} size={18} color={active ? "#2563EB" : "#6B7280"} />
        </View>
        {isSaved ? (
          <View style={styles.tileSavedBadge}><Text style={styles.tileSavedBadgeText}>Đã lưu</Text></View>
        ) : isDraft ? (
          <View style={styles.tileDraftBadge}><Text style={styles.tileDraftBadgeText}>Đang nhập</Text></View>
        ) : null}
      </View>
      <Text style={[styles.typeTileLabel, active && styles.typeTileLabelActive]} numberOfLines={1}>{item.label}</Text>
      <Text style={styles.typeTileDesc} numberOfLines={1}>{item.description}</Text>
    </TouchableOpacity>
  );
}

export default function InputMeasurementPatientScreen() {
  const { user } = useAuth() || {};
  const currentPatientUser = user || { _id: "u_patient_self_1", id: "p1", name: "Thong tin mau" };
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
  const [savedSections, setSavedSections] = useState(createSavedState);
  const [submitting, setSubmitting] = useState(false);

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
        (hasValue(systolic) || hasValue(diastolic)) &&
        prev.bp
      ) {
        next.bp = false;
        changed = true;
      }
      return changed ? next : prev;
    });
  };

  const bindInput = (sectionKey, setter) => (value) => {
    setter(value);
    markEditing(sectionKey);
  };

  const hasSectionValue = (sectionKey) => {
    if (sectionKey === "bp") return hasValue(systolic) || hasValue(diastolic) || hasValue(heartRate);
    if (sectionKey === "glucose") return hasValue(glucose);
    if (sectionKey === "spo2") return hasValue(spo2);
    if (sectionKey === "temp") return hasValue(temperature);
    if (sectionKey === "heartRate") {
      return hasValue(heartRate) && !hasValue(systolic) && !hasValue(diastolic);
    }
    if (sectionKey === "respiratoryRate") return hasValue(respiratoryRate);
    return false;
  };

  const ensurePatient = () => {
    if (!currentPatientUser || (!currentPatientUser._id && !currentPatientUser.id)) {
      Alert.alert("Lỗi", "Không xác định được tài khoản bệnh nhân.");
      return false;
    }
    return true;
  };

  const validateSection = (sectionKey) => {
    if (!ensurePatient()) return false;
    if (sectionKey === "bp") {
      const sys = Number(systolic);
      const dia = Number(diastolic);
      const pulse = Number(heartRate);
      if (!systolic || !diastolic || !heartRate) {
        Alert.alert("Thiếu chỉ số", "Huyết áp yêu cầu đủ: Tâm thu, Tâm trương và mạch.");
        return false;
      }
      if (Number.isNaN(sys) || Number.isNaN(dia) || Number.isNaN(pulse) || sys < 70 || sys > 250 || dia < 40 || dia > 150 || pulse < 30 || pulse > 220) {
        Alert.alert("Giá trị không hợp lệ", "Hãy kiểm tra lại khoảng giá trị hợp lý cho huyết áp.");
        return false;
      }
    }
    if (sectionKey === "glucose") {
      const value = Number(glucose);
      if (!glucose) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị đường huyết.");
        return false;
      }
      if (Number.isNaN(value) || value < 40 || value > 600) {
        Alert.alert("Giá trị không hợp lệ", "Đường huyết nên nằm trong khoảng 40-600 mg/dL.");
        return false;
      }
    }
    if (sectionKey === "spo2") {
      const value = Number(spo2);
      if (!spo2) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị SpO2.");
        return false;
      }
      if (Number.isNaN(value) || value < 50 || value > 100) {
        Alert.alert("Giá trị không hợp lệ", "SpO2 thông thường nằm trong khoảng 50-100%.");
        return false;
      }
    }
    if (sectionKey === "temp") {
      const value = Number(temperature);
      if (!temperature) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị nhiệt độ cơ thể.");
        return false;
      }
      if (Number.isNaN(value) || value < 30 || value > 45) {
        Alert.alert("Giá trị không hợp lệ", "Nhiệt độ cơ thể nên nằm trong khoảng 30-45°C.");
        return false;
      }
    }
    if (sectionKey === "heartRate") {
      const value = Number(heartRate);
      if (!heartRate) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị nhịp tim.");
        return false;
      }
      if (Number.isNaN(value) || value < 30 || value > 220) {
        Alert.alert("Giá trị không hợp lệ", "Nhịp tim nên nằm trong khoảng 30-220 lần/phút.");
        return false;
      }
    }
    if (sectionKey === "respiratoryRate") {
      const value = Number(respiratoryRate);
      if (!respiratoryRate) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị nhịp thở.");
        return false;
      }
      if (Number.isNaN(value) || value < 5 || value > 60) {
        Alert.alert("Giá trị không hợp lệ", "Nhịp thở nên nằm trong khoảng 5-60 lần/phút.");
        return false;
      }
    }
    return true;
  };

  const resetForm = () => {
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
    setSavedSections(createSavedState());
  };

  const saveCurrentSection = () => {
    if (!validateSection(type)) return;
    setSavedSections((prev) => ({ ...prev, [type]: true }));
    const label = SECTIONS.find((item) => item.key === type)?.label || "Thông tin";
    Alert.alert("Đã lưu tạm", `${label} đã được lưu trên màn hình. Bạn có thể nhập tiếp phần khác rồi gửi một lần.`);
  };

  const submitMeasurement = async () => {
    if (!ensurePatient()) return;
    const missingSections = SECTIONS.filter((item) => !savedSections[item.key]);
    if (missingSections.length > 0) {
      Alert.alert(
        "Thiếu chỉ số",
        `Bạn cần nhập và lưu đủ tất cả chỉ số trước khi gửi. Còn thiếu: ${missingSections
          .map((item) => item.label)
          .join(", ")}.`
      );
      return;
    }
    const savedKeys = SECTIONS.map((item) => item.key);
    const unsavedKeys = SECTIONS.filter((item) => hasSectionValue(item.key) && !savedSections[item.key]);
    if (unsavedKeys.length > 0) {
      Alert.alert("Chưa lưu hết dữ liệu", `Bạn còn ${unsavedKeys.length} phần đang nhập nhưng chưa bấm "Lưu thông tin".`);
      return;
    }
    for (const key of savedKeys) {
      if (!validateSection(key)) return;
    }
    const patientId = currentPatientUser.id || currentPatientUser._id;
    const payload = buildPayload({ patientId, systolic, diastolic, heartRate, glucose, spo2, temperature, respiratoryRate, timing, device, note });
    try {
      setSubmitting(true);
      const response = await createMeasurement(payload);
      if (response.ok) {
        Alert.alert("Thành công", "Đã gửi bản đo lên hệ thống.");
        resetForm();
        return;
      }
      const errorMessage = response.body?.error || response.error || "Gửi dữ liệu lỗi, vui lòng thử lại.";
      Alert.alert("Đã xảy ra lỗi", errorMessage);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderTypeFields = () => {
    if (type === "bp") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Chỉ số huyết áp</Text>
          <View style={styles.row}>
            <View style={styles.fieldColumn}>
              <Text style={styles.fieldLabel}>Tâm thu (SYS)</Text>
              <TextInput style={styles.input} value={systolic} onChangeText={bindInput("bp", setSystolic)} keyboardType="numeric" placeholder="vd: 120" />
              <Text style={styles.fieldHint}>mmHg · 70-250</Text>
            </View>
            <View style={styles.fieldColumn}>
              <Text style={styles.fieldLabel}>Tâm trương (DIA)</Text>
              <TextInput style={styles.input} value={diastolic} onChangeText={bindInput("bp", setDiastolic)} keyboardType="numeric" placeholder="vd: 80" />
              <Text style={styles.fieldHint}>mmHg · 40-150</Text>
            </View>
          </View>
          <View style={[styles.fieldColumn, { marginTop: 10 }]}>
            <Text style={styles.fieldLabel}>Mạch (PULSE)</Text>
            <TextInput style={styles.input} value={heartRate} onChangeText={bindInput("bp", setHeartRate)} keyboardType="numeric" placeholder="vd: 72" />
            <Text style={styles.fieldHint}>lần/phút · 30-220</Text>
          </View>
        </>
      );
    }
    if (type === "glucose") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Chỉ số đường huyết</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Đường huyết</Text>
            <TextInput style={styles.input} value={glucose} onChangeText={bindInput("glucose", setGlucose)} keyboardType="numeric" placeholder="vd: 110" />
            <Text style={styles.fieldHint}>mg/dL · 40-600</Text>
          </View>
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Thời điểm đo so với bữa ăn</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity style={[styles.chipChoice, timing === "pre" && styles.chipChoiceActive]} onPress={() => { setTiming("pre"); markEditing("glucose"); }}>
              <Text style={[styles.chipChoiceText, timing === "pre" && styles.chipChoiceTextActive]}>Trước ăn (pre)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chipChoice, timing === "post" && styles.chipChoiceActive]} onPress={() => { setTiming("post"); markEditing("glucose"); }}>
              <Text style={[styles.chipChoiceText, timing === "post" && styles.chipChoiceTextActive]}>Sau ăn (post)</Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }
    if (type === "spo2") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Chỉ số SpO2</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>SpO2</Text>
            <TextInput style={styles.input} value={spo2} onChangeText={bindInput("spo2", setSpo2)} keyboardType="numeric" placeholder="vd: 98" />
            <Text style={styles.fieldHint}>% · 50-100</Text>
          </View>
        </>
      );
    }
    if (type === "temp") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Nhiệt độ cơ thể</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Nhiệt độ</Text>
            <TextInput style={styles.input} value={temperature} onChangeText={bindInput("temp", setTemperature)} keyboardType="numeric" placeholder="vd: 36.8" />
            <Text style={styles.fieldHint}>°C · 30-45</Text>
          </View>
        </>
      );
    }
    if (type === "heartRate") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Nhịp tim</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Nhịp tim</Text>
            <TextInput style={styles.input} value={heartRate} onChangeText={bindInput("heartRate", setHeartRate)} keyboardType="numeric" placeholder="vd: 78" />
            <Text style={styles.fieldHint}>lần/phút · 30-220</Text>
          </View>
        </>
      );
    }
    return (
      <>
        <Text style={styles.fieldGroupTitle}>Nhịp thở</Text>
        <View style={styles.fieldColumn}>
          <Text style={styles.fieldLabel}>Nhịp thở</Text>
          <TextInput style={styles.input} value={respiratoryRate} onChangeText={bindInput("respiratoryRate", setRespiratoryRate)} keyboardType="numeric" placeholder="vd: 18" />
          <Text style={styles.fieldHint}>lần/phút · 5-60</Text>
        </View>
      </>
    );
  };

  const savedCount = SECTIONS.filter((item) => savedSections[item.key]).length;
  const savedLabels = SECTIONS.filter((item) => savedSections[item.key]).map((item) => item.label);
  const allSectionsSaved = savedCount === SECTIONS.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
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
          <Text style={styles.sectionTitle}>Loại chỉ số cần nhập</Text>
          <View style={styles.card}>
            <Text style={styles.helperText}>
              Chọn nhóm chỉ số cần nhập. Hoàn tất nhóm nào thì bấm "Lưu thông
              tin", sau đó có thể chuyển sang nhóm kế tiếp.
            </Text>
            <View style={styles.typeGridRow}>
              {SECTIONS.slice(0, 3).map((item) => (
                <TypeTile key={item.key} active={type === item.key} isSaved={savedSections[item.key]} isDraft={hasSectionValue(item.key) && !savedSections[item.key]} item={item} onPress={() => setType(item.key)} />
              ))}
            </View>
            <View style={styles.typeGridRow}>
              {SECTIONS.slice(3, 6).map((item) => (
                <TypeTile key={item.key} active={type === item.key} isSaved={savedSections[item.key]} isDraft={hasSectionValue(item.key) && !savedSections[item.key]} item={item} onPress={() => setType(item.key)} />
              ))}
            </View>
          </View>
          <Text style={styles.sectionTitle}>Chi tiết chỉ số đang nhập</Text>
          <View style={styles.card}>
            {renderTypeFields()}
            <TouchableOpacity style={styles.secondaryBtn} onPress={saveCurrentSection}>
              <Ionicons name="document-text-outline" size={18} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryBtnText}>Lưu thông tin</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>Thông tin chung của bản đo</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Thiết bị đo</Text>
            <TextInput style={styles.input} value={device} onChangeText={setDevice} placeholder="vd: Omron HEM-7130" />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Ghi chú</Text>
            <TextInput style={[styles.input, styles.textArea]} value={note} onChangeText={setNote} placeholder="Ghi chú thêm nếu có" multiline />
          </View>
          <Text style={styles.sectionTitle}>Thông tin đã chuẩn bị</Text>
          <View style={styles.card}>
            <Text style={styles.progressTitle}>Đã lưu {savedCount}/6 nhóm chỉ số</Text>
            <Text style={styles.progressSub}>
              Cần lưu đủ 6/6 nhóm chỉ số trước khi gửi bản đo. Sau khi hoàn tất,
              bạn có thể kiểm tra nhanh danh sách bên dưới rồi gửi một lần.
            </Text>
            <View style={styles.savedChipWrap}>
              {SECTIONS.map((item) => (
                <View key={item.key} style={[styles.savedChip, savedSections[item.key] ? styles.savedChipActive : styles.savedChipInactive]}>
                  <Text style={[styles.savedChipText, savedSections[item.key] ? styles.savedChipTextActive : styles.savedChipTextInactive]}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.progressFootnote}>
              {savedLabels.length > 0
                ? `Hiện đã có: ${savedLabels.join(", ")}.`
                : "Hiện chưa có nhóm chỉ số nào được lưu."}
            </Text>
            {!allSectionsSaved ? (
              <Text style={styles.progressWarning}>
                Bạn cần hoàn tất và lưu đủ tất cả nhóm chỉ số trước khi bấm gửi.
              </Text>
            ) : null}
          </View>
          <TouchableOpacity disabled={submitting} style={[styles.saveBtn, submitting && styles.saveBtnDisabled]} onPress={submitMeasurement}>
            <Ionicons name="send-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveText}>{submitting ? "Đang gửi..." : "Gửi bản đo"}</Text>
          </TouchableOpacity>
          <View style={{ height: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20 },
  contentContainer: { paddingBottom: 32 },
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

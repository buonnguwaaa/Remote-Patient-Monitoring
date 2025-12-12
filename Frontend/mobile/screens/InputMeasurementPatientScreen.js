import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

// ===== MOCK: BỆNH NHÂN ĐANG ĐĂNG NHẬP =====
// Sau này thay bằng user từ AuthContext (user._id, user.name, ...)
const currentPatientUser = {
  _id: "u_patient_self_1",
  name: "Nguyễn Văn A",
  emailLower: "a@example.com",
};

// ===== TIỆN ÍCH =====
function buildMeasurementPayload({
  patientUserId,
  type,
  systolic,
  diastolic,
  pulse,
  glucose,
  spo2,
  temperature,
  heartRate,
  respiratoryRate,
  timing,
  device,
  note,
}) {
  const base = {
    patientId: patientUserId, // Ref users
    type, // "bp" | "glucose" | "spo2" | "temp" | "heartRate" | "respiratoryRate"
    timing: timing || null,
    device: device || null,
    recordedBy: patientUserId, // bệnh nhân tự nhập
    note: note || null,
  };

  if (type === "bp") {
    return {
      ...base,
      systolic: systolic ? Number(systolic) : null,
      diastolic: diastolic ? Number(diastolic) : null,
      pulse: pulse ? Number(pulse) : null,
    };
  }

  if (type === "glucose") {
    return {
      ...base,
      glucose: glucose ? Number(glucose) : null,
    };
  }

  if (type === "spo2") {
    return {
      ...base,
      spo2: spo2 ? Number(spo2) : null,
    };
  }

  if (type === "temp") {
    return {
      ...base,
      temperature: temperature ? Number(temperature) : null,
    };
  }

  if (type === "heartRate") {
    return {
      ...base,
      heartRate: heartRate ? Number(heartRate) : null,
    };
  }

  if (type === "respiratoryRate") {
    return {
      ...base,
      respiratoryRate: respiratoryRate ? Number(respiratoryRate) : null,
    };
  }

  return base;
}

// ===== COMPONENT Ô CHỌN TYPE =====
function TypeTile({ active, onPress, iconName, label, description }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.typeTile, active && styles.typeTileActive]}
    >
      <View style={styles.typeTileIconWrapper}>
        <Ionicons
          name={iconName}
          size={18}
          color={active ? "#2563EB" : "#6B7280"}
        />
      </View>
      <Text
        style={[styles.typeTileLabel, active && styles.typeTileLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {description ? (
        <Text style={styles.typeTileDesc} numberOfLines={1}>
          {description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ===== SCREEN: BỆNH NHÂN TỰ NHẬP CHỈ SỐ =====
export default function InputMeasurementPatientScreen() {
  // type: đo tách riêng từng loại, cả nhịp tim / nhịp thở là type riêng
  const [type, setType] = useState("bp"); // "bp" | "glucose" | "spo2" | "temp" | "heartRate" | "respiratoryRate"
  const [timing, setTiming] = useState("pre"); // dùng cho glucose
  const [device, setDevice] = useState("");
  const [note, setNote] = useState("");

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [glucose, setGlucose] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");

  const validateForm = () => {
    if (!currentPatientUser || !currentPatientUser._id) {
      Alert.alert("Lỗi", "Không xác định được tài khoản bệnh nhân.");
      return false;
    }

    if (type === "bp") {
      if (!systolic || !diastolic || !pulse) {
        Alert.alert(
          "Thiếu chỉ số",
          "Huyết áp yêu cầu đủ: Tâm thu, Tâm trương, Mạch."
        );
        return false;
      }
      const sysNum = Number(systolic);
      const diaNum = Number(diastolic);
      const pulseNum = Number(pulse);

      if (
        isNaN(sysNum) ||
        isNaN(diaNum) ||
        isNaN(pulseNum) ||
        sysNum < 70 ||
        sysNum > 250 ||
        diaNum < 40 ||
        diaNum > 150 ||
        pulseNum < 30 ||
        pulseNum > 220
      ) {
        Alert.alert(
          "Giá trị không hợp lệ",
          "Hãy kiểm tra lại khoảng giá trị hợp lý cho huyết áp."
        );
        return false;
      }
    }

    if (type === "glucose") {
      if (!glucose) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị đường huyết.");
        return false;
      }
      const g = Number(glucose);
      if (isNaN(g) || g < 40 || g > 600) {
        Alert.alert(
          "Giá trị không hợp lệ",
          "Đường huyết nên nằm trong khoảng 40–600 mg/dL."
        );
        return false;
      }
    }

    if (type === "spo2") {
      if (!spo2) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị SpO₂.");
        return false;
      }
      const s = Number(spo2);
      if (isNaN(s) || s < 50 || s > 100) {
        Alert.alert(
          "Giá trị không hợp lệ",
          "SpO₂ thông thường nằm trong khoảng 50–100%."
        );
        return false;
      }
    }

    if (type === "temp") {
      if (!temperature) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị nhiệt độ cơ thể.");
        return false;
      }
      const t = Number(temperature);
      if (isNaN(t) || t < 30 || t > 45) {
        Alert.alert(
          "Giá trị không hợp lệ",
          "Nhiệt độ cơ thể nên nằm trong khoảng 30–45°C."
        );
        return false;
      }
    }

    if (type === "heartRate") {
      if (!heartRate) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị nhịp tim.");
        return false;
      }
      const hr = Number(heartRate);
      if (isNaN(hr) || hr < 30 || hr > 220) {
        Alert.alert(
          "Giá trị không hợp lệ",
          "Nhịp tim nên nằm trong khoảng 30–220 lần/phút."
        );
        return false;
      }
    }

    if (type === "respiratoryRate") {
      if (!respiratoryRate) {
        Alert.alert("Thiếu chỉ số", "Hãy nhập giá trị nhịp thở.");
        return false;
      }
      const rr = Number(respiratoryRate);
      if (isNaN(rr) || rr < 5 || rr > 60) {
        Alert.alert(
          "Giá trị không hợp lệ",
          "Nhịp thở nên nằm trong khoảng 5–60 lần/phút."
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const payload = buildMeasurementPayload({
      patientUserId: currentPatientUser._id,
      type,
      systolic,
      diastolic,
      pulse,
      glucose,
      spo2,
      temperature,
      heartRate,
      respiratoryRate,
      timing,
      device,
      note,
    });

    // TODO: gọi API backend để lưu measurement
    console.log("Patient self-measurement payload:", payload);

    Alert.alert("Thành công", "Đã gửi bản đo của bạn (mock).");

    setSystolic("");
    setDiastolic("");
    setPulse("");
    setGlucose("");
    setSpo2("");
    setTemperature("");
    setHeartRate("");
    setRespiratoryRate("");
    setNote("");
  };

  const renderTypeFields = () => {
    if (type === "bp") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Chỉ số huyết áp</Text>
          <View style={styles.row}>
            <View style={styles.fieldColumn}>
              <Text style={styles.fieldLabel}>Tâm thu (SYS)</Text>
              <TextInput
                style={styles.input}
                value={systolic}
                onChangeText={setSystolic}
                keyboardType="numeric"
                placeholder="vd: 120"
              />
              <Text style={styles.fieldHint}>mmHg · 70–250</Text>
            </View>

            <View style={styles.fieldColumn}>
              <Text style={styles.fieldLabel}>Tâm trương (DIA)</Text>
              <TextInput
                style={styles.input}
                value={diastolic}
                onChangeText={setDiastolic}
                keyboardType="numeric"
                placeholder="vd: 80"
              />
              <Text style={styles.fieldHint}>mmHg · 40–150</Text>
            </View>
          </View>

          <View style={[styles.fieldColumn, { marginTop: 10 }]}>
            <Text style={styles.fieldLabel}>Mạch (PULSE)</Text>
            <TextInput
              style={styles.input}
              value={pulse}
              onChangeText={setPulse}
              keyboardType="numeric"
              placeholder="vd: 72"
            />
            <Text style={styles.fieldHint}>lần/phút · 30–220</Text>
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
            <TextInput
              style={styles.input}
              value={glucose}
              onChangeText={setGlucose}
              keyboardType="numeric"
              placeholder="vd: 110"
            />
            <Text style={styles.fieldHint}>mg/dL · 40–600</Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            Thời điểm đo so với bữa ăn
          </Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chipChoice,
                timing === "pre" && styles.chipChoiceActive,
              ]}
              onPress={() => setTiming("pre")}
            >
              <Text
                style={[
                  styles.chipChoiceText,
                  timing === "pre" && styles.chipChoiceTextActive,
                ]}
              >
                Trước ăn (pre)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chipChoice,
                timing === "post" && styles.chipChoiceActive,
              ]}
              onPress={() => setTiming("post")}
            >
              <Text
                style={[
                  styles.chipChoiceText,
                  timing === "post" && styles.chipChoiceTextActive,
                ]}
              >
                Sau ăn (post)
              </Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (type === "spo2") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Chỉ số SpO₂</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>SpO₂</Text>
            <TextInput
              style={styles.input}
              value={spo2}
              onChangeText={setSpo2}
              keyboardType="numeric"
              placeholder="vd: 98"
            />
            <Text style={styles.fieldHint}>% · 50–100</Text>
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
            <TextInput
              style={styles.input}
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="numeric"
              placeholder="vd: 36.8"
            />
            <Text style={styles.fieldHint}>°C · 30–45</Text>
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
            <TextInput
              style={styles.input}
              value={heartRate}
              onChangeText={setHeartRate}
              keyboardType="numeric"
              placeholder="vd: 78"
            />
            <Text style={styles.fieldHint}>lần/phút · 30–220</Text>
          </View>
        </>
      );
    }

    if (type === "respiratoryRate") {
      return (
        <>
          <Text style={styles.fieldGroupTitle}>Nhịp thở</Text>
          <View style={styles.fieldColumn}>
            <Text style={styles.fieldLabel}>Nhịp thở</Text>
            <TextInput
              style={styles.input}
              value={respiratoryRate}
              onChangeText={setRespiratoryRate}
              keyboardType="numeric"
              placeholder="vd: 18"
            />
            <Text style={styles.fieldHint}>lần/phút · 5–60</Text>
          </View>
        </>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Tự nhập chỉ số sức khỏe</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* THANH THÔNG TIN BỆNH NHÂN */}
        <View style={styles.patientBar}>
          <View style={styles.patientLeft}>
            <View style={styles.patientAvatarSmall}>
              <Ionicons name="person-circle-outline" size={20} color="#FFFFFF" />
            </View>
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

        {/* CHỌN LOẠI CHỈ SỐ */}
        <Text style={styles.sectionTitle}>Loại chỉ số cần nhập</Text>
        <View style={styles.card}>
          <View style={styles.typeGridRow}>
            <TypeTile
              active={type === "bp"}
              onPress={() => setType("bp")}
              iconName="heart-outline"
              label="Huyết áp"
              description="SYS / DIA / PULSE"
            />
            <TypeTile
              active={type === "glucose"}
              onPress={() => setType("glucose")}
              iconName="water-outline"
              label="Đường huyết"
              description="mg/dL"
            />
            <TypeTile
              active={type === "spo2"}
              onPress={() => setType("spo2")}
              iconName="pulse-outline"
              label="SpO₂"
              description="% bão hòa O₂"
            />
          </View>

          <View style={styles.typeGridRow}>
            <TypeTile
              active={type === "temp"}
              onPress={() => setType("temp")}
              iconName="thermometer-outline"
              label="Nhiệt độ"
              description="°C"
            />
            <TypeTile
              active={type === "heartRate"}
              onPress={() => setType("heartRate")}
              iconName="fitness-outline"
              label="Nhịp tim"
              description="lần/phút"
            />
            <TypeTile
              active={type === "respiratoryRate"}
              onPress={() => setType("respiratoryRate")}
              iconName="cloud-outline"
              label="Nhịp thở"
              description="lần/phút"
            />
          </View>
        </View>

        {/* FORM NHẬP CHỈ SỐ */}
        <Text style={styles.sectionTitle}>Chi tiết bản đo</Text>
        <View style={styles.card}>
          {renderTypeFields()}

          {/* THIẾT BỊ */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Thiết bị đo</Text>
          <TextInput
            style={styles.input}
            value={device}
            onChangeText={setDevice}
            placeholder="vd: máy đo cá nhân, model..."
          />

          {/* GHI CHÚ */}
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Ghi chú</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            placeholder="Ghi chú thêm (vừa vận động, vừa ăn uống, cảm giác khó chịu...)"
            multiline
          />
        </View>

        {/* NÚT LƯU */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit}>
          <Ionicons
            name="save-outline"
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.saveText}>Gửi bản đo</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },

  // Thanh bệnh nhân
  patientBar: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  patientLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  patientLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  patientNameBar: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  patientTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  patientDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    marginRight: 6,
  },
  patientTagText: {
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 8,
    color: "#111827",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  // Grid chọn loại chỉ số
  typeGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  typeTile: {
    width: "32%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  typeTileActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  typeTileIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  typeTileLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  typeTileLabelActive: {
    color: "#2563EB",
  },
  typeTileDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  // Form fields
  fieldGroupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  fieldColumn: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },

  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  chipChoice: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  chipChoiceActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  chipChoiceText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  chipChoiceTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },

  // Save button
  saveBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});

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
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";

// ===== MOCK DATA / CONSTANTS =====

// Điều dưỡng đang đăng nhập
const currentNurseUser = {
    _id: "u_nurse_1",
    name: "Điều dưỡng Trần Thị B",
};

// Giả lập kết quả quét QR -> lấy user + patient_info
const mockedPatientFromQr = {
    user: {
        _id: "u_patient_1",
        role: "patient",
        name: "Nguyễn Văn A",
        emailLower: "a@example.com",
    },
    patientInfo: {
        _id: "pi_1",
        userId: "u_patient_1",
        insuranceNumber: "BA123456789",
        CCCD: "012345678901",
        emergencyContactName: "Nguyễn Văn B",
        emergencyContactPhone: "+84 987 654 321",
    },
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
    timing,
    device,
    note,
    nurseUserId,
}) {
    const base = {
        patientId: patientUserId, // Ref users
        type, // "bp" | "glucose" | "spo2" | "temp"
        timing: timing || null,
        device: device || null,
        recordedBy: nurseUserId,
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
        // backend nên có trường spo2
        return {
            ...base,
            spo2: spo2 ? Number(spo2) : null,
        };
    }

    if (type === "temp") {
        // backend nên có trường temperature
        return {
            ...base,
            temperature: temperature ? Number(temperature) : null,
        };
    }

    return base;
}

// ===== SCREEN =====
export default function MeasurementInputScreen() {
    const [selectedPatient, setSelectedPatient] = useState(null); // { user, patientInfo }
    const [type, setType] = useState("bp"); // "bp" | "glucose" | "spo2" | "temp"
    const [timing, setTiming] = useState("pre"); // "pre" | "post"
    const [device, setDevice] = useState("");
    const [note, setNote] = useState("");

    const [systolic, setSystolic] = useState("");
    const [diastolic, setDiastolic] = useState("");
    const [pulse, setPulse] = useState("");
    const [glucose, setGlucose] = useState("");
    const [spo2, setSpo2] = useState("");
    const [temperature, setTemperature] = useState("");

    const handleScanQr = () => {
        // Ở đây chỉ mock. Thực tế sẽ mở camera + QR scanner rồi lấy patientId
        setSelectedPatient(mockedPatientFromQr);
        Alert.alert("Quét QR", "Đã nhận dạng bệnh nhân Nguyễn Văn A (mock).");
    };

    const validateForm = () => {
        if (!selectedPatient) {
            Alert.alert("Thiếu thông tin", "Hãy quét QR để chọn bệnh nhân trước.");
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

        return true;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        const payload = buildMeasurementPayload({
            patientUserId: selectedPatient.user._id,
            type,
            systolic,
            diastolic,
            pulse,
            glucose,
            spo2,
            temperature,
            timing,
            device,
            note,
            nurseUserId: currentNurseUser._id,
        });

        // TODO: gửi payload lên API backend
        console.log("Measurement payload:", payload);

        Alert.alert("Thành công", "Đã lưu bản đo (mock).");

        // Reset các trường giá trị sau khi lưu
        setSystolic("");
        setDiastolic("");
        setPulse("");
        setGlucose("");
        setSpo2("");
        setTemperature("");
        setNote("");
    };

    const renderPatientCard = () => {
        if (!selectedPatient) {
            return (
                <View style={styles.patientEmptyCard}>
                    <Ionicons
                        name="qr-code-outline"
                        size={26}
                        color="#9CA3AF"
                        style={{ marginBottom: 6 }}
                    />
                    <Text style={styles.patientEmptyText}>
                        Chưa có bệnh nhân được chọn
                    </Text>
                    <Text style={styles.patientEmptySub}>
                        Quét mã QR trên vòng tay / phiếu bệnh án để tải thông tin bệnh nhân.
                    </Text>
                </View>
            );
        }

        const { user, patientInfo } = selectedPatient;
        return (
            <View style={styles.patientCard}>
                <View style={styles.patientRow}>
                    <View style={styles.patientAvatar}>
                        <Text style={styles.patientAvatarText}>
                            {user.name
                                .split(" ")
                                .filter((p) => p.length > 0)
                                .slice(-2)
                                .map((p) => p[0])
                                .join("")
                                .toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.patientName}>{user.name}</Text>
                        <Text style={styles.patientMeta}>
                            BHYT: {patientInfo.insuranceNumber}
                        </Text>
                        <Text style={styles.patientMetaSm}>
                            CCCD: {patientInfo.CCCD} • ID: {user._id}
                        </Text>
                    </View>
                </View>

                <View style={styles.patientInfoRow}>
                    <Ionicons name="call-outline" size={14} color="#6B7280" />
                    <Text style={styles.patientMetaSm}>
                        Người liên hệ khẩn cấp: {patientInfo.emergencyContactName} ·{" "}
                        {patientInfo.emergencyContactPhone}
                    </Text>
                </View>
            </View>
        );
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

        return null;
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* HEADER */}
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Nhập bản đo sinh hiệu</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* THÔNG TIN ĐIỀU DƯỠNG */}
                <View style={styles.nurseBar}>
                    <View style={styles.nurseLeft}>
                        <View style={styles.nurseAvatar}>
                            <FontAwesome5 name="user-nurse" size={16} color="#FFFFFF" />
                        </View>
                        <View>
                            <Text style={styles.nurseLabel}>Điều dưỡng</Text>
                            <Text style={styles.nurseName}>{currentNurseUser.name}</Text>
                        </View>
                    </View>
                    <View style={styles.nurseTag}>
                        <View style={styles.nurseDot} />
                        <Text style={styles.nurseTagText}>Đang nhập liệu</Text>
                    </View>
                </View>

                {/* QUÉT QR BỆNH NHÂN */}
                <Text style={styles.sectionTitle}>Thông tin bệnh nhân</Text>
                <View style={styles.card}>
                    <View style={styles.qrRow}>
                        <View style={styles.qrLeft}>
                            <Ionicons
                                name="qr-code-outline"
                                size={22}
                                color="#2563EB"
                                style={{ marginRight: 8 }}
                            />
                            <View>
                                <Text style={styles.qrTitle}>Quét mã QR bệnh nhân</Text>
                                <Text style={styles.qrSub}>
                                    Sử dụng vòng tay / mã QR trên hồ sơ để auto điền.
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.qrButton} onPress={handleScanQr}>
                            <Text style={styles.qrButtonText}>Quét QR</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ marginTop: 14 }}>{renderPatientCard()}</View>
                </View>

                {/* CHỌN LOẠI CHỈ SỐ */}
                <Text style={styles.sectionTitle}>Loại chỉ số cần nhập</Text>
                <View style={styles.card}>
                    <View style={styles.typeTabs}>
                        <TouchableOpacity
                            style={[styles.typeTab, type === "bp" && styles.typeTabActive]}
                            onPress={() => setType("bp")}
                        >
                            <Ionicons
                                name="heart-outline"
                                size={16}
                                color={type === "bp" ? "#2563EB" : "#6B7280"}
                            />
                            <Text
                                style={[
                                    styles.typeTabText,
                                    type === "bp" && styles.typeTabTextActive,
                                ]}
                            >
                                Huyết áp
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeTab, type === "glucose" && styles.typeTabActive]}
                            onPress={() => setType("glucose")}
                        >
                            <Ionicons
                                name="water-outline"
                                size={16}
                                color={type === "glucose" ? "#2563EB" : "#6B7280"}
                            />
                            <Text
                                style={[
                                    styles.typeTabText,
                                    type === "glucose" && styles.typeTabTextActive,
                                ]}
                            >
                                Đường huyết
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeTab, type === "spo2" && styles.typeTabActive]}
                            onPress={() => setType("spo2")}
                        >
                            <Ionicons
                                name="pulse-outline"
                                size={16}
                                color={type === "spo2" ? "#2563EB" : "#6B7280"}
                            />
                            <Text
                                style={[
                                    styles.typeTabText,
                                    type === "spo2" && styles.typeTabTextActive,
                                ]}
                            >
                                SpO₂
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.typeTab, type === "temp" && styles.typeTabActive]}
                            onPress={() => setType("temp")}
                        >
                            <Ionicons
                                name="thermometer-outline"
                                size={16}
                                color={type === "temp" ? "#2563EB" : "#6B7280"}
                            />
                            <Text
                                style={[
                                    styles.typeTabText,
                                    type === "temp" && styles.typeTabTextActive,
                                ]}
                            >
                                Nhiệt độ
                            </Text>
                        </TouchableOpacity>
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
                        placeholder="vd: BP_MONITOR_01, GLUCOSE_METER_02..."
                    />

                    {/* GHI CHÚ */}
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Ghi chú</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Ghi chú thêm (tư thế bệnh nhân, tình trạng, đã dùng thuốc...)"
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
                    <Text style={styles.saveText}>Lưu bản đo</Text>
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
    backBtn: {
        width: 40,
        height: 40,
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        flex: 1,
    },

    nurseBar: {
        backgroundColor: "#EFF6FF",
        borderRadius: 16,
        padding: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    nurseLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    nurseAvatar: {
        width: 32,
        height: 32,
        borderRadius: 999,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    nurseLabel: {
        fontSize: 11,
        color: "#6B7280",
    },
    nurseName: {
        fontSize: 13,
        fontWeight: "600",
        color: "#111827",
    },
    nurseTag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#DCFCE7",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    nurseDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        backgroundColor: "#22C55E",
        marginRight: 6,
    },
    nurseTagText: {
        fontSize: 11,
        color: "#15803D",
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

    // QR
    qrRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    qrLeft: {
        flexDirection: "row",
        flex: 1,
        marginRight: 10,
    },
    qrTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
    },
    qrSub: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    qrButton: {
        backgroundColor: "#2563EB",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    qrButtonText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "600",
    },

    // Patient card
    patientEmptyCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 12,
        marginTop: 6,
        alignItems: "center",
    },
    patientEmptyText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 2,
    },
    patientEmptySub: {
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
    },

    patientCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 12,
        marginTop: 6,
        backgroundColor: "#F9FAFB",
    },
    patientRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    patientAvatar: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    patientAvatarText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
    },
    patientName: {
        fontSize: 14,
        fontWeight: "700",
        color: "#111827",
    },
    patientMeta: {
        fontSize: 12,
        color: "#4B5563",
        marginTop: 2,
    },
    patientMetaSm: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 1,
    },
    patientInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        gap: 4,
    },

    // Type tabs
    typeTabs: {
        flexDirection: "row",
        flexWrap: "wrap",
        backgroundColor: "#EFF2FF",
        borderRadius: 999,
        padding: 4,
        gap: 4,
    },
    typeTab: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    typeTabActive: {
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    typeTabText: {
        fontSize: 12,
        color: "#6B7280",
        marginLeft: 4,
        fontWeight: "600",
    },
    typeTabTextActive: {
        color: "#2563EB",
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

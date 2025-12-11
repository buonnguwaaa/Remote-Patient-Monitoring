import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";

// ===== MOCK DATA: DANH SÁCH BỆNH NHÂN ĐÃ CÓ BẢN ĐO =====
const nurseUser = {
    _id: "u_nurse_1",
    name: "Điều dưỡng Trần Thị B",
};

const patients = [
    {
        user: {
            _id: "u_patient_1",
            name: "Nguyễn Văn A",
            emailLower: "a@example.com",
            isActive: true,
        },
        patientInfo: {
            _id: "pi_1",
            userId: "u_patient_1",
            insuranceNumber: "BA123456789",
            CCCD: "012345678901",
            emergencyContactName: "Nguyễn Văn B",
            emergencyContactPhone: "+84 987 654 321",
        },
        lastMeasurementAt: "2025-11-24T09:15:00Z",
        lastMeasurements: {
            bp: { systolic: 132, diastolic: 86, pulse: 78 },
            glucose: { value: 145, timing: "post" },
            spo2: { value: 97 },
            temp: { value: 36.8 },
        },
        alertsSummary: {
            total: 3,
            high: 1,
            lastAlertAt: "2025-11-24T09:20:00Z",
        },
    },
    {
        user: {
            _id: "u_patient_2",
            name: "Trần Thị C",
            emailLower: "c@example.com",
            isActive: true,
        },
        patientInfo: {
            _id: "pi_2",
            userId: "u_patient_2",
            insuranceNumber: "BA987654321",
            CCCD: "079123456789",
            emergencyContactName: "Trần Văn D",
            emergencyContactPhone: "+84 912 000 111",
        },
        lastMeasurementAt: "2025-11-24T08:40:00Z",
        lastMeasurements: {
            bp: { systolic: 118, diastolic: 76, pulse: 72 },
            glucose: null,
            spo2: { value: 99 },
            temp: { value: 36.5 },
        },
        alertsSummary: {
            total: 0,
            high: 0,
            lastAlertAt: null,
        },
    },
    {
        user: {
            _id: "u_patient_3",
            name: "Phạm Văn D",
            emailLower: "d@example.com",
            isActive: false,
        },
        patientInfo: {
            _id: "pi_3",
            userId: "u_patient_3",
            insuranceNumber: "BA111222333",
            CCCD: "023456789012",
            emergencyContactName: "Phạm Thị E",
            emergencyContactPhone: "+84 933 222 444",
        },
        lastMeasurementAt: "2025-11-23T16:10:00Z",
        lastMeasurements: {
            bp: null,
            glucose: { value: 132, timing: "pre" },
            spo2: { value: 95 },
            temp: null,
        },
        alertsSummary: {
            total: 5,
            high: 2,
            lastAlertAt: "2025-11-23T16:20:00Z",
        },
    },
];

function formatRelativeTime(iso) {
    if (!iso) return "Chưa có dữ liệu";
    const now = new Date();
    const t = new Date(iso);
    const diffMs = now.getTime() - t.getTime();
    const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} ngày trước`;
}

function getInitials(name) {
    if (!name) return "?";
    const parts = name
        .split(" ")
        .filter((p) => p.length > 0)
        .slice(-2);
    return parts
        .map((p) => p[0])
        .join("")
        .toUpperCase();
}

export default function NursePatientListScreen() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all"); // "all" | "alerts" | "stable"

    const totalPatients = patients.length;
    const patientsWithAlerts = patients.filter(
        (p) => p.alertsSummary.high > 0
    ).length;

    const filteredPatients = patients.filter((p) => {
        const nameMatch = p.user.name
            .toLowerCase()
            .includes(search.trim().toLowerCase());

        if (!nameMatch) return false;

        if (filter === "alerts") return p.alertsSummary.high > 0;
        if (filter === "stable") return p.alertsSummary.high === 0;
        return true;
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* HEADER */}
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Bệnh nhân được theo dõi</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* NURSE BAR */}
                <View style={styles.nurseBar}>
                    <View style={styles.nurseLeft}>
                        <View style={styles.nurseAvatar}>
                            <FontAwesome5 name="user-nurse" size={16} color="#FFFFFF" />
                        </View>
                        <View>
                            <Text style={styles.nurseLabel}>Điều dưỡng</Text>
                            <Text style={styles.nurseName}>{nurseUser.name}</Text>
                        </View>
                    </View>
                    <View style={styles.nurseSummary}>
                        <Text style={styles.summaryNumber}>{totalPatients}</Text>
                        <Text style={styles.summaryLabel}>bệnh nhân</Text>
                    </View>
                </View>

                {/* SUMMARY CARDS */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryCardPrimary}>
                        <View style={styles.summaryTopRow}>
                            <View style={styles.summaryIconPrimary}>
                                <Ionicons name="people-outline" size={18} color="#2563EB" />
                            </View>
                            <Text style={styles.summaryTag}>Đang theo dõi</Text>
                        </View>
                        <Text style={styles.summaryBig}>{totalPatients}</Text>
                        <Text style={styles.summarySub}>
                            Bệnh nhân đã có bản đo được ghi nhận
                        </Text>
                    </View>

                    <View style={styles.summaryCardAlert}>
                        <View style={styles.summaryTopRow}>
                            <View style={styles.summaryIconAlert}>
                                <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
                            </View>
                            <Text style={styles.summaryTagAlert}>Cảnh báo</Text>
                        </View>
                        <Text style={styles.summaryBig}>{patientsWithAlerts}</Text>
                        <Text style={styles.summarySub}>
                            Bệnh nhân đang có cảnh báo mức cao
                        </Text>
                    </View>
                </View>

                {/* SEARCH + FILTER */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm theo tên bệnh nhân, BHYT..."
                            value={search}
                            onChangeText={setSearch}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <TouchableOpacity style={styles.filterBtn}>
                        <Ionicons name="options-outline" size={18} color="#111827" />
                    </TouchableOpacity>
                </View>

                <View style={styles.filterTabs}>
                    <TouchableOpacity
                        style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
                        onPress={() => setFilter("all")}
                    >
                        <Text
                            style={[
                                styles.filterTabText,
                                filter === "all" && styles.filterTabTextActive,
                            ]}
                        >
                            Tất cả
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filter === "alerts" && styles.filterTabActive,
                        ]}
                        onPress={() => setFilter("alerts")}
                    >
                        <Text
                            style={[
                                styles.filterTabText,
                                filter === "alerts" && styles.filterTabTextActive,
                            ]}
                        >
                            Có cảnh báo
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterTab,
                            filter === "stable" && styles.filterTabActive,
                        ]}
                        onPress={() => setFilter("stable")}
                    >
                        <Text
                            style={[
                                styles.filterTabText,
                                filter === "stable" && styles.filterTabTextActive,
                            ]}
                        >
                            Ổn định
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* LIST PATIENTS */}
                <View style={{ marginTop: 12 }}>
                    {filteredPatients.map((p) => {
                        const initials = getInitials(p.user.name);
                        const hasHighAlert = p.alertsSummary.high > 0;

                        const bp = p.lastMeasurements.bp;
                        const glucose = p.lastMeasurements.glucose;
                        const spo2 = p.lastMeasurements.spo2;
                        const temp = p.lastMeasurements.temp;

                        return (
                            <TouchableOpacity
                                key={p.user._id}
                                style={styles.patientItem}
                                activeOpacity={0.85}
                                // onPress: điều hướng sang màn chi tiết bệnh nhân
                                onPress={() => { }}
                            >
                                {/* TOP ROW: INFO + BADGES */}
                                <View style={styles.patientItemTop}>
                                    <View style={styles.patientLeft}>
                                        <View style={styles.patientAvatarCircle}>
                                            <Text style={styles.patientAvatarInitial}>{initials}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.patientNameRow}>
                                                <Text style={styles.patientNameText}>{p.user.name}</Text>
                                                {!p.user.isActive && (
                                                    <View style={styles.statusBadgeInactive}>
                                                        <Text style={styles.statusBadgeInactiveText}>
                                                            Ngừng kích hoạt
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <Text style={styles.patientInfoLine}>
                                                BHYT: {p.patientInfo.insuranceNumber}
                                            </Text>
                                            <Text style={styles.patientInfoLineSmall}>
                                                CCCD: {p.patientInfo.CCCD}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.rightArrowBox}>
                                        {hasHighAlert ? (
                                            <View style={styles.alertBadgeHigh}>
                                                <Ionicons
                                                    name="alert-circle"
                                                    size={14}
                                                    color="#B91C1C"
                                                    style={{ marginRight: 4 }}
                                                />
                                                <Text style={styles.alertBadgeHighText}>Cảnh báo</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.alertBadgeNormal}>
                                                <Ionicons
                                                    name="checkmark-circle"
                                                    size={14}
                                                    color="#16A34A"
                                                    style={{ marginRight: 4 }}
                                                />
                                                <Text style={styles.alertBadgeNormalText}>Ổn</Text>
                                            </View>
                                        )}

                                        <Ionicons
                                            name="chevron-forward"
                                            size={18}
                                            color="#9CA3AF"
                                            style={{ marginTop: 4 }}
                                        />
                                    </View>
                                </View>

                                {/* MID ROW: LAST MEASUREMENTS */}
                                <View style={styles.metricsRow}>
                                    {/* BP */}
                                    <View style={styles.metricBox}>
                                        <View style={styles.metricHeader}>
                                            <Ionicons
                                                name="heart-outline"
                                                size={14}
                                                color="#EF4444"
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={styles.metricLabel}>HA</Text>
                                        </View>
                                        {bp ? (
                                            <Text style={styles.metricValue}>
                                                {bp.systolic}/{bp.diastolic}
                                            </Text>
                                        ) : (
                                            <Text style={styles.metricPlaceholder}>–</Text>
                                        )}
                                        <Text style={styles.metricUnit}>mmHg</Text>
                                    </View>

                                    {/* GLUCOSE */}
                                    <View style={styles.metricBox}>
                                        <View style={styles.metricHeader}>
                                            <Ionicons
                                                name="water-outline"
                                                size={14}
                                                color="#2563EB"
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={styles.metricLabel}>ĐH</Text>
                                        </View>
                                        {glucose ? (
                                            <Text style={styles.metricValue}>{glucose.value}</Text>
                                        ) : (
                                            <Text style={styles.metricPlaceholder}>–</Text>
                                        )}
                                        <Text style={styles.metricUnit}>
                                            {glucose ? "mg/dL" : ""}
                                        </Text>
                                    </View>

                                    {/* SpO2 */}
                                    <View style={styles.metricBox}>
                                        <View style={styles.metricHeader}>
                                            <Ionicons
                                                name="pulse-outline"
                                                size={14}
                                                color="#10B981"
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={styles.metricLabel}>SpO₂</Text>
                                        </View>
                                        {spo2 ? (
                                            <Text style={styles.metricValue}>{spo2.value}</Text>
                                        ) : (
                                            <Text style={styles.metricPlaceholder}>–</Text>
                                        )}
                                        <Text style={styles.metricUnit}>
                                            {spo2 ? "%" : ""}
                                        </Text>
                                    </View>

                                    {/* TEMP */}
                                    <View style={styles.metricBox}>
                                        <View style={styles.metricHeader}>
                                            <MaterialIcons
                                                name="device-thermostat"
                                                size={14}
                                                color="#F97316"
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={styles.metricLabel}>NĐ</Text>
                                        </View>
                                        {temp ? (
                                            <Text style={styles.metricValue}>{temp.value}</Text>
                                        ) : (
                                            <Text style={styles.metricPlaceholder}>–</Text>
                                        )}
                                        <Text style={styles.metricUnit}>
                                            {temp ? "°C" : ""}
                                        </Text>
                                    </View>
                                </View>

                                {/* BOTTOM ROW: TIME + ALERTS COUNT */}
                                <View style={styles.bottomRow}>
                                    <View style={styles.bottomLeft}>
                                        <Ionicons
                                            name="time-outline"
                                            size={14}
                                            color="#9CA3AF"
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.bottomText}>
                                            Lần đo gần nhất:{" "}
                                            {formatRelativeTime(p.lastMeasurementAt)}
                                        </Text>
                                    </View>

                                    <View style={styles.bottomRight}>
                                        <Ionicons
                                            name="notifications-outline"
                                            size={14}
                                            color="#F97316"
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.bottomText}>
                                            Cảnh báo: {p.alertsSummary.high}/{p.alertsSummary.total}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}

                    {filteredPatients.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons
                                name="search-outline"
                                size={26}
                                color="#9CA3AF"
                                style={{ marginBottom: 6 }}
                            />
                            <Text style={styles.emptyTitle}>Không tìm thấy bệnh nhân</Text>
                            <Text style={styles.emptySub}>
                                Kiểm tra lại từ khóa tìm kiếm hoặc bộ lọc.
                            </Text>
                        </View>
                    )}
                </View>

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
        marginBottom: 14,
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
    nurseSummary: {
        alignItems: "flex-end",
    },
    summaryNumber: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
    },
    summaryLabel: {
        fontSize: 11,
        color: "#6B7280",
    },

    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 10,
    },
    summaryCardPrimary: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: 0.02,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    summaryCardAlert: {
        flex: 1,
        backgroundColor: "#FEF2F2",
        borderRadius: 16,
        padding: 12,
    },
    summaryTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    summaryIconPrimary: {
        width: 28,
        height: 28,
        borderRadius: 999,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    summaryIconAlert: {
        width: 28,
        height: 28,
        borderRadius: 999,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
    },
    summaryTag: {
        fontSize: 11,
        color: "#2563EB",
        fontWeight: "600",
    },
    summaryTagAlert: {
        fontSize: 11,
        color: "#B91C1C",
        fontWeight: "600",
    },
    summaryBig: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
    },
    summarySub: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 2,
    },

    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        marginLeft: 6,
        color: "#111827",
    },
    filterBtn: {
        width: 40,
        height: 40,
        marginLeft: 8,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.02,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },

    filterTabs: {
        flexDirection: "row",
        backgroundColor: "#E5E7EB",
        borderRadius: 999,
        padding: 3,
        marginBottom: 8,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 6,
        borderRadius: 999,
        alignItems: "center",
    },
    filterTabActive: {
        backgroundColor: "#FFFFFF",
    },
    filterTabText: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
    },
    filterTabTextActive: {
        color: "#2563EB",
        fontWeight: "600",
    },

    patientItem: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.02,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    patientItemTop: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    patientLeft: {
        flexDirection: "row",
        flex: 1,
        marginRight: 8,
    },
    patientAvatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    patientAvatarInitial: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
    },
    patientNameRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 2,
    },
    patientNameText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#111827",
        marginRight: 6,
    },
    patientInfoLine: {
        fontSize: 12,
        color: "#4B5563",
    },
    patientInfoLineSmall: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 1,
    },
    statusBadgeInactive: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: "#FEE2E2",
    },
    statusBadgeInactiveText: {
        fontSize: 10,
        color: "#B91C1C",
        fontWeight: "600",
    },

    rightArrowBox: {
        alignItems: "flex-end",
    },
    alertBadgeHigh: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEE2E2",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    alertBadgeHighText: {
        fontSize: 11,
        color: "#B91C1C",
        fontWeight: "600",
    },
    alertBadgeNormal: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#DCFCE7",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    alertBadgeNormalText: {
        fontSize: 11,
        color: "#15803D",
        fontWeight: "600",
    },

    metricsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
        gap: 6,
    },
    metricBox: {
        flex: 1,
        borderRadius: 10,
        backgroundColor: "#F9FAFB",
        padding: 6,
    },
    metricHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#4B5563",
    },
    metricValue: {
        fontSize: 14,
        fontWeight: "700",
        color: "#111827",
        marginTop: 2,
    },
    metricPlaceholder: {
        fontSize: 14,
        fontWeight: "600",
        color: "#D1D5DB",
        marginTop: 2,
    },
    metricUnit: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 1,
    },

    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    bottomLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 4,
    },
    bottomRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    bottomText: {
        fontSize: 11,
        color: "#6B7280",
    },

    emptyState: {
        marginTop: 20,
        alignItems: "center",
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 2,
    },
    emptySub: {
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
    },
});

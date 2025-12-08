import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

export default function HomeScreen() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

                {/* HEADER */}
                <View style={styles.headerCard}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="heart" size={26} color="#4A80F0" />
                    </View>
                    <Text style={styles.headerTitle}>Sức khỏe của tôi</Text>
                </View>

                {/* GREETING */}
                <View style={styles.greetingBox}>
                    <Text style={styles.greeting}>Xin chào, Nguyễn Văn A</Text>
                    <Text style={styles.date}>Thứ Hai, 24 tháng 11, 2025</Text>
                </View>

                {/* BLOOD PRESSURE */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Huyết áp hôm nay</Text>

                    <View style={styles.row}>
                        <View style={styles.miniCard}>
                            <Text style={styles.miniValue}>120</Text>
                            <Text style={styles.miniUnit}>mmHg</Text>
                            <Text style={styles.miniLabel}>Tâm thu</Text>
                        </View>

                        <View style={styles.miniCard}>
                            <Text style={styles.miniValue}>80</Text>
                            <Text style={styles.miniUnit}>mmHg</Text>
                            <Text style={styles.miniLabel}>Tâm trương</Text>
                        </View>

                        <View style={styles.miniCard}>
                            <Text style={styles.miniValue}>72</Text>
                            <Text style={styles.miniUnit}>bpm</Text>
                            <Text style={styles.miniLabel}>Mạch</Text>
                        </View>
                    </View>
                </View>

                {/* BLOOD SUGAR */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Đường huyết hôm nay</Text>

                    <View style={styles.sugarBox}>
                        <View>
                            <Text style={styles.sugarValue}>95</Text>
                            <Text style={styles.sugarUnit}>mg/dL</Text>
                        </View>

                        <View style={styles.statusBox}>
                            <Text style={styles.statusText}>Bình thường</Text>
                        </View>
                    </View>
                </View>

                {/* BUTTONS */}
                <View style={styles.row}>
                    <TouchableOpacity style={styles.historyBtn}>
                        <MaterialIcons name="history" size={18} color="#376AED" />
                        <Text style={styles.historyText}>Xem lịch sử đo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.alertBtn}>
                        <Ionicons name="alert-circle" size={18} color="#D63031" />
                        <Text style={styles.alertText}>Xem tất cả cảnh báo</Text>
                    </TouchableOpacity>
                </View>

                {/* RECENT ALERTS */}
                <Text style={styles.sectionTitle}>Cảnh báo gần đây</Text>

                <View style={styles.warningItem}>
                    <Text style={styles.warnLabel}>Huyết áp bình thường</Text>
                    <View style={styles.normalTag}>
                        <Text style={styles.normalText}>Bình thường</Text>
                    </View>
                    <Text style={styles.warnTime}>2 giờ trước</Text>
                </View>

                <View style={styles.warningItem}>
                    <Text style={styles.warnLabel}>Đường huyết cao hơn bình thường</Text>
                    <View style={styles.highTag}>
                        <Text style={styles.highText}>Cao</Text>
                    </View>
                    <Text style={styles.warnTime}>6 giờ trước</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },

    headerCard: {
        backgroundColor: "#fff",
        padding: 18,
        borderRadius: 20,
        alignItems: "center",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },

    headerIcon: {
        width: 60,
        height: 60,
        backgroundColor: "#EAF0FF",
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },

    headerTitle: { fontWeight: "700", fontSize: 18 },

    greetingBox: { marginBottom: 20 },
    greeting: { fontSize: 18, fontWeight: "600" },
    date: { color: "#777", marginTop: 4, fontSize: 13 },

    card: {
        backgroundColor: "#fff",
        padding: 18,
        borderRadius: 15,
        marginBottom: 20,
        elevation: 2,
    },

    cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 15 },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    miniCard: {
        backgroundColor: "#F8F9FF",
        paddingVertical: 18,
        borderRadius: 12,
        width: "30%",
        alignItems: "center",
    },

    miniValue: { fontSize: 22, fontWeight: "700" },
    miniUnit: { color: "#666", fontSize: 13 },
    miniLabel: { marginTop: 6, color: "#777", fontSize: 12 },

    sugarBox: {
        backgroundColor: "#F8F9FF",
        padding: 18,
        borderRadius: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    sugarValue: { fontSize: 24, fontWeight: "700" },
    sugarUnit: { fontSize: 13, color: "#666" },

    statusBox: {
        backgroundColor: "#E4FFE9",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
    },

    statusText: { color: "#1A8F4A", fontWeight: "700", fontSize: 13 },

    historyBtn: {
        backgroundColor: "#F3F7FF",
        padding: 12,
        borderRadius: 10,
        width: "48%",
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
    },

    historyText: {
        textAlign: "center",
        color: "#376AED",
        fontWeight: "600",
    },

    alertBtn: {
        backgroundColor: "#FFF0F0",
        padding: 12,
        borderRadius: 10,
        width: "48%",
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
    },

    alertText: {
        textAlign: "center",
        color: "#D63031",
        fontWeight: "600",
    },

    sectionTitle: {
        fontWeight: "700",
        fontSize: 16,
        marginVertical: 20,
    },

    warningItem: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },

    warnLabel: { fontSize: 14, fontWeight: "600", marginBottom: 6 },

    normalTag: {
        backgroundColor: "#E4FFE9",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: "flex-start",
    },

    normalText: { color: "#1A8F4A", fontWeight: "700" },

    highTag: {
        backgroundColor: "#FFE5E5",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: "flex-start",
    },

    highText: { color: "#D63031", fontWeight: "700" },

    warnTime: { color: "#777", marginTop: 6, fontSize: 12 },
});

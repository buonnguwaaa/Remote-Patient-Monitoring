import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width - 40;

export default function HistoryScreen() {
    const [tab, setTab] = useState("blood");

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

                {/* HEADER */}
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={22} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Lịch sử đo</Text>
                </View>

                {/* TABS */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        onPress={() => setTab("blood")}
                        style={[styles.tabItem, tab === "blood" && styles.tabActive]}
                    >
                        <Ionicons name="heart" size={16} color={tab === "blood" ? "#376AED" : "#666"} />
                        <Text style={[styles.tabText, tab === "blood" && styles.tabTextActive]}>
                            Huyết áp
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setTab("sugar")}
                        style={[styles.tabItem, tab === "sugar" && styles.tabActive]}
                    >
                        <Ionicons name="water" size={16} color={tab === "sugar" ? "#376AED" : "#666"} />
                        <Text style={[styles.tabText, tab === "sugar" && styles.tabTextActive]}>
                            Đường huyết
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* TREND CARD */}
                <View style={styles.card}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardTitle}>Xu hướng gần đây</Text>
                        <TouchableOpacity>
                            <Text style={styles.detailBtn}>Chi tiết</Text>
                        </TouchableOpacity>
                    </View>

                    <LineChart
                        data={{
                            labels: ["31/10", "01/11", "01/11", "02/11"],
                            datasets: [
                                {
                                    data: [120, 118, 115, 130],
                                    color: () => "#FF4D4F",
                                    strokeWidth: 2,
                                },
                                {
                                    data: [80, 82, 78, 85],
                                    color: () => "#4A80F0",
                                    strokeWidth: 2,
                                },
                            ],
                            legend: ["Tâm thu", "Tâm trương"],
                        }}
                        width={screenWidth}
                        height={180}
                        yAxisLabel=""
                        chartConfig={{
                            backgroundColor: "#FFFFFF",
                            backgroundGradientFrom: "#FFFFFF",
                            backgroundGradientTo: "#FFFFFF",
                            color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                            propsForDots: {
                                r: "4",
                            },
                        }}
                        style={{ marginTop: 10, borderRadius: 12 }}
                    />
                </View>

                {/* RECORD LIST */}
                <Text style={styles.sectionTitle}>Bản ghi đo</Text>

                {/* ITEM */}
                <View style={styles.recordItem}>
                    <View style={styles.rowBetween}>
                        <View style={styles.row}>
                            <FontAwesome5 name="calendar-alt" size={14} color="#777" />
                            <Text style={styles.recordDate}>02/11/2025</Text>
                        </View>
                        <Text style={styles.tagNormal}>Bình thường</Text>
                    </View>

                    <Text style={styles.recordTime}>08:30</Text>

                    <View style={styles.rowBetween}>
                        <View style={styles.recordValue}>
                            <Text style={styles.valueBig}>120</Text>
                            <Text style={styles.unit}>mmHg</Text>
                        </View>

                        <View style={styles.recordValue}>
                            <Text style={styles.valueBig}>80</Text>
                            <Text style={styles.unit}>mmHg</Text>
                        </View>

                        <View style={styles.recordValue}>
                            <Text style={styles.valueBig}>72</Text>
                            <Text style={styles.unit}>bpm</Text>
                        </View>
                    </View>
                </View>

                {/* ITEM */}
                <View style={styles.recordItem}>
                    <View style={styles.rowBetween}>
                        <View style={styles.row}>
                            <FontAwesome5 name="calendar-alt" size={14} color="#777" />
                            <Text style={styles.recordDate}>01/11/2025</Text>
                        </View>
                        <Text style={styles.tagHigh}>Cao</Text>
                    </View>

                    <Text style={styles.recordTime}>14:15</Text>

                    <View style={styles.rowBetween}>
                        <View style={styles.recordValue}>
                            <Text style={styles.valueBig}>135</Text>
                            <Text style={styles.unit}>mmHg</Text>
                        </View>

                        <View style={styles.recordValue}>
                            <Text style={styles.valueBig}>88</Text>
                            <Text style={styles.unit}>mmHg</Text>
                        </View>

                        <View style={styles.recordValue}>
                            <Text style={styles.valueBig}>78</Text>
                            <Text style={styles.unit}>bpm</Text>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    headerTitle: { fontSize: 18, fontWeight: "700" },

    tabs: {
        flexDirection: "row",
        backgroundColor: "#E9EEFF",
        padding: 6,
        borderRadius: 15,
        marginBottom: 20,
    },

    tabItem: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "transparent",
    },

    tabActive: {
        backgroundColor: "#fff",
    },

    tabText: { color: "#666", fontWeight: "600" },
    tabTextActive: { color: "#376AED" },

    card: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 16,
        marginBottom: 25,
        elevation: 2,
    },

    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    row: { flexDirection: "row", alignItems: "center", gap: 6 },

    cardTitle: { fontSize: 16, fontWeight: "700" },
    detailBtn: { color: "#376AED", fontWeight: "600" },

    sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },

    recordItem: {
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 1,
    },

    recordDate: { marginLeft: 6, color: "#555", fontSize: 14 },
    recordTime: { marginTop: 4, color: "#777", marginBottom: 10 },

    tagNormal: {
        backgroundColor: "#E4FFE9",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        color: "#1A8F4A",
        fontWeight: "700",
        fontSize: 12,
    },

    tagHigh: {
        backgroundColor: "#FFE5E5",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        color: "#D63031",
        fontWeight: "700",
        fontSize: 12,
    },

    recordValue: { alignItems: "center" },

    valueBig: { fontSize: 20, fontWeight: "700" },
    unit: { color: "#666", fontSize: 13 },
});

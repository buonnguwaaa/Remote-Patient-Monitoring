import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";

export default function AlertScreen() {
  const [tab, setTab] = useState("all");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#333" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Cảnh báo</Text>

          <View style={styles.badgeNew}>
            <Text style={styles.badgeText}>2 mới</Text>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabItem, tab === "all" && styles.tabActive]}
            onPress={() => setTab("all")}
          >
            <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, tab === "new" && styles.tabActive]}
            onPress={() => setTab("new")}
          >
            <Text style={[styles.tabText, tab === "new" && styles.tabTextActive]}>
              Mới
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, tab === "done" && styles.tabActive]}
            onPress={() => setTab("done")}
          >
            <Text style={[styles.tabText, tab === "done" && styles.tabTextActive]}>
              Đã xác nhận
            </Text>
          </TouchableOpacity>
        </View>

        {/* ALERT LIST */}
        <View style={styles.list}>

          {/* ITEM 1 */}
          <View style={[styles.alertCard, { borderColor: "#FFB6B6" }]}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <Ionicons name="heart" size={18} color="#FF4D4F" />
                <Text style={styles.typeRed}>Huyết áp</Text>
              </View>
              <Text style={styles.badgeSmallBlue}>Mới</Text>
            </View>

            <Text style={styles.alertTitleRed}>Huyết áp cao nguy hiểm</Text>

            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Giá trị đo: <Text style={styles.bold}>165/95</Text></Text>
              <Text style={styles.detailText}>Ngưỡng an toàn: 120-140/80-90</Text>
            </View>

            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color="#777" />
              <Text style={styles.time}>02/11/2025 • 14:30</Text>
            </View>

            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionText}>Đánh dấu đã xử lý</Text>
            </TouchableOpacity>
          </View>

          {/* ITEM 2 */}
          <View style={[styles.alertCard, { borderColor: "#FFE7A6" }]}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <MaterialIcons name="warning" size={18} color="#F0A500" />
                <Text style={styles.typeYellow}>Đường huyết</Text>
              </View>
              <Text style={styles.badgeSmallBlue}>Mới</Text>
            </View>

            <Text style={styles.alertTitleYellow}>Đường huyết cao hơn bình thường</Text>

            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Giá trị đo: <Text style={styles.bold}>145 mg/dL</Text></Text>
              <Text style={styles.detailText}>Ngưỡng an toàn: {"<"} 140 mg/dL</Text>
            </View>

            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color="#777" />
              <Text style={styles.time}>02/11/2025 • 08:15</Text>
            </View>

            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionText}>Đánh dấu đã xử lý</Text>
            </TouchableOpacity>
          </View>

          {/* ITEM 3 */}
          <View style={[styles.alertCard, { borderColor: "#A8E6A1" }]}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <Ionicons name="checkmark-circle" size={18} color="#2ECC71" />
                <Text style={styles.typeGreen}>Huyết áp</Text>
              </View>
            </View>

            <Text style={styles.alertTitleGreen}>Huyết áp trở lại bình thường</Text>

            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Giá trị đo: <Text style={styles.bold}>118/76</Text></Text>
              <Text style={styles.detailText}>Ngưỡng an toàn: 120-140/80-90</Text>
            </View>

            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color="#777" />
              <Text style={styles.time}>01/11/2025 • 07:10</Text>
            </View>

            <Text style={styles.doneText}>Đã xử lý</Text>
          </View>

          {/* ITEM 4 */}
          <View style={[styles.alertCard, { borderColor: "#FFB6B6" }]}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <Ionicons name="alert-circle" size={18} color="#FF4D4F" />
                <Text style={styles.typeRed}>Đường huyết</Text>
              </View>
            </View>

            <Text style={styles.alertTitleRed}>Đường huyết rất cao</Text>

            <View style={styles.detailBox}>
              <Text style={styles.detailText}>Giá trị đo: <Text style={styles.bold}>185 mg/dL</Text></Text>
              <Text style={styles.detailText}>Ngưỡng an toàn: {"<"} 140 mg/dL</Text>
            </View>

            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color="#777" />
              <Text style={styles.time}>01/11/2025 • 15:20</Text>
            </View>

            <Text style={styles.doneText}>Đã xử lý</Text>
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
    marginBottom: 16,
  },

  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  headerTitle: { fontSize: 18, fontWeight: "700", flex: 1 },

  badgeNew: {
    backgroundColor: "#FF4D4F",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#E9EEFF",
    padding: 5,
    borderRadius: 12,
    marginBottom: 20,
  },

  tabItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  tabActive: {
    backgroundColor: "#fff",
    elevation: 2,
  },

  tabText: { color: "#666", fontWeight: "600" },
  tabTextActive: { color: "#376AED" },

  list: { gap: 16 },

  alertCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    borderWidth: 1.5,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  typeRed: { color: "#FF4D4F", fontWeight: "700" },
  typeYellow: { color: "#F0A500", fontWeight: "700" },
  typeGreen: { color: "#2ECC71", fontWeight: "700" },

  badgeSmallBlue: {
    backgroundColor: "#E9F1FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    color: "#376AED",
    fontWeight: "700",
    fontSize: 12,
  },

  alertTitleRed: { color: "#FF4D4F", fontSize: 15, fontWeight: "700", marginTop: 6 },
  alertTitleYellow: { color: "#F0A500", fontSize: 15, fontWeight: "700", marginTop: 6 },
  alertTitleGreen: { color: "#2ECC71", fontSize: 15, fontWeight: "700", marginTop: 6 },

  detailBox: { marginTop: 10, marginBottom: 10 },
  detailText: { color: "#555", fontSize: 13, marginBottom: 4 },
  bold: { fontWeight: "700" },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  time: { color: "#777", fontSize: 12 },

  actionBtn: {
    backgroundColor: "#4A80F0",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  actionText: { color: "#fff", fontWeight: "700" },

  doneText: {
    color: "#2ECC71",
    fontWeight: "700",
    marginTop: 6,
  },
});

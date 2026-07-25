import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

export const NursePatientListHeader = React.memo(({ nurseName, totalPatients, patientsWithAlerts, search, setSearch }) => {
  return (
    <View style={styles.container}>
      {/* Title at top - matching MeasurementInputScreen */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Danh sách bệnh nhân</Text>
      </View>

      {/* Nurse bar - matching MeasurementInputScreen */}
      <View style={styles.nurseBar}>
        <View style={styles.nurseLeft}>
          <View style={styles.nurseAvatar}>
            <FontAwesome5 name="user-nurse" size={14} color="#FFFFFF" />
          </View>
          <View style={styles.nurseTextWrap}>
            <Text style={styles.nurseLabel}>Điều dưỡng</Text>
            <Text style={styles.nurseName} numberOfLines={1}>{nurseName || "Điều dưỡng"}</Text>
          </View>
        </View>
      </View>

      {/* Search Input Box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên hoặc mã bệnh nhân..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
        />
        {search.length > 0 && (
          <Ionicons name="close-circle" size={16} color="#D1D5DB" onPress={() => setSearch("")} style={{ padding: 4 }} />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  headerRow: { marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },

  nurseBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  nurseLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  nurseAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  nurseTextWrap: { flex: 1 },
  nurseLabel: { fontSize: 11, color: "#6B7280", fontWeight: "500" },
  nurseName: { fontSize: 14, fontWeight: "700", color: "#111827" },

  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 10 },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: "#111827" },
});

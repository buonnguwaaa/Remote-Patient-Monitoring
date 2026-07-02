import React from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

export const NursePatientListHeader = React.memo(({ nurseName, totalPatients, patientsWithAlerts, search, setSearch }) => {
  const stable = totalPatients - patientsWithAlerts;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.nurseInfo}>
          <View style={styles.avatar}>
            <FontAwesome5 name="user-nurse" size={14} color="#FFF" />
          </View>
          <View>
            <Text style={styles.role}>Điều dưỡng</Text>
            <Text style={styles.name}>{nurseName || "---"}</Text>
          </View>
        </View>
        <Text style={styles.title}>Bệnh nhân theo dõi</Text>
      </View>


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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  nurseInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  role: { fontSize: 11, color: "#6B7280" },
  name: { fontSize: 14, fontWeight: "700", color: "#111827" },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },

  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 10 },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: "#111827" },
});

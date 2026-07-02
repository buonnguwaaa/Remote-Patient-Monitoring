import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export const NursePatientListFilter = React.memo(({ filter, setFilter }) => {
  const TABS = [
    { key: "all", label: "Tất cả" },
    { key: "alerts", label: "Có cảnh báo" },
    { key: "stable", label: "Ổn định" },
  ];

  return (
    <View style={styles.container}>
      {TABS.map(t => (
        <TouchableOpacity 
          key={t.key} 
          style={[styles.tab, filter === t.key && styles.tabActive]}
          onPress={() => setFilter(t.key)}
        >
          <Text style={[styles.text, filter === t.key && styles.textActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flexDirection: "row", backgroundColor: "#F3F4F6", padding: 4, borderRadius: 10, marginHorizontal: 16, marginVertical: 12 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  text: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  textActive: { color: "#111827" },
});

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export const TABS = [
  { key: "history", label: "Lịch sử" },
  { key: "alerts", label: "Cảnh báo" },
  { key: "prescriptions", label: "Đơn thuốc" },
  { key: "profile", label: "Hồ sơ" },
  { key: "thresholds", label: "Ngưỡng" },
];

export function PatientTabs({ activeTab, onTabChange }) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {TABS.map(t => (
          <TouchableOpacity 
            key={t.key} 
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => onTabChange(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  scrollContent: { paddingHorizontal: 16, gap: 24 },
  tab: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#2563EB" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#2563EB" },
});

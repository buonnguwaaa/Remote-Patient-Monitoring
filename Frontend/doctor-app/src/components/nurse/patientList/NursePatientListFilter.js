import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export const NursePatientListFilter = React.memo(({ filter, setFilter, counts = {} }) => {
  const TABS = [
    { key: "all", label: "Tất cả", count: counts.all },
    { key: "alerts", label: "Có cảnh báo", count: counts.alerts },
    { key: "stable", label: "Ổn định", count: counts.stable },
  ];

  return (
    <View style={styles.container}>
      {TABS.map(t => (
        <TouchableOpacity 
          key={t.key} 
          style={[styles.tab, filter === t.key && styles.tabActive]}
          onPress={() => setFilter(t.key)}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.text, filter === t.key && styles.textActive]}>{t.label}</Text>
            {t.count !== undefined && (
              <View style={[styles.badge, filter === t.key && styles.badgeActive]}>
                <Text style={[styles.badgeText, filter === t.key && styles.badgeTextActive]}>{t.count}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flexDirection: "row", backgroundColor: "#F3F4F6", padding: 4, borderRadius: 10, marginHorizontal: 16, marginVertical: 12 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabContent: { flexDirection: "row", alignItems: "center", gap: 6 },
  text: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  textActive: { color: "#111827" },
  badge: { backgroundColor: "#E5E7EB", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeActive: { backgroundColor: "#EFF6FF" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  badgeTextActive: { color: "#2563EB" },
});

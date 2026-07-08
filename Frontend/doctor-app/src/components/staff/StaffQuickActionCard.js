import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function StaffQuickActionCard({ actions }) {
  // actions: [{ label: string, subtitle: string, icon: string, color: string, onPress: function }]
  return (
    <View style={styles.grid}>
      {actions.map((action, idx) => (
        <TouchableOpacity
          key={idx}
          style={styles.card}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <View style={[styles.iconWrap, { backgroundColor: action.color + "1A" }]}>
            <Ionicons name={action.icon} size={20} color={action.color} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title} numberOfLines={1}>{action.label}</Text>
            {action.subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>{action.subtitle}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  textWrap: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    color: "#6B7280",
  },
});

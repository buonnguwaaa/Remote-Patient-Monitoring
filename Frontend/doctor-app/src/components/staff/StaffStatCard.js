import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function StaffStatCard({ items }) {
  // items: [{ label: string, value: string/number, icon: string, color: string, onPress: function }]
  return (
    <View style={styles.row}>
      {items.map((item, idx) => (
        <TouchableOpacity
          key={idx}
          style={[styles.card, { borderLeftColor: item.color }]}
          onPress={item.onPress}
          activeOpacity={item.onPress ? 0.7 : 1}
        >
          <View style={[styles.iconWrap, { backgroundColor: item.color + "1A" }]}>
            <Ionicons name={item.icon} size={16} color={item.color} />
          </View>
          <Text style={styles.value} numberOfLines={1}>{item.value}</Text>
          <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
          {item.subtitle && <Text style={styles.subtitle} numberOfLines={1}>{item.subtitle}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderRightColor: "#F3F4F6",
    borderTopColor: "#F3F4F6",
    borderBottomColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    marginTop: 2,
  },
  subtitle: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 2,
  },
});

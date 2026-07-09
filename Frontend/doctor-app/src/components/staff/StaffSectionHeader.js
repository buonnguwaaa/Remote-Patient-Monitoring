import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function StaffSectionHeader({ title, subtitle }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    marginTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
});

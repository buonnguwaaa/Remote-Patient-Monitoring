import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function StaffEmptyState({ iconName = "document-text-outline", title, description }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name={iconName} size={32} color="#9CA3AF" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    marginVertical: 8,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
});

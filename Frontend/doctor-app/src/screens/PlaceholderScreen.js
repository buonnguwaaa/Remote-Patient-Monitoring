import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function PlaceholderScreen({ route }) {
  const title = route?.params?.title || "Chức năng";
  const icon = route?.params?.icon || "construct-outline";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <Ionicons name={icon} size={56} color="#93C5FD" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Chức năng đang được phát triển</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F2F6FF" },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginTop: 16 },
  sub: { fontSize: 14, color: "#6B7280", marginTop: 8 },
});

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import InputMeasurementPatientScreen from "./InputMeasurementPatientScreen";
import HistoryScreen from "./HistoryScreen";

export default function TrackingScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState("input"); // "input" | "history"

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentBackground}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "input" && styles.segmentTabActive]}
            onPress={() => setActiveTab("input")}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTab === "input" && styles.segmentTextActive]}>
              Nhập liệu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "history" && styles.segmentTabActive]}
            onPress={() => setActiveTab("history")}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTab === "history" && styles.segmentTextActive]}>
              Lịch sử
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "input" ? (
          <InputMeasurementPatientScreen isEmbedded />
        ) : (
          <HistoryScreen isEmbedded />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F6FF",
  },
  segmentContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#F2F6FF",
  },
  segmentBackground: {
    flexDirection: "row",
    backgroundColor: "#E5EDFF",
    borderRadius: 999,
    padding: 4,
    height: 44,
  },
  segmentTab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
  },
  segmentTabActive: {
    backgroundColor: "#2563EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
});

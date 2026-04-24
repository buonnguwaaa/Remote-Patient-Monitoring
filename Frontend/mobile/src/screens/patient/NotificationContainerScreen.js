import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AlertScreen from "./AlertScreen";
import NotificationInboxScreen from "./NotificationInboxScreen";

export default function NotificationContainerScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState("alerts"); // "alerts" | "system"

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentBackground}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "alerts" && styles.segmentTabActive]}
            onPress={() => setActiveTab("alerts")}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTab === "alerts" && styles.segmentTextActive]}>
              Cảnh báo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "system" && styles.segmentTabActive]}
            onPress={() => setActiveTab("system")}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, activeTab === "system" && styles.segmentTextActive]}>
              Hệ thống
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "alerts" ? (
          <AlertScreen isEmbedded />
        ) : (
          <NotificationInboxScreen isEmbedded />
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

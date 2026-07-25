import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";

import { useBadge } from "../../context/BadgeContext";
import AlertScreen from "./AlertScreen";
import NotificationInboxScreen from "./NotificationInboxScreen";

export default function NotificationContainerScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState("alerts"); // "alerts" | "system"
  const isFocused = useIsFocused();
  const { refreshBadges, unreadAlertsCount = 0, unreadRemindersCount = 0 } = useBadge();

  // Refresh badge count when screen is focused
  useEffect(() => {
    if (isFocused) {
      refreshBadges();
    }
  }, [isFocused, refreshBadges]);

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
            <View style={styles.tabContentRow}>
              <Text style={[styles.segmentText, activeTab === "alerts" && styles.segmentTextActive]}>
                Cảnh báo sức khỏe
              </Text>
              {unreadAlertsCount > 0 && (
                <View
                  style={[
                    styles.badgePill,
                    activeTab === "alerts" ? styles.badgePillActive : styles.badgePillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgePillText,
                      activeTab === "alerts" ? styles.badgePillTextActive : styles.badgePillTextInactive,
                    ]}
                  >
                    {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === "system" && styles.segmentTabActive]}
            onPress={() => setActiveTab("system")}
            activeOpacity={0.8}
          >
            <View style={styles.tabContentRow}>
              <Text style={[styles.segmentText, activeTab === "system" && styles.segmentTextActive]}>
                Nhắc nhở
              </Text>
              {unreadRemindersCount > 0 && (
                <View
                  style={[
                    styles.badgePill,
                    activeTab === "system" ? styles.badgePillActive : styles.badgePillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgePillText,
                      activeTab === "system" ? styles.badgePillTextActive : styles.badgePillTextInactive,
                    ]}
                  >
                    {unreadRemindersCount > 99 ? "99+" : unreadRemindersCount}
                  </Text>
                </View>
              )}
            </View>
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
  tabContentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  badgePill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgePillActive: {
    backgroundColor: "#FFFFFF",
  },
  badgePillInactive: {
    backgroundColor: "#EF4444",
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgePillTextActive: {
    color: "#2563EB",
  },
  badgePillTextInactive: {
    color: "#FFFFFF",
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

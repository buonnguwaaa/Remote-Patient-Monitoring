/**
 * AccountHistoryScreen.js
 *
 * Màn hình hiển thị "Lịch sử hoạt động" dành cho Bác sĩ và Y tá (Staff App).
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import ActivityHistoryList from "../components/ActivityHistoryList";
import { colors } from "../theme/rpmTheme";

export default function AccountHistoryScreen() {
  return (
    <View style={styles.container}>
      <ActivityHistoryList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

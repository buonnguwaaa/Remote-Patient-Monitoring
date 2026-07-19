import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function StaffScreenContainer({ children, style }) {
  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={["left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
});

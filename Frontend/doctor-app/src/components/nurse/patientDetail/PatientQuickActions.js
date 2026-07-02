import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function PatientQuickActions({ onInput, onPrescription, onCall, phone, emergencyPhone }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.actionBtn} onPress={onInput}>
        <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
          <Ionicons name="create" size={20} color="#2563EB" />
        </View>
        <Text style={styles.label}>Nhập KQ</Text>
      </TouchableOpacity>



      <TouchableOpacity 
        style={[styles.actionBtn, !phone && { opacity: 0.5 }]} 
        onPress={() => phone && onCall(phone)} 
        disabled={!phone}
      >
        <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
          <Ionicons name="call" size={20} color="#16A34A" />
        </View>
        <Text style={styles.label}>Gọi điện</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionBtn, !emergencyPhone && { opacity: 0.5 }]} 
        onPress={() => emergencyPhone && onCall(emergencyPhone)}
        disabled={!emergencyPhone}
      >
        <View style={[styles.iconBox, { backgroundColor: "#FEE2E2" }]}>
          <Ionicons name="warning" size={20} color="#DC2626" />
        </View>
        <Text style={styles.label}>Khẩn cấp</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  actionBtn: { alignItems: "center", gap: 6, flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  label: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
});

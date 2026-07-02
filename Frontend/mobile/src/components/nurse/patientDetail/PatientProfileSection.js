import React from "react";
import { View, Text, StyleSheet } from "react-native";

function PR({ label, val }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.val}>{val || "---"}</Text>
    </View>
  );
}

export function PatientProfileSection({ profile }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Thông tin hành chính</Text>
        <PR label="Họ tên" val={profile.name} />
        <PR label="Mã hồ sơ" val={profile.patientCode} />
        <PR label="Giới tính" val={profile.gender === "male" ? "Nam" : profile.gender === "female" ? "Nữ" : profile.gender} />
        <PR label="Ngày sinh" val={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("vi-VN") : ""} />
        <PR label="BHYT" val={profile.insuranceNumber} />
        <PR label="CCCD" val={profile.cccd} />
        
        <View style={styles.divider} />
        <Text style={styles.title}>Liên hệ</Text>
        <PR label="SĐT" val={profile.phone} />
        <PR label="SĐT Khẩn cấp" val={profile.emergencyContactPhone ? `${profile.emergencyContactPhone} (${profile.emergencyContactName})` : ""} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: { backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", padding: 16 },
  title: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 12 },
  row: { marginBottom: 12 },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  val: { fontSize: 14, fontWeight: "500", color: "#111827" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 16 },
});

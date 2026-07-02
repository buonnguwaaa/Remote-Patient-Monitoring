import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const STATUS_META = {
  active: { label: "Đang điều trị", bg: "#D1FAE5", text: "#065F46" },
  completed: { label: "Hoàn thành", bg: "#DBEAFE", text: "#1E40AF" },
  discontinued: { label: "Ngưng dùng", bg: "#FEE2E2", text: "#991B1B" },
  expired: { label: "Hết hạn", bg: "#F3F4F6", text: "#4B5563" },
};

function formatDateVN(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function PrescriptionCard({ prescription, onDetail, onEdit, onStatusChange }) {
  const meta = STATUS_META[prescription.status] || STATUS_META.expired;
  const medications = prescription.medications || [];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
        <Text style={styles.dateText}>
          {formatDateVN(prescription.startDate)} - {prescription.endDate ? formatDateVN(prescription.endDate) : "Không GH"}
        </Text>
      </View>

      {/* Body: Medicines summary */}
      <View style={styles.body}>
        {medications.slice(0, 3).map((med, i) => (
          <View key={i} style={styles.medRow}>
            <View style={styles.medBullet} />
            <Text style={styles.medName} numberOfLines={1}>
              {med.drugName} <Text style={styles.medDosage}>({med.dosage})</Text>
            </Text>
          </View>
        ))}
        {medications.length > 3 && (
          <Text style={styles.moreMeds}>+ {medications.length - 3} loại thuốc khác...</Text>
        )}
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onDetail(prescription)}>
          <Ionicons name="document-text-outline" size={16} color="#4B5563" />
          <Text style={styles.actionText}>Chi tiết</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(prescription)}>
          <Ionicons name="create-outline" size={16} color="#2563EB" />
          <Text style={[styles.actionText, { color: "#2563EB" }]}>Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onStatusChange(prescription)}>
          <Ionicons name="swap-horizontal-outline" size={16} color="#EA580C" />
          <Text style={[styles.actionText, { color: "#EA580C" }]}>Trạng thái</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function PrescriptionPatientGroup({ patientInfo, prescriptions, onDetail, onEdit, onStatusChange }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View style={styles.groupContainer}>
      <TouchableOpacity style={styles.groupHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(patientInfo.name || "BN").split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase()}
          </Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patientInfo.name}</Text>
          <Text style={styles.patientCode}>{patientInfo.code || "Chưa có mã"}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{prescriptions.length}</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.groupBody}>
          {prescriptions.map(p => (
            <PrescriptionCard
              key={p.id}
              prescription={p}
              onDetail={onDetail}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  groupContainer: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: "700", color: "#1D4ED8" },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  patientCode: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  countBadge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  countText: { fontSize: 12, fontWeight: "700", color: "#4B5563", lineHeight: 16 },
  groupBody: { padding: 14, backgroundColor: "#F2F6FF" },
  
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  badgeText: { fontSize: 11, fontWeight: "700", lineHeight: 16 },
  dateText: { fontSize: 12, color: "#6B7280", fontWeight: "500", lineHeight: 16 },
  body: { marginBottom: 12 },
  medRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  medBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2563EB", marginRight: 8 },
  medName: { fontSize: 13, fontWeight: "600", color: "#111827", flex: 1, lineHeight: 18 },
  medDosage: { fontWeight: "400", color: "#6B7280", lineHeight: 18 },
  moreMeds: { fontSize: 12, color: "#9CA3AF", fontStyle: "italic", marginLeft: 14, lineHeight: 16 },
  footer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
    justifyContent: "space-between",
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 8 },
  actionText: { fontSize: 13, fontWeight: "600", color: "#4B5563", lineHeight: 18 },
});

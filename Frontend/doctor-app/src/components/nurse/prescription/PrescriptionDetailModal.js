import React from "react";
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STATUS_META = {
  active: { label: "Đang điều trị", bg: "#D1FAE5", text: "#065F46" },
  completed: { label: "Hoàn thành", bg: "#DBEAFE", text: "#1E40AF" },
  discontinued: { label: "Ngưng dùng", bg: "#FEE2E2", text: "#991B1B" },
  expired: { label: "Hết hạn", bg: "#F3F4F6", text: "#4B5563" },
};

const WEEKDAY_FULL = { 0: "Chủ nhật", 1: "Thứ 2", 2: "Thứ 3", 3: "Thứ 4", 4: "Thứ 5", 5: "Thứ 6", 6: "Thứ 7" };

function formatDateVN(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function todLabel(tod) {
  if (tod === "morning") return "Sáng";
  if (tod === "noon") return "Chiều";
  if (tod === "evening") return "Tối";
  return "Khác";
}

function mealLabel(mt) {
  if (mt === "pre_meal") return "Trước ăn";
  if (mt === "post_meal") return "Sau ăn";
  return "Bất kỳ";
}

export function PrescriptionDetailModal({ visible, prescription, patientName, onClose, onEdit, onStatusChange }) {
  const insets = useSafeAreaInsets();

  if (!prescription) return null;
  const meta = STATUS_META[prescription.status] || STATUS_META.expired;
  
  const handleEdit = () => { onClose(); if (onEdit) onEdit(prescription); };
  const handleStatus = () => { onClose(); if (onStatusChange) onStatusChange(prescription); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.safeArea}>
        {/* Top Header with Insets */}
        <View style={[
          styles.header, 
          { paddingTop: Platform.OS === "android" ? Math.max(insets.top, 16) : 14 }
        ]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Chi tiết đơn thuốc</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.body} 
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }} 
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.patientName}>{patientName}</Text>
              <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                {formatDateVN(prescription.startDate)} - {prescription.endDate ? formatDateVN(prescription.endDate) : "Không giới hạn"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="repeat-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                {prescription.daysOfWeek?.length === 7 ? "Mỗi ngày" : prescription.daysOfWeek?.map(d => WEEKDAY_FULL[d]).join(", ")}
              </Text>
            </View>
          </View>

          {/* Medications */}
          <Text style={styles.sectionTitle}>Danh sách thuốc ({prescription.medications?.length || 0})</Text>
          {(prescription.medications || []).map((med, i) => (
            <View key={i} style={styles.medCard}>
              <Text style={styles.medTitle}>{med.drugName} <Text style={styles.medDosage}>({med.dosage})</Text></Text>
              {med.route ? <Text style={styles.medRoute}>Đường dùng: {med.route}</Text> : null}
              {med.instructions ? <Text style={styles.medInstructions}>Chỉ dẫn: {med.instructions}</Text> : null}
              
              <View style={styles.scheduleContainer}>
                {(med.schedule || []).map((dose, j) => (
                  <View key={j} style={styles.scheduleChip}>
                    <Text style={styles.scheduleText}>
                      {todLabel(dose.timeOfDay)} · {dose.hour !== undefined ? `${String(dose.hour).padStart(2, "0")}:${String(dose.minute || 0).padStart(2, "0")}` : "---"} · {mealLabel(dose.mealTiming)} · {dose.pillCount} viên
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Action Footer with Bottom Insets */}
        <View style={[
          styles.footer, 
          { paddingBottom: Math.max(insets.bottom, 16) + 6 }
        ]}>
          {onStatusChange && (
            <TouchableOpacity style={[styles.footerBtn, styles.statusBtn]} onPress={handleStatus}>
              <Ionicons name="swap-horizontal" size={18} color="#EA580C" />
              <Text style={styles.statusBtnText}>Đổi trạng thái</Text>
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity style={[styles.footerBtn, styles.editBtn]} onPress={handleEdit}>
              <Ionicons name="create" size={18} color="#FFFFFF" />
              <Text style={styles.editBtnText}>Chỉnh sửa đơn</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  body: { padding: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  patientName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  infoText: { fontSize: 14, color: "#4B5563", fontWeight: "500" },
  
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 },
  medCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  medTitle: { fontSize: 15, fontWeight: "700", color: "#2563EB", marginBottom: 4 },
  medDosage: { color: "#6B7280", fontWeight: "500" },
  medRoute: { fontSize: 13, color: "#4B5563", marginBottom: 2 },
  medInstructions: { fontSize: 13, color: "#4B5563", fontStyle: "italic", marginBottom: 8 },
  scheduleContainer: { gap: 6, marginTop: 8 },
  scheduleChip: {
    backgroundColor: "#EFF6FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  scheduleText: { fontSize: 13, color: "#1D4ED8", fontWeight: "600" },
  
  footer: {
    flexDirection: "row",
    paddingTop: 14,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  statusBtn: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  statusBtnText: { color: "#EA580C", fontWeight: "700", fontSize: 15 },
  editBtn: { backgroundColor: "#2563EB" },
  editBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});

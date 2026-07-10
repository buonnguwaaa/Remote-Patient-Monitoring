/**
 * NursePrescriptionScreen.js
 * Màn hình quản lý đơn thuốc cho y tá:
 *  - Refactored UI với Grouped List, Thống kê, và Gợi ý thuốc
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, Modal, TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";

import { useNursePatientListData } from "../../hooks/useNursePatientListData";
import { useAuth } from "../../hooks/useAuth";
import { useSnackbar } from "../../hooks/useSnackbar";
import {
  getPrescriptions, createPrescription, updatePrescription, updatePrescriptionStatus
} from "../../api/prescriptionApi";

// Components
import { PrescriptionStatsHeader } from "../../components/nurse/prescription/PrescriptionStatsHeader";
import { PrescriptionPatientGroup } from "../../components/nurse/prescription/PrescriptionCard";
import { PrescriptionDetailModal } from "../../components/nurse/prescription/PrescriptionDetailModal";
import { PrescriptionFormModal } from "../../components/nurse/prescription/PrescriptionFormModal";

// ─── Constants ───
const STATUS_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang dùng" },
  { key: "completed", label: "Hoàn thành" },
  { key: "discontinued", label: "Đã dừng" },
  { key: "expired", label: "Hết hạn" },
];

function createDefaultForm(patientId = "") {
  return {
    patientId,
    medications: [{ drugName: "", dosage: "", route: "Đường uống", instructions: "", schedule: [{ timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }] }],
    timezone: "Asia/Ho_Chi_Minh",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
  };
}

// Helper: Group Prescriptions
function groupPrescriptionsByPatient(prescriptions) {
  const map = {};
  prescriptions.forEach(p => {
    if (!map[p.patientId]) map[p.patientId] = [];
    map[p.patientId].push(p);
  });
  return map;
}

// Status Update Modal inside main screen to keep it simple
function StatusUpdateModal({ visible, prescription, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const handle = async (status) => {
    Alert.alert("Xác nhận", `Cập nhật trạng thái thành "${status}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Đồng ý", onPress: async () => {
          setLoading(true);
          try {
            const res = await updatePrescriptionStatus(prescription.id, status);
            if (res.ok) { onUpdated(); onClose(); }
            else Alert.alert("Lỗi", "Không cập nhật được.");
          } catch { Alert.alert("Lỗi", "Lỗi kết nối máy chủ."); }
          finally { setLoading(false); }
      }}
    ]);
  };
  if (!prescription) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.statusModalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đổi trạng thái đơn thuốc</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#374151" /></TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} /> : (
            <>
              {prescription.status !== "active" && <TouchableOpacity style={[styles.statusBtn, { backgroundColor: "#D1FAE5" }]} onPress={() => handle("active")}><Text style={[styles.statusBtnText, { color: "#065F46" }]}>Kích hoạt lại</Text></TouchableOpacity>}
              {prescription.status === "active" && <TouchableOpacity style={[styles.statusBtn, { backgroundColor: "#DBEAFE" }]} onPress={() => handle("completed")}><Text style={[styles.statusBtnText, { color: "#1E40AF" }]}>Hoàn thành</Text></TouchableOpacity>}
              {prescription.status === "active" && <TouchableOpacity style={[styles.statusBtn, { backgroundColor: "#FEE2E2" }]} onPress={() => handle("discontinued")}><Text style={[styles.statusBtnText, { color: "#991B1B" }]}>Ngưng dùng</Text></TouchableOpacity>}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ───
export default function NursePrescriptionScreen() {
  const { user } = useAuth() || {};
  const route = useRoute();
  const { showError, showSuccess } = useSnackbar();
  
  const { patients, loadPatients } = useNursePatientListData(user);
  
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingPres, setLoadingPres] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [detailModal, setDetailModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  
  const [formVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState(createDefaultForm());

  useEffect(() => {
    if (route?.params?.patientId) setSelectedPatientId(route.params.patientId);
  }, [route?.params?.patientId]);

  useFocusEffect(useCallback(() => { loadPatients({ showLoader: !patients.length }); }, [loadPatients]));

  const fetchPrescriptions = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoadingPres(true);
    try {
      const list = await getPrescriptions({ patientId: selectedPatientId || undefined });
      setPrescriptions([...(Array.isArray(list) ? list : [])].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch { showError("Không tải được danh sách đơn thuốc."); }
    finally { setLoadingPres(false); setRefreshing(false); }
  }, [selectedPatientId, showError]);

  useFocusEffect(useCallback(() => { fetchPrescriptions(); }, [fetchPrescriptions]));

  const stats = useMemo(() => {
    let t = prescriptions.length, a = 0, e = 0, s = 0;
    const now = new Date();
    prescriptions.forEach(p => {
      if (p.status === "active") a++;
      if (p.status === "discontinued" || p.status === "completed") s++;
      if (p.status === "active" && p.endDate && new Date(p.endDate) < new Date(now.getTime() + 7*24*60*60*1000)) e++;
    });
    return { total: t, active: a, expiring: e, stopped: s };
  }, [prescriptions]);

  const patientMap = useMemo(() => {
    const map = {};
    patients.forEach(p => map[p.user?._id] = { name: p.user?.name, code: p.patientCode });
    return map;
  }, [patients]);

  const grouped = useMemo(() => {
    let list = prescriptions;

    if (statusFilter !== "all") {
      const now = new Date();
      list = list.filter(p => {
        if (statusFilter === "expired") {
          return p.status === "active" && p.endDate && new Date(p.endDate) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        return p.status === statusFilter;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const pInfo = patientMap[p.patientId] || {};
        return (pInfo.name?.toLowerCase().includes(q)) || (pInfo.code?.toLowerCase().includes(q)) || (p.medications?.some(m => m.drugName?.toLowerCase().includes(q)));
      });
    }
    return groupPrescriptionsByPatient(list);
  }, [prescriptions, searchQuery, patientMap, statusFilter]);

  const handleSaveForm = async (data) => {
    const payload = {
      patientId: data.patientId,
      timezone: data.timezone,
      daysOfWeek: data.daysOfWeek,
      startDate: new Date(`${data.startDate}T00:00:00`).toISOString(),
      endDate: data.endDate ? new Date(`${data.endDate}T23:59:59`).toISOString() : null,
      medications: data.medications.map(m => ({
        drugName: m.drugName,
        dosage: m.dosage,
        route: m.route || undefined,
        instructions: m.instructions || undefined,
        schedule: m.schedule.map(d => {
          const s = { timeOfDay: d.timeOfDay, pillCount: Number(d.pillCount) };
          if (d.customTime) { const [h, min] = d.customTime.split(":"); s.hour = parseInt(h); s.minute = parseInt(min); }
          if (d.mealTiming) s.mealTiming = d.mealTiming;
          return s;
        })
      }))
    };
    try {
      const res = data.id ? await updatePrescription(data.id, { ...payload, status: data.status }) : await createPrescription(payload);
      if (res.ok) {
        showSuccess(data.id ? "Cập nhật thành công!" : "Tạo đơn thuốc thành công!");
        setFormVisible(false);
        fetchPrescriptions();
        return { success: true };
      } else {
        const errMsg = res.body?.error || "Lỗi lưu đơn thuốc";
        showError(errMsg);
        return { success: false, error: errMsg };
      }
    } catch (e) {
      showError("Lỗi kết nối máy chủ");
      return { success: false, error: "Lỗi kết nối máy chủ" };
    }
  };

  const openEdit = (p) => {
    setFormData({
      id: p.id,
      patientId: p.patientId,
      status: p.status,
      timezone: p.timezone,
      daysOfWeek: p.daysOfWeek || [],
      startDate: p.startDate?.slice(0, 10) || "",
      endDate: p.endDate?.slice(0, 10) || "",
      medications: (p.medications || []).map(m => ({
        drugName: m.drugName, dosage: m.dosage, route: m.route || "", instructions: m.instructions || "",
        schedule: (m.schedule || []).map(s => ({
          timeOfDay: s.timeOfDay, mealTiming: s.mealTiming || "", pillCount: s.pillCount || 1,
          customTime: s.hour !== undefined ? `${String(s.hour).padStart(2,"0")}:${String(s.minute||0).padStart(2,"0")}` : ""
        }))
      }))
    });
    setFormVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.topBar, { justifyContent: "flex-end" }]}>
        <TouchableOpacity style={styles.createBtn} onPress={() => { setFormData(createDefaultForm(selectedPatientId)); setFormVisible(true); }}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Kê đơn mới</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Tìm tên bệnh nhân, tên thuốc..." placeholderTextColor="#9CA3AF" />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery("")}><Ionicons name="close-circle" size={16} color="#9CA3AF" /></TouchableOpacity> : null}
        </View>
        {selectedPatientId && (
          <TouchableOpacity style={styles.clearPatientBtn} onPress={() => setSelectedPatientId("")}>
            <Text style={styles.clearPatientText}>Hiển thị tất cả</Text>
            <Ionicons name="close" size={16} color="#4B5563" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]} onPress={() => setStatusFilter(f.key)}>
            <Text style={[styles.filterText, statusFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        style={styles.listWrapper} 
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPrescriptions({ isRefresh: true })} />}
      >
        <PrescriptionStatsHeader stats={stats} />
        
        {loadingPres && !prescriptions.length ? <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} /> : null}
        {!loadingPres && Object.keys(grouped).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>Không có đơn thuốc nào phù hợp.</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([pId, list]) => (
            <PrescriptionPatientGroup 
              key={pId} 
              patientInfo={patientMap[pId] || { name: "Bệnh nhân ẩn danh" }} 
              prescriptions={list} 
              onDetail={setDetailModal}
              onEdit={openEdit}
              onStatusChange={setStatusModal}
            />
          ))
        )}
      </ScrollView>

      <PrescriptionDetailModal visible={!!detailModal} prescription={detailModal} patientName={detailModal ? patientMap[detailModal.patientId]?.name : ""} onClose={() => setDetailModal(null)} onEdit={openEdit} onStatusChange={setStatusModal} />
      <PrescriptionFormModal visible={formVisible} onClose={() => setFormVisible(false)} initialData={formData} onSave={handleSaveForm} patients={patients} />
      <StatusUpdateModal visible={!!statusModal} prescription={statusModal} onClose={() => setStatusModal(null)} onUpdated={fetchPrescriptions} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F6FF" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  topTitle: { fontSize: 18, fontWeight: "700" },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  searchContainer: { paddingHorizontal: 14, marginTop: 12, flexDirection: "row", gap: 10 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  clearPatientBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E5E7EB", paddingHorizontal: 10, borderRadius: 10 },
  clearPatientText: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  filterBar: { height: 46, flexGrow: 0, marginTop: 12, marginBottom: 4 },
  filterContent: { paddingHorizontal: 14, gap: 8, alignItems: "center" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  filterChipActive: { backgroundColor: "#DBEAFE" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#6B7280", lineHeight: 18 },
  filterTextActive: { color: "#1D4ED8" },
  listWrapper: { flex: 1 },
  listContent: { padding: 14, paddingBottom: 100 },
  emptyState: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyStateText: { color: "#9CA3AF", fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  statusModalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  statusBtn: { marginHorizontal: 16, marginTop: 10, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  statusBtnText: { fontSize: 15, fontWeight: "700" },
});

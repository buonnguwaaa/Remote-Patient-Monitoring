import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, Modal, TextInput, FlatList
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";

import { getMyPatients } from "../../api/patientApi";
import {
  getPrescriptions, createPrescription, updatePrescription, updatePrescriptionStatus
} from "../../api/prescriptionApi";

import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

// Shared Components
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
    medications: [{ drugName: "", dosage: "", route: "Đường uống", instructions: "", schedule: [
      { timeOfDay: "morning", customTime: "08:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "noon", customTime: "12:00", mealTiming: "post_meal", pillCount: 1 },
      { timeOfDay: "evening", customTime: "20:00", mealTiming: "post_meal", pillCount: 1 }
    ] }],
    timezone: "Asia/Ho_Chi_Minh",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
  };
}

function groupPrescriptionsByPatient(prescriptions) {
  const map = {};
  prescriptions.forEach(p => {
    const key = p.patientId || p.patient?._id || "unknown";
    if (!map[key]) map[key] = [];
    map[key].push(p);
  });
  return map;
}

// Status Update Modal
function StatusUpdateModal({ visible, prescription, onClose, onUpdated, showToast }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const handle = async (status) => {
    setLoading(true);
    try {
      const res = await updatePrescriptionStatus(prescription.id, status);
      if (res.ok || !res.error) { 
        if (showToast) showToast("Đã cập nhật trạng thái đơn thuốc.", "success");
        onUpdated(); 
        onClose(); 
      } else {
        if (showToast) showToast("Không cập nhật được trạng thái.", "error");
      }
    } catch { 
      if (showToast) showToast("Lỗi kết nối máy chủ.", "error"); 
    } finally { 
      setLoading(false); 
    }
  };
  if (!prescription) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.statusModalSheet, { paddingBottom: Math.max(insets.bottom + 16, 28) }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Đổi trạng thái đơn thuốc</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator color="#2563EB" style={{ marginVertical: 20 }} />
          ) : (
            <>
              {prescription.status === "discontinued" && (
                <TouchableOpacity style={[styles.statusBtn, { backgroundColor: "#D1FAE5" }]} onPress={() => handle("active")}>
                  <Text style={[styles.statusBtnText, { color: "#065F46" }]}>Kích hoạt lại</Text>
                </TouchableOpacity>
              )}
              {(prescription.status === "completed" || prescription.status === "expired") && (
                <Text style={{ textAlign: "center", color: "#6B7280", fontStyle: "italic", marginTop: 10 }}>
                  Đơn thuốc đã kết thúc, không thể thay đổi trạng thái.
                </Text>
              )}
              {prescription.status === "active" && (
                <TouchableOpacity style={[styles.statusBtn, { backgroundColor: "#DBEAFE" }]} onPress={() => handle("completed")}>
                  <Text style={[styles.statusBtnText, { color: "#1E40AF" }]}>Hoàn thành</Text>
                </TouchableOpacity>
              )}
              {prescription.status === "active" && (
                <TouchableOpacity style={[styles.statusBtn, { backgroundColor: "#FEE2E2" }]} onPress={() => handle("discontinued")}>
                  <Text style={[styles.statusBtnText, { color: "#991B1B" }]}>Ngưng dùng</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Unified Common Screen (Doctor & Nurse) ───
export default function PrescriptionsScreen() {
  const insets = useSafeAreaInsets();
  const authContext = useAuth() || {};
  const { user, isDoctor, isNurse } = authContext;
  const route = useRoute();
  
  let toastFunc = null;
  try {
    const toastCtx = useToast();
    toastFunc = toastCtx?.showToast;
  } catch {
    toastFunc = null;
  }

  const showToast = useCallback((msg, type = "info") => {
    if (toastFunc) toastFunc(msg, type);
    else Alert.alert(type === "error" ? "Thông báo lỗi" : "Thông báo", msg);
  }, [toastFunc]);

  // Determine user role and permissions
  const userRole = user?.role || "";
  const isDocRole = isDoctor || userRole === "doctor" || userRole === "user.doctor";

  const [patients, setPatients] = useState([]);
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

  const loadPatients = useCallback(async () => {
    try {
      const res = await getMyPatients();
      if (res && res.ok && res.body && res.body.data) {
        setPatients(res.body.data);
      } else if (res && Array.isArray(res)) {
        setPatients(res);
      } else if (res && res.body && Array.isArray(res.body)) {
        setPatients(res.body);
      }
    } catch (e) {
      console.log("Failed to load patients", e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPatients(); }, [loadPatients]));

  const fetchPrescriptions = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoadingPres(true);
    try {
      const list = await getPrescriptions({ patientId: selectedPatientId || undefined });
      setPrescriptions([...(Array.isArray(list) ? list : [])].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      showToast("Không tải được danh sách đơn thuốc.", "error");
    } finally {
      setLoadingPres(false);
      setRefreshing(false);
    }
  }, [selectedPatientId, showToast]);

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
    patients.forEach(p => {
      const key = p.patientId || p.user?._id || p.id || p._id;
      if (key) {
        map[key] = {
          name: p.patientName || p.user?.name || "Bệnh nhân #" + key,
          code: p.patientPublicId || p.patientCode || "",
        };
      }
    });
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
        const pInfo = patientMap[p.patientId || p.patient?._id] || {};
        return (
          (pInfo.name?.toLowerCase().includes(q)) ||
          (pInfo.code?.toLowerCase().includes(q)) ||
          (p.medications?.some(m => m.drugName?.toLowerCase().includes(q)))
        );
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
      if (res && (res.ok || res.id || res._id || res.patientId)) {
        showToast(data.id ? "Cập nhật thành công!" : "Tạo đơn thuốc thành công!", "success");
        setFormVisible(false);
        fetchPrescriptions();
        return { success: true };
      } else {
        const errMsg = res?.body?.error || res?.error || "Lỗi lưu đơn thuốc";
        showToast(errMsg, "error");
        return { success: false, error: errMsg };
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ", "error");
      return { success: false, error: "Lỗi kết nối máy chủ" };
    }
  };

  const canCreatePrescription = true;

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
    <SafeAreaView style={styles.safeArea} edges={isDocRole ? ["bottom", "left", "right"] : ["top", "bottom", "left", "right"]}>
      {/* Top Bar Action */}
      <View style={[styles.topBar, isDocRole ? styles.topBarDoctor : styles.topBarNurse]}>
        {!isDocRole && (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitleText}>Quản lý đơn thuốc</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.createBtn} 
          onPress={async () => { 
            if (!selectedPatientId) {
              setFormData(createDefaultForm());
              setFormVisible(true);
              return;
            }
            try {
              const list = await getPrescriptions({ patientId: selectedPatientId, latest: true });
              const activeP = Array.isArray(list) ? list[0] : null;
              if (activeP && activeP.status === "active") {
                Alert.alert(
                  "Cảnh báo: Đơn thuốc đang hiệu lực",
                  "Bệnh nhân này đang có một đơn thuốc còn hiệu lực. Bạn có muốn tiếp tục tạo đơn mới đè lên, hay chỉnh sửa đơn hiện tại?",
                  [
                    { text: "Hủy bỏ", style: "cancel" },
                    { 
                      text: "Tiếp tục tạo mới", 
                      onPress: () => {
                        setFormData(createDefaultForm(selectedPatientId)); 
                        setFormVisible(true); 
                      } 
                    },
                    {
                      text: "Chỉnh sửa đơn cũ",
                      onPress: () => openEdit(activeP)
                    }
                  ]
                );
                return;
              }
            } catch (e) {
              console.log("Error checking active prescription", e);
            }
            setFormData(createDefaultForm(selectedPatientId)); 
            setFormVisible(true); 
          }}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Kê đơn mới</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Patient Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            placeholder="Tìm tên bệnh nhân, tên thuốc..." 
            placeholderTextColor="#9CA3AF" 
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
        {selectedPatientId ? (
          <TouchableOpacity style={styles.clearPatientBtn} onPress={() => setSelectedPatientId("")}>
            <Text style={styles.clearPatientText}>Tất cả BN</Text>
            <Ionicons name="close" size={16} color="#4B5563" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity 
            key={f.key} 
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]} 
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={[styles.filterText, statusFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main List */}
      <FlatList
        style={styles.listWrapper}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 80, 100) }]}
        data={Object.entries(grouped)}
        keyExtractor={([pId]) => pId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPrescriptions({ isRefresh: true })} />}
        ListHeaderComponent={<PrescriptionStatsHeader stats={stats} />}
        ListEmptyComponent={
          loadingPres && !prescriptions.length ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
          ) : !loadingPres ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>Không có đơn thuốc nào phù hợp.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: [pId, list] }) => (
          <PrescriptionPatientGroup
            patientInfo={patientMap[pId] || { name: "Bệnh nhân #" + pId }}
            prescriptions={list}
            onDetail={setDetailModal}
            onEdit={openEdit}
            onStatusChange={setStatusModal}
          />
        )}
      />

      <PrescriptionDetailModal 
        visible={!!detailModal} 
        prescription={detailModal} 
        patientName={detailModal ? (patientMap[detailModal.patientId]?.name || "Bệnh nhân") : ""} 
        onClose={() => setDetailModal(null)} 
        onEdit={openEdit} 
        onStatusChange={setStatusModal} 
      />

      <PrescriptionFormModal 
        visible={formVisible} 
        onClose={() => setFormVisible(false)} 
        initialData={formData} 
        onSave={handleSaveForm} 
        patients={patients} 
      />

      <StatusUpdateModal 
        visible={!!statusModal} 
        prescription={statusModal} 
        onClose={() => setStatusModal(null)} 
        onUpdated={fetchPrescriptions} 
        showToast={showToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F2F6FF" },
  topBar: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 16, 
  },
  topBarNurse: {
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 4,
  },
  topBarDoctor: {
    justifyContent: "flex-end",
    paddingTop: 6,
    paddingBottom: 2,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitleText: { fontSize: 18, fontWeight: "700", color: "#111827" },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  searchContainer: { paddingHorizontal: 14, marginTop: 6, flexDirection: "row", gap: 10 },
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

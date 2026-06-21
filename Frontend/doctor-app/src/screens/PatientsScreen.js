import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getMyPatients, getAlerts, getPatientById, getMeasurements, getThresholds } from "../api/patientApi";
import PatientCard from "../components/PatientCard";
import PatientDetailModal from "../components/PatientDetailModal";

export default function PatientsScreen() {
  const navigation = useNavigation();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'warning' | 'normal'

  // Patient detail modal state
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailedInfo, setDetailedInfo] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [threshold, setThreshold] = useState(null);

  const loadPatients = useCallback(async () => {
    try {
      setError(null);
      const [patientsRes, alertsRes] = await Promise.all([
        getMyPatients(),
        getAlerts({ limit: 100 }),
      ]);

      if (!patientsRes.ok) {
        throw new Error("Không thể tải danh sách bệnh nhân");
      }

      const assignments = patientsRes.body?.data || [];
      const alerts = alertsRes.body?.data || [];

      // Find the latest open high alert for each patient
      const latestAlertByPatient = new Map();
      const sortedAlerts = [...alerts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      sortedAlerts.forEach((alert) => {
        if (!latestAlertByPatient.has(alert.patientId)) {
          latestAlertByPatient.set(alert.patientId, alert);
        }
      });

      const formatted = assignments.map((item) => {
        let isWarning = false;
        const latestAlert = latestAlertByPatient.get(item.patientId);
        if (latestAlert && latestAlert.severity === "high" && latestAlert.status === "open") {
          isWarning = true;
        }

        return {
          id: item.patientId,
          name: item.patientName || "Bệnh nhân",
          patientCode: item.patientCode || item.patientPublicId || "Chưa có mã",
          gender: item.gender || "N/A",
          dob: item.dob ? new Date(item.dob).toLocaleDateString("vi-VN") : "N/A",
          phone: item.phone || "Chưa có SĐT",
          isWarning,
          updatedAt: item.updatedAt
            ? new Date(item.updatedAt).toLocaleDateString("vi-VN")
            : "Chưa cập nhật",
        };
      });

      setPatients(formatted);
      applyFilters(formatted, searchQuery, filterStatus);
    } catch (err) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    loadPatients();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients();
  };

  const applyFilters = (list, query, status) => {
    let result = [...list];

    // Filter by query
    if (query.trim() !== "") {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patientCode.toLowerCase().includes(q) ||
          p.phone.includes(q)
      );
    }

    // Filter by status
    if (status === "warning") {
      result = result.filter((p) => p.isWarning);
    } else if (status === "normal") {
      result = result.filter((p) => !p.isWarning);
    }

    setFilteredPatients(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(patients, text, filterStatus);
  };

  const handleStatusFilter = (status) => {
    setFilterStatus(status);
    applyFilters(patients, searchQuery, status);
  };

  const handleOpenDetail = async (patient) => {
    setSelectedPatient(patient);
    setDetailModalVisible(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailedInfo(null);
    setMeasurements([]);
    setThreshold(null);

    try {
      const [detailRes, measurementsRes, thresholdsRes] = await Promise.all([
        getPatientById(patient.id),
        getMeasurements({ patientId: patient.id }), // load history
        getThresholds({ patientId: patient.id, latest: true }),
      ]);

      if (detailRes.ok) {
        setDetailedInfo(detailRes.body?.data);
      } else {
        setDetailedInfo(patient); // fallback to basic patient item info
      }

      if (measurementsRes.ok) {
        setMeasurements(measurementsRes.body?.data || []);
      }

      if (thresholdsRes.ok) {
        setThreshold(thresholdsRes.body?.data?.[0] || null);
      }
    } catch (err) {
      setDetailError("Không thể tải thông tin chi tiết");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Tìm theo tên, mã bệnh nhân..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: "all", label: "Tất cả" },
          { key: "warning", label: "Cảnh báo" },
          { key: "normal", label: "Ổn định" },
        ].map((tab) => {
          const isActive = filterStatus === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => handleStatusFilter(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Patients List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải danh sách bệnh nhân...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPatients}>
            <Text style={styles.retryText}>Tải lại</Text>
          </TouchableOpacity>
        </View>
      ) : filteredPatients.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="people-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Không tìm thấy bệnh nhân nào</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PatientCard
              item={item}
              onChat={() => navigation.navigate("Chat", { patientId: item.id })}
              onDetail={() => handleOpenDetail(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
          }
        />
      )}

      {/* Detail Modal Sheet Component */}
      <PatientDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        patient={selectedPatient}
        detailedInfo={detailedInfo}
        measurements={measurements}
        threshold={threshold}
        detailLoading={detailLoading}
        detailError={detailError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F6FF" },
  searchContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#1F2937" },
  tabContainer: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#fff" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#4B5563" },
  errorText: { marginTop: 12, fontSize: 14, color: "#DC2626", textAlign: "center" },
  emptyText: { marginTop: 16, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  listContent: { paddingBottom: 24 },
});

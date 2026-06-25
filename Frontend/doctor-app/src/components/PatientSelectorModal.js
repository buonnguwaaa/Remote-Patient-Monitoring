import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PatientSelectorModal({
  visible,
  onClose,
  patients = [],
  selectedPatientId = "",
  onSelect,
  loading = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        (p.patientName || p.name || "").toLowerCase().includes(q) ||
        (p.patientCode || p.code || "").toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  const handleSelect = (patientId) => {
    onSelect(patientId);
    setSearchQuery("");
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn bệnh nhân</Text>
            <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Tìm theo tên hoặc mã bệnh án..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredPatients.length === 0 ? (
                <Text style={styles.modalEmptyText}>Không tìm thấy bệnh nhân nào.</Text>
              ) : (
                filteredPatients.map((p, idx) => {
                  const patientId = p.patientId || p.id;
                  const isSelected = patientId === selectedPatientId;
                  return (
                    <TouchableOpacity
                      key={patientId || `patient-${idx}`}
                      style={[styles.modalItem, isSelected && styles.modalItemActive]}
                      onPress={() => handleSelect(patientId)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalItemName, isSelected && styles.modalItemNameActive]}>
                          {p.patientName || p.name}
                        </Text>
                        {(p.patientCode || p.code) ? (
                          <Text style={[styles.modalItemCode, isSelected && styles.modalItemCodeActive]}>
                            Mã HS: {p.patientCode || p.code}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={18} color="#2563EB" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "75%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalCloseBtn: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    paddingVertical: 0,
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemActive: {
    borderBottomColor: "#BFDBFE",
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  modalItemNameActive: {
    color: "#2563EB",
  },
  modalItemCode: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  modalItemCodeActive: {
    color: "#3B82F6",
  },
  modalEmptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginTop: 40,
    fontSize: 14,
  },
});

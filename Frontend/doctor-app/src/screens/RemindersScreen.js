import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import Toast from "../components/Toast";

import { useAuth } from "../context/AuthContext";
import {
  getMyPatients,
  getReminders,
  createReminder,
  updateReminder,
  updateReminderStatus,
} from "../api/patientApi";

const weekdayOptions = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

const weekdayLabelsFull = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  0: "Chủ nhật",
};

const createDefaultFormData = (patientId = "") => {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  return {
    patientId,
    kind: "measure", // 'measure' | 'medication'
    message: "",
    time: "08:00",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
    timezone: "Asia/Ho_Chi_Minh",
    startDate: today.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    status: "active",
  };
};

function formatTime(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateOnly(iso) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function RemindersScreen() {
  const isFocused = useIsFocused();
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  // Form states
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Search modals
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showPatientListInForm, setShowPatientListInForm] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");

  // Load patients
  useEffect(() => {
    if (!isFocused) return;

    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const res = await getMyPatients();
        const list = res.body?.data || res.body || [];
        setPatients(list);
      } catch (err) {
        console.error("Failed to load patients for reminders:", err);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, [isFocused]);

  // Load reminders when patients list is available or filters change
  const fetchReminders = async () => {
    if (loadingPatients) return;
    setLoadingReminders(true);

    try {
      const targetPatientIds = selectedPatientId
        ? [selectedPatientId]
        : patients.map((item) => item.patientId);

      if (targetPatientIds.length === 0) {
        setReminders([]);
        setLoadingReminders(false);
        return;
      }

      const reminderGroups = await Promise.all(
        targetPatientIds.map((patientId) =>
          getReminders({
            patientId,
            status: statusFilter === "all" ? undefined : statusFilter,
            kind: kindFilter === "all" ? undefined : kindFilter,
          })
        )
      );

      const merged = reminderGroups.flatMap((res) => res.body?.data || res.body || []);
      const uniqueList = Array.from(
        new Map(merged.map((item) => [item.id, item])).values()
      ).sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );

      setReminders(uniqueList);
    } catch (err) {
      console.error("Failed to load reminders:", err);
    } finally {
      setLoadingReminders(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchReminders();
    }
  }, [selectedPatientId, statusFilter, kindFilter, patients, loadingPatients, isFocused]);

  const selectedPatientName = useMemo(() => {
    const found = patients.find((p) => p.patientId === selectedPatientId);
    return found?.patientName || found?.name || "Tất cả bệnh nhân";
  }, [patients, selectedPatientId]);

  const selectedPatientCode = useMemo(() => {
    const found = patients.find((p) => p.patientId === selectedPatientId);
    return found?.patientCode || found?.code || "";
  }, [patients, selectedPatientId]);

  const filteredPatients = useMemo(() => {
    const q = patientSearchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        (p.patientName || p.name || "").toLowerCase().includes(q) ||
        (p.patientCode || p.code || "").toLowerCase().includes(q)
    );
  }, [patients, patientSearchQuery]);

  const buildWeekdaySummary = (days) => {
    if (!days || days.length === 0) return "Chưa chọn ngày";
    if (days.length === 7) return "Mỗi ngày";
    return days
      .map((d) => weekdayLabelsFull[d])
      .join(", ");
  };

  const handleEdit = (reminder) => {
    setFormData({
      patientId: reminder.patientId,
      kind: reminder.kind,
      message: reminder.message,
      time: formatTime(reminder.hour, reminder.minute),
      daysOfWeek: reminder.daysOfWeek || [],
      timezone: reminder.timezone || "Asia/Ho_Chi_Minh",
      startDate: formatDateOnly(reminder.startDate),
      endDate: formatDateOnly(reminder.endDate),
      status: reminder.status,
    });
    setEditingId(reminder.id);
    setIsFormVisible(true);
    setShowPatientListInForm(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleToggleWeekday = (val) => {
    setFormData((curr) => {
      const exists = curr.daysOfWeek.includes(val);
      return {
        ...curr,
        daysOfWeek: exists
          ? curr.daysOfWeek.filter((d) => d !== val)
          : [...curr.daysOfWeek, val],
      };
    });
  };

  const handleStatusUpdate = (reminder, nextStatus) => {
    const actionLabel =
      nextStatus === "paused"
        ? "tạm dừng"
        : nextStatus === "active"
        ? "kích hoạt lại"
        : "hủy bỏ";

    Alert.alert(
      "Xác nhận thay đổi",
      `Bạn có muốn ${actionLabel} nhắc nhở này không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          onPress: async () => {
            setLoadingReminders(true);
            try {
              const res = await updateReminderStatus(reminder.id, nextStatus);
              if (res.ok) {
                setSuccessMessage(`Đã ${actionLabel} nhắc nhở thành công.`);
                fetchReminders();
              } else {
                setErrorMessage(res.body?.error || "Lỗi khi cập nhật trạng thái nhắc nhở.");
              }
            } catch (err) {
              setErrorMessage("Lỗi hệ thống xảy ra.");
            } finally {
              setLoadingReminders(false);
            }
          },
        },
      ]
    );
  };

  const validateForm = () => {
    if (!formData.patientId) return "Vui lòng chọn một bệnh nhân.";
    if (!formData.message.trim()) return "Vui lòng nhập nội dung nhắc nhở.";
    if (formData.daysOfWeek.length === 0) return "Vui lòng chọn ít nhất một ngày lặp lại.";

    const [hText, mText] = formData.time.split(":");
    const hour = parseInt(hText || "", 10);
    const minute = parseInt(mText || "", 10);
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return "Giờ nhắc nhở không hợp lệ (định dạng HH:mm).";
    }

    const start = new Date(`${formData.startDate}T00:00:00`);
    const end = new Date(`${formData.endDate}T23:59:59`);
    if (end.getTime() < start.getTime()) {
      return "Ngày kết thúc không được nhỏ hơn ngày bắt đầu.";
    }

    return null;
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    const [hText, mText] = formData.time.split(":");
    const hour = parseInt(hText, 10);
    const minute = parseInt(mText, 10);

    const payload = {
      patientId: formData.patientId,
      kind: formData.kind,
      message: formData.message.trim(),
      hour,
      minute,
      daysOfWeek: [...formData.daysOfWeek].sort((a, b) => a - b),
      timezone: formData.timezone,
      startDate: new Date(`${formData.startDate}T00:00:00`).toISOString(),
      endDate: new Date(`${formData.endDate}T23:59:59`).toISOString(),
    };

    try {
      let res;
      if (editingId) {
        res = await updateReminder(editingId, {
          ...payload,
          status: formData.status,
        });
      } else {
        res = await createReminder(payload);
      }

      if (res.ok) {
        setSuccessMessage(
          editingId ? "Cập nhật nhắc nhở thành công!" : "Tạo nhắc nhở mới thành công!"
        );
        setIsFormVisible(false);
        setEditingId(null);
        fetchReminders();
      } else {
        setErrorMessage(res.body?.error || "Lỗi khi lưu cấu hình nhắc nhở.");
      }
    } catch (err) {
      setErrorMessage("Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Patient Picker Header */}
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>Lọc theo bệnh nhân</Text>
        <TouchableOpacity
          style={styles.pickerSelectorBtn}
          onPress={() => {
            setPatientSearchQuery("");
            setShowPatientModal(true);
          }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            {selectedPatientId ? (
              <View style={styles.selectedPatientRow}>
                <Text style={styles.pickerSelectedName}>{selectedPatientName}</Text>
                {selectedPatientCode ? (
                  <Text style={styles.pickerSelectedCode}>Mã HS: {selectedPatientCode}</Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.pickerPlaceholderText}>Tất cả bệnh nhân (Nhấp để chọn lọc)</Text>
            )}
          </View>
          {selectedPatientId ? (
            <TouchableOpacity
              onPress={() => setSelectedPatientId("")}
              style={{ marginRight: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="chevron-down" size={20} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {/* Patient Search Picker Modal */}
      <Modal
        visible={showPatientModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPatientModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn bệnh nhân</Text>
              <TouchableOpacity onPress={() => setShowPatientModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Tìm theo tên hoặc mã bệnh án..."
                placeholderTextColor="#9CA3AF"
                value={patientSearchQuery}
                onChangeText={setPatientSearchQuery}
              />
              {patientSearchQuery ? (
                <TouchableOpacity onPress={() => setPatientSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingPatients ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                {filteredPatients.length === 0 ? (
                  <Text style={styles.modalEmptyText}>Không tìm thấy bệnh nhân nào.</Text>
                ) : (
                  filteredPatients.map((p, idx) => {
                    const isSelected = isFormVisible
                      ? p.patientId === formData.patientId
                      : p.patientId === selectedPatientId;
                    return (
                      <TouchableOpacity
                        key={p.patientId || p.id || `patient-${idx}`}
                        style={[styles.modalItem, isSelected && styles.modalItemActive]}
                        onPress={() => {
                          if (isFormVisible) {
                            setFormData((prev) => ({ ...prev, patientId: p.patientId }));
                          } else {
                            setSelectedPatientId(p.patientId);
                          }
                          setShowPatientModal(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalItemName, isSelected && styles.modalItemNameActive]}>
                            {p.patientName || p.name}
                          </Text>
                          {p.patientCode ? (
                            <Text style={[styles.modalItemCode, isSelected && styles.modalItemCodeActive]}>
                              Mã HS: {p.patientCode}
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

      {/* Filter Options Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Status filters */}
          {["all", "active", "paused", "expired", "canceled"].map((status) => {
            const isSelected = statusFilter === status;
            let label = "Tất cả trạng thái";
            if (status === "active") label = "Hoạt động";
            if (status === "paused") label = "Đang tạm dừng";
            if (status === "expired") label = "Hết hạn";
            if (status === "canceled") label = "Đã hủy";

            return (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.filterBar, { borderTopWidth: 0, paddingTop: 0 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Kind filters */}
          {["all", "measure", "medication"].map((kind) => {
            const isSelected = kindFilter === kind;
            let label = "Tất cả loại nhắc nhở";
            if (kind === "measure") label = "Lịch đo chỉ số";
            if (kind === "medication") label = "Lịch uống thuốc";

            return (
              <TouchableOpacity
                key={kind}
                style={[styles.filterChip, isSelected && styles.filterChipActive, { backgroundColor: "#F3F4F6" }]}
                onPress={() => setKindFilter(kind)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>


        {/* Reminders List Title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Danh sách nhắc nhở ({reminders.length})
          </Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setFormData(createDefaultFormData(selectedPatientId));
              setEditingId(null);
              setIsFormVisible(true);
              setShowPatientListInForm(false);
              setErrorMessage("");
              setSuccessMessage("");
            }}
          >
            <Ionicons name="add" size={16} color="#FFF" />
            <Text style={styles.addBtnText}>Tạo mới</Text>
          </TouchableOpacity>
        </View>

        {loadingReminders ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
        ) : reminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alarm-outline" size={40} color="#9CA3AF" />
            <Text style={styles.emptyText}>Không tìm thấy nhắc nhở nào trùng khớp.</Text>
          </View>
        ) : (
          reminders.map((item, idx) => {
            const patientObj = patients.find((p) => p.patientId === item.patientId);
            const patName = patientObj?.patientName || patientObj?.name || "Bệnh nhân";

            let statusColor = "#6B7280";
            let statusBg = "#F3F4F6";
            let statusText = "Hết hạn";

            if (item.status === "active") {
              statusColor = "#065F46";
              statusBg = "#D1FAE5";
              statusText = "Đang chạy";
            } else if (item.status === "paused") {
              statusColor = "#92400E";
              statusBg = "#FEF3C7";
              statusText = "Tạm dừng";
            } else if (item.status === "canceled") {
              statusColor = "#991B1B";
              statusBg = "#FEE2E2";
              statusText = "Đã hủy";
            }

            return (
              <View key={item.id || `reminder-${idx}`} style={styles.reminderCard}>
                <View style={styles.reminderCardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusTagText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: "#EFF6FF" }]}>
                      <Text style={[styles.statusTagText, { color: "#1E40AF" }]}>
                        {item.kind === "measure" ? "Đo chỉ số" : "Uống thuốc"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.timeTitle}>
                    {formatTime(item.hour, item.minute)}
                  </Text>
                </View>

                <View style={styles.reminderCardBody}>
                  <Text style={styles.patientSub}>{patName}</Text>
                  <Text style={styles.messageText}>{item.message}</Text>

                  <Text style={styles.infoText}>
                    <Ionicons name="calendar-outline" size={12} color="#6B7280" /> Lặp lại:{" "}
                    <Text style={{ fontWeight: "600", color: "#374151" }}>
                      {buildWeekdaySummary(item.daysOfWeek)}
                    </Text>
                  </Text>

                  <Text style={styles.infoText}>
                    <Ionicons name="time-outline" size={12} color="#6B7280" /> Hiệu lực:{" "}
                    {formatDate(item.startDate)} → {formatDate(item.endDate)}
                  </Text>
                </View>

                {/* Actions row */}
                <View style={styles.cardActions}>
                  {(item.status === "active" || item.status === "paused") && (
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleEdit(item)}
                    >
                      <Ionicons name="create-outline" size={16} color="#2563EB" />
                      <Text style={[styles.cardActionBtnText, { color: "#2563EB" }]}>Sửa</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === "active" && (
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleStatusUpdate(item, "paused")}
                    >
                      <Ionicons name="pause-circle-outline" size={16} color="#D97706" />
                      <Text style={[styles.cardActionBtnText, { color: "#D97706" }]}>Tạm dừng</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === "paused" && (
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleStatusUpdate(item, "active")}
                    >
                      <Ionicons name="play-circle-outline" size={16} color="#059669" />
                      <Text style={[styles.cardActionBtnText, { color: "#059669" }]}>Tiếp tục</Text>
                    </TouchableOpacity>
                  )}

                  {(item.status === "active" || item.status === "paused") && (
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleStatusUpdate(item, "canceled")}
                    >
                      <Ionicons name="stop-circle-outline" size={16} color="#DC2626" />
                      <Text style={[styles.cardActionBtnText, { color: "#DC2626" }]}>Hủy bỏ</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add/Edit Reminder Form Modal */}
      {isFormVisible && (
        <Modal
          visible={isFormVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsFormVisible(false)}
        >
          <View style={styles.formBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.formWrapper}
            >
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    {editingId ? "Chỉnh sửa nhắc nhở" : "Thêm nhắc nhở mới"}
                  </Text>
                  <TouchableOpacity onPress={() => setIsFormVisible(false)}>
                    <Ionicons name="close" size={24} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.formContent} keyboardShouldPersistTaps="handled">
                  {/* Select Patient */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSecTitle}>Bệnh nhân áp dụng <Text style={{ color: "#EF4444" }}>*</Text></Text>
                    <TouchableOpacity
                      style={styles.pickerSelectorBtn}
                      onPress={() => {
                        setPatientSearchQuery("");
                        setShowPatientListInForm(!showPatientListInForm);
                      }}
                      disabled={Boolean(editingId)}
                    >
                      <View style={{ flex: 1 }}>
                        {formData.patientId ? (
                          <Text style={styles.pickerSelectedName}>
                            {patients.find((p) => p.patientId === formData.patientId)?.patientName || formData.patientId}
                          </Text>
                        ) : (
                          <Text style={styles.pickerPlaceholderText}>Nhấp để chọn bệnh nhân</Text>
                        )}
                      </View>
                      <Ionicons name={showPatientListInForm ? "chevron-up" : "chevron-down"} size={18} color="#4B5563" />
                    </TouchableOpacity>

                    {showPatientListInForm && !editingId && (
                      <View style={styles.inlinePatientSelector}>
                        <View style={styles.inlineSearchContainer}>
                          <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                          <TextInput
                            style={styles.inlineSearchInput}
                            placeholder="Tìm kiếm bệnh nhân..."
                            placeholderTextColor="#9CA3AF"
                            value={patientSearchQuery}
                            onChangeText={setPatientSearchQuery}
                          />
                          {patientSearchQuery ? (
                            <TouchableOpacity onPress={() => setPatientSearchQuery("")}>
                              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        <ScrollView style={styles.inlinePatientList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {filteredPatients.length === 0 ? (
                            <Text style={styles.inlinePatientEmptyText}>Không tìm thấy bệnh nhân nào.</Text>
                          ) : (
                            filteredPatients.map((p, idx) => {
                              const isSelected = p.patientId === formData.patientId;
                              return (
                                <TouchableOpacity
                                  key={p.patientId || p.id || `form-patient-${idx}`}
                                  style={[styles.inlinePatientItem, isSelected && styles.inlinePatientItemActive]}
                                  onPress={() => {
                                    setFormData((prev) => ({ ...prev, patientId: p.patientId }));
                                    setShowPatientListInForm(false);
                                  }}
                                >
                                  <Text style={[styles.inlinePatientName, isSelected && styles.inlinePatientNameActive]}>
                                    {p.patientName || p.name}
                                  </Text>
                                  {isSelected && <Ionicons name="checkmark" size={16} color="#2563EB" />}
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Reminder Kind */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSecTitle}>Loại nhắc nhở</Text>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={[styles.kindToggleBtn, formData.kind === "measure" && styles.kindToggleBtnActive]}
                        onPress={() => setFormData({ ...formData, kind: "measure" })}
                      >
                        <Ionicons name="analytics" size={16} color={formData.kind === "measure" ? "#FFF" : "#4B5563"} />
                        <Text style={[styles.kindToggleText, formData.kind === "measure" && styles.kindToggleTextActive]}>
                          Lịch đo chỉ số
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.kindToggleBtn, formData.kind === "medication" && styles.kindToggleBtnActive]}
                        onPress={() => setFormData({ ...formData, kind: "medication" })}
                      >
                        <Ionicons name="medical" size={16} color={formData.kind === "medication" ? "#FFF" : "#4B5563"} />
                        <Text style={[styles.kindToggleText, formData.kind === "medication" && styles.kindToggleTextActive]}>
                          Lịch uống thuốc
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Message Input */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSecTitle}>Nội dung lời dặn <Text style={{ color: "#EF4444" }}>*</Text></Text>
                    <TextInput
                      style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                      multiline
                      numberOfLines={3}
                      placeholder="Nhập nội dung nhắc nhở (ví dụ: Đo huyết áp sau ăn, Uống thuốc tiểu đường 1 viên...)"
                      placeholderTextColor="#9CA3AF"
                      value={formData.message}
                      onChangeText={(val) => setFormData({ ...formData, message: val })}
                    />
                  </View>

                  {/* Time input */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSecTitle}>Giờ nhắc nhở (HH:mm) <Text style={{ color: "#EF4444" }}>*</Text></Text>
                    <TextInput
                      style={styles.input}
                      placeholder="08:00"
                      placeholderTextColor="#9CA3AF"
                      value={formData.time}
                      onChangeText={(val) => setFormData({ ...formData, time: val })}
                    />
                  </View>

                  {/* Weekday chips */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSecTitle}>Lặp lại vào ngày trong tuần</Text>
                    <View style={styles.weekdayChipsContainer}>
                      {weekdayOptions.map((opt) => {
                        const active = formData.daysOfWeek.includes(opt.value);
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.weekdayChip, active && styles.weekdayChipActive]}
                            onPress={() => handleToggleWeekday(opt.value)}
                          >
                            <Text style={[styles.weekdayChipText, active && styles.weekdayChipTextActive]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Time range */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSecTitle}>Thời gian áp dụng (YYYY-MM-DD)</Text>
                    <View style={styles.row}>
                      <View style={styles.col}>
                        <Text style={styles.inputLabel}>Bắt đầu từ</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#9CA3AF"
                          value={formData.startDate}
                          onChangeText={(val) => setFormData({ ...formData, startDate: val })}
                        />
                      </View>
                      <View style={styles.col}>
                        <Text style={styles.inputLabel}>Kết thúc lúc</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#9CA3AF"
                          value={formData.endDate}
                          onChangeText={(val) => setFormData({ ...formData, endDate: val })}
                        />
                      </View>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer buttons */}
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setIsFormVisible(false)}
                    disabled={saving}
                  >
                    <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Lưu nhắc nhở</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

      <Toast
        visible={!!successMessage}
        message={successMessage}
        type="success"
        onDismiss={() => setSuccessMessage("")}
      />
      <Toast
        visible={!!errorMessage}
        message={errorMessage}
        type="error"
        onDismiss={() => setErrorMessage("")}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F6FF" },
  pickerHeader: {
    backgroundColor: "#FFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  pickerSelectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedPatientRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  pickerSelectedName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  pickerSelectedCode: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickerPlaceholderText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  // Modal styling for selector
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
  },
  modalContent: {
    backgroundColor: "#FFF",
    marginTop: Platform.OS === "ios" ? 60 : 40,
    marginHorizontal: 16,
    borderRadius: 16,
    maxHeight: "65%",
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    paddingVertical: 0,
  },
  modalList: {
    paddingHorizontal: 16,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemActive: {
    backgroundColor: "#F9FAFB",
  },
  modalItemName: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  modalItemNameActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  modalItemCode: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  modalItemCodeActive: {
    color: "#3B82F6",
  },
  modalEmptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginVertical: 24,
    fontSize: 14,
  },

  // Filters Bar
  filterBar: {
    backgroundColor: "#FFF",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  filterChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#2563EB",
  },

  body: { flex: 1, padding: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: "#FFF", marginLeft: 4 },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 8 },

  reminderCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 10,
    marginBottom: 10,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  timeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  reminderCardBody: {
    marginBottom: 12,
    gap: 4,
  },
  patientSub: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  messageText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginVertical: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 10,
    gap: 16,
  },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Form Modal styling
  formBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  formWrapper: {
    width: "100%",
    height: "85%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  formCard: {
    flex: 1,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  formContent: { padding: 16 },
  formSection: { marginBottom: 14 },
  formSecTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 },
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  kindToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFF",
  },
  kindToggleBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  kindToggleText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  kindToggleTextActive: {
    color: "#FFF",
  },
  inputLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1F2937",
  },
  weekdayChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  weekdayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  weekdayChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  weekdayChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  weekdayChipTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
  saveBtn: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 13, fontWeight: "600", color: "#FFF" },
  saveBtnDisabled: { backgroundColor: "#93C5FD" },

  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: { fontSize: 12, color: "#EF4444", flex: 1 },
  successAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  successText: { fontSize: 12, color: "#065F46", flex: 1 },

  inlinePatientSelector: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    padding: 8,
    maxHeight: 200,
  },
  inlineSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  inlineSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1F2937",
    padding: 0,
  },
  inlinePatientList: {
    maxHeight: 140,
  },
  inlinePatientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  inlinePatientItemActive: {
    backgroundColor: "#EFF6FF",
  },
  inlinePatientName: {
    fontSize: 13,
    color: "#4B5563",
  },
  inlinePatientNameActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  inlinePatientEmptyText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginVertical: 12,
  },
});

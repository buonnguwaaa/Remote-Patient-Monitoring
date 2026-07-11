import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  SectionList,
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
import { useIsFocused, useRoute, useNavigation } from "@react-navigation/native";
import PatientSelectorModal from "../components/PatientSelectorModal";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
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

const parseTimesString = (timeStr) => {
  if (!timeStr) return [];
  return timeStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => {
      const [hText, mText] = t.split(":");
      const hour = parseInt(hText || "", 10);
      const minute = parseInt(mText || "", 10);
      return { hour, minute };
    });
};

const getReminderFirstTime = (r) => {
  if (r.times && r.times.length > 0) {
    return r.times[0];
  }
  return { hour: r.hour || 0, minute: r.minute || 0 };
};

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
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingGroup, setViewingGroup] = useState(null);

  useEffect(() => {
    if (route.params?.patientId) {
      setSelectedPatientId(route.params.patientId);
    }
  }, [route.params?.patientId]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [hideInactive, setHideInactive] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(false);

  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Form states
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCloseForm = () => {
    const isBlank = !formData.message || formData.message.trim() === "";
    if (isBlank) {
      setIsFormVisible(false);
    } else {
      Alert.alert(
        "Xác nhận đóng",
        "Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn hủy bỏ và đóng biểu mẫu không?",
        [
          { text: "Quay lại", style: "cancel" },
          { text: "Đóng", style: "destructive", onPress: () => setIsFormVisible(false) }
        ]
      );
    }
  };

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
        const list = Array.isArray(res.body?.data) ? res.body.data : (Array.isArray(res.body) ? res.body : []);
        setPatients(list);
      } catch (err) {
        console.error("Failed to load patients for reminders:", err);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, [isFocused]);

  // Load reminders when patients list is available (all status/kind are fetched once and filtered locally)
  const fetchReminders = async () => {
    if (loadingPatients) return;
    setLoadingReminders(true);

    try {
      let merged = [];
      if (selectedPatientId) {
        const res = await getReminders({
          patientId: selectedPatientId,
        });
        merged = Array.isArray(res.body?.data) ? res.body.data : (Array.isArray(res.body) ? res.body : []);
      } else {
        if (patients.length === 0) {
          setReminders([]);
          setLoadingReminders(false);
          return;
        }
        const res = await getReminders({});
        const allReminders = Array.isArray(res.body?.data) ? res.body.data : (Array.isArray(res.body) ? res.body : []);
        const doctorPatientIds = new Set(patients.map((p) => p.patientId));
        merged = allReminders.filter((rem) => doctorPatientIds.has(rem.patientId));
      }

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
  }, [selectedPatientId, patients, loadingPatients, isFocused]);

  // Patient Display Map (memoized)
  const patientDisplayMap = useMemo(() => {
    return new Map(
      patients.map((item) => [
        item.patientId,
        {
          name: item.patientName || item.name || item.patientId,
          code: item.patientCode || item.code || "N/A",
        },
      ])
    );
  }, [patients]);

  const aggregatedItems = useMemo(() => {
    // 1. Filter
    const filteredList = reminders.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;

      if (searchTerm.trim()) {
        const pt = patientDisplayMap.get(r.patientId);
        const term = searchTerm.toLowerCase();
        const matchName = pt?.name?.toLowerCase().includes(term);
        const matchCode = pt?.code?.toLowerCase().includes(term);
        const matchMsg = r.message?.toLowerCase().includes(term);
        if (!matchName && !matchCode && !matchMsg) return false;
      }
      return true;
    });

    // 2. Group medication reminders by patientId + prescriptionId
    const groups = new Map();
    const singles = [];

    filteredList.forEach((r) => {
      if (r.kind === "medication" && r.prescriptionId) {
        const key = `${r.patientId}_${r.prescriptionId}`;
        if (!groups.has(key)) {
          const pt = patientDisplayMap.get(r.patientId);
          const patName = pt?.name || r.patientId;
          groups.set(key, {
            id: key,
            type: "group",
            patientId: r.patientId,
            prescriptionId: r.prescriptionId,
            reminders: [],
            status: "expired",
            patientName: patName,
            patientCode: pt?.code || "",
          });
        }
        groups.get(key).reminders.push(r);
      } else {
        singles.push({ type: "single", reminder: r });
      }
    });

    // 3. Compute group status and sort reminders inside
    const groupArr = Array.from(groups.values());
    groupArr.forEach((g) => {
      const statuses = g.reminders.map((r) => r.status);
      if (statuses.includes("active")) g.status = "active";
      else if (statuses.includes("paused")) g.status = "paused";
      else if (statuses.includes("canceled")) g.status = "canceled";
      else g.status = "expired";

      // Sort reminders within group by time
      g.reminders.sort((a, b) => {
        const timeA = getReminderFirstTime(a);
        const timeB = getReminderFirstTime(b);
        if (timeA.hour !== timeB.hour) return timeA.hour - timeB.hour;
        return timeA.minute - timeB.minute;
      });
    });

    // Merge group and singles and sort newest first
    const allItems = [...groupArr, ...singles];
    allItems.sort((a, b) => {
      const timeA =
        a.type === "group"
          ? Math.max(...a.reminders.map((r) => new Date(r.createdAt).getTime()))
          : new Date(a.reminder.createdAt).getTime();
      const timeB =
        b.type === "group"
          ? Math.max(...b.reminders.map((r) => new Date(r.createdAt).getTime()))
          : new Date(b.reminder.createdAt).getTime();
      return timeB - timeA;
    });

    return allItems;
  }, [reminders, statusFilter, kindFilter, searchTerm, patientDisplayMap, patients, hideInactive]);

  const sectionedItems = useMemo(() => {
    const map = new Map();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    aggregatedItems.forEach((item) => {
      let ptId = null;
      let ptName = "Chưa rõ";
      let ptCode = "";
      let times = [];

      if (item.type === "group") {
        ptId = item.patientId;
        ptName = item.patientName;
        ptCode = item.patientCode;
        item.reminders.forEach(r => {
          if (r.status === 'active' && r.times) times.push(...r.times);
        });
      } else {
        ptId = item.reminder.patientId;
        const info = patientDisplayMap.get(ptId);
        ptName = info?.name || "Bệnh nhân";
        ptCode = info?.code || "";
        if (item.reminder.status === 'active' && item.reminder.times) times.push(...item.reminder.times);
      }
      
      if (!map.has(ptId)) {
        map.set(ptId, {
          id: ptId,
          title: ptName,
          patientCode: ptCode !== "N/A" ? ptCode : null,
          nextTimeStr: null,
          minDiff: Infinity,
          data: []
        });
      }

      const section = map.get(ptId);
      times.forEach(t => {
        let diff = (t.hour * 60 + t.minute) - (currentHour * 60 + currentMin);
        if (diff < 0) diff += 24 * 60; // Next day
        if (diff < section.minDiff) {
          section.minDiff = diff;
          let h = t.hour.toString().padStart(2, '0');
          let m = t.minute.toString().padStart(2, '0');
          section.nextTimeStr = `${h}:${m}`;
        }
      });

      section.data.push(item);
    });
    return Array.from(map.values());
  }, [aggregatedItems, patientDisplayMap]);

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
    let timeStr = "";
    if (reminder.times && reminder.times.length > 0) {
      timeStr = reminder.times.map((t) => formatTime(t.hour, t.minute)).join(", ");
    } else {
      timeStr = formatTime(reminder.hour, reminder.minute);
    }

    setFormData({
      patientId: reminder.patientId,
      kind: reminder.kind,
      message: reminder.message,
      time: timeStr,
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
                showToast(`Đã ${actionLabel} nhắc nhở thành công.`);
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

    const times = parseTimesString(formData.time);
    if (times.length === 0) {
      return "Vui lòng nhập giờ nhắc nhở (HH:mm).";
    }

    for (const t of times) {
      if (isNaN(t.hour) || isNaN(t.minute) || t.hour < 0 || t.hour > 23 || t.minute < 0 || t.minute > 59) {
        return "Giờ nhắc nhở không hợp lệ (định dạng HH:mm, ví dụ 08:00, 12:00).";
      }
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
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    const times = parseTimesString(formData.time);

    const payload = {
      patientId: formData.patientId,
      kind: formData.kind,
      message: formData.message.trim(),
      times,
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
        showToast(
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
      <PatientSelectorModal
        visible={showPatientModal}
        onClose={() => setShowPatientModal(false)}
        patients={patients}
        selectedPatientId={isFormVisible ? formData.patientId : selectedPatientId}
        onSelect={(patientId) => {
          if (isFormVisible) {
            setFormData((prev) => ({ ...prev, patientId }));
          } else {
            setSelectedPatientId(patientId);
          }
          setShowPatientModal(false);
        }}
        loading={loadingPatients}
      />

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên, mã bệnh nhân, nội dung..."
          placeholderTextColor="#9CA3AF"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm("")}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

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

      <SectionList
        style={styles.body}
        contentContainerStyle={styles.listContent}
        sections={sectionedItems.map(sec => ({
          ...sec,
          originalDataLength: sec.data.length,
          data: expandedSections[sec.id] ? sec.data : []
        }))}
        keyExtractor={(item, index) => item.id || `reminder-item-${index}`}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => toggleSection(section.id)}
            style={{ backgroundColor: "#F8FAFC", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: "#E2E8F0" }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={expandedSections[section.id] ? "chevron-down" : "chevron-forward"} size={18} color="#475569" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0F172A" }}>{section.title}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13, color: "#64748B", fontWeight: "600" }}>{section.originalDataLength} nhắc nhở</Text>
              {section.nextTimeStr ? <Text style={{ fontSize: 13, color: "#059669", fontWeight: "600" }}>• Sắp tới: {section.nextTimeStr}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Danh sách nhắc nhở ({aggregatedItems.length})
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setFormData(createDefaultFormData(selectedPatientId));
                setEditingId(null);
                setIsFormVisible(true);
                setShowPatientListInForm(false);
                setErrorMessage("");
              }}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>Tạo nhắc nhở mới</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          loadingReminders ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="alarm-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyText}>Không tìm thấy nhắc nhở nào trùng khớp.</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          if (item.type === "group") {
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

            // Count time slots
            const timeGroups = new Map();
            item.reminders.forEach((r) => {
              if (r.times && r.times.length > 0) {
                r.times.forEach((tObj) => {
                  const t = formatTime(tObj.hour, tObj.minute);
                  timeGroups.set(t, (timeGroups.get(t) || 0) + 1);
                });
              } else {
                const t = formatTime(r.hour, r.minute);
                timeGroups.set(t, (timeGroups.get(t) || 0) + 1);
              }
            });
            const timeSlots = Array.from(timeGroups.entries()).map(([t, count]) => ({ time: t, count }));

            return (
              <View key={item.id || `reminder-group-${index}`} style={[styles.reminderCard, { borderColor: "#C7D2FE" }]}>
                <View style={styles.reminderCardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusTagText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: "#E0E7FF" }]}>
                      <Text style={[styles.statusTagText, { color: "#4338CA" }]}>
                        Uống thuốc theo Đơn
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.reminderCardBody}>
                  {item.reminders.length > 0 ? (
                    <Text style={[styles.infoText, { marginBottom: 4 }]}>
                      <Ionicons name="time-outline" size={12} color="#6B7280" /> Hiệu lực:{" "}
                      {formatDate(item.reminders[0].startDate)} → {formatDate(item.reminders[0].endDate)}
                    </Text>
                  ) : null}
                  <Text style={[styles.infoText, { marginBottom: 6 }]}>
                    Gồm <Text style={{ fontWeight: "700", color: "#374151" }}>{item.reminders.length}</Text> nhắc nhở thuốc.
                  </Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                    {timeSlots.slice(0, 3).map((slot, i) => (
                      <View key={i} style={styles.timeSlotPill}>
                        <Text style={styles.timeSlotPillText}>
                          {slot.time} • {slot.count} thuốc
                        </Text>
                      </View>
                    ))}
                    {timeSlots.length > 3 ? (
                      <View style={[styles.timeSlotPill, { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }]}>
                        <Text style={[styles.timeSlotPillText, { color: "#6B7280" }]}>
                          +{timeSlots.length - 3} khung giờ nữa
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Actions row */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                     style={styles.cardActionBtn}
                    onPress={() => setViewingGroup(item)}
                  >
                    <Ionicons name="list" size={16} color="#4F46E5" />
                    <Text style={[styles.cardActionBtnText, { color: "#4F46E5" }]}>Xem lịch nhắc</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cardActionBtn}
                    onPress={() => {
                      navigation.navigate("Prescriptions", {
                        patientId: item.patientId,
                        prescriptionId: item.prescriptionId,
                      });
                    }}
                  >
                    <Ionicons name="open-outline" size={16} color="#4B5563" />
                    <Text style={[styles.cardActionBtnText, { color: "#4B5563" }]}>Mở đơn thuốc</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          } else {
            // Single Reminder Card
            const r = item.reminder;
            const ptInfo = patientDisplayMap.get(r.patientId);
            const patName = ptInfo?.name || "Bệnh nhân";

            let statusColor = "#6B7280";
            let statusBg = "#F3F4F6";
            let statusText = "Hết hạn";

            if (r.status === "active") {
              statusColor = "#065F46";
              statusBg = "#D1FAE5";
              statusText = "Đang chạy";
            } else if (r.status === "paused") {
              statusColor = "#92400E";
              statusBg = "#FEF3C7";
              statusText = "Tạm dừng";
            } else if (r.status === "canceled") {
              statusColor = "#991B1B";
              statusBg = "#FEE2E2";
              statusText = "Đã hủy";
            }

            return (
              <View key={r.id || `reminder-single-${index}`} style={styles.reminderCard}>
                <View style={styles.reminderCardHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
                      <Text style={[styles.statusTagText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: "#EFF6FF" }]}>
                      <Text style={[styles.statusTagText, { color: "#1E40AF" }]}>
                        {r.kind === "measure" ? "Đo chỉ số" : "Uống thuốc"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.timeTitle}>
                    {r.times && r.times.length > 0
                      ? r.times.map((t) => formatTime(t.hour, t.minute)).join(", ")
                      : formatTime(r.hour, r.minute)}
                  </Text>
                </View>

                <View style={styles.reminderCardBody}>
                  <Text style={styles.messageText}>{r.message}</Text>

                  <Text style={styles.infoText}>
                    <Ionicons name="calendar-outline" size={12} color="#6B7280" /> Lặp lại:{" "}
                    <Text style={{ fontWeight: "600", color: "#374151" }}>
                      {buildWeekdaySummary(r.daysOfWeek)}
                    </Text>
                  </Text>

                  <Text style={styles.infoText}>
                    <Ionicons name="time-outline" size={12} color="#6B7280" /> Hiệu lực:{" "}
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  </Text>
                </View>

                {/* Actions row */}
                <View style={styles.cardActions}>
                  {(r.status === "active" || r.status === "paused") && (
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleEdit(r)}
                    >
                      <Ionicons name="create-outline" size={16} color="#2563EB" />
                      <Text style={[styles.cardActionBtnText, { color: "#2563EB" }]}>Sửa</Text>
                    </TouchableOpacity>
                  )}

                  {r.status === "active" && (
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleStatusUpdate(r, "paused")}
                    >
                      <Ionicons name="pause-circle-outline" size={16} color="#D97706" />
                      <Text style={[styles.cardActionBtnText, { color: "#D97706" }]}>Tạm dừng</Text>
                    </TouchableOpacity>
                  )}

                  {r.status === "paused" && (
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleStatusUpdate(r, "active")}
                    >
                      <Ionicons name="play-circle-outline" size={16} color="#059669" />
                      <Text style={[styles.cardActionBtnText, { color: "#059669" }]}>Tiếp tục</Text>
                    </TouchableOpacity>
                  )}

                  {(r.status === "active" || r.status === "paused") && (
                    <TouchableOpacity
                      style={styles.cardActionBtn}
                      onPress={() => handleStatusUpdate(r, "canceled")}
                    >
                      <Ionicons name="stop-circle-outline" size={16} color="#DC2626" />
                      <Text style={[styles.cardActionBtnText, { color: "#DC2626" }]}>Hủy bỏ</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }
        }}
      />

      {/* Add/Edit Reminder Form Modal */}
      {isFormVisible && (
        <Modal
          visible={isFormVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCloseForm}
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
                  <TouchableOpacity onPress={handleCloseForm}>
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
                    onPress={handleCloseForm}
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

      {/* Group Details Modal */}
      {viewingGroup && (
        <Modal
          visible={Boolean(viewingGroup)}
          transparent
          animationType="fade"
          onRequestClose={() => setViewingGroup(null)}
        >
          <View style={styles.formBackdrop}>
            <View style={styles.formWrapper}>
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.formTitle}>Chi tiết nhắc uống thuốc</Text>
                  <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                    Bệnh nhân: {viewingGroup.patientName}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setViewingGroup(null)}>
                  <Ionicons name="close" size={24} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContent}>
                <View style={styles.groupInfoBox}>
                  <Text style={styles.groupInfoText}>
                    Đây là các lịch nhắc được tự động sinh ra từ đơn thuốc. Để thay đổi giờ uống hoặc nội dung nhắc, vui lòng chỉnh sửa trực tiếp trong Đơn Thuốc.
                  </Text>
                  <TouchableOpacity
                    style={styles.goToPrescriptionBtn}
                    onPress={() => {
                      setViewingGroup(null);
                      navigation.navigate("Prescriptions", {
                        patientId: viewingGroup.patientId,
                        prescriptionId: viewingGroup.prescriptionId,
                      });
                    }}
                  >
                    <Text style={styles.goToPrescriptionBtnText}>Đến trang Đơn Thuốc</Text>
                    <Ionicons name="arrow-forward" size={14} color="#2563EB" />
                  </TouchableOpacity>
                </View>

                {viewingGroup.reminders.map((r, rIdx) => {
                  let statusColor = "#6B7280";
                  let statusBg = "#F3F4F6";
                  let statusText = "Hết hạn";
                  if (r.status === "active") {
                    statusColor = "#065F46";
                    statusBg = "#D1FAE5";
                    statusText = "Đang chạy";
                  } else if (r.status === "paused") {
                    statusColor = "#92400E";
                    statusBg = "#FEF3C7";
                    statusText = "Tạm dừng";
                  } else if (r.status === "canceled") {
                    statusColor = "#991B1B";
                    statusBg = "#FEE2E2";
                    statusText = "Đã hủy";
                  }

                  let todLabel = r.timeOfDay;
                  if (r.timeOfDay === "morning") todLabel = "Sáng";
                  else if (r.timeOfDay === "noon") todLabel = "Trưa";
                  else if (r.timeOfDay === "evening") todLabel = "Tối";

                  let mealLabel = r.mealTiming;
                  if (r.mealTiming === "pre_meal") mealLabel = "Trước ăn";
                  else if (r.mealTiming === "post_meal") mealLabel = "Sau ăn";
                  else if (r.mealTiming === "with_meal") mealLabel = "Trong bữa ăn";

                  return (
                    <View key={r.id || `group-rem-${rIdx}`} style={styles.groupRemItem}>
                      <View style={styles.groupRemItemHeader}>
                        <Text style={styles.groupRemItemTime}>
                          {r.times && r.times.length > 0
                            ? r.times.map((t) => formatTime(t.hour, t.minute)).join(", ")
                            : formatTime(r.hour, r.minute)}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          {todLabel ? (
                            <View style={styles.tagLabel}>
                              <Text style={styles.tagLabelText}>{todLabel}</Text>
                            </View>
                          ) : null}
                          {mealLabel ? (
                            <View style={styles.tagLabel}>
                              <Text style={styles.tagLabelText}>{mealLabel}</Text>
                            </View>
                          ) : null}
                          <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
                            <Text style={[styles.statusTagText, { color: statusColor }]}>
                              {statusText}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.groupRemItemMsg}>{r.message}</Text>

                      {(r.status === "active" || r.status === "paused") && (
                        <View style={styles.groupRemItemActions}>
                          {r.status === "active" && (
                            <TouchableOpacity
                              style={[styles.modalActionBtn, { borderColor: "#D97706" }]}
                              onPress={() => {
                                setViewingGroup(null);
                                handleStatusUpdate(r, "paused");
                              }}
                            >
                              <Ionicons name="pause-circle-outline" size={14} color="#D97706" style={{ marginRight: 2 }} />
                              <Text style={[styles.modalActionBtnText, { color: "#D97706" }]}>Tạm dừng</Text>
                            </TouchableOpacity>
                          )}
                          {r.status === "paused" && (
                            <TouchableOpacity
                              style={[styles.modalActionBtn, { borderColor: "#059669" }]}
                              onPress={() => {
                                setViewingGroup(null);
                                handleStatusUpdate(r, "active");
                              }}
                            >
                              <Ionicons name="play-circle-outline" size={14} color="#059669" style={{ marginRight: 2 }} />
                              <Text style={[styles.modalActionBtnText, { color: "#059669" }]}>Tiếp tục</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.modalActionBtn, { borderColor: "#DC2626" }]}
                            onPress={() => {
                              setViewingGroup(null);
                              handleStatusUpdate(r, "canceled");
                            }}
                          >
                            <Ionicons name="stop-circle-outline" size={14} color="#DC2626" style={{ marginRight: 2 }} />
                            <Text style={[styles.modalActionBtnText, { color: "#DC2626" }]}>Hủy bỏ</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { flex: 1 }]}
                  onPress={() => setViewingGroup(null)}
                >
                  <Text style={styles.cancelBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F6FF" },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    paddingVertical: 0,
  },
  timeSlotPill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  timeSlotPillText: {
    fontSize: 11,
    color: "#4338CA",
    fontWeight: "600",
  },
  groupInfoBox: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  groupInfoText: {
    fontSize: 12,
    color: "#3730A3",
    lineHeight: 18,
  },
  goToPrescriptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  goToPrescriptionBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  groupRemItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
  },
  groupRemItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  groupRemItemTime: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  groupRemItemMsg: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  tagLabel: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    justifyContent: "center",
  },
  tagLabelText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4B5563",
    textTransform: "capitalize",
  },
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

  body: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
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
  hideInactiveRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  groupRemItemActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#FFF",
  },
  modalActionBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

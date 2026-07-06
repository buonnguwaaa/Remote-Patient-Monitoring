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
import { useIsFocused, useRoute } from "@react-navigation/native";
import PatientSelectorModal from "../components/PatientSelectorModal";

import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  getMyPatients,
  getPrescriptions,
  createPrescription,
  updatePrescription,
  updatePrescriptionStatus,
  getReminders,
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

const drug = (name, dosage, schedule) => ({ name, dosage, schedule });

const DRUG_SUGGESTIONS = [
  drug("Paracetamol", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Ibuprofen", "400mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Aspirin", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Diclofenac", "50mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Meloxicam", "7.5mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Amoxicillin", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "14:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Ampicillin", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "14:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Azithromycin", "500mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Clarithromycin", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Ciprofloxacin", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Metronidazole", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "14:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Doxycycline", "100mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Cefuroxime", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Ceftriaxone", "1g"),
  drug("Cephalexin", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "14:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Omeprazole", "20mg", { morning: { customTime: "07:00", mealTiming: "pre_meal", pillCount: 1 } }),
  drug("Pantoprazole", "40mg", { morning: { customTime: "07:00", mealTiming: "pre_meal", pillCount: 1 } }),
  drug("Esomeprazole", "40mg", { morning: { customTime: "07:00", mealTiming: "pre_meal", pillCount: 1 } }),
  drug("Ranitidine", "150mg", { morning: { customTime: "08:00", mealTiming: "pre_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "pre_meal", pillCount: 1 } }),
  drug("Antacid", "1 gói", { morning: { customTime: "08:30", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:30", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:30", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Metformin", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Glibenclamide", "5mg", { morning: { customTime: "07:30", mealTiming: "pre_meal", pillCount: 1 } }),
  drug("Gliclazide", "80mg", { morning: { customTime: "07:30", mealTiming: "pre_meal", pillCount: 1 } }),
  drug("Insulin Aspart"),
  drug("Insulin Glargine", "", { evening: { customTime: "22:00", mealTiming: "", pillCount: 1 } }),
  drug("Amlodipine", "5mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Nifedipine", "30mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Atenolol", "50mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Metoprolol", "50mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Bisoprolol", "5mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Losartan", "50mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Valsartan", "80mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Lisinopril", "10mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Enalapril", "10mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Ramipril", "5mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Atorvastatin", "20mg", { evening: { customTime: "21:00", mealTiming: "", pillCount: 1 } }),
  drug("Rosuvastatin", "10mg", { evening: { customTime: "21:00", mealTiming: "", pillCount: 1 } }),
  drug("Simvastatin", "20mg", { evening: { customTime: "21:00", mealTiming: "", pillCount: 1 } }),
  drug("Aspirin 81mg", "81mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Clopidogrel", "75mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Warfarin", "5mg", { evening: { customTime: "18:00", mealTiming: "", pillCount: 1 } }),
  drug("Furosemide", "40mg", { morning: { customTime: "07:00", mealTiming: "", pillCount: 1 } }),
  drug("Hydrochlorothiazide", "25mg", { morning: { customTime: "07:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Spironolactone", "25mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Prednisolone", "5mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Dexamethasone", "0.5mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Methylprednisolone", "4mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Cetirizine", "10mg", { evening: { customTime: "21:00", mealTiming: "", pillCount: 1 } }),
  drug("Loratadine", "10mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Fexofenadine", "120mg", { morning: { customTime: "08:00", mealTiming: "", pillCount: 1 } }),
  drug("Salbutamol", "4mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "12:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Montelukast", "10mg", { evening: { customTime: "21:00", mealTiming: "", pillCount: 1 } }),
  drug("Fluticasone"),
  drug("Levothyroxine", "50mcg", { morning: { customTime: "07:00", mealTiming: "pre_meal", pillCount: 1 } }),
  drug("Methimazole", "10mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, noon: { customTime: "14:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Diazepam", "5mg", { evening: { customTime: "21:00", mealTiming: "", pillCount: 1 } }),
  drug("Alprazolam", "0.25mg", { evening: { customTime: "21:00", mealTiming: "", pillCount: 1 } }),
  drug("Clonazepam", "0.5mg", { evening: { customTime: "21:00", mealTiming: "", pillCount: 1 } }),
  drug("Vitamin B1", "10mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Vitamin B6", "10mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Vitamin B12", "500mcg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Vitamin C", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Vitamin D3", "1000IU", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Sắt (II) sulfate", "60mg", { morning: { customTime: "07:30", mealTiming: "pre_meal", pillCount: 1 } }),
  drug("Acid folic", "5mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 } }),
  drug("Canxi carbonat", "500mg", { morning: { customTime: "08:00", mealTiming: "post_meal", pillCount: 1 }, evening: { customTime: "20:00", mealTiming: "post_meal", pillCount: 1 } }),
];

const createDefaultDose = () => ({
  timeOfDay: "morning", // 'morning' | 'noon' | 'evening'
  customTime: "08:00",
  mealTiming: "post_meal", // 'pre_meal' | 'post_meal' | ''
  pillCount: 1,
});

const createDefaultMedication = () => ({
  drugName: "",
  dosage: "1 viên",
  route: "Đường uống",
  instructions: "",
  schedule: [createDefaultDose()],
});

const createDefaultFormData = (patientId = "") => {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);

  return {
    patientId,
    medications: [createDefaultMedication()],
    timezone: "Asia/Ho_Chi_Minh",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
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

export default function PrescriptionsScreen() {
  const isFocused = useIsFocused();
  const route = useRoute();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  useEffect(() => {
    if (route.params?.patientId) {
      setSelectedPatientId(route.params.patientId);
    }
  }, [route.params?.patientId]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [prescriptions, setPrescriptions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  // Form states
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createDefaultFormData());
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [focusedMedIdx, setFocusedMedIdx] = useState(null);

  const handleDrugSelect = (medIdx, suggestion) => {
    setFormData((prev) => {
      const nextMeds = [...prev.medications];
      const med = { ...nextMeds[medIdx] };
      med.drugName = suggestion.name;
      if (suggestion.dosage) {
        med.dosage = suggestion.dosage;
      }
      if (suggestion.schedule) {
        const schedule = [];
        for (const tod of ["morning", "noon", "evening"]) {
          const slot = suggestion.schedule[tod];
          if (slot) {
            schedule.push({
              timeOfDay: tod,
              customTime: slot.customTime,
              mealTiming: slot.mealTiming || "",
              pillCount: slot.pillCount || 1,
            });
          }
        }
        if (schedule.length > 0) {
          med.schedule = schedule;
        }
      }
      nextMeds[medIdx] = med;
      return { ...prev, medications: nextMeds };
    });
  };

  const handleCloseForm = () => {
    const hasTypedMedication = (formData.medications || []).some(
      (med) => med.drugName && med.drugName.trim() !== ""
    );
    if (!hasTypedMedication) {
      setIsFormVisible(false);
    } else {
      Alert.alert(
        "Xác nhận đóng",
        "Đơn thuốc có chứa các loại thuốc chưa lưu. Bạn có chắc chắn muốn hủy bỏ và đóng biểu mẫu không?",
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
        const list = res.body?.data || res.body || [];
        setPatients(list);
      } catch (err) {
        console.error("Failed to load patients for prescriptions:", err);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, [isFocused]);

  // Load prescriptions
  const fetchPrescriptions = async () => {
    if (loadingPatients) return;
    setLoadingPrescriptions(true);

    try {
      const [presRes, remRes] = await Promise.all([
        getPrescriptions({
          patientId: selectedPatientId || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        }),
        getReminders({
          patientId: selectedPatientId || undefined,
        }),
      ]);

      const list = presRes.body?.data || presRes.body || [];
      const sorted = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPrescriptions(sorted);

      const remindersList = remRes.body?.data || remRes.body || [];
      setReminders(remindersList);
    } catch (err) {
      console.error("Failed to load prescriptions or reminders:", err);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchPrescriptions();
    }
  }, [selectedPatientId, statusFilter, patients, loadingPatients, isFocused]);

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

  const handleEdit = (p) => {
    const meds = (p.medications || []).map((med) => ({
      drugName: med.drugName,
      dosage: med.dosage,
      route: med.route || "",
      instructions: med.instructions || "",
      schedule: (med.schedule || []).map((dose) => ({
        timeOfDay: dose.timeOfDay,
        customTime: dose.hour !== undefined && dose.minute !== undefined ? formatTime(dose.hour, dose.minute) : "",
        mealTiming: dose.mealTiming || "",
        pillCount: dose.pillCount || 1,
      })),
    }));

    setFormData({
      patientId: p.patientId,
      medications: meds,
      timezone: p.timezone || "Asia/Ho_Chi_Minh",
      daysOfWeek: p.daysOfWeek || [],
      startDate: formatDateOnly(p.startDate),
      endDate: p.endDate ? formatDateOnly(p.endDate) : "",
      status: p.status,
    });
    setEditingId(p.id);
    setIsFormVisible(true);
    setShowPatientListInForm(false);
    setErrorMessage("");
  };

  const handleStatusUpdate = (prescription, nextStatus) => {
    let actionLabel = "kích hoạt";
    if (nextStatus === "completed") actionLabel = "hoàn thành";
    if (nextStatus === "discontinued") actionLabel = "ngưng sử dụng";

    Alert.alert(
      "Xác nhận thay đổi",
      `Bạn có muốn chuyển trạng thái đơn thuốc thành "${actionLabel}" không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          onPress: async () => {
            setLoadingPrescriptions(true);
            try {
              const res = await updatePrescriptionStatus(prescription.id, nextStatus);
              if (res.ok) {
                showToast(`Đã cập nhật trạng thái đơn thuốc thành công.`);
                fetchPrescriptions();
              } else {
                setErrorMessage(res.body?.error || "Lỗi khi cập nhật trạng thái đơn thuốc.");
              }
            } catch (err) {
              setErrorMessage("Lỗi hệ thống xảy ra.");
            } finally {
              setLoadingPrescriptions(false);
            }
          },
        },
      ]
    );
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

  // Medications modifiers
  const handleAddMedication = () => {
    setFormData((curr) => ({
      ...curr,
      medications: [...curr.medications, createDefaultMedication()],
    }));
  };

  const handleRemoveMedication = (medIdx) => {
    setFormData((curr) => ({
      ...curr,
      medications: curr.medications.filter((_, idx) => idx !== medIdx),
    }));
  };

  const handleMedFieldChange = (medIdx, key, val) => {
    setFormData((curr) => {
      const updated = curr.medications.map((med, idx) => {
        if (idx === medIdx) {
          return { ...med, [key]: val };
        }
        return med;
      });
      return { ...curr, medications: updated };
    });
  };

  // Doses modifiers
  const handleAddDose = (medIdx) => {
    setFormData((curr) => {
      const updated = curr.medications.map((med, idx) => {
        if (idx === medIdx) {
          return { ...med, schedule: [...med.schedule, createDefaultDose()] };
        }
        return med;
      });
      return { ...curr, medications: updated };
    });
  };

  const handleRemoveDose = (medIdx, doseIdx) => {
    setFormData((curr) => {
      const updated = curr.medications.map((med, idx) => {
        if (idx === medIdx) {
          return { ...med, schedule: med.schedule.filter((_, dIdx) => dIdx !== doseIdx) };
        }
        return med;
      });
      return { ...curr, medications: updated };
    });
  };

  const handleDoseFieldChange = (medIdx, doseIdx, key, val) => {
    setFormData((curr) => {
      const updated = curr.medications.map((med, idx) => {
        if (idx === medIdx) {
          const updatedDoses = med.schedule.map((dose, dIdx) => {
            if (dIdx === doseIdx) {
              return { ...dose, [key]: val };
            }
            return dose;
          });
          return { ...med, schedule: updatedDoses };
        }
        return med;
      });
      return { ...curr, medications: updated };
    });
  };

  const validateForm = () => {
    if (!formData.patientId) return "Vui lòng chọn một bệnh nhân.";
    if (formData.medications.length === 0) return "Đơn thuốc cần ít nhất một loại thuốc.";
    if (formData.daysOfWeek.length === 0) return "Vui lòng chọn ít nhất một ngày uống trong tuần.";

    for (let i = 0; i < formData.medications.length; i++) {
      const med = formData.medications[i];
      if (!med.drugName.trim()) return `Tên thuốc thứ ${i + 1} không được để trống.`;
      if (!med.dosage.trim()) return `Liều lượng thuốc thứ ${i + 1} không được để trống.`;
      if (med.schedule.length === 0) return `Vui lòng thêm lịch uống cho thuốc "${med.drugName || `#${i + 1}`}".`;

      for (let j = 0; j < med.schedule.length; j++) {
        const dose = med.schedule[j];
        if (dose.pillCount <= 0) return `Số lượng viên của liều thứ ${j + 1} phải lớn hơn 0.`;
        if (dose.customTime) {
          const [hText, mText] = dose.customTime.split(":");
          const hour = parseInt(hText || "", 10);
          const minute = parseInt(mText || "", 10);
          if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
            return `Giờ uống thuốc "${med.drugName}" không hợp lệ (HH:mm).`;
          }
        }
      }
    }

    const start = new Date(`${formData.startDate}T00:00:00`);
    if (formData.endDate) {
      const end = new Date(`${formData.endDate}T23:59:59`);
      if (end.getTime() < start.getTime()) {
        return "Ngày kết thúc không được nhỏ hơn ngày bắt đầu.";
      }
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

    const medicationsPayload = formData.medications.map((med) => {
      const schedule = med.schedule.map((dose) => {
        const doseObj = {
          timeOfDay: dose.timeOfDay,
          pillCount: parseFloat(dose.pillCount),
        };
        if (dose.customTime) {
          const [hText, mText] = dose.customTime.split(":");
          doseObj.hour = parseInt(hText, 10);
          doseObj.minute = parseInt(mText, 10);
        }
        if (dose.mealTiming) {
          doseObj.mealTiming = dose.mealTiming;
        }
        return doseObj;
      });

      return {
        drugName: med.drugName.trim(),
        dosage: med.dosage.trim(),
        route: med.route.trim() || undefined,
        instructions: med.instructions.trim() || undefined,
        schedule,
      };
    });

    const payload = {
      patientId: formData.patientId,
      medications: medicationsPayload,
      timezone: formData.timezone,
      daysOfWeek: [...formData.daysOfWeek].sort((a, b) => a - b),
      startDate: new Date(`${formData.startDate}T00:00:00`).toISOString(),
      endDate: formData.endDate ? new Date(`${formData.endDate}T23:59:59`).toISOString() : null,
    };

    try {
      let res;
      if (editingId) {
        res = await updatePrescription(editingId, {
          ...payload,
          status: formData.status,
        });
      } else {
        res = await createPrescription(payload);
      }

      if (res.ok) {
        showToast(
          editingId ? "Cập nhật đơn thuốc thành công!" : "Tạo đơn thuốc mới thành công!"
        );
        setIsFormVisible(false);
        setEditingId(null);
        fetchPrescriptions();
      } else {
        setErrorMessage(res.body?.error || "Lỗi khi lưu cấu hình đơn thuốc.");
      }
    } catch (err) {
      setErrorMessage("Không thể kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const renderTimeOfDay = (tod) => {
    if (tod === "morning") return "Sáng";
    if (tod === "noon") return "Trưa";
    if (tod === "evening") return "Tối";
    return tod;
  };

  const renderMealTiming = (mt) => {
    if (mt === "pre_meal") return "Trước ăn";
    if (mt === "post_meal") return "Sau ăn";
    return "";
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{prescriptions.length}</Text>
          <Text style={styles.statLabel}>Tổng đơn</Text>
        </View>
        <View style={[styles.statCard, { borderColor: "#D1FAE5" }]}>
          <Text style={[styles.statValue, { color: "#059669" }]}>{prescriptions.filter(p => p.status === "active").length}</Text>
          <Text style={styles.statLabel}>Đang hoạt động</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: "#6B7280" }]}>{prescriptions.filter(p => p.status !== "active").length}</Text>
          <Text style={styles.statLabel}>Đã kết thúc</Text>
        </View>
      </View>

      {/* Patient Search Header */}
      <View style={styles.pickerHeader}>
        <Text style={styles.pickerTitle}>Lọc đơn thuốc theo bệnh nhân</Text>
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

      {/* Patient Search Modal */}
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

      {/* Filter Status Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {["all", "active", "completed", "discontinued", "expired"].map((status) => {
            const isSelected = statusFilter === status;
            let label = "Tất cả trạng thái";
            if (status === "active") label = "Đang điều trị";
            if (status === "completed") label = "Đã hoàn thành";
            if (status === "discontinued") label = "Ngưng sử dụng";
            if (status === "expired") label = "Hết hạn";

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

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>


        {/* Prescription List Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Danh sách đơn thuốc ({prescriptions.length})
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
            <Text style={styles.addBtnText}>Kê đơn mới</Text>
          </TouchableOpacity>
        </View>

        {loadingPrescriptions ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
        ) : prescriptions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color="#9CA3AF" />
            <Text style={styles.emptyText}>Không tìm thấy đơn thuốc nào.</Text>
          </View>
        ) : (
          prescriptions.map((p, idx) => {
            const patientObj = patients.find((pat) => pat.patientId === p.patientId);
            const patName = patientObj?.patientName || patientObj?.name || "Bệnh nhân";

            let statusColor = "#6B7280";
            let statusBg = "#F3F4F6";
            let statusText = "Hết hạn";

            if (p.status === "active") {
              statusColor = "#065F46";
              statusBg = "#D1FAE5";
              statusText = "Đang hoạt động";
            } else if (p.status === "completed") {
              statusColor = "#1E40AF";
              statusBg = "#DBEAFE";
              statusText = "Đã hoàn thành";
            } else if (p.status === "discontinued") {
              statusColor = "#991B1B";
              statusBg = "#FEE2E2";
              statusText = "Ngưng sử dụng";
            }

            return (
              <View key={p.id || `prescription-${idx}`} style={styles.prescriptionCard}>
                <View style={styles.prescriptionCardHeader}>
                  <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusTagText, { color: statusColor }]}>{statusText}</Text>
                  </View>
                  <Text style={styles.patientSub}>{patName}</Text>
                </View>

                {/* Medications List */}
                <View style={styles.medsContainer}>
                  {(p.medications || []).map((med, medIdx) => (
                    <View key={medIdx} style={styles.medItem}>
                      <View style={styles.medItemHeader}>
                        <Ionicons name="medical-outline" size={16} color="#2563EB" />
                        <Text style={styles.drugName}>{med.drugName}</Text>
                        <Text style={styles.dosageText}>({med.dosage})</Text>
                      </View>
                      {med.route ? (
                        <Text style={styles.medSubText}>• Đường dùng: {med.route}</Text>
                      ) : null}
                      {med.instructions ? (
                        <Text style={styles.medSubText}>• Chỉ dẫn: {med.instructions}</Text>
                      ) : null}

                      {/* Doses */}
                      <View style={styles.dosesRow}>
                        {(med.schedule || []).map((dose, doseIdx) => (
                          <View key={doseIdx} style={styles.doseTag}>
                            <Text style={styles.doseTagText}>
                              {renderTimeOfDay(dose.timeOfDay)}{" "}
                              {dose.hour !== undefined && dose.minute !== undefined ? `(${formatTime(dose.hour, dose.minute)})` : ""}{" "}
                              {renderMealTiming(dose.mealTiming)}{" "}
                              {dose.pillCount}v
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Duration */}
                <View style={styles.durationRow}>
                  <Text style={styles.infoText}>
                    <Ionicons name="calendar-outline" size={12} color="#6B7280" /> Lặp lại:{" "}
                    <Text style={{ fontWeight: "600", color: "#374151" }}>
                      {buildWeekdaySummary(p.daysOfWeek)}
                    </Text>
                  </Text>
                  <Text style={styles.infoText}>
                    <Ionicons name="time-outline" size={12} color="#6B7280" /> Hiệu lực:{" "}
                    {formatDate(p.startDate)} → {p.endDate ? formatDate(p.endDate) : "Không thời hạn"}
                  </Text>
                </View>

                {/* Linked Reminders */}
                {(() => {
                  const linkedReminders = reminders.filter((r) => r.prescriptionId === p.id && r.status === "active");
                  if (linkedReminders.length === 0) return null;
                  return (
                    <View style={styles.linkedRemindersSection}>
                      <Text style={styles.linkedRemindersTitle}>
                        <Ionicons name="alarm-outline" size={13} color="#B45309" /> Nhắc nhở liên kết:
                      </Text>
                      {linkedReminders.map((r, rIdx) => {
                        const timeStr = (r.hour != null && r.minute != null)
                          ? `${String(r.hour).padStart(2, "0")}:${String(r.minute).padStart(2, "0")}`
                          : r.time || "";
                        const statusLabel = r.status === "active" ? "Đang hoạt động"
                          : r.status === "paused" ? "Tạm dừng"
                          : r.status === "completed" ? "Đã xong"
                          : r.status === "canceled" ? "Đã ngưng"
                          : "Đã ngưng";
                        return (
                          <View key={r.id || rIdx} style={styles.linkedReminderRow}>
                            <View style={[styles.reminderStatusDot, { backgroundColor: r.status === "active" ? "#10B981" : "#9CA3AF" }]} />
                            <Text style={styles.linkedReminderText} numberOfLines={1}>
                              [{timeStr}] {r.message || "Uống thuốc"} ({statusLabel})
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}

                {/* Actions */}
                <View style={styles.cardActions}>
                  {p.status === "active" && (
                    <>
                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => handleEdit(p)}
                      >
                        <Ionicons name="create-outline" size={16} color="#2563EB" />
                        <Text style={[styles.cardActionBtnText, { color: "#2563EB" }]}>Sửa</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => handleStatusUpdate(p, "completed")}
                      >
                        <Ionicons name="checkmark-done-circle-outline" size={16} color="#10B981" />
                        <Text style={[styles.cardActionBtnText, { color: "#10B981" }]}>Hoàn thành</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => handleStatusUpdate(p, "discontinued")}
                      >
                        <Ionicons name="stop-circle-outline" size={16} color="#EF4444" />
                        <Text style={[styles.cardActionBtnText, { color: "#EF4444" }]}>Ngưng dùng</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add/Edit Prescription Form Modal */}
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
                    {editingId ? "Chỉnh sửa đơn thuốc" : "Kê đơn thuốc mới"}
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

                  {/* Weekday choices */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSecTitle}>Lặp lại vào các ngày</Text>
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

                  {/* Duration Dates */}
                  <View style={styles.formSection}>
                    <Text style={styles.formSecTitle}>Thời gian áp dụng (YYYY-MM-DD)</Text>
                    <View style={styles.row}>
                      <View style={styles.col}>
                        <Text style={styles.inputLabel}>Bắt đầu từ</Text>
                        <TextInput
                          style={styles.input}
                          value={formData.startDate}
                          onChangeText={(val) => setFormData({ ...formData, startDate: val })}
                        />
                      </View>
                      <View style={styles.col}>
                        <Text style={styles.inputLabel}>Kết thúc lúc</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Bỏ trống nếu lâu dài"
                          value={formData.endDate}
                          onChangeText={(val) => setFormData({ ...formData, endDate: val })}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Medications List */}
                  <View style={styles.medsFormHeader}>
                    <Text style={styles.formSecTitle}>Danh mục thuốc kê toa ({formData.medications.length})</Text>
                    <TouchableOpacity
                      style={styles.addMedBtn}
                      onPress={handleAddMedication}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#2563EB" />
                      <Text style={styles.addMedBtnText}>Thêm thuốc</Text>
                    </TouchableOpacity>
                  </View>

                  {formData.medications.map((med, medIdx) => (
                    <View key={medIdx} style={styles.medFormCard}>
                      <View style={styles.medFormHeader}>
                        <Text style={styles.medFormTitle}>Thuốc #{medIdx + 1}</Text>
                        {formData.medications.length > 1 && (
                          <TouchableOpacity
                            onPress={() => handleRemoveMedication(medIdx)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Drug Name & Dosage */}
                      <View style={styles.formSection}>
                        <Text style={styles.inputLabel}>Tên thuốc *</Text>
                        <View style={{ justifyContent: "center" }}>
                          <TextInput
                            style={[styles.input, { paddingRight: 36 }]}
                            placeholder="Ví dụ: Panadol, Metformin..."
                            value={med.drugName}
                            onChangeText={(val) => handleMedFieldChange(medIdx, "drugName", val)}
                            onFocus={() => setFocusedMedIdx(medIdx)}
                            onBlur={() => {
                              // Delay slightly so onPress registers
                              setTimeout(() => {
                                setFocusedMedIdx((prev) => (prev === medIdx ? null : prev));
                              }, 200);
                            }}
                          />
                          <TouchableOpacity
                            style={{ position: "absolute", right: 12, padding: 4 }}
                            onPress={() => setFocusedMedIdx(focusedMedIdx === medIdx ? null : medIdx)}
                          >
                            <Ionicons
                              name={focusedMedIdx === medIdx ? "chevron-up" : "chevron-down"}
                              size={18}
                              color="#6B7280"
                            />
                          </TouchableOpacity>
                        </View>
                        {focusedMedIdx === medIdx && (() => {
                          const query = (med.drugName || "").trim().toLowerCase();
                          const matches = query
                            ? DRUG_SUGGESTIONS.filter((item) =>
                                item.name.toLowerCase().includes(query)
                              )
                            : DRUG_SUGGESTIONS;
                          if (matches.length === 0) return null;
                          return (
                            <ScrollView
                              style={styles.suggestionsContainer}
                              nestedScrollEnabled={true}
                              keyboardShouldPersistTaps="handled"
                            >
                              {matches.map((item, sIdx) => (
                                <TouchableOpacity
                                  key={`suggestion-${sIdx}`}
                                  style={[
                                    styles.suggestionItem,
                                    sIdx === matches.length - 1 && { borderBottomWidth: 0 },
                                  ]}
                                  onPress={() => {
                                    handleDrugSelect(medIdx, item);
                                    setFocusedMedIdx(null);
                                  }}
                                >
                                  <Ionicons name="medkit" size={16} color="#3B82F6" />
                                  <Text style={styles.suggestionText}>{item.name}</Text>
                                  {item.dosage ? <Text style={styles.suggestionDosage}>({item.dosage})</Text> : null}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          );
                        })()}
                      </View>

                      <View style={styles.row}>
                        <View style={styles.col}>
                          <Text style={styles.inputLabel}>Liều lượng *</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Ví dụ: 1 viên, 500mg..."
                            value={med.dosage}
                            onChangeText={(val) => handleMedFieldChange(medIdx, "dosage", val)}
                          />
                        </View>
                        <View style={styles.col}>
                          <Text style={styles.inputLabel}>Đường dùng</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="Ví dụ: Đường uống, tiêm..."
                            value={med.route}
                            onChangeText={(val) => handleMedFieldChange(medIdx, "route", val)}
                          />
                        </View>
                      </View>

                      <View style={[styles.formSection, { marginTop: 10 }]}>
                        <Text style={styles.inputLabel}>Lời dặn / Ghi chú</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ví dụ: Uống sau ăn 30 phút..."
                          value={med.instructions}
                          onChangeText={(val) => handleMedFieldChange(medIdx, "instructions", val)}
                        />
                      </View>

                      {/* Dose Schedules for this Med */}
                      <View style={styles.dosesFormHeader}>
                        <Text style={styles.subLabel}>Lịch uống ({med.schedule.length})</Text>
                        <TouchableOpacity
                          style={styles.addDoseBtn}
                          onPress={() => handleAddDose(medIdx)}
                        >
                          <Ionicons name="time" size={12} color="#2563EB" />
                          <Text style={styles.addDoseBtnText}>Thêm giờ</Text>
                        </TouchableOpacity>
                      </View>

                      {med.schedule.map((dose, doseIdx) => (
                        <View key={doseIdx} style={styles.doseFormCard}>
                          {/* Header of Dose */}
                          <View style={styles.doseCardHeader}>
                            <View style={styles.doseCardHeaderLeft}>
                              <Ionicons name="time-outline" size={14} color="#64748B" />
                              <Text style={styles.doseCardTitle}>Lần uống #{doseIdx + 1}</Text>
                            </View>
                            {med.schedule.length > 1 && (
                              <TouchableOpacity
                                onPress={() => handleRemoveDose(medIdx, doseIdx)}
                                style={styles.removeDoseBtn}
                              >
                                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                <Text style={styles.removeDoseText}>Xóa</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Time of Day Segment & Time Input */}
                          <View style={styles.doseRow}>
                            {/* Segment selector for Sáng / Trưa / Tối */}
                            <View style={{ flex: 1 }}>
                              <Text style={styles.doseFieldLabel}>Thời điểm</Text>
                              <View style={styles.todSegmentContainer}>
                                {["morning", "noon", "evening"].map((tod) => {
                                  const selected = dose.timeOfDay === tod;
                                  return (
                                    <TouchableOpacity
                                      key={tod}
                                      style={[styles.todSegmentBtn, selected && styles.todSegmentBtnActive]}
                                      onPress={() => handleDoseFieldChange(medIdx, doseIdx, "timeOfDay", tod)}
                                    >
                                      <Text style={[styles.todSegmentText, selected && styles.todSegmentTextActive]}>
                                        {renderTimeOfDay(tod)}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>

                            {/* HH:mm input */}
                            <View style={styles.timeInputContainer}>
                              <Text style={styles.doseFieldLabel}>Giờ uống</Text>
                              <TextInput
                                style={styles.timeInput}
                                placeholder="08:00"
                                placeholderTextColor="#9CA3AF"
                                value={dose.customTime}
                                onChangeText={(val) => handleDoseFieldChange(medIdx, doseIdx, "customTime", val)}
                              />
                            </View>
                          </View>

                          {/* Pill Count & Meal Timing */}
                          <View style={styles.doseRow}>
                            {/* Pill Counter with - / + buttons */}
                            <View style={styles.pillCounterContainer}>
                              <Text style={styles.doseFieldLabel}>Số viên</Text>
                              <View style={styles.counterRow}>
                                <TouchableOpacity
                                  style={styles.counterBtn}
                                  onPress={() => {
                                    const nextVal = Math.max(0.5, Number(dose.pillCount || 0) - 0.5);
                                    handleDoseFieldChange(medIdx, doseIdx, "pillCount", nextVal);
                                  }}
                                >
                                  <Text style={styles.counterBtnText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.counterValueText}>{dose.pillCount}</Text>
                                <TouchableOpacity
                                  style={styles.counterBtn}
                                  onPress={() => {
                                    const nextVal = Number(dose.pillCount || 0) + 0.5;
                                    handleDoseFieldChange(medIdx, doseIdx, "pillCount", nextVal);
                                  }}
                                >
                                  <Text style={styles.counterBtnText}>+</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Meal Timing Button group */}
                            <View style={styles.mealTimingContainer}>
                              <Text style={styles.doseFieldLabel}>Thời điểm ăn</Text>
                              <View style={styles.mealTimingRow}>
                                {[
                                  { val: "", lbl: "K.hạn" },
                                  { val: "pre_meal", lbl: "Trước ăn" },
                                  { val: "post_meal", lbl: "Sau ăn" },
                                ].map((item) => {
                                  const selected = dose.mealTiming === item.val;
                                  return (
                                    <TouchableOpacity
                                      key={item.val}
                                      style={[styles.mealTimingBtn, selected && styles.mealTimingBtnActive]}
                                      onPress={() => handleDoseFieldChange(medIdx, doseIdx, "mealTiming", item.val)}
                                    >
                                      <Text style={[styles.mealTimingText, selected && styles.mealTimingTextActive]}>
                                        {item.lbl}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
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
                      <Text style={styles.saveBtnText}>Lưu đơn thuốc</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F6FF" },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
  statLabel: { fontSize: 10, fontWeight: "500", color: "#6B7280", marginTop: 2 },
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

  // Modal styling
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

  // Filter Bar
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

  prescriptionCard: {
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
  prescriptionCardHeader: {
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
  patientSub: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  medsContainer: {
    gap: 12,
    marginBottom: 10,
  },
  medItem: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  medItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  drugName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  dosageText: {
    fontSize: 13,
    color: "#64748B",
  },
  medSubText: {
    fontSize: 12,
    color: "#475569",
    marginLeft: 22,
    marginTop: 2,
  },
  dosesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginLeft: 22,
    marginTop: 8,
  },
  doseTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  doseTagText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
  },
  durationRow: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 8,
    gap: 4,
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
    marginTop: 10,
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
    padding: 16,
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

  // Medications sub-form list
  medsFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 6,
  },
  addMedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addMedBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  medFormCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  medFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  medFormTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  dosesFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  addDoseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addDoseBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  doseFormCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  doseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 6,
  },
  doseCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  doseCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  removeDoseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  removeDoseText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "600",
  },
  doseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 8,
  },
  todSegmentContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 2,
    height: 38,
    alignItems: "center",
  },
  todSegmentBtn: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  todSegmentBtnActive: {
    backgroundColor: "#2563EB",
  },
  todSegmentText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  todSegmentTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  timeInputContainer: {
    width: 90,
  },
  doseFieldLabel: {
    fontSize: 10,
    color: "#64748B",
    marginBottom: 4,
    fontWeight: "600",
  },
  timeInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
    fontSize: 14,
    color: "#1F2937",
    textAlign: "center",
  },
  pillCounterContainer: {
    width: 100,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    height: 38,
  },
  counterBtn: {
    width: 30,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#64748B",
  },
  counterValueText: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  mealTimingContainer: {
    flex: 1,
  },
  mealTimingRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 2,
    height: 38,
    alignItems: "center",
  },
  mealTimingBtn: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
  },
  mealTimingBtnActive: {
    backgroundColor: "#10B981",
  },
  mealTimingText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
  },
  mealTimingTextActive: {
    color: "#FFFFFF",
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
  linkedRemindersSection: {
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  linkedRemindersTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    marginBottom: 6,
  },
  linkedReminderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  reminderStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  linkedReminderText: {
    fontSize: 11,
    color: "#78350F",
    fontWeight: "500",
    flex: 1,
  },
  suggestionsContainer: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    marginTop: 6,
    padding: 2,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  suggestionText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    marginLeft: 8,
  },
  suggestionDosage: {
    fontSize: 12,
    color: "#4B5563",
    marginLeft: 6,
  },
});

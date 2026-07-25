import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";

import { useAuth } from "../../hooks/useAuth";
import { useSnackbar } from "../../hooks/useSnackbar";
import {
  getMyPatientProfile,
  updateMyPatientProfile,
} from "../../api/profileApi";
import {
  getFirstValidationMessage,
  validatePatientProfileForm,
} from "../../utils/profileValidation";
import { buildPatientQrValue } from "../../utils/patientQrUtils";
import { request } from "../../api/httpClient";
import { getMyCareTeam } from "../../api/assignmentApi";


const EMPTY_USER_FORM = {
  id: "",
  name: "",
  email: "",
  phone: "",
  avatarUrl: "",
};

const EMPTY_PATIENT_FORM = {
  id: "",
  patientCode: "",
  insuranceNumber: "",
  cccd: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  medicalHistory: "",
  gender: "",
  dob: "",
  createdAt: "",
  updatedAt: "",
  diseaseTypes: {
    bloodPressure: false,
    glucose: false,
  },
};

function getAvatarInitial(name) {
  if (!name || !name.trim()) {
    return "BN";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatDateTime(value) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return "Chưa cập nhật";
  }

  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mi = String(parsed.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} • ${hh}:${mi}`;
}

function formatDateOnly(value) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return value || "Chưa cập nhật";
  }

  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

function formatGender(gender) {
  switch (gender) {
    case "M":
      return "Nam";
    case "F":
      return "Nữ";
    case "O":
      return "Khác";
    default:
      return "Chưa cập nhật";
  }
}

function getErrorMessage(response) {
  if (!response) {
    return "Không thể kết nối tới máy chủ.";
  }

  if (typeof response.error === "string" && response.error) {
    return response.error;
  }

  if (typeof response.body === "string" && response.body) {
    return response.body;
  }

  if (response.body?.error) {
    return response.body.error;
  }

  return "Đã xảy ra lỗi không xác định.";
}

function normalizeProfile(profile = {}) {
  const user = {
    id: profile.id || "",
    name: profile.name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    avatarUrl: profile.avatarUrl || "",
  };

  const patient = {
    id: profile.id || "",
    patientCode: profile.patientCode || profile.userPublicId || "",
    insuranceNumber: profile.insuranceNumber || "",
    cccd: profile.cccd || "",
    emergencyContactName: profile.emergencyContactName || "",
    emergencyContactPhone: profile.emergencyContactPhone || "",
    medicalHistory: profile.medicalHistory || "",
    gender: profile.gender || "",
    dob: profile.dob || "",
    createdAt: profile.createdAt || "",
    updatedAt: profile.updatedAt || "",
    diseaseTypes: {
      bloodPressure: profile.diseaseTypes?.bloodPressure || false,
      glucose: profile.diseaseTypes?.glucose || false,
    },
  };

  return { user, patient };
}

function ValidationMessage({ message }) {
  if (!message) {
    return null;
  }

  return <Text style={styles.validationText}>{message}</Text>;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { logout, updateUser, isBiometricEnabled, enableBiometric, disableBiometric, refreshBiometricStatus, sessionPassword } = useAuth();
  const { showSuccess, showError, showWarning } = useSnackbar();
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleToggleBiometric = async () => {
    if (isBiometricEnabled) {
      const res = await disableBiometric();
      if (!res.ok) {
        showError(res.error);
      }
    } else {
      if (!sessionPassword) {
        if (Platform.OS === "ios") {
          Alert.prompt(
            "Xác nhận mật khẩu",
            "Vui lòng nhập mật khẩu tài khoản của bạn để bật tính năng này:",
            [
              { text: "Hủy", style: "cancel" },
              {
                text: "Xác nhận",
                onPress: async (pwd) => {
                  if (!pwd) {
                    showError("Mật khẩu không được để trống.");
                    return;
                  }
                  setBiometricLoading(true);
                  const res = await enableBiometric(pwd);
                  setBiometricLoading(false);
                  if (!res.ok) {
                    showError(res.error);
                  } else {
                    showSuccess("Đã bật đăng nhập sinh trắc học.");
                  }
                },
              },
            ],
            "secure-text"
          );
        } else {
          showWarning(
            "Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại bằng mật khẩu để kích hoạt sinh trắc học."
          );
        }
      } else {
        setBiometricLoading(true);
        const res = await enableBiometric();
        setBiometricLoading(false);
        if (!res.ok) {
          showError(res.error);
        } else {
          showSuccess("Đã bật đăng nhập sinh trắc học.");
        }
      }
    }
  };

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrPreviewVisible, setQrPreviewVisible] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT_FORM);
  const [careTeam, setCareTeam] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [snapshot, setSnapshot] = useState({
    user: EMPTY_USER_FORM,
    patient: EMPTY_PATIENT_FORM,
  });

  const clearFieldError = useCallback((field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const applyProfile = useCallback((profile) => {
    const normalized = normalizeProfile(profile);
    setUserForm(normalized.user);
    setPatientForm(normalized.patient);
    setSnapshot(normalized);
    setFieldErrors({});
    setLoadError("");
  }, []);

  const loadProfile = useCallback(
    async ({ showLoader = true, showRefresh = false } = {}) => {
      if (showLoader) {
        setLoading(true);
      }
      if (showRefresh) {
        setRefreshing(true);
      }

      try {
        const [profileRes, careTeamRes] = await Promise.allSettled([
          getMyPatientProfile(),
          getMyCareTeam(),
        ]);

        if (profileRes.status === "fulfilled" && profileRes.value) {
          const response = profileRes.value;
          if (!response.ok) {
            if (response.status === 401) return;
            throw new Error(getErrorMessage(response));
          }
          applyProfile(response.body?.data || {});
        } else {
          throw new Error("Không tải được hồ sơ bệnh nhân.");
        }

        if (careTeamRes.status === "fulfilled" && careTeamRes.value) {
          const ctResponse = careTeamRes.value;
          if (ctResponse.ok) {
            setCareTeam(ctResponse.body?.data || null);
          } else {
            setCareTeam(null);
          }
        } else {
          setCareTeam(null);
        }
      } catch (error) {
        setLoadError(error.message || "Không tải được hồ sơ bệnh nhân.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [applyProfile]
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      if (refreshBiometricStatus) {
        refreshBiometricStatus();
      }
    }, [loadProfile, refreshBiometricStatus])
  );

  const handleChangeUser = (field, value) => {
    clearFieldError(field);
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangePatient = (field, value) => {
    clearFieldError(field);
    setPatientForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleEdit = () => {
    if (saving) {
      return;
    }

    if (editMode) {
      setUserForm(snapshot.user);
      setPatientForm(snapshot.patient);
      setFieldErrors({});
      setEditMode(false);
      return;
    }

    setEditMode(true);
  };

  const handleSave = async () => {
    const { payload, errors, isValid } = validatePatientProfileForm({
      userForm,
      patientForm,
    });

    if (!isValid) {
      setFieldErrors(errors);
      showWarning(getFirstValidationMessage(errors));
      return;
    }

    setSaving(true);
    try {
      const response = await updateMyPatientProfile(payload);
      if (!response.ok) {
        const backendField = response.body?.field;
        if (backendField) {
          setFieldErrors((prev) => ({
            ...prev,
            [backendField]: getErrorMessage(response),
          }));
        }
        throw new Error(getErrorMessage(response));
      }

      const updatedProfile = response.body?.data || {
        ...payload,
        id: patientForm.id,
        patientCode: patientForm.patientCode,
        createdAt: patientForm.createdAt,
        updatedAt: new Date().toISOString(),
        gender: patientForm.gender,
        dob: patientForm.dob,
        email: userForm.email,
        avatarUrl: userForm.avatarUrl,
      };

      applyProfile(updatedProfile);
      updateUser({
        id: updatedProfile.id,
        name: updatedProfile.name,
        email: updatedProfile.email,
        phone: updatedProfile.phone,
        avatarUrl: updatedProfile.avatarUrl,
        gender: updatedProfile.gender,
        dob: updatedProfile.dob,
      });

      setEditMode(false);
      showSuccess("Thông tin hồ sơ đã được cập nhật");
    } catch (error) {
      showError(error.message || "Không thể lưu hồ sơ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const avatarInitial = getAvatarInitial(userForm.name);
  const hasProfileData = Boolean(userForm.id || snapshot.user.id);
  const patientQrValue = buildPatientQrValue(patientForm.patientCode);

  const handleOpenQrPreview = () => {
    if (!patientQrValue) {
      return;
    }

    setQrPreviewVisible(true);
  };

  const handleCloseQrPreview = () => {
    setQrPreviewVisible(false);
  };

  if (loading && !hasProfileData) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.stateTitle}>Đang tải hồ sơ bệnh nhân</Text>
          <Text style={styles.stateSubtitle}>
            Hệ thống đang lấy thông tin mới nhất từ máy chủ.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasProfileData && loadError) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <View style={styles.stateCard}>
          <Ionicons name="cloud-offline-outline" size={34} color="#B91C1C" />
          <Text style={styles.stateTitle}>Không tải được hồ sơ</Text>
          <Text style={styles.stateSubtitle}>{loadError}</Text>
          <TouchableOpacity style={styles.stateButton} onPress={() => loadProfile()}>
            <Text style={styles.stateButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        visible={qrPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseQrPreview}
      >
        <TouchableOpacity
          style={styles.qrModalOverlay}
          activeOpacity={1}
          onPress={handleCloseQrPreview}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={styles.qrModalCard}
          >
            <View style={styles.qrModalHeader}>
              <View>
                <Text style={styles.qrModalTitle}>Mã QR bệnh nhân</Text>
                <Text style={styles.qrModalSubtitle}>
                  Đưa mã này cho điều dưỡng hoặc thiết bị khác quét trực tiếp.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.qrModalCloseButton}
                onPress={handleCloseQrPreview}
              >
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrModalCodeBox}>
              <QRCode
                value={patientQrValue}
                size={220}
                backgroundColor="#FFFFFF"
                color="#111827"
              />
            </View>

            <Text style={styles.qrModalCodeLabel}>Mã hồ sơ</Text>
            <Text style={styles.qrModalCodeValue}>
              {patientForm.patientCode || "Đang cấp mã"}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        key={selectedStaff?.id || selectedStaff?._id || selectedStaff?.phone || "staff-modal"}
        visible={!!selectedStaff}
        transparent
        statusBarTranslucent={true}
        animationType="fade"
        onRequestClose={() => setSelectedStaff(null)}
      >
        <View style={styles.qrModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedStaff(null)}
          />

          <View
            style={{
              width: "90%",
              maxWidth: 380,
              maxHeight: "82%",
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 0,
              overflow: "hidden",
              alignItems: "stretch",
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            {(() => {
              const isDoctor =
                selectedStaff?.role === "doctor" ||
                selectedStaff?.role === "user.doctor" ||
                selectedStaff?.role?.includes("doctor");
              const genderText =
                selectedStaff?.gender === "MALE" ||
                selectedStaff?.gender === "user.gender.male" ||
                selectedStaff?.gender === "M" ||
                selectedStaff?.gender === "male" ||
                selectedStaff?.gender === "Nam"
                  ? "Nam"
                  : selectedStaff?.gender === "FEMALE" ||
                    selectedStaff?.gender === "user.gender.female" ||
                    selectedStaff?.gender === "F" ||
                    selectedStaff?.gender === "female" ||
                    selectedStaff?.gender === "Nữ"
                  ? "Nữ"
                  : "Chưa cập nhật";

              const qualificationParts = [
                selectedStaff?.academicTitleLabel,
                selectedStaff?.academicDegreeLabel,
                selectedStaff?.professionalQualificationLabel,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <>
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      padding: 6,
                      borderRadius: 16,
                      backgroundColor: "rgba(255,255,255,0.9)",
                      zIndex: 20,
                      shadowColor: "#000",
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                    onPress={() => setSelectedStaff(null)}
                  >
                    <Ionicons name="close" size={20} color="#475569" />
                  </TouchableOpacity>

                  <ScrollView
                    style={{ width: "100%", backgroundColor: "#FFFFFF" }}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    overScrollMode="always"
                    scrollEventThrottle={16}
                  >
                    <View
                      style={{
                        width: "100%",
                        backgroundColor: "#FFFFFF",
                        paddingTop: 28,
                        paddingBottom: 16,
                        paddingHorizontal: 20,
                        alignItems: "center",
                        borderBottomWidth: 1,
                        borderBottomColor: "#F1F5F9",
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: "#F8FAFC",
                          width: 84,
                          height: 84,
                          borderRadius: 42,
                          marginBottom: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          shadowColor: "#000",
                          shadowOpacity: 0.06,
                          shadowRadius: 6,
                          shadowOffset: { width: 0, height: 2 },
                          borderWidth: 2,
                          borderColor: "#E2E8F0",
                        }}
                      >
                        {selectedStaff?.avatarUrl ? (
                          <Image
                            source={{ uri: selectedStaff.avatarUrl }}
                            style={{ width: 80, height: 80, borderRadius: 40 }}
                          />
                        ) : (
                          <Ionicons
                            name={isDoctor ? "person" : "medkit"}
                            size={42}
                            color={isDoctor ? "#2563EB" : "#16A34A"}
                          />
                        )}
                      </View>

                      <Text
                        style={{
                          fontSize: 19,
                          fontWeight: "700",
                          color: "#0F172A",
                          textAlign: "center",
                        }}
                      >
                        {selectedStaff?.displayName || selectedStaff?.name}
                      </Text>

                      <View
                        style={{
                          marginTop: 6,
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 12,
                          backgroundColor: isDoctor ? "#EFF6FF" : "#F0FDF4",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: isDoctor ? "#2563EB" : "#16A34A",
                          }}
                        >
                          {isDoctor ? "Bác sĩ phụ trách" : "Điều dưỡng phụ trách"}
                        </Text>
                      </View>
                    </View>

                    <View style={{ padding: 20 }}>
                      <View style={{ flexDirection: "row", marginBottom: 16, alignItems: "center", width: "100%" }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0, borderWidth: 1, borderColor: "#F1F5F9" }}>
                          <Ionicons name="call" size={18} color={isDoctor ? "#2563EB" : "#16A34A"} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>Số điện thoại</Text>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A", marginTop: 2 }}>
                            {selectedStaff?.phone || "Chưa cập nhật"}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", marginBottom: 16, alignItems: "center", width: "100%" }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0, borderWidth: 1, borderColor: "#F1F5F9" }}>
                          <Ionicons name="male-female" size={18} color={isDoctor ? "#2563EB" : "#16A34A"} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>Giới tính</Text>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A", marginTop: 2 }}>
                            {genderText}
                          </Text>
                        </View>
                      </View>

                      {isDoctor && selectedStaff?.specialization ? (
                        <View style={{ flexDirection: "row", marginBottom: 16, alignItems: "center", width: "100%" }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0, borderWidth: 1, borderColor: "#F1F5F9" }}>
                            <Ionicons name="medical" size={18} color={isDoctor ? "#2563EB" : "#16A34A"} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>Chuyên khoa</Text>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A", marginTop: 2 }}>
                              {selectedStaff.specialization}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {qualificationParts ? (
                        <View style={{ flexDirection: "row", marginBottom: 16, alignItems: "center", width: "100%" }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0, borderWidth: 1, borderColor: "#F1F5F9" }}>
                            <Ionicons name="school" size={18} color={isDoctor ? "#2563EB" : "#16A34A"} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>Học vị / Chuyên môn</Text>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A", marginTop: 2 }}>
                              {qualificationParts}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {selectedStaff?.yearsOfExperience ? (
                        <View style={{ flexDirection: "row", marginBottom: 16, alignItems: "center", width: "100%" }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0, borderWidth: 1, borderColor: "#F1F5F9" }}>
                            <Ionicons name="briefcase" size={18} color={isDoctor ? "#2563EB" : "#16A34A"} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>Kinh nghiệm</Text>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A", marginTop: 2 }}>
                              {selectedStaff.yearsOfExperience} năm
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {selectedStaff?.workplace ? (
                        <View style={{ flexDirection: "row", marginBottom: 16, alignItems: "center", width: "100%" }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginRight: 14, flexShrink: 0, borderWidth: 1, borderColor: "#F1F5F9" }}>
                            <Ionicons name="business" size={18} color={isDoctor ? "#2563EB" : "#16A34A"} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "600" }}>Nơi công tác</Text>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A", marginTop: 2 }}>
                              {selectedStaff.workplace}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {selectedStaff?.phone ? (
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isDoctor ? "#2563EB" : "#16A34A",
                            paddingVertical: 14,
                            borderRadius: 14,
                            marginTop: 8,
                            gap: 8,
                            width: "100%",
                          }}
                          onPress={() => Linking.openURL(`tel:${selectedStaff.phone}`)}
                        >
                          <Ionicons name="call" size={18} color="#FFFFFF" />
                          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>
                            Gọi điện ngay
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadProfile({ showLoader: false, showRefresh: true })}
            />
          }
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Hồ sơ bệnh nhân</Text>

            <TouchableOpacity
              style={[
                styles.editToggleBtn,
                editMode && styles.editToggleBtnActive,
                (loading || saving) && styles.actionDisabled,
              ]}
              onPress={handleToggleEdit}
              disabled={loading || saving}
            >
              <Ionicons
                name={editMode ? "close-outline" : "create-outline"}
                size={16}
                color={editMode ? "#B91C1C" : "#2563EB"}
              />
              <Text
                style={[
                  styles.editToggleText,
                  editMode && styles.editToggleTextActive,
                ]}
              >
                {editMode ? "Hủy" : "Chỉnh sửa"}
              </Text>
            </TouchableOpacity>
          </View>

          {loadError ? (
            <View style={styles.inlineErrorCard}>
              <Ionicons name="warning-outline" size={18} color="#B91C1C" />
              <Text style={styles.inlineErrorText}>{loadError}</Text>
            </View>
          ) : null}

          <View style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.avatarColumn}>
                <View style={styles.avatarWrapper}>
                  {userForm.avatarUrl ? (
                    <Image source={{ uri: userForm.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{avatarInitial}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.avatarHint}>
                  
                </Text>
              </View>

              <View style={styles.profileMainContent}>
                {editMode ? (
                  <>
                    <Text style={styles.fieldLabel}>Họ tên</Text>
                    <TextInput
                      style={styles.inputPrimary}
                      value={userForm.name}
                      onChangeText={(value) => handleChangeUser("name", value)}
                      placeholder="Nhập họ tên bệnh nhân"
                      maxLength={120}
                    />
                    <ValidationMessage message={fieldErrors.name} />
                  </>
                ) : (
                  <Text style={styles.profileName}>{userForm.name || "Chưa cập nhật"}</Text>
                )}

                <Text style={styles.profileSub}>
                  Mã hồ sơ: {patientForm.patientCode || "Đang cấp mã"}
                </Text>

                <View style={styles.chipRow}>
                  <View style={styles.chipPrimary}>
                    <Ionicons name="person-circle-outline" size={14} color="#fff" />
                    <Text style={styles.chipPrimaryText}>Bệnh nhân</Text>
                  </View>
                  <View style={styles.chipOutline}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#2563EB" />
                    <Text style={styles.chipOutlineText}>Theo dõi từ xa</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.contactStack}>
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={16} color="#6B7280" />
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>Email đăng nhập</Text>
                  <Text style={styles.contactValue}>{userForm.email || "Chưa cập nhật"}</Text>
                  {editMode ? (
                    <Text style={styles.contactHint}>
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.contactDivider} />

              <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={16} color="#6B7280" />
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>Số điện thoại</Text>
                  {editMode ? (
                    <>
                      <TextInput
                        style={styles.inputInline}
                        value={userForm.phone}
                        onChangeText={(value) => handleChangeUser("phone", value)}
                        placeholder="Nhập số điện thoại"
                        keyboardType="phone-pad"
                        autoCorrect={false}
                        maxLength={18}
                      />
                      <ValidationMessage message={fieldErrors.phone} />
                    </>
                  ) : userForm.phone ? (
                    <Text style={styles.contactValue}>{userForm.phone}</Text>
                  ) : (
                    <Text style={styles.infoHint}>Chưa cập nhật số điện thoại</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRowIcon}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="male-female-outline" size={20} color="#2563EB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Giới tính</Text>
                <Text style={styles.infoValue}>{formatGender(patientForm.gender)}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRowIcon}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="calendar-outline" size={20} color="#2563EB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Ngày sinh</Text>
                <Text style={styles.infoValue}>{formatDateOnly(patientForm.dob)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Thông tin bảo hiểm & định danh</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRowIcon}>
              <View style={styles.infoIconWrapper}>
                <MaterialIcons name="health-and-safety" size={20} color="#2563EB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Số BHYT</Text>
                {editMode ? (
                  <>
                    <TextInput
                      style={styles.inputPrimary}
                      value={patientForm.insuranceNumber}
                      onChangeText={(value) =>
                        handleChangePatient("insuranceNumber", value.toUpperCase())
                      }
                      placeholder="Nhập số bảo hiểm y tế"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={15}
                    />
                    <ValidationMessage message={fieldErrors.insuranceNumber} />
                  </>
                ) : patientForm.insuranceNumber ? (
                  <Text style={styles.infoValue}>{patientForm.insuranceNumber}</Text>
                ) : (
                  <Text style={styles.infoHint}>Chưa cập nhật số BHYT</Text>
                )}
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRowIcon}>
              <View style={styles.infoIconWrapper}>
                <FontAwesome5 name="id-card" size={18} color="#2563EB" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>CCCD</Text>
                {editMode ? (
                  <>
                    <TextInput
                      style={styles.inputPrimary}
                      value={patientForm.cccd}
                      onChangeText={(value) => handleChangePatient("cccd", value)}
                      placeholder="Nhập số CCCD"
                      keyboardType="numeric"
                      autoCorrect={false}
                      maxLength={12}
                    />
                    <ValidationMessage message={fieldErrors.cccd} />
                  </>
                ) : patientForm.cccd ? (
                  <Text style={styles.infoValue}>{patientForm.cccd}</Text>
                ) : (
                  <Text style={styles.infoHint}>Chưa cập nhật số CCCD</Text>
                )}
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Người liên hệ khẩn cấp</Text>
          <View style={styles.infoCard}>
            <View style={styles.emergencyHeader}>
              <View style={styles.emergencyBadge}>
                <Ionicons name="warning-outline" size={14} color="#B91C1C" />
                <Text style={styles.emergencyBadgeText}>Sử dụng khi cấp cứu</Text>
              </View>
            </View>

            <View style={styles.emergencyRow}>
              <View style={styles.emergencyAvatar}>
                <Text style={styles.emergencyAvatarText}>
                  {patientForm.emergencyContactName
                    ? patientForm.emergencyContactName.charAt(0).toUpperCase()
                    : "?"}
                </Text>
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Họ tên</Text>
                {editMode ? (
                  <>
                    <TextInput
                      style={styles.inputPrimary}
                      value={patientForm.emergencyContactName}
                      onChangeText={(value) =>
                        handleChangePatient("emergencyContactName", value)
                      }
                      placeholder="Nhập tên người liên hệ khẩn cấp"
                      maxLength={120}
                    />
                    <ValidationMessage message={fieldErrors.emergencyContactName} />
                  </>
                ) : patientForm.emergencyContactName ? (
                  <Text style={styles.infoValue}>{patientForm.emergencyContactName}</Text>
                ) : (
                  <Text style={styles.infoHint}>Chưa cập nhật người liên hệ khẩn cấp</Text>
                )}

                <Text style={[styles.infoLabel, styles.marginTopSmall]}>Số điện thoại</Text>
                {editMode ? (
                  <>
                    <TextInput
                      style={styles.inputPrimary}
                      value={patientForm.emergencyContactPhone}
                      onChangeText={(value) =>
                        handleChangePatient("emergencyContactPhone", value)
                      }
                      placeholder="Nhập số điện thoại khẩn cấp"
                      keyboardType="phone-pad"
                      autoCorrect={false}
                      maxLength={18}
                    />
                    <ValidationMessage message={fieldErrors.emergencyContactPhone} />
                  </>
                ) : patientForm.emergencyContactPhone ? (
                  <View style={styles.phoneRow}>
                    <Ionicons
                      name="call"
                      size={14}
                      color="#16A34A"
                      style={styles.phoneIcon}
                    />
                    <Text style={styles.phoneText}>{patientForm.emergencyContactPhone}</Text>
                  </View>
                ) : (
                  <Text style={styles.infoHint}>Chưa cập nhật số điện thoại khẩn cấp</Text>
                )}
              </View>
            </View>
          </View>



          <Text style={styles.sectionTitle}>Tiền sử bệnh án</Text>
          <View style={styles.infoCard}>
            <View style={styles.medicalRowHeader}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="document-text-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.medicalTitle}>Tóm tắt</Text>
            </View>

            {editMode ? (
              <>
                <TextInput
                  style={styles.textArea}
                  value={patientForm.medicalHistory}
                  onChangeText={(value) => handleChangePatient("medicalHistory", value)}
                  placeholder="Nhập tiền sử bệnh án..."
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                />
                <Text style={styles.textAreaCounter}>
                  {patientForm.medicalHistory.length}/2000 ký tự
                </Text>
                <ValidationMessage message={fieldErrors.medicalHistory} />
              </>
            ) : patientForm.medicalHistory ? (
              <Text style={styles.medicalText}>{patientForm.medicalHistory}</Text>
            ) : (
              <Text style={styles.infoHint}>
                Chưa có thông tin tiền sử bệnh án. Vui lòng cập nhật cùng bác sĩ.
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Đội ngũ y tế phụ trách</Text>
          {careTeam ? (
            <>
              {careTeam.doctor ? (
                <View style={[styles.infoCard, { padding: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.infoIconWrapper, { backgroundColor: '#E0E7FF', width: 44, height: 44, borderRadius: 22, marginRight: 12 }]}>
                        {careTeam.doctor.avatarUrl ? (
                          <Image source={{ uri: careTeam.doctor.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                        ) : (
                          <Ionicons name="person" size={20} color="#4338CA" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Bác sĩ phụ trách</Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 2 }}>{careTeam.doctor.name || 'Đang cập nhật'}</Text>
                        <Text style={{ fontSize: 13, color: '#374151', marginTop: 1 }}>{careTeam.doctor.phone || 'Chưa cập nhật SĐT'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => setSelectedStaff(careTeam.doctor)}
                    >
                      <Ionicons name="information-circle-outline" size={16} color="#4F46E5" />
                      <Text style={{ color: '#4F46E5', fontWeight: '600', fontSize: 13, marginLeft: 6 }}>Chi tiết</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {careTeam.nurse ? (
                <View style={[styles.infoCard, { padding: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[styles.infoIconWrapper, { backgroundColor: '#ECFCCB', width: 44, height: 44, borderRadius: 22, marginRight: 12 }]}>
                        {careTeam.nurse.avatarUrl ? (
                          <Image source={{ uri: careTeam.nurse.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                        ) : (
                          <Ionicons name="medkit" size={20} color="#65A30D" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Điều dưỡng</Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 2 }}>{careTeam.nurse.name || 'Đang cập nhật'}</Text>
                        <Text style={{ fontSize: 13, color: '#374151', marginTop: 1 }}>{careTeam.nurse.phone || 'Chưa cập nhật SĐT'}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => setSelectedStaff(careTeam.nurse)}
                    >
                      <Ionicons name="information-circle-outline" size={16} color="#4F46E5" />
                      <Text style={{ color: '#4F46E5', fontWeight: '600', fontSize: 13, marginLeft: 6 }}>Chi tiết</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {!careTeam.doctor && !careTeam.nurse ? (
                <View style={styles.infoCard}>
                  <Text style={styles.infoHint}>Hồ sơ của bạn đang chờ phân công người phụ trách.</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoHint}>Hồ sơ của bạn đang chờ phân công người phụ trách.</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Mã QR hồ sơ</Text>
          <View style={styles.qrCard}>
            <View style={styles.qrHeaderRow}>
              <View style={styles.qrTitleRow}>
                <Ionicons
                  name="qr-code-outline"
                  size={18}
                  color="#111827"
                  style={styles.qrTitleIcon}
                />
                <Text style={styles.qrTitle}>QR bệnh nhân</Text>
              </View>
              <Text style={styles.qrSubtitle}>Tạo tự động từ mã hồ sơ hiện tại</Text>
            </View>

            <View style={styles.qrContentRow}>
              <TouchableOpacity
                style={styles.qrImageWrapper}
                activeOpacity={patientQrValue ? 0.85 : 1}
                onPress={handleOpenQrPreview}
                disabled={!patientQrValue}
              >
                {patientQrValue ? (
                  <QRCode
                    value={patientQrValue}
                    size={112}
                    backgroundColor="#FFFFFF"
                    color="#111827"
                  />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="qr-code-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.qrPlaceholderText}>Chưa có mã hồ sơ</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.qrDescription}>
                <Text style={styles.qrDescText}>
                  Điều dưỡng có thể quét mã này để nhận diện đúng bệnh nhân khi nhập
                  liệu sinh hiệu.
                </Text>

                {patientQrValue ? (
                  <Text style={styles.qrHintText}>
                    Chạm vào mã QR để phóng to và quét dễ hơn.
                  </Text>
                ) : null}

                <View style={styles.qrCodeBox}>
                  <Text style={styles.qrCodeLabel}>Mã hồ sơ dùng để tạo QR</Text>
                  <Text style={styles.qrCodeValue}>
                    {patientForm.patientCode || "Đang cấp mã"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Tài khoản & cài đặt</Text>
          <View style={styles.settingsCard}>

            <View style={[styles.settingInfoRow, { alignItems: 'center' }]}>
              <Ionicons name="finger-print-outline" size={18} color="#2563EB" />
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Đăng nhập vân tay / Face ID</Text>
                <Text style={styles.settingSub}>
                  Sử dụng sinh trắc học để đăng nhập nhanh
                </Text>
              </View>
              {biometricLoading ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Switch
                  value={isBiometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={isBiometricEnabled ? "#2563EB" : "#F3F4F6"}
                />
              )}
            </View>

            {/* Row navigation sang Lịch sử tài khoản */}
            <TouchableOpacity
              style={[
                styles.settingInfoRow,
                {
                  alignItems: "center",
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: "#F3F4F6",
                },
              ]}
              onPress={() => navigation.navigate("AccountHistory")}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color="#2563EB" />
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Lịch sử tài khoản</Text>
                <Text style={styles.settingSub}>
                  Xem các hoạt động đã thực hiện trên tài khoản
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {editMode ? (
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.actionDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={styles.saveSpinner} />
              ) : (
                <Ionicons
                  name="save-outline"
                  size={18}
                  color="#FFFFFF"
                  style={styles.saveIcon}
                />
              )}
              <Text style={styles.saveText}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>


          <Text style={styles.footerVersion}>Phiên bản 1.0.0</Text>
          <Text style={styles.footerBrand}>© 2025 Remote Patient Monitoring</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F6FF",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  stateContainer: {
    flex: 1,
    backgroundColor: "#F2F6FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  stateCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  stateSubtitle: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    lineHeight: 20,
  },
  stateButton: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  stateButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  editToggleBtnActive: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  editToggleText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    marginLeft: 4,
  },
  editToggleTextActive: {
    color: "#B91C1C",
  },
  actionDisabled: {
    opacity: 0.7,
  },
  inlineErrorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  inlineErrorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 12,
    lineHeight: 18,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  avatarColumn: {
    width: 88,
    marginRight: 12,
    alignItems: "center",
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 8,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  avatarHint: {
    fontSize: 11,
    lineHeight: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  profileMainContent: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  profileSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  chipPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipPrimaryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  chipOutline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipOutlineText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  contactStack: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  contactValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 4,
  },
  contactHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#2563EB",
  },
  contactDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
    color: "#111827",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  infoRowIcon: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  infoHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  inputPrimary: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  inputInline: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    marginTop: 6,
  },
  validationText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#B91C1C",
  },
  emergencyHeader: {
    marginBottom: 10,
  },
  emergencyBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FEF2F2",
  },
  emergencyBadgeText: {
    fontSize: 11,
    color: "#B91C1C",
    marginLeft: 4,
    fontWeight: "600",
  },
  emergencyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  emergencyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emergencyAvatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  marginTopSmall: {
    marginTop: 8,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  phoneIcon: {
    marginRight: 4,
  },
  phoneText: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "600",
  },
  medicalRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  medicalTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  medicalText: {
    fontSize: 13,
    lineHeight: 22,
    color: "#374151",
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  diseaseTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  checkboxWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#111827",
  },
  textAreaCounter: {
    marginTop: 8,
    alignSelf: "flex-end",
    fontSize: 11,
    color: "#6B7280",
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  qrHeaderRow: {
    marginBottom: 10,
  },
  qrTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  qrTitleIcon: {
    marginRight: 6,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  qrSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  qrContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  qrImageWrapper: {
    width: 132,
    height: 132,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginRight: 14,
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  qrPlaceholderText: {
    marginTop: 6,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  qrDescription: {
    flex: 1,
  },
  qrDescText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#4B5563",
  },
  qrCodeBox: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  qrCodeLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  qrCodeValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 0.5,
  },
  qrHintText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#2563EB",
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.76)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  qrModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },
  qrModalHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  qrModalSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
    maxWidth: 240,
  },
  qrModalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  qrModalCodeBox: {
    width: 260,
    height: 260,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  qrModalCodeLabel: {
    marginTop: 18,
    fontSize: 12,
    color: "#6B7280",
  },
  qrModalCodeValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  referenceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  referenceHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  referenceBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  referenceContent: {
    flex: 1,
  },
  referenceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  referenceSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  referenceCodeBox: {
    marginTop: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#0F172A",
  },
  referenceCode: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
  },
  referenceText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 20,
    color: "#4B5563",
  },
  metaCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  settingInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  settingContent: {
    flex: 1,
    marginLeft: 10,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  settingSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  saveIcon: {
    marginRight: 6,
  },
  saveSpinner: {
    marginRight: 8,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  logoutBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: {
    color: "#B91C1C",
    fontWeight: "700",
  },
  footerVersion: {
    textAlign: "center",
    marginTop: 18,
    fontSize: 11,
    color: "#9CA3AF",
  },
  footerBrand: {
    textAlign: "center",
    marginTop: 4,
    fontSize: 11,
    color: "#9CA3AF",
  },
});

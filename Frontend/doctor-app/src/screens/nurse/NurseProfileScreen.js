import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../../hooks/useAuth";
import { getDepartments } from "../../api/departmentApi";
import { getMyNurseProfile } from "../../api/profileApi";
import { useToast } from "../../context/ToastContext";
import ActivityHistorySection from "../../components/ActivityHistorySection";


const EMPTY_PROFILE = {
  id: "",
  userPublicId: "",
  name: "",
  email: "",
  phone: "",
  avatarUrl: "",
  gender: "",
  dob: "",
  status: "",
  departmentId: "",
  licenseNumber: "",
  workplace: "",
  yearsOfExperience: 0,
  createdAt: "",
  updatedAt: "",
};

function getAvatarInitial(name) {
  if (!name || !name.trim()) {
    return "YT";
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

function getStatusMeta(status) {
  if (status === "active") {
    return {
      label: "Đang hoạt động",
      bg: "#ECFDF3",
      color: "#15803D",
      dot: "#22C55E",
    };
  }

  return {
    label: "Ngừng hoạt động",
    bg: "#FEF2F2",
    color: "#B91C1C",
    dot: "#F97373",
  };
}

function normalizeObjectId(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && typeof value.$oid === "string") {
    return value.$oid;
  }

  return String(value);
}

function resolveDepartmentName(departments, departmentId) {
  if (!departmentId || !Array.isArray(departments)) {
    return "";
  }

  const normalizedDepartmentId = normalizeObjectId(departmentId);
  const matchedDepartment = departments.find((department) => {
    return normalizeObjectId(department?.id) === normalizedDepartmentId;
  });

  return matchedDepartment?.name || "";
}

function normalizeProfile(profile = {}) {
  return {
    id: profile.id || "",
    userPublicId: profile.userPublicId || "",
    name: profile.name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    avatarUrl: profile.avatarUrl || "",
    gender: profile.gender || "",
    dob: profile.dob || "",
    status: profile.status || "",
    departmentId: normalizeObjectId(profile.departmentId),
    licenseNumber: profile.licenseNumber || "",
    workplace: profile.workplace || "",
    yearsOfExperience: Number(profile.yearsOfExperience) || 0,
    createdAt: profile.createdAt || "",
    updatedAt: profile.updatedAt || "",
  };
}

function InfoRow({ icon, label, value, hint, iconLib = "ionicons" }) {
  const IconComponent =
    iconLib === "material" ? MaterialIcons : iconLib === "fontawesome" ? FontAwesome5 : Ionicons;

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrapper}>
        <IconComponent name={icon} size={18} color="#2563EB" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        {value ? <Text style={styles.infoValue}>{value}</Text> : <Text style={styles.infoHint}>{hint || "Chưa cập nhật"}</Text>}
      </View>
    </View>
  );
}

export default function NurseProfileScreen() {
  const { showToast } = useToast();
  const { logout, isBiometricEnabled, enableBiometric, disableBiometric, sessionPassword } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const applyProfile = useCallback((payload, departments = []) => {
    const nextProfile = normalizeProfile(payload);
    setProfile(nextProfile);
    setDepartmentName(resolveDepartmentName(departments, nextProfile.departmentId));
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
        const [profileResponse, departmentsResponse] = await Promise.all([
          getMyNurseProfile(),
          getDepartments(),
        ]);

        if (!profileResponse.ok) {
          throw new Error(getErrorMessage(profileResponse));
        }

        const departments = departmentsResponse.ok
          ? Array.isArray(departmentsResponse.body?.data)
            ? departmentsResponse.body.data
            : []
          : [];

        applyProfile(profileResponse.body?.data || {}, departments);
      } catch (error) {
        setLoadError(error.message || "Không tải được hồ sơ điều dưỡng.");
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
    }, [loadProfile])
  );

  const avatarInitial = getAvatarInitial(profile.name);
  const statusMeta = getStatusMeta(profile.status);
  const hasProfileData = Boolean(profile.id);

  const handleToggleBiometric = async () => {
    if (isBiometricEnabled) {
      const res = await disableBiometric();
      if (!res.ok) {
        showToast(res.error, "error");
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
                    showToast("Mật khẩu không được để trống.", "error");
                    return;
                  }
                  setBiometricLoading(true);
                  const res = await enableBiometric(pwd);
                  setBiometricLoading(false);
                  if (!res.ok) {
                    showToast(res.error, "error");
                  } else {
                    showToast("Đã bật đăng nhập sinh trắc học.", "success");
                  }
                },
              },
            ],
            "secure-text"
          );
        } else {
          Alert.alert(
            "Yêu cầu đăng nhập lại",
            "Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại bằng mật khẩu để có thể kích hoạt tính năng sinh trắc học trên thiết bị này."
          );
        }
      } else {
        setBiometricLoading(true);
        const res = await enableBiometric();
        setBiometricLoading(false);
        if (!res.ok) {
          showToast(res.error, "error");
        } else {
          showToast("Đã bật đăng nhập sinh trắc học.", "success");
        }
      }
    }
  };

  if (loading && !hasProfileData) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.stateTitle}>Đang tải hồ sơ điều dưỡng</Text>
          <Text style={styles.stateSubtitle}>
            Hệ thống đang đồng bộ thông tin thực từ máy chủ.
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
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile({ showLoader: false, showRefresh: true })}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Hồ sơ điều dưỡng</Text>
        </View>

        {loadError ? (
          <View style={styles.inlineErrorCard}>
            <Ionicons name="warning-outline" size={18} color="#B91C1C" />
            <Text style={styles.inlineErrorText}>{loadError}</Text>
          </View>
        ) : null}

        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrapper}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{avatarInitial}</Text>
                </View>
              )}
            </View>

            <View style={styles.profileMainContent}>
              <Text style={styles.profileName}>{profile.name || "Chưa cập nhật"}</Text>
              <Text style={styles.profileSub}>
                Mã hồ sơ: {profile.userPublicId || "Đang cấp mã"}
              </Text>

              <View style={styles.chipRow}>
                <View style={styles.roleChip}>
                  <FontAwesome5 name="user-nurse" size={12} color="#FFFFFF" />
                  <Text style={styles.roleChipText}>Y tá / Điều dưỡng</Text>
                </View>

                <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
                  <Text style={[styles.statusText, { color: statusMeta.color }]}>
                    {statusMeta.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.contactStack}>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={16} color="#6B7280" />
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Email đăng nhập</Text>
                <Text style={styles.contactValue}>{profile.email || "Chưa cập nhật"}</Text>
              </View>
            </View>

            <View style={styles.contactDivider} />

            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={16} color="#6B7280" />
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Số điện thoại</Text>
                {profile.phone ? (
                  <Text style={styles.contactValue}>{profile.phone}</Text>
                ) : (
                  <Text style={styles.infoHint}>Chưa cập nhật số điện thoại</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Thông tin chuyên môn</Text>
        <View style={styles.infoCard}>
          <InfoRow
            icon="verified"
            iconLib="material"
            label="Mã chứng chỉ hành nghề"
            value={profile.licenseNumber}
            hint="Chưa cập nhật chứng chỉ hành nghề"
          />
          <View style={styles.infoDivider} />
          <InfoRow
            icon="business-outline"
            label="Nơi làm việc"
            value={profile.workplace}
            hint="Chưa cập nhật nơi làm việc"
          />
          <View style={styles.infoDivider} />
          <InfoRow
            icon="medkit-outline"
            label="Khoa/phòng"
            value={departmentName}
            hint="Chưa cập nhật khoa/phòng"
          />
          <View style={styles.infoDivider} />
          <InfoRow
            icon="time-outline"
            label="Số năm kinh nghiệm"
            value={profile.yearsOfExperience > 0 ? `${profile.yearsOfExperience} năm` : ""}
            hint="Chưa cập nhật số năm kinh nghiệm"
          />
        </View>

        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <View style={styles.infoCard}>
          <InfoRow
            icon="male-female-outline"
            label="Giới tính"
            value={formatGender(profile.gender)}
          />
          <View style={styles.infoDivider} />
          <InfoRow
            icon="calendar-outline"
            label="Ngày sinh"
            value={formatDateOnly(profile.dob)}
          />
        </View>



        <Text style={styles.sectionTitle}>Bảo mật</Text>
        <View style={styles.infoCard}>
          <View style={styles.securityRow}>
            <View style={styles.securityInfo}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="finger-print-outline" size={18} color="#2563EB" />
              </View>
              <View style={styles.securityTextBlock}>
                <Text style={styles.securityLabel}>Sinh trắc học (Vân tay / Face ID)</Text>
                <Text style={styles.securitySub}>Kích hoạt đăng nhập nhanh không cần mật khẩu</Text>
              </View>
            </View>
            {biometricLoading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <TouchableOpacity
                style={[styles.toggleBtn, isBiometricEnabled && styles.toggleBtnActive]}
                onPress={handleToggleBiometric}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleCircle, isBiometricEnabled && styles.toggleCircleActive]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Activity History */}
        <ActivityHistorySection />

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>


        <Text style={styles.footerVersion}>Phiên bản 1.0.0</Text>
        <Text style={styles.footerBrand}>© 2025 Remote Patient Monitoring</Text>
      </ScrollView>
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
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
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
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleChipText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
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
  infoRow: {
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
  infoHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 18,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
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

  // Biometric
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  securityInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  securityTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  securityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  securitySub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  toggleBtn: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#D1D5DB",
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#10B981",
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  toggleCircleActive: {
    alignSelf: "flex-end",
  },
});

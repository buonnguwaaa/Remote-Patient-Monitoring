import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function SettingsScreen() {
  const { user, logout, isBiometricEnabled, enableBiometric, disableBiometric, sessionPassword } = useAuth();
  const { showToast } = useToast();
  const [language, setLanguage] = useState("vi"); // 'vi' | 'en'
  const [darkMode, setDarkMode] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

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
                    showToast("Đã bật đăng nhập sinh trắc học.");
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
          showToast("Đã bật đăng nhập sinh trắc học.");
        }
      }
    }
  };



  const handleLogout = () => {
    Alert.alert(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản bác sĩ?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Đăng xuất", style: "destructive", onPress: logout },
      ]
    );
  };



  const getInitials = (name) => {
    if (!name) return "BS";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, darkMode && styles.containerDark]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, darkMode && styles.cardDark]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user?.name || user?.email)}</Text>
          </View>
          <Text style={[styles.doctorName, darkMode && styles.textWhite]}>
            {user?.name || "Bác sĩ điều trị"}
          </Text>
          <Text style={styles.doctorEmail}>{user?.email || "doctor@rpm.com"}</Text>

          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
            <Text style={styles.roleText}>Bác sĩ chuyên khoa</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>Cài đặt hệ thống</Text>

        <View style={[styles.settingsGroup, darkMode && styles.cardDark]}>
          {/* Language Selector - Hidden for now
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="globe-outline" size={20} color={darkMode ? "#93C5FD" : "#2563EB"} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingLabel, darkMode && styles.textWhite]}>Ngôn ngữ</Text>
                <Text style={styles.settingSub}>Thay đổi ngôn ngữ ứng dụng</Text>
              </View>
            </View>

            <View style={styles.languageToggles}>
              <TouchableOpacity
                style={[styles.langBtn, language === "vi" && styles.langBtnActive]}
                onPress={() => setLanguage("vi")}
              >
                <Text style={[styles.langText, language === "vi" && styles.langTextActive]}>Tiếng Việt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, language === "en" && styles.langBtnActive]}
                onPress={() => setLanguage("en")}
              >
                <Text style={[styles.langText, language === "en" && styles.langTextActive]}>English</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />
          */}

          {/* Dark Mode toggle - Hidden for now
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={20} color={darkMode ? "#93C5FD" : "#2563EB"} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingLabel, darkMode && styles.textWhite]}>Chế độ tối (Dark mode)</Text>
                <Text style={styles.settingSub}>Bật/tắt giao diện tối</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.toggleBtn, darkMode && styles.toggleBtnActive]}
              onPress={() => setDarkMode(!darkMode)}
            >
              <View style={[styles.toggleCircle, darkMode && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
          */}

          {/* Biometric toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="finger-print-outline" size={20} color={darkMode ? "#93C5FD" : "#2563EB"} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingLabel, darkMode && styles.textWhite]}>Sinh trắc học (Fingerprint/FaceID)</Text>
                <Text style={styles.settingSub}>Kích hoạt đăng nhập nhanh bằng vân tay/khuôn mặt</Text>
              </View>
            </View>

            {biometricLoading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <TouchableOpacity
                style={[styles.toggleBtn, isBiometricEnabled && styles.toggleBtnActive]}
                onPress={handleToggleBiometric}
              >
                <View style={[styles.toggleCircle, isBiometricEnabled && styles.toggleCircleActive]} />
              </TouchableOpacity>
            )}
          </View>
        </View>



        {/* Action Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>

        {/* Footer info */}
        <Text style={styles.versionInfo}>Phiên bản 1.0.0 (Production) • RPM Staff</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F6FF" },
  containerDark: { backgroundColor: "#0F172A" },
  scrollContent: { padding: 16, pb: 40 },

  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  cardDark: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },
  avatarText: { fontSize: 24, fontWeight: "700", color: "#2563EB" },
  doctorName: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  doctorEmail: { fontSize: 13, color: "#6B7280", marginBottom: 12 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionTitleDark: { color: "#94A3B8" },

  settingsGroup: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },

  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  settingInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  settingSub: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },

  languageToggles: { flexDirection: "row", gap: 6 },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  langBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  langText: { fontSize: 11, fontWeight: "600", color: "#4B5563" },
  langTextActive: { color: "#2563EB" },

  toggleBtn: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#D1D5DB",
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  toggleBtnActive: { backgroundColor: "#10B981" },
  toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFF" },
  toggleCircleActive: { alignSelf: "flex-end" },

  formField: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
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
  inputDark: {
    backgroundColor: "#0F172A",
    borderColor: "#334155",
    color: "#F8FAFC",
  },

  saveBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnDisabled: { backgroundColor: "#93C5FD" },
  saveBtnText: { fontSize: 13, fontWeight: "600", color: "#FFF" },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutBtnText: { fontSize: 14, fontWeight: "600", color: "#EF4444" },

  versionInfo: { textAlign: "center", fontSize: 11, color: "#9CA3AF" },
  textWhite: { color: "#F8FAFC" },

  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 10,
    borderRadius: 8,
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
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  successText: { fontSize: 12, color: "#065F46", flex: 1 },
});

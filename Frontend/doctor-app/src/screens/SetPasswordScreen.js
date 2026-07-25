import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { previewInvite, submitInvitePassword } from "../api/inviteApi";
import { colors } from "../theme/rpmTheme";
import { useAuth } from "../context/AuthContext";

export default function SetPasswordScreen({ route, navigation }) {
  const { logout } = useAuth();
  const token = route?.params?.token || "";
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmedPassword, setShowConfirmedPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const navigateToLogin = () => {
    if (logout) {
      logout().catch(() => {});
    }
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch {
      navigation.navigate("Login");
    }
  };

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setTokenExpired(true);
        setCheckingToken(false);
        return;
      }
      try {
        setCheckingToken(true);
        const res = await previewInvite(token);
        if (res?.ok && res?.body?.valid) {
          setUserName(res.body.name || "");
          setTokenExpired(false);
        } else {
          setTokenExpired(true);
        }
      } catch (err) {
        setTokenExpired(true);
      } finally {
        setCheckingToken(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!password || password.length < 6) {
      setErrorMessage("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmedPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setLoading(true);
      const res = await submitInvitePassword({
        token,
        password,
        confirmedPassword,
      });

      if (res?.ok) {
        setIsSuccess(true);
      } else {
        const errorText =
          res?.body?.error || res?.error || "Không thể đặt mật khẩu.";
        if (errorText.toLowerCase().includes("hết hạn") || errorText.toLowerCase().includes("không hợp lệ")) {
          setTokenExpired(true);
        } else {
          setErrorMessage(errorText);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors?.primary || "#2563EB"} />
        <Text style={styles.loadingText}>Đang xác thực liên kết...</Text>
      </SafeAreaView>
    );
  }

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.expiredCard}>
          <View style={styles.successIconBg}>
            <Ionicons name="checkmark-circle-outline" size={56} color="#10B981" />
          </View>
          <Text style={styles.expiredTitle}>Đặt mật khẩu thành công! 🎉</Text>
          <Text style={styles.expiredDesc}>
            Mật khẩu của bạn đã được khởi tạo thành công. Vui lòng đăng nhập để tiếp tục công việc.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={navigateToLogin}
          >
            <Text style={styles.primaryBtnText}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (tokenExpired) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.expiredCard}>
          <View style={styles.expiredIconBg}>
            <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          </View>
          <Text style={styles.expiredTitle}>Liên kết không hợp lệ hoặc đã hết hạn</Text>
          <Text style={styles.expiredDesc}>
            Liên kết kích hoạt tài khoản chỉ có hiệu lực trong 15 phút. Vui lòng liên hệ quản trị viên để nhận liên kết mới.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={navigateToLogin}
          >
            <Text style={styles.primaryBtnText}>Về trang đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Kích hoạt tài khoản Cán bộ Y tế</Text>
            <Text style={styles.subtitle}>
              {userName
                ? `Chào ${userName}, hãy tạo mật khẩu mới để bắt đầu sử dụng RPM.`
                : "Hãy tạo mật khẩu mới để khởi tạo tài khoản Cán bộ Y tế."}
            </Text>
          </View>

          {Boolean(errorMessage) && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={20} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mật khẩu mới</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Xác nhận mật khẩu</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry={!showConfirmedPassword}
                value={confirmedPassword}
                onChangeText={setConfirmedPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmedPassword(!showConfirmedPassword)}>
                <Ionicons
                  name={showConfirmedPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Lưu mật khẩu</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={navigateToLogin}
          >
            <Text style={styles.linkBtnText}>Quay lại Đăng nhập</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  scrollContent: {
    padding: 24,
    justifyContent: "center",
    flexGrow: 1,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    width: "100%",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  linkBtn: {
    marginTop: 20,
    alignItems: "center",
  },
  linkBtnText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  expiredCard: {
    margin: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  expiredIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  expiredTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  expiredDesc: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
});

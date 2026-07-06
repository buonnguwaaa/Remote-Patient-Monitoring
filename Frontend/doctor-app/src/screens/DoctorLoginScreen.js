import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import * as SecureStore from "../utils/secureStoreHelper";
import * as LocalAuthentication from "expo-local-authentication";

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    (async () => {
      // Try new staff key, fallback to old doctor key for migration
      const bioEnabled =
        (await SecureStore.getItemAsync("staff_biometric_enabled")) ||
        (await SecureStore.getItemAsync("doctor_biometric_enabled"));
      if (bioEnabled === "true") {
        setHasBiometric(true);
        setTimeout(() => {
          handleBiometricLogin();
        }, 600);
      }
    })();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      // Try new staff key, fallback to old doctor key
      const bioEnabled =
        (await SecureStore.getItemAsync("staff_biometric_enabled")) ||
        (await SecureStore.getItemAsync("doctor_biometric_enabled"));
      if (bioEnabled !== "true") {
        Alert.alert("ChÆ°a kÃ­ch hoáº¡t", "Vui lÃ²ng Ä‘Äƒng nháº­p báº±ng máº­t kháº©u trÆ°á»›c vÃ  báº­t sinh tráº¯c há»c trong pháº§n CÃ i Ä‘áº·t.");
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert("Lá»—i", "Thiáº¿t bá»‹ nÃ y khÃ´ng há»— trá»£ hoáº·c chÆ°a Ä‘Äƒng kÃ½ sinh tráº¯c há»c.");
        return;
      }

      const authRes = await LocalAuthentication.authenticateAsync({
        promptMessage: "ÄÄƒng nháº­p báº±ng sinh tráº¯c há»c",
        cancelLabel: "Há»§y",
      });

      if (authRes.success) {
        // Try new staff keys, fallback to old doctor keys
        const savedEmail =
          (await SecureStore.getItemAsync("staff_email")) ||
          (await SecureStore.getItemAsync("doctor_email"));
        const savedPassword =
          (await SecureStore.getItemAsync("staff_password")) ||
          (await SecureStore.getItemAsync("doctor_password"));

        if (savedEmail && savedPassword) {
          setError("");
          setLoading(true);
          const result = await login(savedEmail, savedPassword);
          setLoading(false);
          if (!result.ok) {
            setError(result.error || "ÄÄƒng nháº­p sinh tráº¯c há»c tháº¥t báº¡i.");
          }
        } else {
          Alert.alert("Lá»—i", "KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin Ä‘Äƒng nháº­p Ä‘Ã£ lÆ°u.");
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Lá»—i", "ÄÃ£ xáº£y ra lá»—i khi xÃ¡c thá»±c sinh tráº¯c há»c.");
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Vui lÃ²ng nháº­p email vÃ  máº­t kháº©u");
      return;
    }
    setError("");
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "ÄÄƒng nháº­p tháº¥t báº¡i");
    }
  };

  return (
    <View style={[styles.safe, {  paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="medical" size={40} color="#fff" />
            </View>
            <Text style={styles.appName}>RPM Staff</Text>
            <Text style={styles.appSub}>Há»‡ thá»‘ng theo dÃµi bá»‡nh nhÃ¢n tá»« xa</Text>
          </View>

          {/* Form */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>ÄÄƒng nháº­p</Text>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nháº­p email bÃ¡c sÄ©"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={styles.label}>Máº­t kháº©u</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Nháº­p máº­t kháº©u"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.loginBtnText}>ÄÄƒng nháº­p</Text>
                </>
              )}
            </TouchableOpacity>

            {hasBiometric && (
              <>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>hoáº·c</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin} activeOpacity={0.8}>
                  <Ionicons name="scan-outline" size={22} color="#2563EB" />
                  <Text style={styles.biometricText}>ÄÄƒng nháº­p sinh tráº¯c há»c</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.footer}>
            Chá»‰ dÃ nh cho bÃ¡c sÄ© vÃ  y tÃ¡ Ä‘Æ°á»£c cáº¥p quyá»n
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FF" },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: { alignItems: "center", marginBottom: 20 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  appName: { fontSize: 28, fontWeight: "800", color: "#1E3A8A" },
  appSub: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    marginBottom: 16,
    minHeight: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 10 },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 6,
  },
  errorText: { flex: 1, fontSize: 13, color: "#DC2626" },
  loginBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { fontSize: 12, color: "#9CA3AF" },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: "#EFF6FF",
    gap: 8,
  },
  biometricText: { fontSize: 15, fontWeight: "600", color: "#2563EB" },
  footer: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 12,
    color: "#9CA3AF",
  },
});

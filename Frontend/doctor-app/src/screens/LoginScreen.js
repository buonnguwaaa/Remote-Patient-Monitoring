import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from '../utils/secureStoreHelper';
import * as LocalAuthentication from 'expo-local-authentication';
import ButtonPrimary from '../components/ButtonPrimary';
import { Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/login';
import { useAuth } from '../context/AuthContext';
import { useToast } from "../context/ToastContext";

const biometricStyle = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
});

const portalBadgeStyle = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
});

const savedAccountStyle = StyleSheet.create({
  fixedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  leftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 8,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
});

export default function LoginScreen({ navigation }) {
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [hasBiometric, setHasBiometric] = useState(false);
  const [isSavedAccount, setIsSavedAccount] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const savedEmail =
          (await SecureStore.getItemAsync("staff_email")) ||
          (await SecureStore.getItemAsync("doctor_email"));
        const bioEnabled =
          (await SecureStore.getItemAsync("staff_biometric_enabled")) ||
          (await SecureStore.getItemAsync("doctor_biometric_enabled"));

        if (bioEnabled === "true" && savedEmail) {
          setEmail(savedEmail);
          setHasBiometric(true);
          setIsSavedAccount(true);
          setTimeout(() => {
            handleBiometricLogin();
          }, 600);
        } else {
          setHasBiometric(false);
          setIsSavedAccount(false);
        }
      } catch (e) {
        console.error("Lỗi khi kiểm tra thông tin sinh trắc học:", e);
      }
    })();
  }, []);

  const handleBiometricLogin = async () => {
    try {
      const bioEnabled =
        (await SecureStore.getItemAsync("staff_biometric_enabled")) ||
        (await SecureStore.getItemAsync("doctor_biometric_enabled"));
      if (bioEnabled !== "true") {
        showToast("Vui lòng đăng nhập bằng mật khẩu trước và kích hoạt sinh trắc học ở màn hình Cài đặt.", "warning");
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        showToast("Thiết bị không hỗ trợ hoặc chưa đăng ký sinh trắc học.", "error");
        return;
      }

      const authRes = await LocalAuthentication.authenticateAsync({
        promptMessage: "Đăng nhập bằng sinh trắc học",
        cancelLabel: "Hủy",
      });

      if (authRes.success) {
        const savedEmail =
          (await SecureStore.getItemAsync("staff_email")) ||
          (await SecureStore.getItemAsync("doctor_email"));
        const savedPassword =
          (await SecureStore.getItemAsync("staff_password")) ||
          (await SecureStore.getItemAsync("doctor_password"));

        if (savedEmail && savedPassword) {
          setLoading(true);
          const res = await login(savedEmail, savedPassword);
          setLoading(false);
          if (!res.ok) {
            showToast(String(res.error?.error || res.error || "Lỗi xác thực"), "error");
          }
        } else {
          showToast("Không tìm thấy thông tin đăng nhập đã lưu.", "error");
        }
      }
    } catch (e) {
      console.error(e);
      showToast("Đã xảy ra lỗi khi xác thực sinh trắc học.", "error");
    }
  };

  const handleSwitchAccount = () => {
    Alert.alert(
      "Thay đổi tài khoản",
      "Hành động này sẽ xóa dữ liệu sinh trắc học của tài khoản hiện tại trên thiết bị này. Bạn có muốn tiếp tục?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thay đổi",
          style: "destructive",
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync("staff_email");
              await SecureStore.deleteItemAsync("staff_password");
              await SecureStore.setItemAsync("staff_biometric_enabled", "false");
              try { await SecureStore.deleteItemAsync("doctor_email"); } catch {}
              try { await SecureStore.deleteItemAsync("doctor_password"); } catch {}
              try { await SecureStore.setItemAsync("doctor_biometric_enabled", "false"); } catch {}
            } catch (e) {
              console.error("Lỗi khi xóa sinh trắc học:", e);
            }
            setEmail('');
            setPassword('');
            setHasBiometric(false);
            setIsSavedAccount(false);
          },
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!email.trim() && !password.trim()) {
      showToast("Vui lòng nhập email và mật khẩu.", "warning");
      return;
    }
    if (!email.trim()) {
      showToast("Vui lòng nhập email.", "warning");
      return;
    }
    if (!password.trim()) {
      showToast("Vui lòng nhập mật khẩu.", "warning");
      return;
    }
    setLoading(true);
    (async () => {
      const res = await login(email.trim(), password);
      setLoading(false);
      if (!res.ok) {
        showToast(String(res.error), "error");
      }
    })();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top + 20, 60) }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={{ width: 80, height: 80, borderRadius: 16, marginBottom: 16, alignSelf: 'center' }} 
            resizeMode="contain"
          />
          <Text style={styles.title}>Remote Patient Monitoring</Text>
          <View style={portalBadgeStyle.tag}>
            <Feather name="shield" size={14} color="#1D4ED8" />
            <Text style={portalBadgeStyle.tagText}>CỔNG ĐĂNG NHẬP BÁC SĨ & NHÂN VIÊN</Text>
          </View>
        </View>

        <View style={styles.form}>
          {isSavedAccount ? (
            <View style={styles.field}>
              <Text style={styles.label}>Tài khoản đã lưu</Text>
              <View style={savedAccountStyle.fixedWrap}>
                <View style={savedAccountStyle.leftInfo}>
                  <Feather name="user-check" size={18} color="#2563EB" />
                  <Text style={savedAccountStyle.emailText} numberOfLines={1}>
                    {email}
                  </Text>
                </View>
                <TouchableOpacity
                  style={savedAccountStyle.changeBtn}
                  onPress={handleSwitchAccount}
                  activeOpacity={0.7}
                >
                  <Feather name="edit-2" size={13} color="#2563EB" style={{ marginRight: 4 }} />
                  <Text style={savedAccountStyle.changeBtnText}>Thay đổi</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Nhập địa chỉ email"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
          )}

          <View style={[styles.field, { marginBottom: 12 }]}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu"
                secureTextEntry={!showPassword}
                style={[styles.input, { paddingRight: 50 }]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                style={styles.eyeButton}
                accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={{ alignSelf: 'flex-end', marginTop: 0, marginBottom: 20, paddingVertical: 2, paddingHorizontal: 2 }}
            onPress={() => navigation?.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#2563EB' }}>
              Quên mật khẩu?
            </Text>
          </TouchableOpacity>

          <ButtonPrimary
            title={loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            onPress={handleSubmit}
            disabled={loading}
            style={{ marginTop: 0 }}
          />

          {hasBiometric && (
            <TouchableOpacity
              style={biometricStyle.btn}
              onPress={handleBiometricLogin}
              activeOpacity={0.8}
            >
              <Feather name="unlock" size={18} color="#2563EB" style={{ marginRight: 8 }} />
              <Text style={biometricStyle.text}>Đăng nhập bằng sinh trắc học</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

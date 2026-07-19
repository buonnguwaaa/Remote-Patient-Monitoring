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
import * as SecureStore from '../../utils/secureStoreHelper';
import * as LocalAuthentication from 'expo-local-authentication';
import ButtonPrimary from '../../components/ButtonPrimary';
import { Feather, FontAwesome } from '@expo/vector-icons';
import styles from '../../styles/login';

import { useAuth } from '../../hooks/useAuth';
import { useSnackbar } from '../../hooks/useSnackbar';
import * as GoogleAuth from '../../api/googleAuth';
import * as authApi from '../../api/authApi';

const biometricStyle = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6e6e8',
    backgroundColor: '#f3f3f5',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#030213',
  },
});

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, saveGoogleTokens, updateUser } = useAuth();
  const [hasBiometric, setHasBiometric] = useState(false);
  const { showError, showWarning } = useSnackbar();

  useEffect(() => {
    (async () => {
      const bioEnabled = await SecureStore.getItemAsync("patient_biometric_enabled");
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
      const bioEnabled = await SecureStore.getItemAsync("patient_biometric_enabled");
      if (bioEnabled !== "true") {
        showWarning("Vui lòng đăng nhập bằng mật khẩu trước và kích hoạt sinh trắc học ở màn hình Hồ sơ.");
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        showError("Thiết bị không hỗ trợ hoặc chưa đăng ký sinh trắc học.");
        return;
      }

      const authRes = await LocalAuthentication.authenticateAsync({
        promptMessage: "Đăng nhập bằng sinh trắc học",
        cancelLabel: "Hủy",
      });

      if (authRes.success) {
        const savedEmail = await SecureStore.getItemAsync("patient_email");
        const savedPassword = await SecureStore.getItemAsync("patient_password");

        if (savedEmail && savedPassword) {
          setLoading(true);
          const res = await login(savedEmail, savedPassword);
          setLoading(false);
          if (!res.ok) {
            showError(String(res.error || "Đăng nhập thất bại."));
            return;
          }

          if (onLoginSuccess) {
            try {
              await onLoginSuccess(res.data || null);
            } catch (e) {
              // noop
            }
          }
        } else {
          showError("Không tìm thấy thông tin đăng nhập đã lưu.");
        }
      }
    } catch (e) {
      console.error(e);
      showError("Đã xảy ra lỗi khi xác thực sinh trắc học.");
    }
  };

  const handleSubmit = () => {
    if (!email.trim()) {
      showError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!password) {
      showError('Vui lòng nhập mật khẩu.');
      return;
    }
    setLoading(true);
    (async () => {
      const res = await login(email.trim(), password);
      setLoading(false);
      if (!res.ok) {
        showError(String(res.error || "Đăng nhập thất bại."));
        return;
      }

      if (onLoginSuccess) {
        try {
          await onLoginSuccess(res.data || null);
        } catch (e) {
        }
      }
    })();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>RPM</Text>
          </View>
          <Text style={styles.title}>Remote Patient Monitoring</Text>
          <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
        </View>

        <View style={styles.form}>
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

          <View style={styles.field}>
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

          <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <ButtonPrimary
            title={loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            onPress={handleSubmit}
            disabled={loading}
            style={{ marginTop: 10 }}
          />

          <TouchableOpacity
            style={biometricStyle.btn}
            onPress={handleBiometricLogin}
            activeOpacity={0.8}
          >
            <Feather name="unlock" size={18} color="#030213" style={{ marginRight: 8 }} />
            <Text style={biometricStyle.text}>Đăng nhập bằng sinh trắc học</Text>
          </TouchableOpacity>

          <View style={styles.dividerWrap}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <ButtonPrimary
              variant="outline"
              onPress={async () => {
                setLoading(true);
                try {
                  const res = await GoogleAuth.loginWithGoogle();
                  if (!res.ok) {
                    showError('Đăng nhập Google thất bại: ' + (res.error || 'Lỗi không xác định'));
                  } else {
                    const { accessToken, refreshToken } = res.data;
                    await saveGoogleTokens(accessToken, refreshToken);

                    const meRes = await authApi.me();
                    if (meRes.ok) {
                      const body = meRes.body;
                      const meUser = body.data || body.user || body;
                      updateUser(meUser);
                      if (onLoginSuccess) {
                        await onLoginSuccess(meUser);
                      }
                    } else {
                      showError('Lỗi lấy thông tin user: ' + JSON.stringify(meRes.error || meRes.body));
                    }
                  }
                } catch (e) {
                  showError('Lỗi đăng nhập Google: ' + String(e));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{ flex: 1 }}
            >
              <FontAwesome name="google" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={{ color: '#030213', fontWeight: '600' }}>{loading ? 'Đang xử lý...' : 'Google'}</Text>
            </ButtonPrimary>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Chưa có tài khoản?{' '}
            <Text style={styles.signUp} onPress={() => navigation.navigate('Register')}>Đăng ký</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}



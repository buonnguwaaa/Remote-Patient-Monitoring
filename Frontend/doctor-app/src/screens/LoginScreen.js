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
import * as SecureStore from '../utils/secureStoreHelper';
import * as LocalAuthentication from 'expo-local-authentication';
import ButtonPrimary from '../components/ButtonPrimary';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/login';
import { useAuth } from '../context/AuthContext';

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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    (async () => {
      const bioEnabled = await SecureStore.getItemAsync("staff_biometric_enabled");
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
      const bioEnabled = await SecureStore.getItemAsync("staff_biometric_enabled");
      if (bioEnabled !== "true") {
        Alert.alert("Chưa kích hoạt", "Vui lòng đăng nhập bằng mật khẩu trước và kích hoạt sinh trắc học ở màn hình Cài đặt.");
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert("Lỗi", "Thiết bị không hỗ trợ hoặc chưa đăng ký sinh trắc học.");
        return;
      }

      const authRes = await LocalAuthentication.authenticateAsync({
        promptMessage: "Đăng nhập bằng sinh trắc học",
        cancelLabel: "Hủy",
      });

      if (authRes.success) {
        const savedEmail = await SecureStore.getItemAsync("staff_email");
        const savedPassword = await SecureStore.getItemAsync("staff_password");

        if (savedEmail && savedPassword) {
          setLoading(true);
          const res = await login(savedEmail, savedPassword);
          setLoading(false);
          if (!res.ok) {
            Alert.alert("Đăng nhập thất bại", String(res.error?.error || res.error || "Lỗi xác thực"));
          }
        } else {
          Alert.alert("Lỗi", "Không tìm thấy thông tin đăng nhập đã lưu.");
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi xác thực sinh trắc học.");
    }
  };

  const handleSubmit = () => {
    setLoading(true);
    (async () => {
      const res = await login(email, password);
      setLoading(false);
      if (!res.ok) {
        Alert.alert('Đăng nhập thất bại', String(res.error));
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
          <Text style={styles.subtitle}>Cổng đăng nhập</Text>
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

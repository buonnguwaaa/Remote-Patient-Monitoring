import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import ButtonPrimary from '../../components/ButtonPrimary';
import styles from '../../styles/login';
import * as authApi from '../../api/authApi';

export default function ResetPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    
    if (!email || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!otp || otp.length !== 6) {
      setError('Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    const res = await authApi.resetPassword({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      newPassword,
      confirmedNewPassword: confirmPassword,
    });
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
    } else {
      const msg = res.body?.error || res.error || 'Mã OTP không hợp lệ hoặc đã hết hạn.';
      setError(msg);
    }
  };

  if (success) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.container, { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
            <View style={[styles.logoWrap, { backgroundColor: '#16a34a' }]}>
              <Feather name="check" size={36} color="#fff" />
            </View>
            <Text style={[styles.title, { marginTop: 12 }]}>Đặt lại mật khẩu thành công!</Text>
            <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 8, lineHeight: 22 }]}>
              Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.
            </Text>
            <ButtonPrimary
              title="Về trang đăng nhập"
              onPress={() =>
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] })
              }
              style={{ marginTop: 28, width: '100%' }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8, alignSelf: 'flex-start' }}>
          <Feather name="arrow-left" size={24} color="#030213" />
        </TouchableOpacity>

        <View style={[styles.header, { alignItems: 'flex-start', paddingTop: 4 }]}>
          <Text style={styles.title}>Đặt lại mật khẩu</Text>
          <Text style={[styles.subtitle, { textAlign: 'left' }]}>
            Nhập email, mã OTP từ email và mật khẩu mới của bạn.
          </Text>
        </View>

        <View style={[styles.form, { marginTop: 28 }]}>
          {error ? (
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              placeholder="Nhập địa chỉ email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mã OTP từ email</Text>
            <TextInput
              value={otp}
              onChangeText={(v) => { setOtp(v.replace(/[^0-9]/g, '')); setError(''); }}
              placeholder="Nhập mã 6 chữ số"
              keyboardType="numeric"
              maxLength={6}
              style={styles.input}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mật khẩu mới</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); setError(''); }}
                placeholder="Nhập mật khẩu mới"
                secureTextEntry={!showNewPassword}
                style={[styles.input, { paddingRight: 50 }]}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword((s) => !s)}
                style={styles.eyeButton}
                accessibilityLabel={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#717182', marginTop: 6 }}>Tối thiểu 8 ký tự</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry={!showConfirmPassword}
                style={[styles.input, { paddingRight: 50 }]}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((s) => !s)}
                style={styles.eyeButton}
                accessibilityLabel={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
              </TouchableOpacity>
            </View>
          </View>

          <ButtonPrimary
            title={loading ? 'Đang xử lý...' : 'Xác nhận'}
            onPress={handleSubmit}
            disabled={loading}
            style={{ marginTop: 8 }}
          />

          <TouchableOpacity
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
            style={[styles.forgot, { alignItems: 'center', marginTop: 20 }]}
          >
            <Text style={styles.forgotText}>Về trang đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

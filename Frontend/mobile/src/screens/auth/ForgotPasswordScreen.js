import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import ButtonPrimary from '../../components/ButtonPrimary';
import styles from '../../styles/login';
import * as authApi from '../../api/authApi';
import { useSnackbar } from '../../hooks/useSnackbar';

const customStyles = StyleSheet.create({
  readOnlyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 10,
  },
  readOnlyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  readOnlyEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inlineError: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 8,
  },
  stepDot: {
    width: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
  },
});

export default function ForgotPasswordScreen({ navigation }) {
  // Step 1: Nhập email | Step 2: Xác thực OTP | Step 3: Đặt mật khẩu mới | Step 4: Thành công
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { showError, showSuccess } = useSnackbar();

  // ──── BƯỚC 1: NHẬP EMAIL & KIỂM TRA ───────────────────────────────────
  const handleStep1SendEmail = async () => {
    setErrorMsg('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    setLoading(true);
    const res = await authApi.forgotPassword(trimmedEmail);
    setLoading(false);

    if (res.ok || res.status === 200) {
      showSuccess('Mã OTP 6 chữ số đã được gửi đến email của bạn.');
      setStep(2);
    } else {
      const serverErr = res.body?.error || res.error || 'Email không tồn tại trong hệ thống.';
      setErrorMsg(serverErr);
      showError(serverErr);
    }
  };

  // ──── BƯỚC 2: XÁC THỰC OTP ────────────────────────────────────────────
  const handleStep2VerifyOTP = async () => {
    setErrorMsg('');
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }

    setLoading(true);
    const res = await authApi.verifyResetOtp({
      email: email.trim().toLowerCase(),
      otp: trimmedOtp,
    });
    setLoading(false);

    if (res.ok || res.status === 200) {
      showSuccess('Xác thực OTP thành công! Vui lòng nhập mật khẩu mới.');
      setStep(3);
    } else {
      const serverErr = res.body?.error || res.error || 'Mã OTP không hợp lệ hoặc đã hết hạn.';
      setErrorMsg(serverErr);
      showError(serverErr);
    }
  };

  // ──── BƯỚC 3: ĐẶT MẬT KHẨU MỚI ───────────────────────────────────────
  const handleStep3ResetPassword = async () => {
    setErrorMsg('');
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
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

    if (res.ok || res.status === 200) {
      setStep(4);
    } else {
      const serverErr = res.body?.error || res.error || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
      setErrorMsg(serverErr);
      showError(serverErr);
    }
  };

  // ──── CÁC HÀM XỬ LÝ PHỤ ──────────────────────────────────────────────
  const handleResendOTP = async () => {
    setLoading(true);
    const res = await authApi.forgotPassword(email.trim().toLowerCase());
    setLoading(false);
    if (res.ok || res.status === 200) {
      showSuccess('Đã gửi lại mã OTP mới đến email của bạn.');
    } else {
      showError(res.body?.error || 'Không thể gửi lại OTP.');
    }
  };

  // ──── BƯỚC 4: THÀNH CÔNG ─────────────────────────────────────────────
  if (step === 4) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.container, { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
            <View style={[styles.logoWrap, { backgroundColor: '#16a34a', width: 72, height: 72, borderRadius: 36 }]}>
              <Feather name="check" size={40} color="#fff" />
            </View>
            <Text style={[styles.title, { marginTop: 16 }]}>Đặt lại mật khẩu thành công!</Text>
            <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 8, lineHeight: 22 }]}>
              Mật khẩu cho tài khoản <Text style={{ fontWeight: '700', color: '#111827' }}>{email}</Text> đã được cập nhật thành công.
            </Text>
            <ButtonPrimary
              title="Về trang đăng nhập"
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
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
        {/* Navigation Top Bar */}
        <TouchableOpacity
          onPress={() => {
            if (step > 1) {
              setErrorMsg('');
              setStep((s) => s - 1);
            } else {
              navigation.goBack();
            }
          }}
          style={{ marginBottom: 8, alignSelf: 'flex-start' }}
        >
          <Feather name="arrow-left" size={24} color="#030213" />
        </TouchableOpacity>

        {/* Step Indicator Bar */}
        <View style={customStyles.stepIndicator}>
          <View style={[customStyles.stepDot, customStyles.stepDotActive]} />
          <View style={[customStyles.stepDot, step >= 2 && customStyles.stepDotActive]} />
          <View style={[customStyles.stepDot, step >= 3 && customStyles.stepDotActive]} />
        </View>

        {/* Thông báo lỗi toàn cục (nếu có) */}
        {errorMsg ? (
          <View style={customStyles.errorBox}>
            <Feather name="alert-circle" size={18} color="#DC2626" />
            <Text style={customStyles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* ─── BƯỚC 1: NHẬP EMAIL ─────────────────────────────────────── */}
        {step === 1 && (
          <View style={{ width: '100%' }}>
            <View style={[styles.header, { alignItems: 'flex-start', paddingTop: 4 }]}>
              <Text style={styles.title}>Quên mật khẩu?</Text>
              <Text style={[styles.subtitle, { textAlign: 'left' }]}>
                Nhập email tài khoản của bạn để nhận mã xác thực OTP.
              </Text>
            </View>

            <View style={[styles.form, { marginTop: 24 }]}>
              <View style={styles.field}>
                <Text style={styles.label}>Địa chỉ Email</Text>
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setErrorMsg('');
                  }}
                  placeholder="Nhập email tài khoản của bạn"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, errorMsg ? { borderColor: '#DC2626', borderWidth: 1.5 } : null]}
                  editable={!loading}
                />
                {errorMsg ? <Text style={customStyles.inlineError}>{errorMsg}</Text> : null}
              </View>

              <ButtonPrimary
                title={loading ? 'Đang gửi mã...' : 'Gửi mã xác thực'}
                onPress={handleStep1SendEmail}
                disabled={loading}
                style={{ marginTop: 12 }}
              />

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={[styles.forgot, { alignItems: 'center', marginTop: 20 }]}>
                <Text style={styles.forgotText}>Quay lại Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── BƯỚC 2: XÁC THỰC OTP ────────────────────────────────────── */}
        {step === 2 && (
          <View style={{ width: '100%' }}>
            <View style={[styles.header, { alignItems: 'flex-start', paddingTop: 4 }]}>
              <Text style={styles.title}>Xác thực mã OTP</Text>
              <Text style={[styles.subtitle, { textAlign: 'left' }]}>
                Mã xác thực gồm 6 chữ số đã được gửi đến email bên dưới.
              </Text>
            </View>

            {/* Read-Only Email Display Card (Tuyệt đối không cho sửa) */}
            <View style={customStyles.readOnlyCard}>
              <Feather name="mail" size={22} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={customStyles.readOnlyLabel}>Email nhận mã OTP (Chỉ xem)</Text>
                <Text style={customStyles.readOnlyEmail} numberOfLines={1}>{email}</Text>
              </View>
              <TouchableOpacity onPress={() => setStep(1)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>Đổi email</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Nhập mã OTP (6 chữ số)</Text>
                <TextInput
                  value={otp}
                  onChangeText={(v) => {
                    setOtp(v.replace(/[^0-9]/g, ''));
                    setErrorMsg('');
                  }}
                  placeholder="000000"
                  keyboardType="numeric"
                  maxLength={6}
                  style={[styles.input, { letterSpacing: 6, fontSize: 18, fontWeight: '700', textAlign: 'center' }, errorMsg ? { borderColor: '#DC2626', borderWidth: 1.5 } : null]}
                  editable={!loading}
                />
                {errorMsg ? <Text style={customStyles.inlineError}>{errorMsg}</Text> : null}
              </View>

              <ButtonPrimary
                title={loading ? 'Đang xác thực...' : 'Xác nhận mã OTP'}
                onPress={handleStep2VerifyOTP}
                disabled={loading}
                style={{ marginTop: 12 }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                  <Text style={styles.forgotText}>Gửi lại mã OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep(1)}>
                  <Text style={styles.forgotText}>Nhập lại email khác</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ─── BƯỚC 3: ĐẶT MẬT KHẨU MỚI ────────────────────────────────── */}
        {step === 3 && (
          <View style={{ width: '100%' }}>
            <View style={[styles.header, { alignItems: 'flex-start', paddingTop: 4 }]}>
              <Text style={styles.title}>Tạo mật khẩu mới</Text>
              <Text style={[styles.subtitle, { textAlign: 'left' }]}>
                Thiết lập mật khẩu mới an toàn cho tài khoản của bạn.
              </Text>
            </View>

            {/* Read-Only Email Display Card (Tuyệt đối không cho sửa) */}
            <View style={customStyles.readOnlyCard}>
              <Feather name="shield" size={22} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={customStyles.readOnlyLabel}>Đang đặt lại mật khẩu cho</Text>
                <Text style={customStyles.readOnlyEmail} numberOfLines={1}>{email}</Text>
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Mật khẩu mới</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    value={newPassword}
                    onChangeText={(v) => {
                      setNewPassword(v);
                      setErrorMsg('');
                    }}
                    placeholder="Nhập mật khẩu mới"
                    secureTextEntry={!showNewPassword}
                    style={[styles.input, { paddingRight: 50 }]}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword((s) => !s)}
                    style={styles.eyeButton}
                  >
                    <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: '#717182', marginTop: 4, fontSize: 12 }}>Tối thiểu 6 ký tự</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      setErrorMsg('');
                    }}
                    placeholder="Nhập lại mật khẩu mới"
                    secureTextEntry={!showConfirmPassword}
                    style={[styles.input, { paddingRight: 50 }]}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((s) => !s)}
                    style={styles.eyeButton}
                  >
                    <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
                  </TouchableOpacity>
                </View>
              </View>

              <ButtonPrimary
                title={loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                onPress={handleStep3ResetPassword}
                disabled={loading}
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

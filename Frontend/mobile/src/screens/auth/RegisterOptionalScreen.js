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
import ButtonPrimary from '../../components/ButtonPrimary';
import styles from '../../styles/login';
import { useAuth } from '../../hooks/useAuth';
import { useSnackbar } from '../../hooks/useSnackbar';

export default function RegisterOptionalScreen({ route, navigation }) {
  const step1Data = route.params || {};

  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  const handleFinish = async (includeStep2 = true) => {
    setLoading(true);
    try {
      const payload = {
        name: step1Data.name,
        email: step1Data.email,
        password: step1Data.password,
        confirmedPassword: step1Data.confirmedPassword,
        dob: step1Data.dob,
        gender: step1Data.gender,
        role: step1Data.role || 'user.patient',
        cccd: step1Data.cccd || '',
      };

      if (includeStep2) {
        if (insuranceNumber.trim()) payload.insuranceNumber = insuranceNumber.trim();
        if (emergencyContactName.trim()) payload.emergencyContactName = emergencyContactName.trim();
        if (emergencyContactPhone.trim()) payload.emergencyContactPhone = emergencyContactPhone.trim();
        if (medicalHistory.trim()) payload.medicalHistory = medicalHistory.trim();
      }

      const { ok, error } = await register(payload);
      setLoading(false);

      if (ok) {
        showSuccess('Đăng ký tài khoản thành công. Vui lòng đăng nhập!');
        navigation.navigate('Login');
      } else {
        const errorMsg = error?.error || error?.message || (typeof error === 'string' ? error : JSON.stringify(error)) || 'Đăng ký thất bại.';
        showError(errorMsg);
      }
    } catch (err) {
      setLoading(false);
      showError('Có lỗi xảy ra khi gửi dữ liệu.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>RPM</Text>
          </View>
          <Text style={styles.title}>Bước 2/2: Thông tin y tế</Text>
          <Text style={styles.subtitle}>
            Các thông tin tùy chọn giúp bác sĩ và quản trị viên hoàn thiện hồ sơ theo dõi sức khỏe cho bạn.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Số BHYT (Bảo hiểm y tế)</Text>
            <TextInput
              value={insuranceNumber}
              onChangeText={(text) => setInsuranceNumber(text.toUpperCase())}
              placeholder="Nhập mã số BHYT (tùy chọn)"
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Người liên hệ khẩn cấp</Text>
            <TextInput
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder="Họ tên người nhà/người thân (tùy chọn)"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>SĐT khẩn cấp</Text>
            <TextInput
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              placeholder="Số điện thoại người liên hệ (tùy chọn)"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tiền sử bệnh lý / Dị ứng</Text>
            <TextInput
              value={medicalHistory}
              onChangeText={setMedicalHistory}
              placeholder="Ghi chú bệnh nền (tim mạch, huyết áp...), dị ứng thuốc..."
              multiline
              numberOfLines={3}
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
            />
          </View>

          <View style={{ marginTop: 16 }}>
            <ButtonPrimary
              title={loading ? 'Đang hoàn tất...' : 'Hoàn tất đăng ký'}
              onPress={() => handleFinish(true)}
              disabled={loading}
            />

            <TouchableOpacity
              style={{ marginTop: 16, alignItems: 'center', paddingVertical: 10 }}
              onPress={() => handleFinish(false)}
              disabled={loading}
            >
              <Text style={{ color: '#64748B', fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' }}>
                Bỏ qua bước này & Hoàn tất
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

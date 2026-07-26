import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import ButtonPrimary from '../../components/ButtonPrimary';
import styles from '../../styles/login';
import { useAuth } from '../../hooks/useAuth';
import { useSnackbar } from '../../hooks/useSnackbar';

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

export default function RegisterOptionalScreen({ route, navigation }) {
  const step1Data = route.params || {};
  const savedStep2Data = route.params?.savedStep2 || {};

  const [insuranceNumber, setInsuranceNumber] = useState(savedStep2Data.insuranceNumber || '');
  const [emergencyContactName, setEmergencyContactName] = useState(savedStep2Data.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(savedStep2Data.emergencyContactPhone || '');
  const [medicalHistory, setMedicalHistory] = useState(savedStep2Data.medicalHistory || '');
  const [bloodPressure, setBloodPressure] = useState(!!savedStep2Data.bloodPressure);
  const [glucose, setGlucose] = useState(!!savedStep2Data.glucose);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { showSuccess, showError } = useSnackbar();

  useEffect(() => {
    if (route?.params?.savedStep2) {
      const s2 = route.params.savedStep2;
      if (s2.insuranceNumber !== undefined) setInsuranceNumber(s2.insuranceNumber);
      if (s2.emergencyContactName !== undefined) setEmergencyContactName(s2.emergencyContactName);
      if (s2.emergencyContactPhone !== undefined) setEmergencyContactPhone(s2.emergencyContactPhone);
      if (s2.medicalHistory !== undefined) setMedicalHistory(s2.medicalHistory);
      if (s2.bloodPressure !== undefined) setBloodPressure(!!s2.bloodPressure);
      if (s2.glucose !== undefined) setGlucose(!!s2.glucose);
    }
  }, [route?.params?.savedStep2]);

  const handleGoBackToStep1 = () => {
    navigation.navigate('Register', {
      savedStep1: {
        name: step1Data.name,
        email: step1Data.email,
        phone: step1Data.phone,
        dob: step1Data.dob,
        gender: step1Data.gender,
        cccd: step1Data.cccd,
        password: step1Data.password,
        confirmedPassword: step1Data.confirmedPassword,
      },
      savedStep2: {
        insuranceNumber,
        emergencyContactName,
        emergencyContactPhone,
        medicalHistory,
        bloodPressure,
        glucose,
      },
    });
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If user is navigating back to Login or replacing stack, allow it
      if (e.data.action.type === 'GO_BACK') {
        e.preventDefault();
        handleGoBackToStep1();
      }
    });
    return unsubscribe;
  }, [navigation, insuranceNumber, emergencyContactName, emergencyContactPhone, medicalHistory, bloodPressure, glucose, step1Data]);

  const handleFinish = async (includeStep2 = true) => {
    setLoading(true);
    try {
      const payload = {
        name: step1Data.name,
        email: step1Data.email,
        phone: step1Data.phone?.trim() || '',
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
        payload.diseaseTypes = {
          bloodPressure,
          glucose,
        };
      }

      const { ok, error } = await register(payload);
      setLoading(false);

      if (ok) {
        showSuccess('Đăng ký thành công! Tài khoản của bạn đang chờ Quản trị viên duyệt.');
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

  const handleSkipConfirm = () => {
    Alert.alert(
      'Xác nhận bỏ qua thông tin y tế',
      'Nếu bỏ qua bước này, việc xác thực và kích hoạt tài khoản của bạn bởi Quản trị viên & Bác sĩ có thể mất nhiều thời gian hơn do thiếu thông tin sức khỏe ban đầu.\n\nBạn có chắc chắn muốn bỏ qua không?',
      [
        { text: 'Điền tiếp thông tin', style: 'cancel' },
        {
          text: 'Bỏ qua & Đăng ký',
          style: 'destructive',
          onPress: () => handleFinish(false),
        },
      ]
    );
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
          <Image 
            source={require('../../../assets/icon.png')} 
            style={{ width: 80, height: 80, borderRadius: 16, marginBottom: 12, alignSelf: 'center' }} 
            resizeMode="contain"
          />
          <Text style={styles.title}>Remote Patient Monitoring</Text>
          <View style={portalBadgeStyle.tag}>
            <Feather name="user-plus" size={14} color="#1D4ED8" />
            <Text style={portalBadgeStyle.tagText}>CỔNG ĐĂNG KÝ BỆNH NHÂN</Text>
          </View>
        </View>

        <View style={{ marginTop: 16, marginBottom: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B' }}>
            Bước 2/2: Thông tin y tế
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center', paddingHorizontal: 16 }}>
            Các thông tin bổ sung giúp bác sĩ và quản trị viên hoàn thiện hồ sơ theo dõi sức khỏe cho bạn.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Số BHYT (Bảo hiểm y tế)</Text>
            <TextInput
              value={insuranceNumber}
              onChangeText={(text) => setInsuranceNumber(text.toUpperCase())}
              placeholder="Nhập mã số BHYT"
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Chỉ số & Loại bệnh lý theo dõi</Text>
            <View style={{ flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setBloodPressure((prev) => !prev)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: bloodPressure ? '#EFF6FF' : '#F8FAFC',
                  borderWidth: 1.5,
                  borderColor: bloodPressure ? '#2563EB' : '#E2E8F0',
                }}
              >
                <Feather
                  name={bloodPressure ? 'check-square' : 'square'}
                  size={20}
                  color={bloodPressure ? '#2563EB' : '#94A3B8'}
                />
                <Text
                  style={{
                    marginLeft: 10,
                    fontSize: 14,
                    fontWeight: bloodPressure ? '600' : '400',
                    color: bloodPressure ? '#1E40AF' : '#334155',
                  }}
                >
                  Huyết áp
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setGlucose((prev) => !prev)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: glucose ? '#EFF6FF' : '#F8FAFC',
                  borderWidth: 1.5,
                  borderColor: glucose ? '#2563EB' : '#E2E8F0',
                }}
              >
                <Feather
                  name={glucose ? 'check-square' : 'square'}
                  size={20}
                  color={glucose ? '#2563EB' : '#94A3B8'}
                />
                <Text
                  style={{
                    marginLeft: 10,
                    fontSize: 14,
                    fontWeight: glucose ? '600' : '400',
                    color: glucose ? '#1E40AF' : '#334155',
                  }}
                >
                  Đái tháo đường
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Người liên hệ khẩn cấp</Text>
            <TextInput
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder="Họ tên người nhà/người thân"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>SĐT khẩn cấp</Text>
            <TextInput
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              placeholder="Số điện thoại người liên hệ"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tiền sử bệnh lý & Ghi chú y tế</Text>
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
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#CBD5E1',
                backgroundColor: '#F8FAFC',
              }}
              onPress={handleGoBackToStep1}
              disabled={loading}
            >
              <Feather name="edit-3" size={16} color="#475569" style={{ marginRight: 8 }} />
              <Text style={{ color: '#475569', fontSize: 15, fontWeight: '600' }}>
                Quay lại sửa Bước 1
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 14, alignItems: 'center', paddingVertical: 10 }}
              onPress={handleSkipConfirm}
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




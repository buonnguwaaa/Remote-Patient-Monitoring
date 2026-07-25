import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  StyleSheet,
} from 'react-native';
import ButtonPrimary from '../../components/ButtonPrimary';
import { Feather } from '@expo/vector-icons';
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


export default function RegisterScreen({ route, navigation, onSwitchToLogin }) {
  const savedStep1 = route?.params?.savedStep1;

  const [name, setName] = useState(savedStep1?.name || '');
  const [email, setEmail] = useState(savedStep1?.email || '');
  const [gender, setGender] = useState(() => {
    if (!savedStep1?.gender) return '';
    if (savedStep1.gender === 'M' || savedStep1.gender === 'male') return 'Nam';
    if (savedStep1.gender === 'F' || savedStep1.gender === 'female') return 'Nữ';
    return savedStep1.gender;
  });
  const [showGenderOptions, setShowGenderOptions] = useState(false);
  const [dob, setDob] = useState(savedStep1?.dob || '');
  const [cccd, setCccd] = useState(savedStep1?.cccd || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(dob ? new Date(dob) : new Date());

  let DateTimePicker = null;
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    DateTimePicker = null;
  }
  const [phone, setPhone] = useState(savedStep1?.phone || '');
  const [password, setPassword] = useState(savedStep1?.password || '');
  const [confirmPassword, setConfirmPassword] = useState(savedStep1?.confirmedPassword || savedStep1?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { register } = useAuth();
  const [showDobInput, setShowDobInput] = useState(false);
  const { showSuccess, showError } = useSnackbar();

  useEffect(() => {
    if (route?.params?.savedStep1) {
      const s1 = route.params.savedStep1;
      if (s1.name !== undefined) setName(s1.name);
      if (s1.email !== undefined) setEmail(s1.email);
      if (s1.phone !== undefined) setPhone(s1.phone);
      if (s1.dob !== undefined) setDob(s1.dob);
      if (s1.cccd !== undefined) setCccd(s1.cccd);
      if (s1.password !== undefined) setPassword(s1.password);
      if (s1.confirmedPassword !== undefined) setConfirmPassword(s1.confirmedPassword);
      if (s1.gender) {
        if (s1.gender === 'M' || s1.gender === 'male') setGender('Nam');
        else if (s1.gender === 'F' || s1.gender === 'female') setGender('Nữ');
        else setGender(s1.gender);
      }
    }
  }, [route?.params?.savedStep1]);

  const handleSubmit = () => {
    setEmailError('');
    if (!name.trim()) {
      showError('Vui lòng nhập họ tên.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Vui lòng nhập email hợp lệ.');
      showError('Vui lòng nhập email hợp lệ.');
      return;
    }
    if (!dob) {
      showError('Vui lòng nhập hoặc chọn ngày sinh.');
      return;
    }
    if (!password) {
      showError('Vui lòng nhập mật khẩu.');
      return;
    }
    if (password.length < 8) {
      showError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Mật khẩu xác nhận không khớp.');
      return;
    }
    const genderCode = (() => {
      if (!gender) return 'M';
      const g = gender.toLowerCase();
      if (g === 'nam' || g.startsWith('male')) return 'M';
      if (g === 'nữ' || g.startsWith('female')) return 'F';
      return 'M';
    })();

    navigation.navigate('RegisterOptional', {
      name,
      email,
      phone,
      password,
      confirmedPassword: confirmPassword,
      dob,
      gender: genderCode,
      role: 'user.patient',
      cccd,
      savedStep2: route?.params?.savedStep2,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
            Bước 1/2: Thông tin cá nhân
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
            Điền thông tin cá nhân cơ bản để đăng ký tài khoản
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nhập họ và tên của bạn"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailError) setEmailError('');
              }}
              placeholder="Nhập địa chỉ email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, emailError ? { borderColor: '#DC2626', borderWidth: 1.5 } : null]}
            />
            {emailError ? (
              <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: '500' }}>
                {emailError}
              </Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Nhập số điện thoại"
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Giới tính</Text>
            <TouchableOpacity
              onPress={() => setShowGenderOptions((s) => !s)}
              style={styles.selectButton}
              activeOpacity={0.8}
            >
              <Text style={gender ? styles.inputText : styles.placeholderText}>{gender || 'Chọn giới tính'}</Text>
              <Feather name={showGenderOptions ? 'chevron-up' : 'chevron-down'} size={18} color="#717182" />
            </TouchableOpacity>

            {showGenderOptions && (
              <View style={styles.selectOptions}>
                {[
                  { label: 'Nam', value: 'male' },
                  { label: 'Nữ', value: 'female' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setGender(opt.label);
                      setShowGenderOptions(false);
                    }}
                    style={styles.selectOption}
                  >
                    <Text style={styles.selectOptionText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Ngày sinh</Text>
            <TouchableOpacity
              onPress={() => {
                if (DateTimePicker) {
                  setTempDate(dob ? new Date(dob) : new Date());
                  setShowDatePicker(true);
                } else {
                  setShowDobInput(true);
                }
              }}
              style={styles.dobButton}
            >
              <Feather name="calendar" size={18} color="#717182" style={{ marginRight: 10 }} />
              <Text style={dob ? { color: '#030213' } : styles.dobText}>{dob || 'Chọn ngày sinh'}</Text>
            </TouchableOpacity>

            {showDobInput && (
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                style={[styles.input, { marginTop: 8 }]}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />
            )}

            {DateTimePicker && showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                minimumDate={new Date('1900-01-01')}
                onChange={(event, selected) => {
                  setShowDatePicker(false);
                  if (event.type === 'set' && selected) {
                    setTempDate(selected);
                    const iso = selected.toISOString().slice(0, 10);
                    setDob(iso);
                  }
                }}
              />
            )}

            {DateTimePicker && showDatePicker && Platform.OS === 'ios' && (
              <Modal
                transparent
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.modalContainer}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Chọn ngày sinh</Text>
                    <View style={styles.iosDatePickerWrap}>
                      <DateTimePicker
                        value={tempDate}
                        mode="date"
                        display="spinner"
                        themeVariant="light"
                        textColor="#030213"
                        maximumDate={new Date()}
                        minimumDate={new Date('1900-01-01')}
                        style={styles.iosDatePicker}
                        onChange={(event, selected) => {
                          if (selected) setTempDate(selected);
                        }}
                      />
                    </View>

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={() => {
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={styles.modalActionText}>Hủy</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={() => {
                          const iso = tempDate.toISOString().slice(0, 10);
                          setDob(iso);
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={styles.modalActionText}>Xác nhận</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Số CCCD (Căn cước công dân)</Text>
            <TextInput
              value={cccd}
              onChangeText={setCccd}
              placeholder="Nhập số CCCD"
              keyboardType="number-pad"
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
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeButton}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#717182', marginTop: 6 }}>Mật khẩu phải có ít nhất 8 ký tự</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Xác nhận mật khẩu</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu"
                secureTextEntry={!showConfirmPassword}
                style={[styles.input, { paddingRight: 50 }]}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword((s) => !s)} style={styles.eyeButton}>
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
              </TouchableOpacity>
            </View>
          </View>

          <ButtonPrimary title="Tiếp tục" onPress={handleSubmit} disabled={loading} />

          {/* Terms */}
          <Text style={styles.termsText}>
            Bằng việc đăng ký, bạn đồng ý với{' '}
            <Text
              style={styles.termsLink}
              onPress={() => {
                try {
                  const url = 'https://example.com/terms';
                  const { Linking } = require('react-native');
                  Linking.openURL(url).catch(() => { });
                } catch (e) { }
              }}
            >
              Điều khoản dịch vụ
            </Text>{' '}
            và{' '}
            <Text
              style={styles.termsLink}
              onPress={() => {
                try {
                  const url = 'https://example.com/privacy';
                  const { Linking } = require('react-native');
                  Linking.openURL(url).catch(() => { });
                } catch (e) { }
              }}
            >
              Chính sách bảo mật
            </Text>{' '}
            của chúng tôi.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Đã có tài khoản?{' '}
            <Text style={styles.signUp} onPress={() => navigation.navigate('Login')}>Đăng nhập</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}



import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import ButtonPrimary from '../../components/ButtonPrimary';
import { Feather } from '@expo/vector-icons';
import styles from '../../styles/login';
import { Alert } from 'react-native';

import { useAuth } from '../../hooks/useAuth';

export default function RegisterScreen({ navigation, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [showGenderOptions, setShowGenderOptions] = useState(false);
  const [dob, setDob] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(dob ? new Date(dob) : new Date());

  let DateTimePicker = null;
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    DateTimePicker = null;
  }
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const [showDobInput, setShowDobInput] = useState(false);

  const handleSubmit = () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setLoading(true);
    (async () => {
      const genderCode = (() => {
        if (!gender) return 'O';
        const g = gender.toLowerCase();
        if (g.startsWith('male')) return 'M';
        if (g.startsWith('female')) return 'F';
        return 'O';
      })();

      const { ok, error } = await register({
        name,
        email,
        password,
        confirmedPassword: confirmPassword,
        dob,
        gender: genderCode,
        role: 'user.patient',
      });
      setLoading(false);
      if (ok) {
        alert('Register successful. Please sign in.');
        navigation.navigate('Login');
      } else {
        alert('Register failed: ' + JSON.stringify(error));
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              onPress={() => setShowGenderOptions((s) => !s)}
              style={styles.selectButton}
              activeOpacity={0.8}
            >
              <Text style={gender ? styles.inputText : styles.placeholderText}>{gender || 'Select your gender'}</Text>
              <Feather name={showGenderOptions ? 'chevron-up' : 'chevron-down'} size={18} color="#717182" />
            </TouchableOpacity>

            {showGenderOptions && (
              <View style={styles.selectOptions}>
                {[
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' },
                  { label: 'Non-binary', value: 'non-binary' },
                  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
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
            <Text style={styles.label}>Date of Birth</Text>
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
              <Text style={dob ? { color: '#030213' } : styles.dobText}>{dob || 'Pick a date'}</Text>
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
                    <Text style={styles.modalTitle}>Select date</Text>
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
                        <Text style={styles.modalActionText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalActionButton}
                        onPress={() => {
                          const iso = tempDate.toISOString().slice(0, 10);
                          setDob(iso);
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={styles.modalActionText}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry={!showPassword}
                style={[styles.input, { paddingRight: 50 }]}
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeButton}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#717182', marginTop: 6 }}>Must be at least 8 characters</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                style={[styles.input, { paddingRight: 50 }]}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword((s) => !s)} style={styles.eyeButton}>
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
              </TouchableOpacity>
            </View>
          </View>

          <ButtonPrimary title={loading ? 'Creating Account...' : 'Create Account'} onPress={handleSubmit} disabled={loading} />
          {/* Terms */}
          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
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
              Terms
            </Text>{' '}
            and{' '}
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
              Privacy Policy
            </Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.signUp} onPress={() => navigation.navigate('Login')}>Sign In</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

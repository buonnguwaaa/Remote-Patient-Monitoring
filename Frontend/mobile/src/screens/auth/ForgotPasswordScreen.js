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

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      alert('Please enter your email address.');
      return;
    }
    setLoading(true);
    const res = await authApi.forgotPassword(trimmed);
    setLoading(false);
    if (res.ok || res.status === 200) {
      setSent(true);
    } else {
      alert('Something went wrong. Please try again.');
    }
  };

  if (sent) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.container, { justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', paddingHorizontal: 8 }}>
            <View style={[styles.logoWrap, { backgroundColor: '#16a34a' }]}>
              <Feather name="mail" size={36} color="#fff" />
            </View>
            <Text style={[styles.title, { marginTop: 12 }]}>Check your email</Text>
            <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 8, lineHeight: 22 }]}>
              Nếu tài khoản <Text style={{ fontWeight: '700', color: '#030213' }}>{email.trim()}</Text> tồn tại, bạn sẽ nhận được email đặt lại mật khẩu trong giây lát.
            </Text>
            <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 12, lineHeight: 22 }]}>
              Mở email, nhấn nút <Text style={{ fontWeight: '700', color: '#030213' }}>Reset My Password</Text>, sao chép toàn bộ đường link rồi dán vào bước tiếp theo.
            </Text>
            <ButtonPrimary
              title="Tiếp tục đặt lại mật khẩu"
              onPress={() => navigation.navigate('ResetPassword')}
              style={{ marginTop: 28, width: '100%' }}
            />
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20 }}>
              <Text style={styles.forgotText}>Back to Sign In</Text>
            </TouchableOpacity>
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
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { textAlign: 'left' }]}>
            Enter your email and we'll send you a link to reset your password.
          </Text>
        </View>

        <View style={[styles.form, { marginTop: 28 }]}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              editable={!loading}
            />
          </View>

          <ButtonPrimary
            title={loading ? 'Sending...' : 'Send Reset Link'}
            onPress={handleSubmit}
            disabled={loading}
            style={{ marginTop: 8 }}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={[styles.forgot, { alignItems: 'center', marginTop: 20 }]}>
            <Text style={styles.forgotText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

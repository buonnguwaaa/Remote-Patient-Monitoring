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
import ButtonPrimary from '../components/ButtonPrimary';
import { Feather, FontAwesome } from '@expo/vector-icons';
import styles from '../styles/login';

import { useAuth } from '../context/AuthContext';
import * as GoogleAuth from '../api/googleAuth';

export default function LoginScreen({ onSwitchToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = () => {
    setLoading(true);
    (async () => {
      const res = await login(email, password);
      setLoading(false);
      if (!res.ok) {
        alert('Login failed: ' + JSON.stringify(res.error));
        return;
      }

      // If caller provided onLoginSuccess, call it with user data (if any)
      if (onLoginSuccess) {
        try {
          // res.data may contain user when AuthContext fetched /auth/me; otherwise caller can read context
          await onLoginSuccess(res.data || null);
        } catch (e) {
          // ignore
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>RPM</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                style={[styles.input, { paddingRight: 50 }]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                style={styles.eyeButton}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#717182" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgot} onPress={() => {}}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <ButtonPrimary
            title={loading ? 'Signing in...' : 'Sign In'}
            onPress={handleSubmit}
            disabled={loading}
            style={{ marginTop: 10 }}
          />

          {/* Divider */}
          <View style={styles.dividerWrap}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.divider} />
          </View>

          {/* Social buttons */}
          <View style={styles.socialRow}>
            <ButtonPrimary
              variant="outline"
              onPress={async () => {
                setLoading(true);
                try {
                  const res = await GoogleAuth.loginWithGoogle();
                  if (!res.ok) {
                    alert('Google login failed: ' + JSON.stringify(res.error || res));
                  } else if (res.opened || res.redirected) {
                    alert('Opening browser for Google sign-in. Complete the flow, then return to the app.');
                  } else {
                    alert('Google login result: ' + JSON.stringify(res));
                  }
                } catch (e) {
                  alert('Google login error: ' + String(e));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{ flex: 1, marginRight: 8 }}
            >
              <FontAwesome name="google" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={{ color: '#030213', fontWeight: '600' }}>{loading ? 'Signing in...' : 'Google'}</Text>
            </ButtonPrimary>
            <ButtonPrimary variant="outline" onPress={() => {}} disabled={loading} style={{ flex: 1, marginLeft: 8 }}>
              <FontAwesome name="apple" size={18} color="#000" style={{ marginRight: 8 }} />
              <Text style={{ color: '#030213', fontWeight: '600' }}>Apple</Text>
            </ButtonPrimary>
          </View>
        </View>

        {/* Footer */}
          <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.signUp} onPress={() => onSwitchToRegister && onSwitchToRegister()}>Sign Up</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}



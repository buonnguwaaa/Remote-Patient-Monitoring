import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppInner() {
  const [mode, setMode] = useState('login');
  const { accessToken, initializing } = useAuth();

  if (initializing) return null;

  if (accessToken) {
    return <HomeScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {mode === 'login' ? (
        <LoginScreen onSwitchToRegister={() => setMode('register')} />
      ) : (
        <RegisterScreen onSwitchToLogin={() => setMode('login')} />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

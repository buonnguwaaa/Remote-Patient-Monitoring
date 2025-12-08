import React, { useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppInner() {
  const [mode, setMode] = useState('login');
  const { user, initializing } = useAuth();

  if (initializing) return null;

  return (
    <SafeAreaProvider>
      {user ? (
        <HomeScreen />
      ) : (
        <SafeAreaView style={{ flex: 1 }}>
          {mode === 'login' ? (
            <LoginScreen onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterScreen onSwitchToLogin={() => setMode('login')} />
          )}
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

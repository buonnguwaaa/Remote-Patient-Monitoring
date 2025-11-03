import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/login';

export default function HomeScreen() {
  const { logout } = useAuth();

  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Xin chào bạn đến với RPM.</Text>
      <Text style={{ color: '#717182', marginBottom: 24 }}>Chúc bạn một ngày tốt lành!</Text>
      <TouchableOpacity onPress={logout} style={{ backgroundColor: '#030213', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DoctorLoginScreen from './DoctorLoginScreen';
import NurseLoginScreen from './NurseLoginScreen';

export default function LoginScreen() {
  const [role, setRole] = useState('doctor');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.headerBg, role === 'doctor' ? { backgroundColor: '#F0F4FF' } : { backgroundColor: '#fff' }]}>
        <View style={[styles.tabContainer, { marginTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.tabButton, role === 'doctor' && styles.tabButtonActive]}
            onPress={() => setRole('doctor')}
          >
            <Text style={[styles.tabText, role === 'doctor' && styles.tabTextActive]}>
              Dành cho Bác sĩ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, role === 'nurse' && styles.tabButtonActive]}
            onPress={() => setRole('nurse')}
          >
            <Text style={[styles.tabText, role === 'nurse' && styles.tabTextActive]}>
              Dành cho Y tá
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.content}>
        {role === 'doctor' ? <DoctorLoginScreen /> : <NurseLoginScreen />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBg: {
    paddingBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1D4ED8',
  },
  content: {
    flex: 1,
  },
});

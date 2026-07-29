import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity,
  Platform
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function PatientTutorialModal({ visible, onStartGuide, onSkip }) {
  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="fade" 
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Feather name="heart" size={14} color="#E11D48" />
              <Text style={styles.headerText}>CHÀO MỪNG BẠN MỚI</Text>
            </View>
          </View>
          
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="hand-wave-outline" size={36} color="#2563EB" />
          </View>
          
          <Text style={styles.title}>Chào mừng đến với RPM!</Text>
          <Text style={styles.description}>
            Ứng dụng đồng hành giúp bạn và Bác sĩ theo dõi chỉ số sức khỏe, lịch uống thuốc và nhận cảnh báo sớm mỗi ngày.
          </Text>
          
          <View style={styles.introList}>
            <View style={styles.introListItem}>
              <View style={styles.stepCircle}>
                <Ionicons name="stats-chart" size={16} color="#2563EB" />
              </View>
              <Text style={styles.introListText}>Ghi nhận & lưu nhật ký Huyết áp, Đường huyết, SpO2.</Text>
            </View>
            <View style={styles.introListItem}>
              <View style={styles.stepCircle}>
                <Ionicons name="medical" size={16} color="#2563EB" />
              </View>
              <Text style={styles.introListText}>Theo dõi lịch uống thuốc Bác sĩ kê đơn.</Text>
            </View>
            <View style={styles.introListItem}>
              <View style={styles.stepCircle}>
                <Ionicons name="shield-checkmark" size={16} color="#2563EB" />
              </View>
              <Text style={styles.introListText}>Cảnh báo màu đỏ tự động cho Bác sĩ khi chỉ số bất thường.</Text>
            </View>
          </View>

          {/* 2 Action Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={onStartGuide} 
              activeOpacity={0.85}
            >
              <Ionicons name="book-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>XEM HƯỚNG DẪN NGAY</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={onSkip} 
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryText}>Khám phá ngay (Bỏ qua)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justify: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 64 : 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justify: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  introList: {
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 22,
    gap: 12,
  },
  introListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justify: 'center',
    alignItems: 'center',
  },
  introListText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 19,
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    color: '#64748B',
    fontSize: 13.5,
    fontWeight: '600',
  },
});

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function PatientTutorialModal({ visible, onComplete }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.badge}>
              <Feather name="heart" size={14} color="#E11D48" />
              <Text style={styles.headerText}>CHÀO MỪNG BẠN</Text>
            </View>
          </View>
          
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="hand-wave-outline" size={32} color="#316BFF" />
          </View>
          
          <Text style={styles.title}>Làm quen với ứng dụng</Text>
          <Text style={styles.description}>
            Chào mừng bạn đến với hệ thống! Để giúp bạn sử dụng ứng dụng một cách dễ dàng, chúng ta hãy thử 2 thao tác cơ bản sau:
          </Text>
          
          <View style={styles.introList}>
            <View style={styles.introListItem}>
              <View style={styles.stepCircle}><Text style={styles.stepText}>1</Text></View>
              <Text style={styles.introListText}>Ghi nhận và lưu chỉ số sức khỏe của bạn.</Text>
            </View>
            <View style={styles.introListItem}>
              <View style={styles.stepCircle}><Text style={styles.stepText}>2</Text></View>
              <Text style={styles.introListText}>Theo dõi lịch uống thuốc Bác sĩ đã dặn.</Text>
            </View>
          </View>
          
          <Text style={styles.footerDescription}>
            Chỉ mất khoảng 1 phút, hệ thống sẽ hướng dẫn chi tiết từng bước cho bạn.
          </Text>
          
          <TouchableOpacity 
            style={styles.nextButton} 
            onPress={onComplete} 
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>BẮT ĐẦU NGAY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    marginBottom: 20,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  introList: {
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 16,
  },
  introListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  introListText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 20,
  },
  footerDescription: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  nextButton: {
    width: '100%',
    backgroundColor: '#316BFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#316BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  nextText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

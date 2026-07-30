import React from 'react';
import { View, Text, StyleSheet, Modal, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ButtonPrimary from './ButtonPrimary';

const { width } = Dimensions.get('window');

export default function RegistrationSuccessModal({ visible, onReturnToLogin }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Feather name="check" size={40} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.title}>Hồ sơ đã được gửi!</Text>

          <View style={styles.card}>
            <Text style={styles.message}>
              Hồ sơ sức khỏe của bạn đã được gửi đi thành công! Quản trị viên sẽ kiểm tra và xét duyệt hồ sơ này trong vòng 24 giờ.
            </Text>

            <View style={styles.infoBox}>
              <Feather name="mail" size={20} color="#4F46E5" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Khi tài khoản được kích hoạt, hệ thống sẽ gửi thông báo đến <Text style={styles.boldText}>Email/SĐT của bạn</Text>. Bạn vui lòng chú ý kiểm tra nhé!
              </Text>
            </View>
          </View>

          <View style={styles.buttonWrapper}>
            <ButtonPrimary
              title="Trở về màn hình Đăng nhập"
              onPress={onReturnToLogin}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#F3F6FB', // Light blue background matching the image
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
    // Add subtle shadow/glow to match the design (the image has a light greenish square behind the circle)
    backgroundColor: '#E0F2EC', 
    padding: 15,
    borderRadius: 16,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#52B788', // Green color
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F5FF',
    borderWidth: 1,
    borderColor: '#E1E9FB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#1E293B',
  },
  buttonWrapper: {
    width: '100%',
    marginTop: 20,
  },
});

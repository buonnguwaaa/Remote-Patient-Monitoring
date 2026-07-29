import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Modal, useWindowDimensions, Platform } from 'react-native';
import { useTutorial } from '../../context/tutorial/TutorialContext';
import { Ionicons } from '@expo/vector-icons';

const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.7)';

export default function TutorialOverlay() {
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const { 
    active, 
    tutorialMode, 
    showCompletion,
    closeCompletion,
    currentStep, 
    currentTargetLayout, 
    skipTutorial 
  } = useTutorial();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showFallback, setShowFallback] = useState(false);
  const { targets } = useTutorial();

  useEffect(() => {
    if (active && currentTargetLayout && !showFallback) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [currentTargetLayout, active, fadeAnim, showFallback]);

  useEffect(() => {
    if (active && tutorialMode && currentTargetLayout) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      if (active && tutorialMode && !currentTargetLayout) {
        // Fallback timer if target doesn't register after 3.5s
        const t = setTimeout(() => setShowFallback(true), 3500);
        return () => clearTimeout(t);
      }
    }
  }, [active, tutorialMode, currentTargetLayout]);

  if (showCompletion) {
    return (
      <Modal visible={true} transparent={true} animationType="fade" statusBarTranslucent>
        <View style={styles.completionOverlay}>
          <View style={styles.completionBox}>
            <Ionicons name="ribbon" size={64} color="#10B981" style={{ marginBottom: 16 }} />
            <Text style={styles.completionTitle}>Chúc mừng!</Text>
            <Text style={styles.completionText}>
              Bạn đã hoàn thành bài hướng dẫn. Bây giờ bạn đã sẵn sàng sử dụng ứng dụng để đồng hành cùng Bác sĩ.
            </Text>
            <TouchableOpacity 
              style={styles.completionBtn} 
              onPress={closeCompletion}
            >
              <Text style={styles.completionBtnText}>BẮT ĐẦU SỬ DỤNG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!active || !tutorialMode) return null;

  if (!currentTargetLayout) {
    if (showFallback) {
      return (
        <View style={styles.fallbackContainer}>
          <View style={styles.fallbackBox}>
            <Text style={styles.fallbackText}>Không tìm thấy phần tử hướng dẫn. Bạn có thể thử lại hoặc bỏ qua.</Text>
            <Text style={{ fontSize: 10, color: '#666', marginTop: 10 }}>
              Debug: step={currentStep?.target}, registered={JSON.stringify(Object.keys(targets || {}))}
            </Text>
            <TouchableOpacity style={styles.skipBtn} onPress={skipTutorial}>
              <Text style={styles.skipText}>BỎ QUA HƯỚNG DẪN</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return null;
  }

  const { x, y, width, height } = currentTargetLayout;
  const PADDING = 4;
  const hX = x - PADDING;
  const hY = y - PADDING;
  const hW = width + PADDING * 2;
  const hH = height + PADDING * 2;

  // Calculate tooltip position
  const isBottomHalf = hY > SCREEN_H / 2;
  const tooltipStyle = isBottomHalf
    ? { bottom: SCREEN_H - hY + 16, alignSelf: 'center' }
    : { top: hY + hH + 16, alignSelf: 'center' };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.container, { opacity: fadeAnim }]}>
      {/* 4 Mask Views to create the hole for true touch */}
      <View style={[styles.mask, { top: 0, left: 0, right: 0, height: hY }]} />
      <View style={[styles.mask, { top: hY, bottom: SCREEN_H - (hY + hH), left: 0, width: hX }]} />
      <View style={[styles.mask, { top: hY, bottom: SCREEN_H - (hY + hH), left: hX + hW, right: 0 }]} />
      <View style={[styles.mask, { top: hY + hH, bottom: 0, left: 0, right: 0 }]} />

      {/* Pulse ring around hole (pointerEvents="none") */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          {
            left: hX, top: hY, width: hW, height: hH,
            transform: [{ scale: pulseAnim }]
          }
        ]}
      />

      {/* Tooltip */}
      <View style={[styles.tooltip, tooltipStyle]} pointerEvents="box-none">
        <View style={styles.tooltipBox}>
          <Ionicons name="information-circle" size={20} color="#2563EB" />
          <Text style={styles.tooltipText}>{currentStep?.message}</Text>
        </View>
        <TouchableOpacity style={styles.tooltipSkipBtn} onPress={skipTutorial}>
          <Text style={styles.tooltipSkipText}>Bỏ qua hướng dẫn</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web' ? { position: 'fixed' } : {}),
    zIndex: 999999, // Ensure it's on top of everything
    elevation: 9999,
  },
  mask: {
    position: 'absolute',
    backgroundColor: OVERLAY_COLOR,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
  },
  tooltip: {
    position: 'absolute',
    alignItems: 'center',
    width: '80%',
  },
  tooltipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tooltipText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    lineHeight: 20,
  },
  tooltipSkipBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tooltipSkipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  fallbackContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY_COLOR,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackBox: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 14,
    width: '80%',
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  skipBtn: {
    backgroundColor: '#64748B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  skipText: {
    color: '#FFF',
    fontWeight: '700',
  },
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  completionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 12,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  completionBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  }
});

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { StyleSheet, Animated, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = "success", duration = 3500) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ visible: true, message, type });

    // Animate in
    fadeAnim.setValue(0);
    slideAnim.setValue(-20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    // Auto dismiss
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 250, useNativeDriver: true }),
      ]).start(() => setToast((prev) => ({ ...prev, visible: false })));
    }, duration);
  }, [fadeAnim, slideAnim]);

  const isSuccess = toast.type === "success";
  const isWarning = toast.type === "warning";
  const iconName = isSuccess ? "checkmark-circle" : isWarning ? "warning" : "alert-circle";
  const iconColor = isSuccess ? "#10B981" : isWarning ? "#F59E0B" : "#EF4444";
  const borderColor = isSuccess ? "#10B981" : isWarning ? "#F59E0B" : "#EF4444";

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            { borderLeftColor: borderColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Ionicons name={iconName} size={20} color={iconColor} style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 45,
    left: 20,
    right: 20,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  toastText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});

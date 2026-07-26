import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AvatarPickerModal({ visible, onClose, onTakePhoto, onChooseLibrary }) {
  if (!visible) return null;

  const handleSelect = (action) => {
    onClose();
    setTimeout(() => {
      if (action === "camera") {
        onTakePhoto();
      } else if (action === "library") {
        onChooseLibrary();
      }
    }, 150);
  };

  return (
    <View style={styles.overlayContainer}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Top handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.title}>Đổi ảnh đại diện</Text>
              <Text style={styles.subtitle}>
                Vui lòng chọn phương thức tải ảnh của bạn
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsGroup}>
            {/* Camera Option */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.7}
              onPress={() => handleSelect("camera")}
            >
              <View style={[styles.iconWrapper, styles.cameraIconBg]}>
                <Ionicons name="camera" size={22} color="#2563EB" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Chụp ảnh mới</Text>
                <Text style={styles.optionSub}>
                  Sử dụng máy ảnh để chụp hình trực tiếp
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Gallery Option */}
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.7}
              onPress={() => handleSelect("library")}
            >
              <View style={[styles.iconWrapper, styles.galleryIconBg]}>
                <Ionicons name="image" size={22} color="#16A34A" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Chọn từ thư viện</Text>
                <Text style={styles.optionSub}>
                  Tải ảnh có sẵn từ bộ sưu tập thiết bị
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.8}
            onPress={onClose}
          >
            <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  optionsGroup: {
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cameraIconBg: {
    backgroundColor: "#EFF6FF",
  },
  galleryIconBg: {
    backgroundColor: "#F0FDF4",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  optionSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  cancelBtn: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
});

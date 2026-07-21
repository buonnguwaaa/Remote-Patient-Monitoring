import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { request } from "../api/httpClient";
import { colors, radius, spacing, typography, shadows } from "../theme/rpmTheme";

const OptionGrid = ({ label, options, selectedValue, onSelect, disabled }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.grid}>
      {options.map((opt) => {
        const isSelected = selectedValue === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            disabled={disabled}
            style={[
              styles.gridOption, 
              isSelected && styles.gridOptionSelected,
              disabled && styles.gridOptionDisabled
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[
              styles.gridOptionText, 
              isSelected && styles.gridOptionTextSelected,
              disabled && styles.gridOptionTextDisabled
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

export default function EditProfileModal({ visible, doctor, onClose, onSuccess }) {
  const [formData, setFormData] = useState({});
  const [avatarUri, setAvatarUri] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && doctor) {
      setFormData({
        name: doctor.name || "",
        gender: doctor.gender || "M",
        phone: doctor.phone || "",
        academicDegree: doctor.academicDegree || "",
        academicTitle: doctor.academicTitle || "",
        professionalQualification: doctor.professionalQualification || "",
        specialization: doctor.specialization || "",
        yearsOfExperience: doctor.yearsOfExperience?.toString() || "",
        licenseNumber: doctor.licenseNumber || "",
        workplace: doctor.workplace || "",
      });
      setAvatarUri(null); // Reset pending avatar
    }
  }, [visible, doctor]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Quyền truy cập", "Bạn cần cấp quyền truy cập thư viện ảnh để đổi Avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert("Lỗi", "Vui lòng nhập tên.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData };
      if (payload.yearsOfExperience) {
        payload.yearsOfExperience = parseInt(payload.yearsOfExperience, 10);
      } else {
        payload.yearsOfExperience = 0;
      }

      // Update text data
      const res = await request("/users/doctors/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(res.body?.error || "Cập nhật hồ sơ thất bại");
      }

      // Update avatar if selected
      if (avatarUri) {
        const avatarData = new FormData();
        avatarData.append("file", {
          uri: avatarUri.uri,
          name: avatarUri.fileName || "avatar.jpg",
          type: avatarUri.mimeType || "image/jpeg",
        });

        const avatarRes = await request("/users/doctors/me/avatar", {
          method: "POST",
          body: avatarData,
        });

        if (!avatarRes.ok) {
          throw new Error(avatarRes.body?.error || "Cập nhật ảnh đại diện thất bại");
        }
      }

      Alert.alert("Thành công", "Đã cập nhật hồ sơ cá nhân.");
      onSuccess();
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  };

  if (!doctor) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="checkmark" size={28} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
            <Image
              source={{ uri: avatarUri ? avatarUri.uri : (doctor.avatarUrl || "https://ui-avatars.com/api/?name=BS") }}
              style={styles.avatarImage}
            />
            <View style={styles.avatarOverlay}>
              <Ionicons name="camera" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Nhấn để đổi ảnh đại diện</Text>
        </View>

        {/* Text Fields */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Họ tên <Text style={{color: colors.danger}}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(t) => setFormData({ ...formData, name: t })}
            placeholder="Nhập tên"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(t) => setFormData({ ...formData, phone: t })}
            keyboardType="phone-pad"
            placeholder="Nhập SĐT"
          />
        </View>

        {/* Gender */}
        <OptionGrid
          label="Giới tính"
          selectedValue={formData.gender}
          onSelect={(val) => setFormData({ ...formData, gender: val })}
          options={[
            { label: "Nam", value: "M" },
            { label: "Nữ", value: "F" },
            { label: "Khác", value: "O" },
          ]}
        />

        {/* Academic Degree */}
        <OptionGrid
          label="Học vị"
          selectedValue={formData.academicDegree}
          onSelect={(val) => {
            setFormData({
              ...formData,
              academicDegree: val,
              academicTitle: val !== "phd" ? "" : formData.academicTitle,
            });
          }}
          options={[
            { label: "Không", value: "" },
            { label: "Cử nhân", value: "bachelor" },
            { label: "Thạc sĩ", value: "master" },
            { label: "Tiến sĩ", value: "phd" },
          ]}
        />

        {/* Academic Title */}
        <OptionGrid
          label="Chức danh"
          disabled={formData.academicDegree !== "phd"}
          selectedValue={formData.academicTitle}
          onSelect={(val) => setFormData({ ...formData, academicTitle: val })}
          options={[
            { label: "Không", value: "" },
            { label: "Phó Giáo sư", value: "associate_professor" },
            { label: "Giáo sư", value: "professor" },
          ]}
        />

        {/* Professional Qualification */}
        <OptionGrid
          label="Trình độ chuyên môn"
          selectedValue={formData.professionalQualification}
          onSelect={(val) => setFormData({ ...formData, professionalQualification: val })}
          options={[
            { label: "Không", value: "" },
            { label: "Nội trú", value: "resident" },
            { label: "Chuyên khoa I", value: "cki" },
            { label: "Chuyên khoa II", value: "ckii" },
          ]}
        />

        {/* Specialization */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Chuyên khoa</Text>
          <TextInput
            style={styles.input}
            value={formData.specialization}
            onChangeText={(t) => setFormData({ ...formData, specialization: t })}
            placeholder="Ví dụ: Nội Tổng hợp"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldContainer, { flex: 1, marginRight: spacing.sm }]}>
            <Text style={styles.label}>Kinh nghiệm (năm)</Text>
            <TextInput
              style={styles.input}
              value={formData.yearsOfExperience}
              onChangeText={(t) => setFormData({ ...formData, yearsOfExperience: t })}
              keyboardType="number-pad"
              placeholder="VD: 5"
            />
          </View>
          <View style={[styles.fieldContainer, { flex: 1, marginLeft: spacing.sm }]}>
            <Text style={styles.label}>Số chứng chỉ HN</Text>
            <TextInput
              style={styles.input}
              value={formData.licenseNumber}
              onChangeText={(t) => setFormData({ ...formData, licenseNumber: t })}
              placeholder="VD: DOC-123"
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Nơi công tác</Text>
          <TextInput
            style={styles.input}
            value={formData.workplace}
            onChangeText={(t) => setFormData({ ...formData, workplace: t })}
            placeholder="Bệnh viện / Cơ sở y tế"
          />
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.screenTitle, fontSize: 18 },
  headerBtn: { padding: 4 },
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  avatarSection: { alignItems: "center", marginBottom: spacing.xl, marginTop: spacing.md },
  avatarContainer: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.surfaceSoftBlue,
    alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative",
    borderWidth: 3, borderColor: colors.surface, ...shadows.cardElevated,
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.4)",
    height: 30, alignItems: "center", justifyContent: "center",
  },
  avatarHint: { marginTop: 10, fontSize: 13, color: colors.textMuted },
  
  fieldContainer: { marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center" },
  label: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridOption: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12,
  },
  gridOptionDisabled: { opacity: 0.5, backgroundColor: colors.background },
  gridOptionSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  gridOptionText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  gridOptionTextDisabled: { color: colors.textMuted },
  gridOptionTextSelected: { color: colors.primary, fontWeight: "600" },
});

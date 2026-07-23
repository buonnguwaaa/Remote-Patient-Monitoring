import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import request from "../api/httpClient";
import { colors, radius, spacing, typography, shadows } from "../theme/rpmTheme";
import EditProfileModal from "../components/EditProfileModal";


function formatDate(d) {
  if (!d) return "Chưa cập nhật";
  return new Date(d).toLocaleDateString("vi-VN");
}

function formatGender(g) {
  if (g === "M" || g === "male") return "Nam";
  if (g === "F" || g === "female") return "Nữ";
  return "Khác";
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "Chưa cập nhật"}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const [res, depRes] = await Promise.all([
        request(`/users/doctors/${user.id}`),
        request("/departments").catch(() => null)
      ]);
      if (res.ok) {
        setDoctor(res.body?.data || null);
      } else {
        setError("Không thể tải thông tin hồ sơ");
      }
      if (depRes && depRes.ok) {
        setDepartments(depRes.body?.data || []);
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const onRefresh = () => { setRefreshing(true); loadProfile(); };

  const initials = (doctor?.displayName || doctor?.name || user?.name || "BS")
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const d = doctor || {};
  const departmentName = departments.find(dep => dep.id === d.departmentId)?.name || d.departmentName || d.department?.name;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Avatar card */}
      <View style={styles.avatarCard}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setEditModalVisible(true)}
        >
          <Ionicons name="pencil" size={18} color={colors.primary} />
          <Text style={styles.editBtnText}>Chỉnh sửa</Text>
        </TouchableOpacity>
        
        {d.avatarUrl ? (
          <Image source={{ uri: d.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <Text style={styles.doctorName}>{d.displayName || d.name || user?.name || "Bác sĩ"}</Text>
        {d.specialization ? (
          <View style={styles.specialBadge}>
            <Ionicons name="medkit-outline" size={12} color={colors.primary} />
            <Text style={styles.specialText}>{d.specialization}</Text>
          </View>
        ) : null}
        {d.workplace ? (
          <Text style={styles.workplaceText}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} /> {d.workplace}
          </Text>
        ) : null}
      </View>

      {/* Personal info */}
      <Section title="Thông tin cá nhân">
        <InfoRow icon="person-outline"       label="Giới tính"     value={formatGender(d.gender)} />
        <InfoRow icon="calendar-outline"     label="Ngày sinh"     value={formatDate(d.dob)} />
        <InfoRow icon="mail-outline"         label="Email"         value={d.email || user?.email} />
        <InfoRow icon="call-outline"         label="Số điện thoại" value={d.phone} />
      </Section>

      {/* Work info */}
      <Section title="Thông tin công tác">
        {d.academicDegreeLabel ? <InfoRow icon="school-outline" label="Học vị" value={d.academicDegreeLabel} /> : null}
        {d.professionalQualificationLabel ? <InfoRow icon="medal-outline" label="Trình độ chuyên môn" value={d.professionalQualificationLabel} /> : null}
        {d.academicTitleLabel ? <InfoRow icon="school-outline" label="Chức danh" value={d.academicTitleLabel} /> : null}
        <InfoRow icon="fitness-outline"      label="Chuyên khoa"       value={d.specialization} />
        <InfoRow icon="business-outline"     label="Khoa / Phòng"      value={departmentName} />
        <InfoRow icon="location-outline"     label="Nơi công tác"      value={d.workplace} />
        <InfoRow icon="id-card-outline"      label="Số giấy phép"      value={d.licenseNumber} />
        <InfoRow icon="trophy-outline"       label="Kinh nghiệm"       value={d.yearsOfExperience ? `${d.yearsOfExperience} năm` : null} />
        <InfoRow icon="briefcase-outline"    label="Vai trò"           value="Bác sĩ" />
      </Section>

      {/* Activity History Navigation Row */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TÀI KHOẢN & HOẠT ĐỘNG</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.infoRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate("AccountHistory")}
            activeOpacity={0.7}
          >
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoValue}>Lịch sử hoạt động</Text>
              <Text style={styles.infoLabel}>Xem nhật ký thao tác lâm sàng</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <EditProfileModal
        visible={editModalVisible}
        doctor={doctor}
        onClose={() => setEditModalVisible(false)}
        onSuccess={() => {
          setEditModalVisible(false);
          loadProfile();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: colors.danger, textAlign: "center" },
  retryBtn: { backgroundColor: colors.surfaceSoftBlue, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { fontSize: 14, fontWeight: "600", color: colors.primary },

  avatarCard: {
    backgroundColor: colors.surface, borderRadius: radius["3xl"], padding: spacing["3xl"],
    alignItems: "center", marginBottom: spacing.section, ...shadows.cardElevated, position: "relative",
  },
  editBtn: {
    position: "absolute", top: spacing.lg, right: spacing.lg,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
  },
  editBtnText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  avatarCircle: { width: 80, height: 80, borderRadius: radius["4xl"], backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatarImage: { width: 80, height: 80, borderRadius: radius["4xl"], marginBottom: 14, borderWidth: 2, borderColor: colors.surface },
  avatarText: { fontSize: 28, fontWeight: "800", color: colors.surface },
  doctorName: { ...typography.screenTitle, textAlign: "center" },
  specialBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceSoftBlue, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  specialText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  workplaceText: { fontSize: 12, color: colors.textMuted, marginTop: 6 },

  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, paddingHorizontal: spacing.lg, ...shadows.card },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, gap: 12 },
  infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { ...typography.hint, marginBottom: 2 },
  infoValue: { ...typography.value, fontWeight: "500" },

  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.dangerSoftAlt, borderRadius: radius.lg, paddingVertical: 14, gap: 8, marginTop: 4, marginBottom: 24 },
  logoutText: { fontSize: 15, fontWeight: "700", color: colors.dangerAccent },
});

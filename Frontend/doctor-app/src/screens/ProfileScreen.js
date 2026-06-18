import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import request from "../api/httpClient";

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
        <Ionicons name={icon} size={16} color="#6B7280" />
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
  const { user, logout } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const res = await request(`/users/doctors/${user.id}`);
      if (res.ok) {
        setDoctor(res.body?.data || null);
      } else {
        setError("Không thể tải thông tin hồ sơ");
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

  const initials = (doctor?.name || user?.name || "BS")
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const d = doctor || {};

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
    >
      {/* Avatar card */}
      <View style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.doctorName}>{d.name || user?.name || "Bác sĩ"}</Text>
        {d.specialization ? (
          <View style={styles.specialBadge}>
            <Ionicons name="medkit-outline" size={12} color="#2563EB" />
            <Text style={styles.specialText}>{d.specialization}</Text>
          </View>
        ) : null}
        {d.workplace ? (
          <Text style={styles.workplaceText}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" /> {d.workplace}
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
        <InfoRow icon="fitness-outline"      label="Chuyên khoa"       value={d.specialization} />
        <InfoRow icon="business-outline"     label="Khoa / Phòng"      value={d.departmentName || d.department?.name} />
        <InfoRow icon="location-outline"     label="Nơi công tác"      value={d.workplace} />
        <InfoRow icon="id-card-outline"      label="Số giấy phép"      value={d.licenseNumber} />
        <InfoRow icon="trophy-outline"       label="Kinh nghiệm"       value={d.yearsOfExperience ? `${d.yearsOfExperience} năm` : null} />
        <InfoRow icon="briefcase-outline"    label="Vai trò"           value="Bác sĩ" />
      </Section>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: "#DC2626", textAlign: "center" },
  retryBtn: { backgroundColor: "#EFF6FF", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },

  avatarCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#fff" },
  doctorName: { fontSize: 20, fontWeight: "800", color: "#111827", textAlign: "center" },
  specialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  specialText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
  workplaceText: { fontSize: 12, color: "#9CA3AF", marginTop: 6 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#9CA3AF", marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: "500", color: "#111827" },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
});

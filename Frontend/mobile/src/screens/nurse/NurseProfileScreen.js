import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

// Mock user + Nurse_Info theo schema
const initialUser = {
  id: "u_nurse_1",
  name: "Điều dưỡng Trần Thị B",
  email: "nurse.b@example.com",
  phone: "+84 912 888 999",
};

const initialNurseInfo = {
  id: "ni_1",
  userId: "u_nurse_1",
  licenseNumber: "CHN-2025-00123",
  workplace: "Khoa Nội tổng hợp - Bệnh viện Đa khoa ABC",
  yearsOfExperience: 7,
  status: "active", // "active" | "inactive"
  bio: "Chuyên chăm sóc bệnh nhân nội trú, theo dõi sinh hiệu và phối hợp chặt chẽ với bác sĩ trong quá trình điều trị.",
  profileImageUrl:
    "https://images.pexels.com/photos/3985161/pexels-photo-3985161.jpeg?auto=compress&cs=tinysrgb&w=600",
  createdAt: "2022-05-10T09:00:00Z",
  updatedAt: "2025-11-20T14:20:00Z",
};

function formatDateTime(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} • ${hh}:${mi}`;
}

function getStatusMeta(status) {
  if (status === "active") {
    return {
      label: "Đang hoạt động",
      bg: "#ECFDF3",
      color: "#15803D",
      dot: "#22C55E",
    };
  }
  return {
    label: "Ngừng hoạt động",
    bg: "#FEF2F2",
    color: "#B91C1C",
    dot: "#F97373",
  };
}

export default function NurseProfileScreen() {
  const { logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [notify, setNotify] = useState(true);

  const [userForm, setUserForm] = useState(initialUser);
  const [nurseForm, setNurseForm] = useState(initialNurseInfo);

  const avatarInitial =
    userForm.name && userForm.name.trim().length > 0
      ? userForm.name
        .split(" ")
        .filter((p) => p.length > 0)
        .slice(-2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
      : "N";

  const statusMeta = getStatusMeta(nurseForm.status);

  const handleChangeUser = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangeNurse = (field, value) => {
    setNurseForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEdit = () => {
    if (editMode) {
      setUserForm(initialUser);
      setNurseForm(initialNurseInfo);
      setEditMode(false);
      return;
    }
    setEditMode(true);
  };

  const handleSave = () => {
    // TODO: call API cập nhật hồ sơ điều dưỡng
    console.log("Save nurse profile", { user: userForm, nurse: nurseForm });
    Alert.alert("Đã lưu", "Thông tin điều dưỡng đã được cập nhật (mock).");
    setEditMode(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Hồ sơ điều dưỡng</Text>

          <TouchableOpacity
            style={[styles.editToggleBtn, editMode && styles.editToggleBtnActive]}
            onPress={toggleEdit}
          >
            <Ionicons
              name={editMode ? "close-outline" : "create-outline"}
              size={16}
              color={editMode ? "#B91C1C" : "#2563EB"}
            />
            <Text
              style={[
                styles.editToggleText,
                editMode && styles.editToggleTextActive,
              ]}
            >
              {editMode ? "Hủy" : "Chỉnh sửa"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PROFILE SUMMARY */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrapper}>
              {nurseForm.profileImageUrl ? (
                <Image
                  source={{ uri: nurseForm.profileImageUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{avatarInitial}</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              {editMode ? (
                <>
                  <Text style={styles.fieldLabel}>Họ tên</Text>
                  <TextInput
                    style={styles.inputPrimary}
                    value={userForm.name}
                    onChangeText={(t) => handleChangeUser("name", t)}
                    placeholder="Nhập họ tên điều dưỡng"
                  />
                </>
              ) : (
                <Text style={styles.profileName}>{userForm.name}</Text>
              )}

              <Text style={styles.profileSub}>Mã hồ sơ: {nurseForm.id}</Text>

              <View style={styles.chipRow}>
                <View style={styles.chipPrimary}>
                  <FontAwesome5
                    name="user-nurse"
                    size={13}
                    color="#FFFFFF"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.chipPrimaryText}>Y tá / Điều dưỡng</Text>
                </View>

                <View
                  style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: statusMeta.dot },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusMeta.color },
                    ]}
                  >
                    {statusMeta.label}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* EMAIL + PHONE */}
          <View style={styles.profileBottomRow}>
            <View style={styles.profileInfoItem}>
              <Ionicons name="mail" size={16} color="#6B7280" />
              {editMode ? (
                <TextInput
                  style={styles.inputInline}
                  value={userForm.email}
                  onChangeText={(t) => handleChangeUser("email", t)}
                  placeholder="Nhập email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.profileInfoText}>{userForm.email}</Text>
              )}
            </View>

            <View style={styles.profileInfoItem}>
              <Ionicons name="call" size={16} color="#6B7280" />
              {editMode ? (
                <TextInput
                  style={styles.inputInline}
                  value={userForm.phone}
                  onChangeText={(t) => handleChangeUser("phone", t)}
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.profileInfoText}>{userForm.phone}</Text>
              )}
            </View>
          </View>
        </View>

        {/* LICENSE & WORKPLACE */}
        <Text style={styles.sectionTitle}>Chứng chỉ & nơi làm việc</Text>
        <View style={styles.infoCard}>
          {/* License */}
          <View style={styles.infoRowIcon}>
            <View style={styles.infoIconWrapper}>
              <MaterialIcons name="verified" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Mã chứng chỉ hành nghề</Text>
              {editMode ? (
                <TextInput
                  style={styles.inputPrimary}
                  value={nurseForm.licenseNumber}
                  onChangeText={(t) => handleChangeNurse("licenseNumber", t)}
                  placeholder="Nhập mã chứng chỉ"
                />
              ) : (
                <Text style={styles.infoValue}>{nurseForm.licenseNumber}</Text>
              )}
            </View>
          </View>

          {/* Workplace */}
          <View style={styles.infoDivider} />
          <View style={styles.infoRowIcon}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="business-outline" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Nơi làm việc</Text>
              {editMode ? (
                <TextInput
                  style={styles.inputPrimary}
                  value={nurseForm.workplace}
                  onChangeText={(t) => handleChangeNurse("workplace", t)}
                  placeholder="Nhập nơi làm việc"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {nurseForm.workplace || "Chưa cập nhật"}
                </Text>
              )}
            </View>
          </View>

          {/* Years of experience */}
          <View style={styles.infoDivider} />
          <View style={styles.infoRowIcon}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="time-outline" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Số năm kinh nghiệm</Text>
              {editMode ? (
                <TextInput
                  style={styles.inputPrimary}
                  value={
                    nurseForm.yearsOfExperience !== undefined &&
                      nurseForm.yearsOfExperience !== null
                      ? String(nurseForm.yearsOfExperience)
                      : ""
                  }
                  onChangeText={(t) =>
                    handleChangeNurse(
                      "yearsOfExperience",
                      t.replace(/[^0-9]/g, "") === ""
                        ? 0
                        : Number(t.replace(/[^0-9]/g, ""))
                    )
                  }
                  keyboardType="numeric"
                  placeholder="Nhập số năm kinh nghiệm"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {nurseForm.yearsOfExperience ?? 0} năm
                </Text>
              )}
            </View>
          </View>

          {/* STATUS TOGGLE */}
          <View style={styles.infoDivider} />
          <View style={styles.statusRow}>
            <Text style={styles.infoLabel}>Trạng thái tài khoản</Text>
            {editMode ? (
              <View style={styles.statusToggleGroup}>
                <TouchableOpacity
                  style={[
                    styles.statusToggleBtn,
                    nurseForm.status === "active" &&
                    styles.statusToggleBtnActive,
                  ]}
                  onPress={() => handleChangeNurse("status", "active")}
                >
                  <Text
                    style={[
                      styles.statusToggleText,
                      nurseForm.status === "active" &&
                      styles.statusToggleTextActive,
                    ]}
                  >
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusToggleBtn,
                    nurseForm.status === "inactive" &&
                    styles.statusToggleBtnActiveInactive,
                  ]}
                  onPress={() => handleChangeNurse("status", "inactive")}
                >
                  <Text
                    style={[
                      styles.statusToggleText,
                      nurseForm.status === "inactive" &&
                      styles.statusToggleTextInactive,
                    ]}
                  >
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: statusMeta.dot },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: statusMeta.color },
                  ]}
                >
                  {statusMeta.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* BIO */}
        <Text style={styles.sectionTitle}>Giới thiệu chuyên môn</Text>
        <View style={styles.infoCard}>
          <View style={styles.bioHeaderRow}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="person-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.bioTitle}>Tóm tắt</Text>
          </View>

          {editMode ? (
            <TextInput
              style={styles.textArea}
              value={nurseForm.bio}
              onChangeText={(t) => handleChangeNurse("bio", t)}
              placeholder="Nhập giới thiệu ngắn..."
              multiline
            />
          ) : nurseForm.bio ? (
            <Text style={styles.bioText}>{nurseForm.bio}</Text>
          ) : (
            <Text style={styles.infoHint}>
              Chưa có phần giới thiệu. Hãy bổ sung để bác sĩ và bệnh nhân hiểu
              hơn về chuyên môn của điều dưỡng.
            </Text>
          )}
        </View>

        {/* META */}
        <Text style={styles.sectionTitle}>Hoạt động hồ sơ</Text>
        <View style={styles.metaCard}>
          <View className="meta-row" style={styles.metaRow}>
            <View style={styles.metaIconWrapper}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            </View>
            <View>
              <Text style={styles.metaLabel}>Tạo hồ sơ</Text>
              <Text style={styles.metaText}>
                {formatDateTime(nurseForm.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaRow}>
            <View
              style={[styles.metaIconWrapper, { backgroundColor: "#EEF2FF" }]}
            >
              <Ionicons name="refresh-outline" size={16} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.metaLabel}>Cập nhật gần nhất</Text>
              <Text style={styles.metaText}>
                {formatDateTime(nurseForm.updatedAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* NÚT LƯU */}
        {editMode && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Ionicons
              name="save-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.saveText}>Lưu thay đổi</Text>
          </TouchableOpacity>
        )}

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.footerVersion}>Phiên bản 1.0.0</Text>
        <Text style={styles.footerBrand}>© 2025 Remote Patient Monitoring</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827", flex: 1 },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  editToggleBtnActive: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  editToggleText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    marginLeft: 4,
  },
  editToggleTextActive: {
    color: "#B91C1C",
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
  profileName: { fontSize: 18, fontWeight: "700", color: "#111827" },
  profileSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  chipPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipPrimaryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  profileBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  profileInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
    gap: 6,
  },
  profileInfoText: {
    fontSize: 12,
    color: "#4B5563",
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
    color: "#111827",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  infoRowIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  infoHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusToggleGroup: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    padding: 2,
  },
  statusToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusToggleBtnActive: {
    backgroundColor: "#DCFCE7",
  },
  statusToggleBtnActiveInactive: {
    backgroundColor: "#FEE2E2",
  },
  statusToggleText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  statusToggleTextActive: {
    color: "#166534",
  },
  statusToggleTextInactive: {
    color: "#B91C1C",
  },

  bioHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  bioTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 6,
  },
  bioText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginTop: 4,
  },

  metaCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  metaLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  metaText: {
    fontSize: 13,
    color: "#111827",
    marginTop: 2,
  },
  metaDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },

  footerVersion: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 2,
  },
  footerBrand: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 16,
  },

  // Inputs
  inputPrimary: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  inputInline: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 2,
    fontSize: 12,
    color: "#111827",
  },
  textArea: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 13,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },

  saveBtn: {
    marginTop: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  logoutBtn: {
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  logoutText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 14,
  },
});

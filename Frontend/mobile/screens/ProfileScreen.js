import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";

// Mock user + Patient_Info theo schema
const initialUser = {
  id: "u1",
  name: "Nguyễn Văn A",
  email: "nguyenvana@example.com",
  phone: "+84 912 345 678",
};

const initialPatientInfo = {
  id: "pi_1",
  userId: "u1",
  insuranceNumber: "BA123456789",
  CCCD: "012345678901",
  emergencyContactName: "Nguyễn Văn B",
  emergencyContactPhone: "+84 987 654 321",
  medicalHistory:
    "Tăng huyết áp 5 năm, rối loạn mỡ máu. Đang dùng thuốc hạ áp hàng ngày. Không dị ứng thuốc đã biết.",
  qrImage:
    "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=patient_u1",
  createdAt: "2025-10-01T08:00:00Z",
  updatedAt: "2025-11-20T09:30:00Z",
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

export default function ProfileScreen() {
  const [notify, setNotify] = useState(true);

  const [editMode, setEditMode] = useState(false);

  const [userForm, setUserForm] = useState(initialUser);
  const [patientForm, setPatientForm] = useState(initialPatientInfo);

  const handleChangeUser = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangePatient = (field, value) => {
    setPatientForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleEdit = () => {
    if (editMode) {
      // đang edit -> bấm lần nữa = hủy, reset
      setUserForm(initialUser);
      setPatientForm(initialPatientInfo);
      setEditMode(false);
    } else {
      setEditMode(true);
    }
  };

  const handleSave = () => {
    // Chỗ này sau này thay bằng call API cập nhật
    // Ví dụ: await api.updateProfile(userForm, patientForm)
    // Tạm thời mock:
    console.log("Save profile payload:", {
      user: userForm,
      patientInfo: patientForm,
    });
    Alert.alert("Đã lưu", "Thông tin hồ sơ đã được cập nhật.");
    setEditMode(false);
  };

  const avatarInitial =
    userForm.name && userForm.name.trim().length > 0
      ? userForm.name
          .split(" ")
          .filter((p) => p.length > 0)
          .slice(-2)
          .map((p) => p[0])
          .join("")
          .toUpperCase()
      : "NA";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Hồ sơ bệnh nhân</Text>

          <TouchableOpacity
            style={[styles.editToggleBtn, editMode && styles.editToggleBtnActive]}
            onPress={handleToggleEdit}
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

        {/* PROFILE SUMMARY (user + Patient_Info) */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </View>

            <View style={{ flex: 1 }}>
              {editMode ? (
                <>
                  <Text style={styles.fieldLabel}>Họ tên</Text>
                  <TextInput
                    style={styles.inputPrimary}
                    value={userForm.name}
                    onChangeText={(t) => handleChangeUser("name", t)}
                    placeholder="Nhập họ tên bệnh nhân"
                  />
                </>
              ) : (
                <Text style={styles.profileName}>{userForm.name}</Text>
              )}

              <Text style={styles.profileSub}>Mã hồ sơ: {patientForm.id}</Text>
              <View style={styles.chipRow}>
                <View style={styles.chipPrimary}>
                  <Ionicons
                    name="person-circle-outline"
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.chipPrimaryText}>Bệnh nhân</Text>
                </View>
                <View style={styles.chipOutline}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color="#2563EB"
                  />
                  <Text style={styles.chipOutlineText}>Theo dõi từ xa</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Email + Phone */}
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

        {/* BẢO HIỂM & ĐỊNH DANH (insuranceNumber, CCCD) */}
        <Text style={styles.sectionTitle}>Thông tin bảo hiểm & định danh</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRowIcon}>
            <View style={styles.infoIconWrapper}>
              <MaterialIcons
                name="health-and-safety"
                size={20}
                color="#2563EB"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Số BHYT</Text>
              {editMode ? (
                <TextInput
                  style={styles.inputPrimary}
                  value={patientForm.insuranceNumber}
                  onChangeText={(t) =>
                    handleChangePatient("insuranceNumber", t)
                  }
                  placeholder="Nhập số bảo hiểm y tế"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {patientForm.insuranceNumber}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRowIcon}>
            <View style={styles.infoIconWrapper}>
              <FontAwesome5 name="id-card" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>CCCD</Text>
              {editMode ? (
                <TextInput
                  style={styles.inputPrimary}
                  value={patientForm.CCCD}
                  onChangeText={(t) => handleChangePatient("CCCD", t)}
                  placeholder="Nhập số CCCD"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>{patientForm.CCCD}</Text>
              )}
            </View>
          </View>
        </View>

        {/* LIÊN HỆ KHẨN CẤP (emergencyContactName, emergencyContactPhone) */}
        <Text style={styles.sectionTitle}>Người liên hệ khẩn cấp</Text>
        <View style={styles.infoCard}>
          <View style={styles.emergencyHeader}>
            <View style={styles.emergencyBadge}>
              <Ionicons name="warning-outline" size={14} color="#B91C1C" />
              <Text style={styles.emergencyBadgeText}>Sử dụng khi cấp cứu</Text>
            </View>
          </View>

          <View style={styles.emergencyRow}>
            <View style={styles.emergencyAvatar}>
              <Text style={styles.emergencyAvatarText}>
                {patientForm.emergencyContactName
                  ? patientForm.emergencyContactName.charAt(0)
                  : "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Họ tên</Text>
              {editMode ? (
                <TextInput
                  style={styles.inputPrimary}
                  value={patientForm.emergencyContactName}
                  onChangeText={(t) =>
                    handleChangePatient("emergencyContactName", t)
                  }
                  placeholder="Nhập tên người liên hệ khẩn cấp"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {patientForm.emergencyContactName}
                </Text>
              )}

              <Text style={[styles.infoLabel, { marginTop: 6 }]}>
                Số điện thoại
              </Text>
              {editMode ? (
                <TextInput
                  style={styles.inputPrimary}
                  value={patientForm.emergencyContactPhone}
                  onChangeText={(t) =>
                    handleChangePatient("emergencyContactPhone", t)
                  }
                  placeholder="Nhập số điện thoại khẩn cấp"
                  keyboardType="phone-pad"
                />
              ) : patientForm.emergencyContactPhone ? (
                <View style={styles.phoneRow}>
                  <Ionicons
                    name="call"
                    size={14}
                    color="#16A34A"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.phoneText}>
                    {patientForm.emergencyContactPhone}
                  </Text>
                </View>
              ) : (
                <Text style={styles.infoHint}>
                  Chưa cập nhật số điện thoại khẩn cấp
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* TIỀN SỬ BỆNH (medicalHistory) */}
        <Text style={styles.sectionTitle}>Tiền sử bệnh án</Text>
        <View style={styles.infoCard}>
          <View style={styles.medicalRowHeader}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="document-text-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.medicalTitle}>Tóm tắt</Text>
          </View>

          {editMode ? (
            <TextInput
              style={styles.textArea}
              value={patientForm.medicalHistory}
              onChangeText={(t) => handleChangePatient("medicalHistory", t)}
              placeholder="Nhập tiền sử bệnh án..."
              multiline
            />
          ) : patientForm.medicalHistory ? (
            <Text style={styles.medicalText}>{patientForm.medicalHistory}</Text>
          ) : (
            <Text style={styles.infoHint}>
              Chưa có thông tin tiền sử bệnh án. Vui lòng cập nhật cùng bác sĩ.
            </Text>
          )}
        </View>

        {/* QR CÁ NHÂN (qrImage) */}
        <Text style={styles.sectionTitle}>Mã QR hồ sơ</Text>
        <View style={styles.qrCard}>
          <View style={styles.qrHeaderRow}>
            <View style={styles.qrTitleRow}>
              <Ionicons
                name="qr-code-outline"
                size={18}
                color="#111827"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.qrTitle}>QR cá nhân</Text>
            </View>
            <Text style={styles.qrSubtitle}>Quét để truy cập nhanh hồ sơ</Text>
          </View>

          <View style={styles.qrContentRow}>
            <View style={styles.qrImageWrapper}>
              {patientForm.qrImage ? (
                <Image
                  source={{ uri: patientForm.qrImage }}
                  style={styles.qrImage}
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={40} color="#9CA3AF" />
                  <Text style={styles.qrPlaceholderText}>Chưa có QR</Text>
                </View>
              )}
            </View>

            <View style={styles.qrDescription}>
              <Text style={styles.qrDescText}>
                Bác sĩ và điều dưỡng có thể quét mã này để truy cập vào thông
                tin bệnh nhân.
              </Text>
              <TouchableOpacity style={styles.qrActionBtn}>
                <Text style={styles.qrActionText}>Lưu mã QR về máy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* META createdAt / updatedAt */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons
              name="time-outline"
              size={14}
              color="#9CA3AF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.metaText}>
              Tạo hồ sơ: {formatDateTime(patientForm.createdAt)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name="refresh-outline"
              size={14}
              color="#9CA3AF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.metaText}>
              Cập nhật gần nhất: {formatDateTime(patientForm.updatedAt)}
            </Text>
          </View>
        </View>

        {/* CÀI ĐẶT THÔNG BÁO / BẢO MẬT */}
        <Text style={styles.sectionTitle}>Cài đặt ứng dụng</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Thông báo</Text>
              <Text style={styles.settingSub}>
                Nhận cảnh báo sinh hiệu và nhắc nhở đo
              </Text>
            </View>
            <Switch value={notify} onValueChange={setNotify} />
          </View>

          <TouchableOpacity style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Bảo mật tài khoản</Text>
              <Text style={styles.settingSub}>Đổi mật khẩu đăng nhập</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* NÚT LƯU KHI ĐANG CHỈNH SỬA */}
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
        <TouchableOpacity style={styles.logoutBtn}>
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  profileName: { fontSize: 18, fontWeight: "700", color: "#111827" },
  profileSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
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
    marginLeft: 4,
  },
  chipOutline: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipOutlineText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
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

  emergencyHeader: {
    marginBottom: 10,
  },
  emergencyBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FEF2F2",
  },
  emergencyBadgeText: {
    fontSize: 11,
    color: "#B91C1C",
    marginLeft: 4,
    fontWeight: "600",
  },
  emergencyRow: {
    flexDirection: "row",
    marginTop: 4,
    alignItems: "center",
  },
  emergencyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emergencyAvatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  phoneText: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "600",
  },

  medicalRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  medicalTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 6,
  },
  medicalText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginTop: 4,
  },

  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  qrHeaderRow: {
    marginBottom: 8,
  },
  qrTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  qrSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  qrContentRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  qrImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  qrImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  qrPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  qrPlaceholderText: {
    marginTop: 6,
    fontSize: 12,
    color: "#9CA3AF",
  },
  qrDescription: {
    flex: 1,
    justifyContent: "space-between",
  },
  qrDescText: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
  },
  qrActionBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  qrActionText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  metaRow: {
    marginTop: 4,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  settingSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
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
  fieldLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
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
});

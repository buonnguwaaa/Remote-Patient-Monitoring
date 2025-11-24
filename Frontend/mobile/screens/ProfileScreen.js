import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";

export default function ProfileScreen() {
    const [notify, setNotify] = useState(true);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F6FF" }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

                {/* HEADER */}
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={22} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Hồ sơ</Text>
                </View>

                {/* PROFILE CARD */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>VA</Text>
                        <TouchableOpacity style={styles.editAvatarBtn}>
                            <Ionicons name="pencil" size={14} color="#4A80F0" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.profileName}>Nguyễn Văn A</Text>

                    <TouchableOpacity style={styles.updateBtn}>
                        <Text style={styles.updateBtnText}>Cập nhật hồ sơ</Text>
                    </TouchableOpacity>
                </View>

                {/* PERSONAL INFO */}
                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                <View style={styles.infoCard}>

                    {/* EMAIL */}
                    <View style={styles.infoRow}>
                        <Ionicons name="mail" size={20} color="#4A80F0" />
                        <View>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoValue}>nguyenvana@email.com</Text>
                        </View>
                    </View>

                    {/* PHONE */}
                    <View style={styles.infoRow}>
                        <Ionicons name="call" size={20} color="#4A80F0" />
                        <View>
                            <Text style={styles.infoLabel}>Số điện thoại</Text>
                            <Text style={styles.infoValue}>+84 123 456 789</Text>
                        </View>
                    </View>

                    {/* AGE + GENDER */}
                    <View style={styles.rowBetween}>
                        <View style={styles.smallInfoBox}>
                            <FontAwesome5 name="user" size={18} color="#4A80F0" />
                            <View>
                                <Text style={styles.infoLabel}>Tuổi</Text>
                                <Text style={styles.infoValue}>45</Text>
                            </View>
                        </View>

                        <View style={styles.smallInfoBox}>
                            <MaterialIcons name="male" size={22} color="#4A80F0" />
                            <View>
                                <Text style={styles.infoLabel}>Giới tính</Text>
                                <Text style={styles.infoValue}>Nam</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* SETTINGS */}
                <Text style={styles.sectionTitle}>Cài đặt</Text>
                <View style={styles.settingsCard}>

                    {/* NOTIFICATION */}
                    <View style={styles.settingRow}>
                        <View>
                            <Text style={styles.settingLabel}>Thông báo</Text>
                            <Text style={styles.settingSub}>Nhận thông báo đẩy</Text>
                        </View>
                        <Switch value={notify} onValueChange={setNotify} />
                    </View>

                    {/* SECURITY */}
                    <TouchableOpacity style={styles.settingRow}>
                        <View>
                            <Text style={styles.settingLabel}>Bảo mật</Text>
                            <Text style={styles.settingSub}>Đổi mật khẩu</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#777" />
                    </TouchableOpacity>

                    {/* HELP */}
                    <TouchableOpacity style={styles.settingRow}>
                        <View>
                            <Text style={styles.settingLabel}>Trợ giúp</Text>
                            <Text style={styles.settingSub}>Hướng dẫn sử dụng</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#777" />
                    </TouchableOpacity>
                </View>

                {/* LOGOUT */}
                <TouchableOpacity style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>

                {/* FOOTER */}
                <Text style={styles.footerVersion}>Phiên bản 1.0.0</Text>
                <Text style={styles.footerBrand}>© 2025 Sức khỏe của tôi</Text>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20 },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        backgroundColor: "#fff",
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    headerTitle: { fontSize: 18, fontWeight: "700" },

    profileCard: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 20,
        alignItems: "center",
        marginBottom: 20,
    },

    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#4A80F0",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
        position: "relative",
    },

    avatarText: { color: "#fff", fontSize: 26, fontWeight: "700" },

    editAvatarBtn: {
        position: "absolute",
        bottom: 0,
        right: -2,
        backgroundColor: "#fff",
        padding: 6,
        borderRadius: 20,
        elevation: 2,
    },

    profileName: { fontSize: 18, fontWeight: "700", marginBottom: 12 },

    updateBtn: {
        backgroundColor: "#4A80F0",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },

    updateBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 14,
    },

    sectionTitle: {
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 10,
        marginTop: 10,
        color: "#333",
    },

    infoCard: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 16,
        marginBottom: 20,
    },

    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
    },

    infoLabel: { fontSize: 12, color: "#777" },
    infoValue: { fontSize: 14, fontWeight: "600", color: "#333" },

    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },

    smallInfoBox: {
        width: "48%",
        backgroundColor: "#F8F9FF",
        padding: 12,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    settingsCard: {
        backgroundColor: "#fff",
        borderRadius: 15,
        padding: 16,
        marginBottom: 20,
    },

    settingRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 14,
        alignItems: "center",
        borderBottomWidth: 1,
        borderColor: "#EEE",
    },

    settingLabel: { fontSize: 14, fontWeight: "600" },
    settingSub: { fontSize: 12, color: "#777" },

    logoutBtn: {
        backgroundColor: "#FFF3F3",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 20,
    },

    logoutText: {
        color: "#D63031",
        fontWeight: "700",
        fontSize: 15,
    },

    footerVersion: {
        textAlign: "center",
        color: "#777",
        fontSize: 12,
        marginBottom: 2,
    },

    footerBrand: {
        textAlign: "center",
        color: "#777",
        fontSize: 12,
        marginBottom: 20,
    },
});

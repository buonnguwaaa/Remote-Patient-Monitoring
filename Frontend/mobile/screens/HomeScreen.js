import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

// Mock data bám theo ERD + thêm nhịp thở (respiratoryRate)

const user = {
  id: "u1",
  name: "Nguyễn Văn A",
};

const patientInfo = {
  id: "p1",
  userId: "u1",
  insuranceNumber: "BA12345678",
  emergencyContactName: "Nguyễn Văn B",
  emergencyContactPhone: "0123 456 789",
};

const measurements = [
  {
    id: "m1",
    patientId: "p1",
    type: "bp",
    systolic: 120,
    diastolic: 80,
    pulse: 72, // dùng làm heartRate
    timing: "morning",
    device: "BP_MONITOR_01",
    note: "Đo sau khi nghỉ 5 phút",
    recordedBy: "u1",
    createdAt: "2025-12-12T08:30:00Z",
    updatedAt: "2025-12-12T08:31:00Z",
  },
  {
    id: "m2",
    patientId: "p1",
    type: "glucose",
    glucose: 95,
    timing: "fasting",
    device: "GLUCOSE_METER_01",
    note: "Đo lúc đói",
    recordedBy: "u1",
    createdAt: "2025-12-12T07:00:00Z",
    updatedAt: "2025-12-12T07:01:00Z",
  },
  {
    id: "m3",
    patientId: "p1",
    type: "spo2",
    spo2: 98,
    timing: "rest",
    device: "SPO2_01",
    note: "",
    recordedBy: "u1",
    createdAt: "2025-12-12T09:10:00Z",
    updatedAt: "2025-12-12T09:11:00Z",
  },
  {
    id: "m4",
    patientId: "p1",
    type: "temp",
    temperature: 36.7,
    timing: "evening",
    device: "THERMO_01",
    note: "",
    recordedBy: "u1",
    createdAt: "2025-12-12T18:00:00Z",
    updatedAt: "2025-12-12T18:01:00Z",
  },
  {
    id: "m5",
    patientId: "p1",
    type: "respiratory_rate",
    respiratoryRate: 18,
    timing: "rest",
    device: "RESP_MONITOR_01",
    note: "Thở đều, lúc nghỉ",
    recordedBy: "u1",
    createdAt: "2025-12-12T08:45:00Z",
    updatedAt: "2025-12-12T08:46:00Z",
  },
];

const alerts = [
  {
    id: "a1",
    patientId: "p1",
    doctorId: "d1",
    measurementId: "m1",
    type: "bp",
    rule: "BP > 150",
    observed: "120/80",
    severity: "normal",
    status: "resolved",
    createdAt: "2025-11-24T09:00:00Z",
  },
  {
    id: "a2",
    patientId: "p1",
    doctorId: "d1",
    measurementId: "m2",
    type: "glucose",
    rule: "GLUCOSE > 130",
    observed: "145",
    severity: "high",
    status: "new",
    createdAt: "2025-11-24T03:00:00Z",
  },
];

function formatRelativeTime(iso) {
  const now = new Date();
  const t = new Date(iso);
  const diffMinutes = Math.max(
    1,
    Math.round((now.getTime() - t.getTime()) / (1000 * 60))
  );
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours} giờ trước`;
}

// Lấy measurement mới nhất theo type
function getLatestMeasurement(type) {
  return measurements
    .filter((m) => m.type === type)
    .reduce((latest, m) => {
      if (!latest) return m;
      return new Date(m.createdAt) > new Date(latest.createdAt) ? m : latest;
    }, null);
}

export default function HomeScreen() {
  const latestBp = getLatestMeasurement("bp");
  const latestGlucose = getLatestMeasurement("glucose");
  const latestSpo2 = getLatestMeasurement("spo2");
  const latestTemp = getLatestMeasurement("temp");
  const latestResp = getLatestMeasurement("respiratory_rate");

  // heartRate: lấy trực tiếp từ pulse của bản đo huyết áp gần nhất
  const latestHeartRate = latestBp ? latestBp.pulse : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F2F4FF" }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="heart" size={26} color="#316BFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Trang chủ bệnh nhân</Text>
              <Text style={styles.headerSub}>
                Mã BHYT: {patientInfo.insuranceNumber}
              </Text>
            </View>
          </View>
          <View style={styles.headerBottomRow}>
            <Text style={styles.chipPrimary}>Theo dõi từ xa</Text>
            <Text style={styles.chipLight}>An toàn · Real-time</Text>
          </View>
        </View>

        {/* GREETING */}
        <View style={styles.greetingBox}>
          <Text style={styles.greeting}>Xin chào, {user.name}</Text>
          <Text style={styles.date}>Thứ Hai, 24 tháng 11, 2025</Text>
          <Text style={styles.subInfo}>
            Người liên hệ khẩn cấp: {patientInfo.emergencyContactName} ·{" "}
            {patientInfo.emergencyContactPhone}
          </Text>
        </View>

        {/* TỔNG QUAN SINH HIỆU: bổ sung heartRate + respiratoryRate */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tổng quan sinh hiệu mới nhất</Text>
          <View style={styles.vitalGrid}>
            {/* BP */}
            <View style={styles.vitalCard}>
              <View style={styles.vitalHeader}>
                <Ionicons name="fitness" size={18} color="#316BFF" />
                <Text style={styles.vitalTitle}>Huyết áp</Text>
              </View>
              {latestBp ? (
                <>
                  <Text style={styles.vitalMainValue}>
                    {latestBp.systolic}/{latestBp.diastolic}
                  </Text>
                  <Text style={styles.vitalUnit}>
                    mmHg · {latestBp.pulse} bpm
                  </Text>
                  <Text style={styles.vitalMeta}>
                    {latestBp.timing} · {formatRelativeTime(latestBp.createdAt)}
                  </Text>
                </>
              ) : (
                <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
              )}
            </View>

            {/* Đường huyết */}
            <View style={styles.vitalCard}>
              <View style={styles.vitalHeader}>
                <Ionicons name="water" size={18} color="#2C9F5A" />
                <Text style={styles.vitalTitle}>Đường huyết</Text>
              </View>
              {latestGlucose ? (
                <>
                  <Text style={styles.vitalMainValue}>
                    {latestGlucose.glucose}
                  </Text>
                  <Text style={styles.vitalUnit}>
                    mg/dL · {latestGlucose.timing}
                  </Text>
                  <Text style={styles.vitalMeta}>
                    {formatRelativeTime(latestGlucose.createdAt)}
                  </Text>
                </>
              ) : (
                <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
              )}
            </View>

            {/* SpO2 */}
            <View style={styles.vitalCard}>
              <View style={styles.vitalHeader}>
                <Ionicons name="pulse" size={18} color="#EA4C89" />
                <Text style={styles.vitalTitle}>SpO₂</Text>
              </View>
              {latestSpo2 ? (
                <>
                  <Text style={styles.vitalMainValue}>
                    {latestSpo2.spo2}%
                  </Text>
                  <Text style={styles.vitalUnit}>{latestSpo2.timing}</Text>
                  <Text style={styles.vitalMeta}>
                    {formatRelativeTime(latestSpo2.createdAt)}
                  </Text>
                </>
              ) : (
                <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
              )}
            </View>

            {/* Nhiệt độ */}
            <View style={styles.vitalCard}>
              <View style={styles.vitalHeader}>
                <Ionicons name="thermometer" size={18} color="#FF9933" />
                <Text style={styles.vitalTitle}>Nhiệt độ</Text>
              </View>
              {latestTemp ? (
                <>
                  <Text style={styles.vitalMainValue}>
                    {latestTemp.temperature}
                  </Text>
                  <Text style={styles.vitalUnit}>
                    °C · {latestTemp.timing}
                  </Text>
                  <Text style={styles.vitalMeta}>
                    {formatRelativeTime(latestTemp.createdAt)}
                  </Text>
                </>
              ) : (
                <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
              )}
            </View>

            {/* Nhịp tim (Heart rate) – lấy từ pulse của huyết áp */}
            <View style={styles.vitalCard}>
              <View style={styles.vitalHeader}>
                <Ionicons name="heart-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.vitalTitle}>Nhịp tim</Text>
              </View>
              {latestHeartRate != null ? (
                <>
                  <Text style={styles.vitalMainValue}>{latestHeartRate}</Text>
                  <Text style={styles.vitalUnit}>bpm</Text>
                  <Text style={styles.vitalMeta}>
                    {formatRelativeTime(latestBp.createdAt)}
                  </Text>
                </>
              ) : (
                <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
              )}
            </View>

            {/* Nhịp thở (Respiratory rate) */}
            <View style={styles.vitalCard}>
              <View style={styles.vitalHeader}>
                <MaterialIcons name="air" size={20} color="#10B981" />
                <Text style={styles.vitalTitle}>Nhịp thở</Text>
              </View>
              {latestResp ? (
                <>
                  <Text style={styles.vitalMainValue}>
                    {latestResp.respiratoryRate}
                  </Text>
                  <Text style={styles.vitalUnit}>lần/phút</Text>
                  <Text style={styles.vitalMeta}>
                    {formatRelativeTime(latestResp.createdAt)}
                  </Text>
                </>
              ) : (
                <Text style={styles.vitalEmpty}>Chưa có dữ liệu</Text>
              )}
            </View>
          </View>
        </View>

        {/* RECENT ALERTS */}
        <Text style={styles.sectionTitle}>Cảnh báo gần đây</Text>

        {alerts.map((alert) => {
          const isHigh = alert.severity === "high";

          const typeLabel =
            alert.type === "bp"
              ? "Huyết áp"
              : alert.type === "glucose"
              ? "Đường huyết"
              : "Sinh hiệu";

          const severityText =
            alert.severity === "normal"
              ? "Bình thường"
              : alert.severity === "high"
              ? "Cao"
              : alert.severity;

          const statusText =
            alert.status === "new"
              ? "Mới"
              : alert.status === "resolved"
              ? "Đã xử lý"
              : alert.status;

          return (
            <View
              key={alert.id}
              style={[
                styles.warningItem,
                isHigh && styles.warningItemHigh,
              ]}
            >
              <View style={styles.alertHeaderRow}>
                <View style={styles.alertTitleWrapper}>
                  <Ionicons
                    name={
                      alert.type === "glucose"
                        ? "water"
                        : alert.type === "bp"
                        ? "fitness"
                        : "pulse"
                    }
                    size={18}
                    color={isHigh ? "#D63031" : "#1A8F4A"}
                  />
                  <Text style={styles.warnLabel}>
                    {typeLabel} · {alert.observed}
                  </Text>
                </View>

                <View
                  style={
                    isHigh
                      ? styles.alertStatusPillHigh
                      : styles.alertStatusPillNormal
                  }
                >
                  <Text
                    style={
                      isHigh
                        ? styles.alertStatusTextHigh
                        : styles.alertStatusTextNormal
                    }
                  >
                    {severityText}
                  </Text>
                </View>
              </View>

              <View style={styles.alertRuleRow}>
                <Text style={styles.alertRuleText}>
                  Quy tắc: {alert.rule}
                </Text>
                <Text style={styles.alertRuleText}>{statusText}</Text>
              </View>

              <View style={styles.alertTimeRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color="#9CA3AF"
                />
                <Text style={styles.alertTimeText}>
                  {formatRelativeTime(alert.createdAt)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, },

  headerCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  headerIcon: {
    width: 52,
    height: 52,
    backgroundColor: "#E5EDFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontWeight: "700", fontSize: 18, color: "#121826" },
  headerSub: { marginTop: 4, color: "#7A8194", fontSize: 12 },

  headerBottomRow: {
    flexDirection: "row",
    gap: 8,
  },
  chipPrimary: {
    backgroundColor: "#316BFF",
    color: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    overflow: "hidden",
  },
  chipLight: {
    backgroundColor: "#EEF2FF",
    color: "#4C5A7D",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    overflow: "hidden",
  },

  greetingBox: { marginBottom: 20 },
  greeting: { fontSize: 18, fontWeight: "600", color: "#121826" },
  date: { color: "#7A8194", marginTop: 4, fontSize: 13 },
  subInfo: { color: "#4C5A7D", marginTop: 6, fontSize: 12 },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 15,
    color: "#1A2740",
  },

  vitalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  vitalCard: {
    width: "48%",
    backgroundColor: "#F6F7FF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  vitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  vitalTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2740",
  },
  vitalMainValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  vitalUnit: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  vitalMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  vitalEmpty: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  historyBtn: {
    backgroundColor: "#F3F7FF",
    padding: 12,
    borderRadius: 12,
    width: "48%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    alignItems: "center",
  },

  historyText: {
    textAlign: "center",
    color: "#376AED",
    fontWeight: "600",
    fontSize: 13,
  },

  alertBtn: {
    backgroundColor: "#FFF0F0",
    padding: 12,
    borderRadius: 12,
    width: "48%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    alignItems: "center",
  },

  alertText: {
    textAlign: "center",
    color: "#D63031",
    fontWeight: "600",
    fontSize: 13,
  },

  sectionTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginVertical: 20,
    color: "#1A2740",
  },

  warningItem: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  warningItemHigh: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FFF5F5",
  },

  alertHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  alertTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  warnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
  },

  alertStatusPillNormal: {
    backgroundColor: "#E4FFE9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  alertStatusPillHigh: {
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  alertStatusTextNormal: {
    color: "#1A8F4A",
    fontWeight: "700",
    fontSize: 11,
  },
  alertStatusTextHigh: {
    color: "#D63031",
    fontWeight: "700",
    fontSize: 11,
  },

  alertRuleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  alertRuleText: {
    fontSize: 11,
    color: "#6B7280",
    flexShrink: 1,
  },

  alertTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  alertTimeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";

const currentPatient = {
  _id: "u_patient_1",
  role: "patient",
  name: "Nguyễn Văn A",
  emailLower: "a@example.com",
};

const doctorUser = {
  _id: "u_doctor_1",
  role: "doctor",
  name: "BS. Trần Văn B",
  emailLower: "bsb@example.com",
  specialty: "Tim mạch",
};

const measurementsById = {
  m_bp_1: {
    _id: "m_bp_1",
    patientId: "u_patient_1",
    type: "bp",
    systolic: 150,
    diastolic: 92,
    pulse: 88,
    timing: "pre",
    device: "BP_MONITOR_01",
    recordedBy: "u_nurse_1",
    note: "Đo lúc bệnh nhân ngồi, chưa nghỉ ngơi đầy đủ",
    createdAt: "2025-11-24T08:30:00Z",
  },
  m_glu_1: {
    _id: "m_glu_1",
    patientId: "u_patient_1",
    type: "glucose",
    glucose: 145,
    timing: "post",
    device: "GLUCOSE_METER_01",
    recordedBy: "u_nurse_1",
    note: "Đo sau ăn 2 giờ",
    createdAt: "2025-11-24T07:10:00Z",
  },
  m_spo2_1: {
    _id: "m_spo2_1",
    patientId: "u_patient_1",
    type: "spo2",
    spo2: 96,
    device: "SPO2_FINGER_01",
    recordedBy: "u_nurse_1",
    createdAt: "2025-11-24T09:00:00Z",
  },
};

const chat = {
  _id: "chat_1",
  doctorId: doctorUser._id,
  patientId: currentPatient._id,
  updatedAt: "2025-11-24T09:20:00Z",
};

const initialMessages = [
  {
    _id: "msg1",
    chatId: chat._id,
    senderId: doctorUser._id,
    message:
      "Chào anh, huyết áp sáng nay hơi cao. Anh chú ý nghỉ ngơi, hạn chế muối và đo lại sau 30 phút.",
    measurementId: "m_bp_1",
    createdAt: "2025-11-24T08:40:00Z",
  },
  {
    _id: "msg2",
    chatId: chat._id,
    senderId: currentPatient._id,
    message: "Dạ vâng, tôi đã hiểu.",
    measurementId: null,
    createdAt: "2025-11-24T08:42:00Z",
  },
  {
    _id: "msg3",
    chatId: chat._id,
    senderId: doctorUser._id,
    message:
      "Kết quả đường huyết sau ăn của anh đang ở mức cao nhẹ. Anh cố gắng giảm đồ ngọt, tinh bột tinh chế.",
    measurementId: "m_glu_1",
    createdAt: "2025-11-24T08:55:00Z",
  },
  {
    _id: "msg4",
    chatId: chat._id,
    senderId: doctorUser._id,
    message:
      "SpO₂ của anh vẫn trong giới hạn an toàn. Anh cứ tiếp tục vận động nhẹ nhàng, tránh nằm lâu một chỗ.",
    measurementId: "m_spo2_1",
    createdAt: "2025-11-24T09:05:00Z",
  },
];

const QUICK_REPLIES = [
  "Đã xem",
  "Đã hiểu",
  "Cảm ơn bác sĩ",
  "Tôi sẽ thực hiện theo hướng dẫn",
];

function formatTime(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatRelativeDay(iso) {
  return "Hôm nay";
}

function renderMeasurementSummary(measurement) {
  if (!measurement) return null;
  const type = measurement.type;

  if (type === "bp") {
    return {
      label: "Huyết áp",
      main: `${measurement.systolic}/${measurement.diastolic} mmHg`,
      sub: `${measurement.pulse} bpm · ${
        measurement.timing === "pre" ? "Trước ăn" : "Sau ăn"
      }`,
      icon: (
        <Ionicons
          name="heart-outline"
          size={18}
          color="#EF4444"
          style={{ marginRight: 8 }}
        />
      ),
      accentColor: "#F97316",
    };
  }

  if (type === "glucose") {
    return {
      label: "Đường huyết",
      main: `${measurement.glucose} mg/dL`,
      sub:
        measurement.timing === "pre"
          ? "Đo trước ăn"
          : measurement.timing === "post"
          ? "Đo sau ăn"
          : "Đo đường huyết",
      icon: (
        <Ionicons
          name="water-outline"
          size={18}
          color="#2563EB"
          style={{ marginRight: 8 }}
        />
      ),
      accentColor: "#2563EB",
    };
  }

  if (type === "spo2") {
    return {
      label: "SpO₂",
      main: `${measurement.spo2}%`,
      sub: "Độ bão hòa oxy máu ngoại vi",
      icon: (
        <Ionicons
          name="pulse-outline"
          size={18}
          color="#10B981"
          style={{ marginRight: 8 }}
        />
      ),
      accentColor: "#10B981",
    };
  }

  if (type === "temp") {
    return {
      label: "Nhiệt độ",
      main: `${measurement.temperature} °C`,
      sub: "Nhiệt độ cơ thể",
      icon: (
        <MaterialIcons
          name="device-thermostat"
          size={18}
          color="#F97316"
          style={{ marginRight: 8 }}
        />
      ),
      accentColor: "#F97316",
    };
  }

  return null;
}

// ===== SCREEN =====

export default function DoctorChatScreen() {
  const [messages, setMessages] = useState(initialMessages);

  const handleQuickReply = (text) => {
    const newMsg = {
      _id: `local_${Date.now()}`,
      chatId: chat._id,
      senderId: currentPatient._id,
      message: text,
      measurementId: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
  };

  const renderMessageBubble = (msg) => {
    const isDoctor = msg.senderId === doctorUser._id;
    const measurement =
      msg.measurementId && measurementsById[msg.measurementId]
        ? measurementsById[msg.measurementId]
        : null;

    const summary = measurement ? renderMeasurementSummary(measurement) : null;

    return (
      <View
        key={msg._id}
        style={[
          styles.messageWrapper,
          isDoctor ? { alignItems: "flex-start" } : { alignItems: "flex-end" },
        ]}
      >
        <View
          style={[
            styles.messageRow,
            isDoctor && { flexDirection: "row" },
            !isDoctor && { flexDirection: "row-reverse" },
          ]}
        >
          {/* Avatar */}
          <View
            style={[
              styles.avatarSmall,
              isDoctor ? styles.avatarDoctor : styles.avatarPatient,
            ]}
          >
            {isDoctor ? (
              <FontAwesome5 name="user-md" size={14} color="#FFFFFF" />
            ) : (
              <Ionicons name="person-outline" size={16} color="#2563EB" />
            )}
          </View>

          {/* Bubble */}
          <View
            style={[
              styles.bubble,
              isDoctor ? styles.bubbleDoctor : styles.bubblePatient,
            ]}
          >
            {isDoctor && (
              <View style={styles.senderRow}>
                <Text style={styles.senderNameSmall}>{doctorUser.name}</Text>
                <View style={styles.senderRoleBadge}>
                  <Text style={styles.senderRoleText}>Bác sĩ</Text>
                </View>
              </View>
            )}

            <Text
              style={[
                styles.messageText,
                !isDoctor && styles.messageTextPatient,
              ]}
            >
              {msg.message}
            </Text>

            {summary && (
              <View style={styles.measureCard}>
                <View style={styles.measureHeader}>
                  {summary.icon}
                  <View>
                    <Text style={styles.measureLabel}>{summary.label}</Text>
                    <Text
                      style={[
                        styles.measureChip,
                        { borderColor: summary.accentColor },
                      ]}
                    >
                      ID đo: {measurement._id}
                    </Text>
                  </View>
                </View>
                <Text style={styles.measureMain}>{summary.main}</Text>
                <Text style={styles.measureSub}>{summary.sub}</Text>

                <View style={styles.measureMetaRow}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color="#9CA3AF"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.measureMeta}>
                    {formatTime(measurement.createdAt)}
                  </Text>
                </View>
              </View>
            )}

            <Text
              style={[
                styles.timeText,
                isDoctor ? styles.timeTextDoctor : styles.timeTextPatient,
              ]}
            >
              {formatTime(msg.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F172A" }}>
      <View style={styles.root}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.headerCenter}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerTitle}>{doctorUser.name}</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>Bác sĩ</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>Chuyên khoa {doctorUser.specialty}</Text>
          </View>

          <View style={styles.headerStatus}>
            <View style={styles.headerDot} />
            <Text style={styles.headerStatusText}>Trực tuyến</Text>
          </View>
        </View>

        <View style={styles.chatCard}>
          <View style={styles.dayBadgeWrapper}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>
                {formatRelativeDay(chat.updatedAt)}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.chatContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90 }}
          >
            {messages.map(renderMessageBubble)}
          </ScrollView>
        </View>

        <View style={styles.quickBarWrapper}>
          <View style={styles.quickBarHeader}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#6B7280"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.quickBarTitle}>
              Phản hồi nhanh của bệnh nhân
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {QUICK_REPLIES.map((text) => (
              <TouchableOpacity
                key={text}
                style={styles.quickChip}
                onPress={() => handleQuickReply(text)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F172A",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 6,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.6)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerCenter: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F9FAFB",
    marginRight: 8,
  },
  headerBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#38BDF8",
    backgroundColor: "rgba(56,189,248,0.12)",
  },
  headerBadgeText: {
    fontSize: 11,
    color: "#E0F2FE",
    fontWeight: "600",
  },
  headerSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  headerStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(22,163,74,0.15)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.5)",
    marginLeft: 6,
  },
  headerDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#22C55E",
    marginRight: 4,
  },
  headerStatusText: {
    fontSize: 11,
    color: "#BBF7D0",
    fontWeight: "600",
  },

  // Chat card
  chatCard: {
    flex: 1,
    backgroundColor: "#F3F4FF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 0,
    marginTop: 10,
  },

  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Day badge
  dayBadgeWrapper: {
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  dayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  dayBadgeText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
  },

  // Message
  messageWrapper: {
    marginVertical: 4,
    paddingHorizontal: 10,
  },
  messageRow: {
    alignItems: "flex-end",
    flexShrink: 1,
  },

  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarDoctor: {
    backgroundColor: "#2563EB",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  avatarPatient: {
    backgroundColor: "#E0ECFF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  bubbleDoctor: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bubblePatient: {
    backgroundColor: "#2563EB",
    borderTopRightRadius: 4,
  },

  senderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  senderNameSmall: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
    marginRight: 6,
  },
  senderRoleBadge: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#EFF6FF",
  },
  senderRoleText: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "600",
  },

  messageText: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 18,
  },
  messageTextPatient: {
    color: "#EEF2FF",
  },

  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  timeTextDoctor: {
    color: "#9CA3AF",
    alignSelf: "flex-end",
  },
  timeTextPatient: {
    color: "rgba(226,232,240,0.9)",
    alignSelf: "flex-end",
  },

  // Measurement card
  measureCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  measureHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  measureLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  measureChip: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    color: "#6B7280",
  },
  measureMain: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 6,
  },
  measureSub: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  measureMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  measureMeta: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  // Quick reply bar
  quickBarWrapper: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  quickBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  quickBarTitle: {
    fontSize: 11,
    color: "#6B7280",
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  quickChipText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
});

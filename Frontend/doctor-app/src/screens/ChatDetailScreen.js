import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation, useRoute, useIsFocused } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";
import {
  getPatientById,
  getAlertById,
  getAlerts,
} from "../api/patientApi";
import {
  getConversationMessages,
  ensureConversation,
  buildConversationSocketUrl,
} from "../api/chatApi";

const QUICK_REPLIES = [
  "Bác tiếp tục theo dõi thêm 24 giờ nhé.",
  "Bác nhớ uống thuốc đúng giờ và đo lại giúp tôi.",
  "Nếu còn khó chịu, bác liên hệ lại ngay để tôi kiểm tra thêm.",
  "Chỉ số của bác đang ổn định, tiếp tục phát huy nhé.",
];

const MESSAGE_MENU_WIDTH = 188;
const MESSAGE_MENU_HEIGHT = 116;

function normalizeMessage(message) {
  return {
    id: message.id || message._id,
    conversationId: message.conversationId || message.chatId,
    senderId: message.senderId,
    messageSource: message.messageSource || null,
    content: message.content || message.message || "",
    replyToMessageId: message.replyToMessageId || null,
    relatedAlertId: message.relatedAlertId || null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt || message.createdAt,
  };
}

function sortMessages(messages) {
  return [...messages].sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function mergeMessages(current, incoming) {
  const next = [...current];

  incoming.forEach((message) => {
    const existingIndex = next.findIndex((item) => item.id === message.id);
    if (existingIndex >= 0) {
      next[existingIndex] = message;
      return;
    }
    next.push(message);
  });

  return sortMessages(next);
}

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(iso) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Hôm nay";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Hôm qua";
  }
  return date.toLocaleDateString("vi-VN");
}

function parseSocketPayload(raw) {
  return String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function parseAlertLinkedMessage(content, relatedAlertId) {
  if (!relatedAlertId) {
    return null;
  }

  const segments = String(content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return {
      hasStructuredAlertSummary: false,
      alertSummary: "",
      note: "",
      shortAlertId: String(relatedAlertId).slice(-8),
    };
  }

  const alertPrefix = "Cảnh báo chỉ số:";
  const firstLine = segments[0];

  if (firstLine.startsWith(alertPrefix)) {
    return {
      hasStructuredAlertSummary: true,
      alertSummary: firstLine.slice(alertPrefix.length).trim(),
      note: segments.slice(1).join("\n").trim(),
      shortAlertId: String(relatedAlertId).slice(-8),
    };
  }

  return {
    hasStructuredAlertSummary: true,
    alertSummary: segments.join("\n").trim(),
    note: "",
    shortAlertId: String(relatedAlertId).slice(-8),
  };
}

function getReplyPreviewContent(message) {
  const alertMessage = parseAlertLinkedMessage(message?.content, message?.relatedAlertId);
  if (alertMessage?.hasStructuredAlertSummary && alertMessage.alertSummary) {
    return `Cảnh báo chỉ số: ${alertMessage.alertSummary}`;
  }

  const normalized = String(message?.content || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Tin nhắn không có nội dung";
  }
  return normalized.length > 100 ? `${normalized.slice(0, 97)}...` : normalized;
}

function getViolationLabel(type) {
  const labels = {
    temperature: "Nhiệt độ",
    heart_rate: "Nhịp tim",
    respiratory_rate: "Nhịp thở",
    spo2: "SpO2",
    blood_pressure_systolic: "Huyết áp tâm thu",
    blood_pressure_diastolic: "Huyết áp tâm trương",
    glucose: "Đường huyết",
  };
  return labels[type] || type;
}

function getUnit(type) {
  const units = {
    temperature: "°C",
    heart_rate: "bpm",
    respiratory_rate: "nhịp/phút",
    spo2: "%",
    blood_pressure_systolic: "mmHg",
    blood_pressure_diastolic: "mmHg",
    glucose: "mmol/L",
  };
  return units[type] || "";
}

export default function ChatDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;
  const insets = useSafeAreaInsets();

  const { patientId, conversationId: routeConversationId } = route.params || {};

  const [patient, setPatient] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketState, setSocketState] = useState("idle");
  const [replyTarget, setReplyTarget] = useState(null);
  const [messageMenu, setMessageMenu] = useState(null);
  const [showPatientInfo, setShowPatientInfo] = useState(false);

  // Active Alert context state
  const [activeAlertId, setActiveAlertId] = useState(route.params?.alertId || null);
  const [alertContext, setAlertContext] = useState(null);
  const [loadingAlertContext, setLoadingAlertContext] = useState(false);

  const socketRef = useRef(null);
  const scrollViewRef = useRef(null);
  const lastDeliveredSentRef = useRef(null);
  const lastReadSentRef = useRef(null);
  const [alertsCache, setAlertsCache] = useState({});

  // 1. Fetch Patient details
  useEffect(() => {
    if (!patientId) {
      setLoadingPatient(false);
      return;
    }

    const fetchPatient = async () => {
      setLoadingPatient(true);
      try {
        const res = await getPatientById(patientId);
        if (res.ok) {
          setPatient(res.body?.data || null);
        }
      } catch (err) {
        console.error("Failed to fetch patient details:", err);
      } finally {
        setLoadingPatient(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  // 2. Fetch or create Conversation and load messages
  const loadChat = async ({ silent = false } = {}) => {
    if (!patientId) {
      setLoading(false);
      setError("Không tìm thấy thông tin bệnh nhân.");
      return;
    }

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      // Ensure conversation exists
      const convRes = await ensureConversation(patientId);
      if (!convRes.ok) {
        throw new Error(convRes.body?.error || "Không thể khởi tạo cuộc trò chuyện.");
      }

      const conv = convRes.body?.data || {};
      setConversation({
        id: conv.id,
        participants: (conv.participants || []).map((p) => ({
          userId: p.userId,
          lastReadMessageId: p.lastReadMessageId || null,
          lastDeliveredMessageId: p.lastDeliveredMessageId || null,
        })),
        participantIds: (conv.participants || []).map((p) => p.userId),
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt || conv.createdAt,
      });

      // Load conversation messages
      const msgRes = await getConversationMessages(conv.id, 100);
      if (!msgRes.ok) {
        throw new Error(msgRes.body?.error || "Không thể tải tin nhắn.");
      }

      const loadedMessages = (msgRes.body?.data?.messages || []).map(normalizeMessage);
      setMessages(sortMessages(loadedMessages));
    } catch (loadError) {
      setError(loadError?.message || "Đã xảy ra lỗi.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadChat();
    }
  }, [patientId, isFocused]);

  // 3. Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages]);

  // 4. Batch pre-fetch alert info for system messages
  useEffect(() => {
    const systemAlertIds = [
      ...new Set(
        messages
          .filter((m) => m.messageSource === "system" && m.relatedAlertId)
          .map((m) => m.relatedAlertId)
      ),
    ];

    const missing = systemAlertIds.filter((id) => !alertsCache[id]);
    if (missing.length === 0) return;

    Promise.allSettled(missing.map((id) => getAlertById(id))).then((results) => {
      const next = {};
      results.forEach((result, i) => {
        if (result.status === "fulfilled" && result.value?.ok) {
          next[missing[i]] = result.value.body?.data || null;
        }
      });
      if (Object.keys(next).length > 0) {
        setAlertsCache((prev) => ({ ...prev, ...next }));
      }
    });
  }, [messages]);

  // 5. Connect to WebSocket
  useEffect(() => {
    if (!isFocused || !conversation?.id) {
      return undefined;
    }

    setSocketState("connecting");
    const socket = new WebSocket(buildConversationSocketUrl(conversation.id));
    socketRef.current = socket;

    socket.onopen = () => {
      setSocketState("open");
      setError(null);
    };

    socket.onmessage = (event) => {
      const payloads = parseSocketPayload(event.data);

      payloads.forEach((payload) => {
        if (payload?.type === "error") {
          setError(payload.error || "Có lỗi xảy ra khi truyền tin nhắn.");
          return;
        }

        if (payload?.type === "NEW_MESSAGE" && payload?.data) {
          setMessages((current) => mergeMessages(current, [normalizeMessage(payload.data)]));
          return;
        }

        if (payload?.type === "DELIVERED" && payload?.data?.userId && payload?.data?.messageId) {
          setConversation((current) => {
            if (!current) return current;
            return {
              ...current,
              participants: current.participants.map((p) =>
                p.userId === payload.data.userId
                  ? { ...p, lastDeliveredMessageId: payload.data.messageId }
                  : p
              ),
            };
          });
          return;
        }

        if (payload?.type === "READ" && payload?.data?.userId && payload?.data?.lastReadMessageId) {
          setConversation((current) => {
            if (!current) return current;
            return {
              ...current,
              participants: current.participants.map((p) =>
                p.userId === payload.data.userId
                  ? {
                      ...p,
                      lastDeliveredMessageId: payload.data.lastReadMessageId,
                      lastReadMessageId: payload.data.lastReadMessageId,
                    }
                  : p
              ),
            };
          });
          return;
        }

        if (payload && typeof payload === "object" && (payload.id || payload._id) && payload.content) {
          // Direct message object fallback
          setMessages((current) => mergeMessages(current, [normalizeMessage(payload)]));
        }
      });
    };

    socket.onerror = () => {
      setError("Kết nối thời gian thực đang lỗi. Hãy mở lại màn hình.");
    };

    socket.onclose = () => {
      setSocketState("closed");
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [conversation?.id, isFocused]);

  // 6. Handle sending READ & DELIVERED acknowledgements
  useEffect(() => {
    if (
      !isFocused ||
      !conversation?.id ||
      socketState !== "open" ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    // Find the latest incoming message from patient/system
    let latestIncomingMessage = null;
    for (let index = messages.length - 1; index >= 0; index--) {
      if (messages[index].senderId !== currentUserId) {
        latestIncomingMessage = messages[index];
        break;
      }
    }

    if (!latestIncomingMessage?.id) return;

    if (lastDeliveredSentRef.current !== latestIncomingMessage.id) {
      socketRef.current.send(
        JSON.stringify({
          type: "DELIVERED",
          data: { messageId: latestIncomingMessage.id },
        })
      );
      lastDeliveredSentRef.current = latestIncomingMessage.id;
    }

    if (lastReadSentRef.current !== latestIncomingMessage.id) {
      socketRef.current.send(
        JSON.stringify({
          type: "READ",
          data: { lastReadMessageId: latestIncomingMessage.id },
        })
      );
      lastReadSentRef.current = latestIncomingMessage.id;
    }
  }, [conversation?.id, currentUserId, isFocused, messages, socketState]);

  // 7. Load Active Alert context details
  useEffect(() => {
    if (!activeAlertId) {
      setAlertContext(null);
      setLoadingAlertContext(false);
      return;
    }

    const fetchAlertContext = async () => {
      setLoadingAlertContext(true);
      try {
        const res = await getAlertById(activeAlertId);
        if (res.ok) {
          setAlertContext(res.body?.data || null);
        }
      } catch (err) {
        console.error("Failed to load active alert context:", err);
      } finally {
        setLoadingAlertContext(false);
      }
    };

    fetchAlertContext();
  }, [activeAlertId]);

  const otherParticipantState = useMemo(() => {
    if (!conversation?.participants || !currentUserId) return null;
    return conversation.participants.find((p) => p.userId !== currentUserId) || null;
  }, [conversation?.participants, currentUserId]);

  const messageItems = useMemo(() => {
    const items = [];
    let lastLabel = "";

    messages.forEach((message) => {
      const label = formatDayLabel(message.createdAt);
      if (label !== lastLabel) {
        items.push({ type: "day", key: `day-${message.id}`, label });
        lastLabel = label;
      }
      items.push({ type: "message", key: message.id, message });
    });

    return items;
  }, [messages]);

  const messageLookup = useMemo(() => {
    return new Map(messages.map((m) => [m.id, m]));
  }, [messages]);

  const messageOrder = useMemo(() => {
    return new Map(messages.map((m, idx) => [m.id, idx]));
  }, [messages]);

  const handleSelectQuickReply = (text) => {
    setDraft(text);
    setError(null);
  };

  const handleSend = (nextContent = draft) => {
    const content = String(nextContent || "").trim();
    if (!content) return;

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("Hệ thống chưa kết nối thời gian thực, không thể gửi.");
      return;
    }

    const payload = { content };
    if (replyTarget?.id) {
      payload.replyToMessageId = replyTarget.id;
    }
    if (activeAlertId) {
      payload.relatedAlertId = activeAlertId;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "SEND_MESSAGE",
        data: payload,
      })
    );

    setDraft("");
    setReplyTarget(null);
    setError(null);
  };

  const handleReplyFromMessage = (message) => {
    setReplyTarget(message);
    setMessageMenu(null);
  };

  const handleOpenMessageMenu = (event, message, isMe) => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
    const { pageX, pageY, locationX, locationY } = event.nativeEvent;
    const bubbleLeft = pageX - locationX;
    const bubbleRight = pageX + (locationX || 0);

    const left = isMe
      ? Math.max(12, Math.min(bubbleRight - MESSAGE_MENU_WIDTH, screenWidth - MESSAGE_MENU_WIDTH - 12))
      : Math.max(12, Math.min(bubbleLeft, screenWidth - MESSAGE_MENU_WIDTH - 12));

    const top = Math.max(12, Math.min(pageY + 42, screenHeight - MESSAGE_MENU_HEIGHT - 24));

    setMessageMenu({
      message,
      left,
      top,
    });
  };

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading && !messages.length) {
    return (
      <SafeAreaView style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang tải cuộc trò chuyện…</Text>
      </SafeAreaView>
    );
  }

  const isConnected = socketState === "open";
  const displayPatientName = patient?.name || route.params?.patientName || "Bệnh nhân";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* Custom Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={24} color="#1F2937" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerCenter}
            onPress={() => setShowPatientInfo(!showPatientInfo)}
            activeOpacity={0.8}
          >
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {displayPatientName}
              </Text>
              <Ionicons
                name={showPatientInfo ? "chevron-up" : "chevron-down"}
                size={14}
                color="#6B7280"
                style={{ marginLeft: 4 }}
              />
            </View>
            <Text style={styles.headerSub}>
              {isConnected ? "Đã kết nối" : "Đang kết nối..."}
            </Text>
          </TouchableOpacity>

          {/* Connection Status Dot */}
          <View style={styles.headerStatus}>
            <View
              style={[
                styles.headerDot,
                isConnected ? styles.headerDotOnline : styles.headerDotSyncing,
              ]}
            />
          </View>
        </View>

        {/* Patient Details Sub-Panel (Collapsible) */}
        {showPatientInfo && (
          <View style={styles.patientInfoPanel}>
            {loadingPatient ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : patient ? (
              <View style={styles.patientInfoBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mã bệnh án:</Text>
                  <Text style={styles.infoValue}>{patient.patientCode || "N/A"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Giới tính:</Text>
                  <Text style={styles.infoValue}>{patient.gender || "N/A"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ngày sinh:</Text>
                  <Text style={styles.infoValue}>
                    {patient.dob ? new Date(patient.dob).toLocaleDateString("vi-VN") : "N/A"}
                  </Text>
                </View>
                {patient.phone ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>SĐT:</Text>
                    <Text style={styles.infoValue}>{patient.phone}</Text>
                  </View>
                ) : null}
                {patient.medicalHistory ? (
                  <View style={styles.infoHistoryBlock}>
                    <Text style={styles.infoLabel}>Tiền sử bệnh án:</Text>
                    <Text style={styles.infoHistoryText}>{patient.medicalHistory}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.infoError}>Không lấy được thông tin chi tiết bệnh nhân.</Text>
            )}
          </View>
        )}

        {/* Active Alert Context Banner */}
        {activeAlertId && (
          <View style={styles.alertContextPanel}>
            <View style={styles.alertContextHead}>
              <View style={styles.alertContextTitleWrap}>
                <Ionicons name="warning" size={16} color="#DC2626" />
                <Text style={styles.alertContextTitle}>Ngữ cảnh cảnh báo đang xem</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveAlertId(null)}>
                <Ionicons name="close-circle" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {loadingAlertContext ? (
              <ActivityIndicator size="small" color="#DC2626" style={{ marginTop: 8 }} />
            ) : alertContext ? (
              <View style={styles.alertContextDetails}>
                <Text style={styles.alertContextMeta}>
                  Đo lúc: {formatDateTime(alertContext.createdAt)}
                </Text>
                <View style={styles.alertViolationsGrid}>
                  {alertContext.violations?.map((v, idx) => (
                    <View key={idx} style={styles.alertViolationCard}>
                      <Text style={styles.alertViolationLabel}>{getViolationLabel(v.type)}</Text>
                      <Text style={styles.alertViolationValue}>
                        {v.observed} {getUnit(v.type)}
                      </Text>
                      <Text style={styles.alertViolationThreshold}>
                        Ngưỡng: {v.threshold} {getUnit(v.type)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.alertContextError}>Không thể tải chi tiết cảnh báo.</Text>
            )}
          </View>
        )}

        {/* Messages list container */}
        <View style={styles.chatCard}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatContent}
            onScrollBeginDrag={() => setMessageMenu(null)}
          >
            {messageItems.length === 0 ? (
              <View style={styles.emptyConversation}>
                <Text style={styles.emptyConversationText}>
                  Cuộc trò chuyện này chưa có tin nhắn nào. Bạn có thể gửi tin nhắn đầu tiên
                  cho bệnh nhân ở khung bên dưới.
                </Text>
              </View>
            ) : (
              messageItems.map((item) => {
                if (item.type === "day") {
                  return (
                    <View key={item.key} style={styles.dayBadgeWrapper}>
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>{item.label}</Text>
                      </View>
                    </View>
                  );
                }

                const isMine = item.message.senderId === currentUserId;
                const isSystemMessage = item.message.messageSource === "system";
                const isPatientMsg = !isMine && !isSystemMessage;

                // 1. Render system metrics alerts
                if (isSystemMessage) {
                  const cachedAlert = item.message.relatedAlertId
                    ? alertsCache[item.message.relatedAlertId]
                    : null;
                  const isHigh = cachedAlert?.severity === "high";
                  const violations = cachedAlert?.violations ?? [];

                  return (
                    <View key={item.key} style={styles.systemMsgRow}>
                      <View
                        style={[
                          styles.systemAvatar,
                          isHigh ? styles.systemAvatarHigh : styles.systemAvatarWarn,
                        ]}
                      >
                        <Ionicons
                          name="shield-checkmark"
                          size={16}
                          color={isHigh ? "#DC2626" : "#D97706"}
                        />
                      </View>

                      <View style={styles.systemMsgBody}>
                        <View style={styles.systemMsgHeader}>
                          <Text style={styles.systemSenderLabel}>Hệ thống giám sát</Text>
                          {cachedAlert ? (
                            <View
                              style={[
                                styles.systemSeverityBadge,
                                isHigh ? styles.severityHigh : styles.severityWarn,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.systemSeverityText,
                                  isHigh ? styles.severityHighText : styles.severityWarnText,
                                ]}
                              >
                                {isHigh ? "Nguy kịch" : "Cảnh báo"}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={[styles.systemCard, isHigh ? styles.systemCardHigh : styles.systemCardWarn]}>
                          {violations.length > 0 && (
                            <View style={styles.violationsBlock}>
                              <Text style={[styles.violationsTitle, isHigh ? styles.violationsTitleHigh : styles.violationsTitleWarn]}>
                                {violations.length} chỉ số vượt ngưỡng
                              </Text>
                              <View style={styles.violationsGrid}>
                                {violations.map((v, idx) => (
                                  <View
                                    key={idx}
                                    style={[
                                      styles.violationItem,
                                      v.severity === "high" ? styles.violationItemHigh : styles.violationItemWarn,
                                    ]}
                                  >
                                    <Text style={styles.violationLabel}>{getViolationLabel(v.type)}</Text>
                                    <Text style={[styles.violationValue, v.severity === "high" ? styles.violationValueHigh : styles.violationValueWarn]}>
                                      {v.observed} {getUnit(v.type)}
                                    </Text>
                                    <Text style={styles.violationThreshold}>Ngưỡng: {v.threshold}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}

                          <Text style={[styles.systemMsgText, isHigh ? styles.systemMsgTextHigh : styles.systemMsgTextWarn]}>
                            {item.message.content}
                          </Text>

                          <View style={styles.systemMsgFooter}>
                            <Text style={styles.systemMsgTime}>{formatTime(item.message.createdAt)}</Text>
                            {cachedAlert && (
                              <Text style={styles.systemMsgStatus}>
                                • {cachedAlert.status === "ack" ? "Đã xử lý" : "Chờ xử lý"}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }

                // 2. Render standard user messages
                const alertMessage = parseAlertLinkedMessage(
                  item.message.content,
                  item.message.relatedAlertId
                );
                const hasAlertTag = Boolean(item.message.relatedAlertId);

                const repliedMessage = item.message.replyToMessageId
                  ? messageLookup.get(item.message.replyToMessageId)
                  : null;

                const repliedSenderLabel = repliedMessage
                  ? repliedMessage.senderId === currentUserId
                    ? "Bạn"
                    : displayPatientName
                  : "";

                // Check read status
                let isReadByOther = false;
                if (isMine && otherParticipantState?.lastReadMessageId) {
                  const myMsgIndex = messageOrder.get(item.message.id);
                  const otherReadIndex = messageOrder.get(otherParticipantState.lastReadMessageId);
                  if (myMsgIndex !== undefined && otherReadIndex !== undefined) {
                    isReadByOther = otherReadIndex >= myMsgIndex;
                  }
                }

                return (
                  <View
                    key={item.key}
                    style={[
                      styles.messageWrapper,
                      isMine ? styles.messageWrapperRight : styles.messageWrapperLeft,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageRow,
                        isMine ? styles.messageRowRight : styles.messageRowLeft,
                      ]}
                    >
                      {/* Avatar for patient messages */}
                      {isPatientMsg && (
                        <View style={[styles.avatarSmall, styles.avatarPatient]}>
                          <Text style={styles.avatarSmallText}>
                            {getInitials(displayPatientName)}
                          </Text>
                        </View>
                      )}

                      <Pressable
                        onLongPress={(event) =>
                          handleOpenMessageMenu(event, item.message, isMine)
                        }
                        delayLongPress={220}
                        onPress={() => {
                          if (messageMenu) setMessageMenu(null);
                        }}
                      >
                        <View
                          style={[
                            styles.bubble,
                            isMine ? styles.bubbleDoctor : styles.bubblePatient,
                          ]}
                        >
                          {/* Alert metadata embedded */}
                          {hasAlertTag && alertMessage?.hasStructuredAlertSummary ? (
                            <View style={styles.alertContentBlock}>
                              <View
                                style={[
                                  styles.alertSummaryCard,
                                  isMine
                                    ? styles.alertSummaryCardDoctor
                                    : styles.alertSummaryCardPatient,
                                ]}
                              >
                                <View style={styles.alertSummaryHeader}>
                                  <Ionicons
                                    name="warning-outline"
                                    size={14}
                                    color={isMine ? "#DBEAFE" : "#B45309"}
                                  />
                                  <Text
                                    style={[
                                      styles.alertSummaryLabel,
                                      isMine
                                        ? styles.alertSummaryLabelDoctor
                                        : styles.alertSummaryLabelPatient,
                                    ]}
                                  >
                                    Cảnh báo liên quan
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.alertSummaryText,
                                    isMine
                                      ? styles.alertSummaryTextDoctor
                                      : styles.alertSummaryTextPatient,
                                  ]}
                                >
                                  {alertMessage.alertSummary}
                                </Text>
                                <Text
                                  style={[
                                    styles.alertSummaryMeta,
                                    isMine
                                      ? styles.alertSummaryMetaDoctor
                                      : styles.alertSummaryMetaPatient,
                                  ]}
                                >
                                  Alert #{alertMessage.shortAlertId}
                                </Text>
                              </View>

                              {alertMessage.note ? (
                                <View
                                  style={[
                                    styles.alertNoteCard,
                                    isMine
                                      ? styles.alertNoteCardDoctor
                                      : styles.alertNoteCardPatient,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.alertNoteLabel,
                                      isMine
                                        ? styles.alertNoteLabelDoctor
                                        : styles.alertNoteLabelPatient,
                                    ]}
                                  >
                                    Nội dung lời nhắn
                                  </Text>
                                  <Text
                                    style={[
                                      styles.messageText,
                                      isMine ? styles.messageTextDoctor : styles.messageTextPatient,
                                    ]}
                                  >
                                    {alertMessage.note}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          ) : (
                            <>
                              {repliedMessage ? (
                                <View
                                  style={[
                                    styles.replyPreviewCard,
                                    isMine ? styles.replyPreviewCardDoctor : styles.replyPreviewCardPatient,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.replyPreviewSender,
                                      isMine
                                        ? styles.replyPreviewSenderDoctor
                                        : styles.replyPreviewSenderPatient,
                                    ]}
                                  >
                                    {repliedSenderLabel}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.replyPreviewText,
                                      isMine
                                        ? styles.replyPreviewTextDoctor
                                        : styles.replyPreviewTextPatient,
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {getReplyPreviewContent(repliedMessage)}
                                  </Text>
                                </View>
                              ) : null}
                              <Text
                                style={[
                                  styles.messageText,
                                  isMine ? styles.messageTextDoctor : styles.messageTextPatient,
                                ]}
                              >
                                {item.message.content}
                              </Text>
                            </>
                          )}

                          <View style={styles.messageFooterRow}>
                            <Text
                              style={[
                                styles.timeText,
                                isMine ? styles.timeTextDoctor : styles.timeTextPatient,
                              ]}
                            >
                              {formatTime(item.message.createdAt)}
                            </Text>
                            {isMine && (
                              <Ionicons
                                name={isReadByOther ? "checkmark-done" : "checkmark"}
                                size={14}
                                color={isReadByOther ? "#BAE6FD" : "#C7D2FE"}
                                style={styles.messageStatusIcon}
                              />
                            )}
                          </View>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* Long Press Menu Modal */}
        <Modal
          transparent
          visible={Boolean(messageMenu)}
          animationType="fade"
          onRequestClose={() => setMessageMenu(null)}
        >
          <View style={styles.messageMenuBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMessageMenu(null)} />
            {messageMenu ? (
              <View
                style={[
                  styles.messageMenuPopover,
                  {
                    top: messageMenu.top,
                    left: messageMenu.left,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.messageMenuItem}
                  onPress={() => handleReplyFromMessage(messageMenu.message)}
                >
                  <Text style={styles.messageMenuText}>Trả lời</Text>
                  <Ionicons name="arrow-undo-outline" size={18} color="#E5E7EB" />
                </TouchableOpacity>
                <View style={styles.messageMenuDivider} />
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.messageMenuItem}
                  onPress={() => setMessageMenu(null)}
                >
                  <Text style={styles.messageMenuTextMuted}>Đóng</Text>
                  <Ionicons name="close-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </Modal>

        {/* Quick replies scrollable list */}
        <View style={styles.quickBarWrapper}>
          <Text style={styles.quickBarTitle}>Gửi nhanh mẫu tin</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScrollContent}
          >
            {QUICK_REPLIES.map((text) => (
              <TouchableOpacity
                key={text}
                style={styles.quickChip}
                onPress={() => handleSelectQuickReply(text)}
                activeOpacity={0.85}
              >
                <Text style={styles.quickChipText} numberOfLines={1}>
                  {text}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input composer row */}
        <View style={[styles.composerWrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.composerInputWrap}>
            {replyTarget && (
              <View style={styles.replyComposerCard}>
                <View style={styles.replyComposerBody}>
                  <Text style={styles.replyComposerLabel}>Đang trả lời</Text>
                  <Text style={styles.replyComposerSender}>
                    {replyTarget.senderId === currentUserId ? "Bạn" : displayPatientName}
                  </Text>
                  <Text style={styles.replyComposerText} numberOfLines={2}>
                    {getReplyPreviewContent(replyTarget)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyTarget(null)}
                  activeOpacity={0.85}
                  style={styles.replyComposerClose}
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Nhập lời nhắn cho bệnh nhân..."
              placeholderTextColor="#9CA3AF"
              multiline
              style={styles.composerInput}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            activeOpacity={0.85}
            disabled={!draft.trim()}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF" },
  root: { flex: 1, backgroundColor: "#F2F6FF" },
  loadingRoot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F2F6FF" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: { padding: 4, marginRight: 8 },
  headerCenter: { flex: 1 },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827", maxWidth: "85%" },
  headerSub: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  headerStatus: { flexDirection: "row", alignItems: "center", paddingLeft: 8 },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerDotOnline: { backgroundColor: "#10B981" },
  headerDotSyncing: { backgroundColor: "#F59E0B" },
  patientInfoPanel: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  patientInfoBody: { gap: 6 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 13, color: "#6B7280" },
  infoValue: { fontSize: 13, color: "#1F2937", fontWeight: "600" },
  infoHistoryBlock: { marginTop: 4 },
  infoHistoryText: { fontSize: 12, color: "#4B5563", fontStyle: "italic", marginTop: 2, lineHeight: 16 },
  infoError: { fontSize: 13, color: "#EF4444", textAlign: "center" },
  alertContextPanel: {
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FCA5A5",
    padding: 12,
  },
  alertContextHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertContextTitleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertContextTitle: { fontSize: 13, fontWeight: "700", color: "#DC2626" },
  alertContextDetails: { marginTop: 6 },
  alertContextMeta: { fontSize: 11, color: "#6B7280", marginBottom: 6 },
  alertViolationsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alertViolationCard: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 8,
    flex: 1,
    minWidth: 120,
  },
  alertViolationLabel: { fontSize: 11, color: "#4B5563", fontWeight: "500" },
  alertViolationValue: { fontSize: 13, color: "#DC2626", fontWeight: "700", marginVertical: 2 },
  alertViolationThreshold: { fontSize: 9, color: "#9CA3AF" },
  alertContextError: { fontSize: 12, color: "#6B7280", fontStyle: "italic", marginTop: 4 },
  chatCard: { flex: 1 },
  chatContainer: { flex: 1 },
  chatContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 14 },
  emptyConversation: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, marginTop: 40 },
  emptyConversationText: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 18 },
  errorBanner: { backgroundColor: "#FEF2F2", padding: 10, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  errorBannerText: { color: "#EF4444", fontSize: 12, textAlign: "center" },
  dayBadgeWrapper: { alignItems: "center", marginVertical: 8 },
  dayBadge: { backgroundColor: "#E0E7FF", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  dayBadgeText: { fontSize: 11, fontWeight: "700", color: "#4F46E5" },
  systemMsgRow: { flexDirection: "row", gap: 10, marginBottom: 12, width: "95%" },
  systemAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  systemAvatarHigh: { backgroundColor: "#FEE2E2" },
  systemAvatarWarn: { backgroundColor: "#FEF3C7" },
  systemMsgBody: { flex: 1 },
  systemMsgHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  systemSenderLabel: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
  systemSeverityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  severityHigh: { backgroundColor: "#FEE2E2" },
  severityWarn: { backgroundColor: "#FEF3C7" },
  systemSeverityText: { fontSize: 9, fontWeight: "700" },
  severityHighText: { color: "#DC2626" },
  severityWarnText: { color: "#B45309" },
  systemCard: { borderRadius: 12, padding: 12, borderWidth: 1 },
  systemCardHigh: { backgroundColor: "#FFF5F5", borderColor: "#FCA5A5" },
  systemCardWarn: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  systemMsgText: { fontSize: 13, lineHeight: 18 },
  systemMsgTextHigh: { color: "#7F1D1D" },
  systemMsgTextWarn: { color: "#78350F" },
  systemMsgFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  systemMsgTime: { fontSize: 10, color: "#9CA3AF" },
  systemMsgStatus: { fontSize: 10, color: "#9CA3AF" },
  violationsBlock: { marginBottom: 8, gap: 4 },
  violationsTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  violationsTitleHigh: { color: "#DC2626" },
  violationsTitleWarn: { color: "#D97706" },
  violationsGrid: { gap: 6 },
  violationItem: { padding: 8, borderRadius: 8, borderWidth: 1 },
  violationItemHigh: { backgroundColor: "#FFF", borderColor: "#FEE2E2" },
  violationItemWarn: { backgroundColor: "#FFF", borderColor: "#FEF3C7" },
  violationLabel: { fontSize: 11, color: "#4B5563" },
  violationValue: { fontSize: 13, fontWeight: "700", marginVertical: 2 },
  violationValueHigh: { color: "#DC2626" },
  violationValueWarn: { color: "#D97706" },
  violationThreshold: { fontSize: 9, color: "#9CA3AF" },
  messageWrapper: { flexDirection: "row", marginVertical: 2 },
  messageWrapperLeft: { justifyContent: "flex-start" },
  messageWrapperRight: { justifyContent: "flex-end" },
  messageRow: { flexDirection: "row", alignItems: "flex-end", maxWidth: "80%" },
  messageRowLeft: { justifyContent: "flex-start" },
  messageRowRight: { justifyContent: "flex-end" },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, marginRight: 8, alignItems: "center", justifyContent: "center" },
  avatarPatient: { backgroundColor: "#EFF6FF" },
  avatarSmallText: { fontSize: 10, fontWeight: "700", color: "#2563EB" },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.01, shadowRadius: 3, elevation: 1 },
  bubbleDoctor: { backgroundColor: "#2563EB", borderBottomRightRadius: 2 },
  bubblePatient: { backgroundColor: "#FFF", borderBottomLeftRadius: 2, borderWidth: 1, borderColor: "#E2E8F0" },
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTextDoctor: { color: "#FFF" },
  messageTextPatient: { color: "#1F2937" },
  messageFooterRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 4, alignSelf: "flex-end", gap: 3 },
  timeText: { fontSize: 9 },
  timeTextDoctor: { color: "#E0E7FF" },
  timeTextPatient: { color: "#9CA3AF" },
  messageStatusIcon: { marginLeft: 2 },
  alertContentBlock: { gap: 6, marginVertical: 4 },
  alertSummaryCard: { borderRadius: 10, padding: 10, borderWidth: 1 },
  alertSummaryCardDoctor: { backgroundColor: "#1D4ED8", borderColor: "#3B82F6" },
  alertSummaryCardPatient: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  alertSummaryHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  alertSummaryLabel: { fontSize: 11, fontWeight: "700" },
  alertSummaryLabelDoctor: { color: "#DBEAFE" },
  alertSummaryLabelPatient: { color: "#92400E" },
  alertSummaryText: { fontSize: 12, marginVertical: 4, lineHeight: 16 },
  alertSummaryTextDoctor: { color: "#EFF6FF" },
  alertSummaryTextPatient: { color: "#78350F" },
  alertSummaryMeta: { fontSize: 9 },
  alertSummaryMetaDoctor: { color: "#93C5FD" },
  alertSummaryMetaPatient: { color: "#B45309" },
  alertNoteCard: { borderRadius: 10, padding: 10 },
  alertNoteCardDoctor: { backgroundColor: "#1E40AF" },
  alertNoteCardPatient: { backgroundColor: "#FFFBEB" },
  alertNoteLabel: { fontSize: 10, fontWeight: "700", marginBottom: 2 },
  alertNoteLabelDoctor: { color: "#BFDBFE" },
  alertNoteLabelPatient: { color: "#B45309" },
  replyPreviewCard: { borderRadius: 10, padding: 8, marginBottom: 6, borderLeftWidth: 3 },
  replyPreviewCardDoctor: { backgroundColor: "#1E40AF", borderLeftColor: "#93C5FD" },
  replyPreviewCardPatient: { backgroundColor: "#F3F4F6", borderLeftColor: "#9CA3AF" },
  replyPreviewSender: { fontSize: 10, fontWeight: "700" },
  replyPreviewSenderDoctor: { color: "#BFDBFE" },
  replyPreviewSenderPatient: { color: "#4B5563" },
  replyPreviewText: { fontSize: 11, marginTop: 2 },
  replyPreviewTextDoctor: { color: "#E0E7FF" },
  replyPreviewTextPatient: { color: "#6B7280" },
  messageMenuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  messageMenuPopover: { position: "absolute", width: MESSAGE_MENU_WIDTH, backgroundColor: "#1F2937", borderRadius: 12, padding: 4, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  messageMenuItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  messageMenuText: { color: "#F3F4F6", fontSize: 13, fontWeight: "600" },
  messageMenuTextMuted: { color: "#9CA3AF", fontSize: 13 },
  messageMenuDivider: { height: 1, backgroundColor: "#374151" },
  quickBarWrapper: { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingVertical: 8 },
  quickBarTitle: { fontSize: 11, fontWeight: "700", color: "#6B7280", paddingHorizontal: 16, marginBottom: 6 },
  quickScrollContent: { paddingHorizontal: 16, gap: 8 },
  quickChip: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, justifyContent: "center" },
  quickChipText: { fontSize: 12, color: "#2563EB", fontWeight: "500" },
  composerWrapper: { flexDirection: "row", alignItems: "flex-end", backgroundColor: "#fff", padding: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 10 },
  composerInputWrap: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, maxH: 120 },
  composerInput: { flex: 1, fontSize: 14, color: "#1F2937", paddingVertical: 4, textAlignVertical: "center" },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  sendButtonDisabled: { backgroundColor: "#BFDBFE" },
  replyComposerCard: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 12, padding: 8, marginBottom: 6, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  replyComposerBody: { flex: 1 },
  replyComposerLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF" },
  replyComposerSender: { fontSize: 11, fontWeight: "700", color: "#2563EB", marginVertical: 2 },
  replyComposerText: { fontSize: 11, color: "#6B7280" },
  replyComposerClose: { padding: 4 },
});

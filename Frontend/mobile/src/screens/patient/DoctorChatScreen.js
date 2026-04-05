import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";

import { useAuth } from "../../hooks/useAuth";
import {
  buildConversationSocketUrl,
  getConversationMessages,
  getConversations,
} from "../../api/chatApi";

const QUICK_REPLIES = [
  "Dạ tôi đã xem.",
  "Tôi sẽ đo lại và cập nhật thêm.",
  "Cảm ơn bác sĩ, tôi sẽ làm theo.",
];

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

function normalizeMessage(message) {
  return {
    id: message.id || message._id,
    conversationId: message.conversationId || message.chatId,
    senderId: message.senderId,
    content: message.content || message.message || "",
    relatedAlertId: message.relatedAlertId || null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt || message.createdAt,
  };
}

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleTimeString("vi-VN", {
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
      alertSummary: "",
      note: "",
      shortAlertId: String(relatedAlertId).slice(-8),
    };
  }

  const alertPrefix = "Cảnh báo chỉ số:";
  const firstLine = segments[0];

  if (firstLine.startsWith(alertPrefix)) {
    return {
      alertSummary: firstLine.slice(alertPrefix.length).trim(),
      note: segments.slice(1).join("\n").trim(),
      shortAlertId: String(relatedAlertId).slice(-8),
    };
  }

  return {
    alertSummary: "",
    note: segments.join("\n").trim(),
    shortAlertId: String(relatedAlertId).slice(-8),
  };
}

export default function DoctorChatScreen() {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;
  const isFocused = useIsFocused();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketState, setSocketState] = useState("idle");

  const socketRef = useRef(null);
  const scrollViewRef = useRef(null);

  async function fetchConversationMessages(conversationId, limit = 100) {
    const messagesResponse = await getConversationMessages(conversationId, limit);
    if (!messagesResponse.ok) {
      throw new Error(
        messagesResponse.body?.error || messagesResponse.error || "Không thể tải tin nhắn."
      );
    }

    return (messagesResponse.body?.data?.messages || []).map(normalizeMessage);
  }

  async function resolveConversation(conversations) {
    const availableConversations = Array.isArray(conversations)
      ? conversations.filter((item) => item?.id)
      : [];

    const latestConversation = availableConversations[0] || null;
    if (!latestConversation) {
      return { conversation: null, messages: [] };
    }

    const latestMessages = await fetchConversationMessages(latestConversation.id, 100);
    if (latestMessages.length > 0 || availableConversations.length === 1) {
      return {
        conversation: latestConversation,
        messages: latestMessages,
      };
    }

    for (const candidate of availableConversations.slice(1)) {
      const previewMessages = await fetchConversationMessages(candidate.id, 1);
      if (previewMessages.length === 0) {
        continue;
      }

      return {
        conversation: candidate,
        messages: await fetchConversationMessages(candidate.id, 100),
      };
    }

    return {
      conversation: latestConversation,
      messages: latestMessages,
    };
  }

  async function loadChat({ silent = false } = {}) {
    if (!currentUserId) {
      setLoading(false);
      setError("Không xác định được người dùng hiện tại.");
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const conversationsResponse = await getConversations(20);
      if (!conversationsResponse.ok) {
        throw new Error(
          conversationsResponse.body?.error ||
            conversationsResponse.error ||
            "Không thể tải danh sách cuộc trò chuyện."
        );
      }

      const conversations = conversationsResponse.body?.data?.conversations || [];
      const resolvedChat = await resolveConversation(conversations);

      setConversation(resolvedChat.conversation);
      setMessages(sortMessages(resolvedChat.messages));
    } catch (loadError) {
      setError(loadError?.message || "Không thể mở màn hình chat.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    loadChat();
  }, [currentUserId, isFocused]);

  useEffect(() => {
    if (!isFocused || conversation?.id) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadChat({ silent: true });
    }, 5000);

    return () => clearInterval(timer);
  }, [conversation?.id, isFocused, currentUserId]);

  useEffect(() => {
    if (!conversation?.id) {
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
          setError(payload.error || "Không thể gửi tin nhắn.");
          return;
        }

        setMessages((current) => mergeMessages(current, [normalizeMessage(payload)]));
      });
    };

    socket.onerror = () => {
      setError("Kết nối chat đang gặp lỗi. Bạn thử mở lại màn hình này nhé.");
    };

    socket.onclose = () => {
      setSocketState("closed");
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [conversation?.id]);

  const otherParticipantId = useMemo(() => {
    if (!conversation?.participantIds || !currentUserId) {
      return null;
    }

    return conversation.participantIds.find((id) => id !== currentUserId) || null;
  }, [conversation?.participantIds, currentUserId]);

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

  const handleSend = (nextContent = draft) => {
    const content = String(nextContent || "").trim();
    if (!content) {
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("Chat realtime chưa sẵn sàng để gửi tin nhắn.");
      return;
    }

    socketRef.current.send(JSON.stringify({ content }));
    setDraft("");
    setError(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang tải cuộc trò chuyện…</Text>
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.loadingRoot}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện nào</Text>
          <Text style={styles.emptyText}>
            Hiện tại tài khoản của bạn chưa có phòng chat đang hoạt động với bác sĩ.
          </Text>
          {error ? <Text style={styles.emptyError}>{error}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerAvatar}>
            <FontAwesome5 name="user-md" size={18} color="#FFFFFF" />
          </View>

          <View style={styles.headerCenter}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerTitle}>Bác sĩ phụ trách</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>Chat trực tiếp</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>
              {otherParticipantId
                ? `Người tham gia: ${otherParticipantId.slice(-8)}`
                : "Cuộc trò chuyện dành cho bệnh nhân"}
            </Text>
          </View>

          <View
            style={[
              styles.headerStatus,
              socketState === "open" ? styles.headerStatusOnline : styles.headerStatusSyncing,
            ]}
          >
            <View
              style={[
                styles.headerDot,
                socketState === "open" ? styles.headerDotOnline : styles.headerDotSyncing,
              ]}
            />
            <Text style={styles.headerStatusText}>
              {socketState === "open" ? "Đã kết nối" : "Đang đồng bộ"}
            </Text>
          </View>
        </View>

        <View style={styles.chatCard}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatContent}
          >
            {messageItems.length === 0 ? (
              <View style={styles.emptyConversation}>
                <Text style={styles.emptyConversationText}>
                  Cuộc trò chuyện này chưa có tin nhắn nào. Bạn có thể nhắn cho bác sĩ ở
                  khung bên dưới.
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
                const isDoctor = !isMine;
                const alertMessage = parseAlertLinkedMessage(
                  item.message.content,
                  item.message.relatedAlertId
                );
                const hasAlertTag = Boolean(item.message.relatedAlertId);

                return (
                  <View
                    key={item.key}
                    style={[
                      styles.messageWrapper,
                      isDoctor ? styles.messageWrapperLeft : styles.messageWrapperRight,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageRow,
                        isDoctor ? styles.messageRowLeft : styles.messageRowRight,
                      ]}
                    >
                      <View
                        style={[
                          styles.avatarSmall,
                          isDoctor ? styles.avatarDoctor : styles.avatarPatient,
                        ]}
                      >
                        {isDoctor ? (
                          <FontAwesome5 name="user-md" size={12} color="#FFFFFF" />
                        ) : (
                          <Ionicons name="person-outline" size={16} color="#2563EB" />
                        )}
                      </View>

                      <View
                        style={[
                          styles.bubble,
                          isDoctor ? styles.bubbleDoctor : styles.bubblePatient,
                        ]}
                      >
                        {isDoctor ? (
                          <Text style={styles.senderNameSmall}>Bác sĩ</Text>
                        ) : null}

                        {hasAlertTag && alertMessage ? (
                          <View style={styles.alertContentBlock}>
                            <View
                              style={[
                                styles.alertSummaryCard,
                                isDoctor
                                  ? styles.alertSummaryCardDoctor
                                  : styles.alertSummaryCardPatient,
                              ]}
                            >
                              <View style={styles.alertSummaryHeader}>
                                <Ionicons
                                  name="warning-outline"
                                  size={14}
                                  color={isDoctor ? "#B45309" : "#DBEAFE"}
                                />
                                <Text
                                  style={[
                                    styles.alertSummaryLabel,
                                    isDoctor
                                      ? styles.alertSummaryLabelDoctor
                                      : styles.alertSummaryLabelPatient,
                                  ]}
                                >
                                  Thông tin cảnh báo
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.alertSummaryText,
                                  isDoctor
                                    ? styles.alertSummaryTextDoctor
                                    : styles.alertSummaryTextPatient,
                                ]}
                              >
                                {alertMessage.alertSummary ||
                                  "Tin nhắn này được gửi trong ngữ cảnh một cảnh báo theo dõi sức khỏe."}
                              </Text>
                              <Text
                                style={[
                                  styles.alertSummaryMeta,
                                  isDoctor
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
                                  isDoctor
                                    ? styles.alertNoteCardDoctor
                                    : styles.alertNoteCardPatient,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.alertNoteLabel,
                                    isDoctor
                                      ? styles.alertNoteLabelDoctor
                                      : styles.alertNoteLabelPatient,
                                  ]}
                                >
                                  Lời nhắn bác sĩ
                                </Text>
                                <Text
                                  style={[
                                    styles.messageText,
                                    !isDoctor && styles.messageTextPatient,
                                    isDoctor
                                      ? styles.alertNoteTextDoctor
                                      : styles.alertNoteTextPatient,
                                  ]}
                                >
                                  {alertMessage.note}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.messageText,
                              !isDoctor && styles.messageTextPatient,
                            ]}
                          >
                            {item.message.content}
                          </Text>
                        )}

                        <Text
                          style={[
                            styles.timeText,
                            isDoctor ? styles.timeTextDoctor : styles.timeTextPatient,
                          ]}
                        >
                          {formatTime(item.message.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={styles.quickBarWrapper}>
          <Text style={styles.quickBarTitle}>Phản hồi nhanh</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScrollContent}
          >
            {QUICK_REPLIES.map((text) => (
              <TouchableOpacity
                key={text}
                style={styles.quickChip}
                onPress={() => handleSend(text)}
                activeOpacity={0.85}
              >
                <Text style={styles.quickChipText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.composerWrapper}>
          <View style={styles.composerInputWrap}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Nhập tin nhắn cho bác sĩ..."
              placeholderTextColor="#9CA3AF"
              multiline
              style={styles.composerInput}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              !draft.trim() && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            activeOpacity={0.85}
            disabled={!draft.trim()}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  root: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#4B5563",
  },
  emptyCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
  },
  emptyError: {
    marginTop: 10,
    fontSize: 13,
    color: "#DC2626",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderWidth: 1,
    borderColor: "#93C5FD",
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginRight: 8,
  },
  headerBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(56,189,248,0.16)",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.45)",
  },
  headerBadgeText: {
    fontSize: 11,
    color: "#E0F2FE",
    fontWeight: "600",
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#94A3B8",
  },
  headerStatus: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
    borderWidth: 1,
  },
  headerStatusOnline: {
    backgroundColor: "rgba(22,163,74,0.16)",
    borderColor: "rgba(74,222,128,0.4)",
  },
  headerStatusSyncing: {
    backgroundColor: "rgba(245,158,11,0.14)",
    borderColor: "rgba(251,191,36,0.4)",
  },
  headerDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 4,
  },
  headerDotOnline: {
    backgroundColor: "#22C55E",
  },
  headerDotSyncing: {
    backgroundColor: "#F59E0B",
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  chatCard: {
    flex: 1,
    marginTop: 8,
    backgroundColor: "#EEF2FF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorBannerText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#DC2626",
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
  },
  emptyConversation: {
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  emptyConversationText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  dayBadgeWrapper: {
    alignItems: "center",
    marginVertical: 8,
  },
  dayBadge: {
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dayBadgeText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
  },
  messageWrapper: {
    marginVertical: 4,
  },
  messageWrapperLeft: {
    alignItems: "flex-start",
  },
  messageWrapperRight: {
    alignItems: "flex-end",
  },
  messageRow: {
    maxWidth: "86%",
    alignItems: "flex-end",
  },
  messageRowLeft: {
    flexDirection: "row",
  },
  messageRowRight: {
    flexDirection: "row-reverse",
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
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
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleDoctor: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 4,
  },
  bubblePatient: {
    backgroundColor: "#2563EB",
    borderTopRightRadius: 4,
  },
  senderNameSmall: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "600",
    marginBottom: 3,
  },
  alertContentBlock: {
    gap: 8,
  },
  alertSummaryCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  alertSummaryCardDoctor: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  alertSummaryCardPatient: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(191,219,254,0.26)",
  },
  alertSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  alertSummaryLabel: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  alertSummaryLabelDoctor: {
    color: "#B45309",
  },
  alertSummaryLabelPatient: {
    color: "#DBEAFE",
  },
  alertSummaryText: {
    fontSize: 13,
    lineHeight: 19,
  },
  alertSummaryTextDoctor: {
    color: "#78350F",
  },
  alertSummaryTextPatient: {
    color: "#EFF6FF",
  },
  alertSummaryMeta: {
    marginTop: 8,
    fontSize: 11,
  },
  alertSummaryMetaDoctor: {
    color: "#B45309",
  },
  alertSummaryMetaPatient: {
    color: "rgba(219,234,254,0.92)",
  },
  alertNoteCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alertNoteCardDoctor: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  alertNoteCardPatient: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  alertNoteLabel: {
    marginBottom: 6,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  alertNoteLabelDoctor: {
    color: "#6B7280",
  },
  alertNoteLabelPatient: {
    color: "#DBEAFE",
  },
  alertNoteTextDoctor: {
    color: "#111827",
  },
  alertNoteTextPatient: {
    color: "#EFF6FF",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
  },
  messageTextPatient: {
    color: "#EFF6FF",
  },
  timeText: {
    marginTop: 4,
    fontSize: 11,
    alignSelf: "flex-end",
  },
  timeTextDoctor: {
    color: "#9CA3AF",
  },
  timeTextPatient: {
    color: "rgba(224,231,255,0.95)",
  },
  quickBarWrapper: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    paddingBottom: 6,
  },
  quickBarTitle: {
    paddingHorizontal: 16,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 6,
  },
  quickScrollContent: {
    paddingHorizontal: 12,
  },
  quickChip: {
    marginHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickChipText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  composerWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 18 : 14,
    backgroundColor: "#FFFFFF",
  },
  composerInputWrap: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  composerInput: {
    minHeight: 24,
    maxHeight: 110,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
});

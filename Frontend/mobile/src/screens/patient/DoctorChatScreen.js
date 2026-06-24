import { useEffect, useMemo, useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";

import { useAuth } from "../../hooks/useAuth";
import { useBadge } from "../../context/BadgeContext";
import {
  buildConversationSocketUrl,
  getConversationMessages,
  getConversations,
} from "../../api/chatApi";
import { getAlertById } from "../../api/alertApi";
import { getActiveVideoSession } from "../../api/videoSessionApi";


const QUICK_REPLIES = [
  "Dạ tôi đã xem.",
  "Tôi sẽ đo lại và cập nhật thêm.",
  "Cảm ơn bác sĩ, tôi sẽ làm theo.",
];

const MESSAGE_MENU_WIDTH = 188;
const MESSAGE_MENU_HEIGHT = 116;

function normalizeConversation(conversation) {
  const participantsSource = Array.isArray(conversation?.participants)
    ? conversation.participants
    : Array.isArray(conversation?.participantIds)
      ? conversation.participantIds.map((userId) => ({ userId }))
      : [];

  const participants = participantsSource
    .map((participant) => ({
      userId: String(participant?.userId || participant?.id || "").trim(),
      lastReadMessageId: participant?.lastReadMessageId || null,
      lastDeliveredMessageId: participant?.lastDeliveredMessageId || null,
    }))
    .filter((participant) => participant.userId);

  return {
    id: conversation?.id || conversation?._id,
    participants,
    participantIds: participants.map((participant) => participant.userId),
    createdAt: conversation?.createdAt,
    updatedAt: conversation?.updatedAt || conversation?.createdAt,
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

function isSocketErrorPayload(payload) {
  return payload?.type === "error";
}

function isMessageEnvelope(payload) {
  return payload?.type === "NEW_MESSAGE" && payload?.data;
}

function isDirectMessagePayload(payload) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      (payload.id || payload._id) &&
      (payload.content !== undefined || payload.message !== undefined)
  );
}

function createSendMessagePayload(message) {
  return {
    type: "SEND_MESSAGE",
    data: message,
  };
}

function isDeliveredEnvelope(payload) {
  return payload?.type === "DELIVERED" && payload?.data?.userId && payload?.data?.messageId;
}

function isReadEnvelope(payload) {
  return payload?.type === "READ" && payload?.data?.userId && payload?.data?.lastReadMessageId;
}

function createDeliveredPayload(messageId) {
  return {
    type: "DELIVERED",
    data: {
      messageId,
    },
  };
}

function createReadPayload(lastReadMessageId) {
  return {
    type: "READ",
    data: {
      lastReadMessageId,
    },
  };
}

function updateConversationParticipantState(conversation, userId, nextState) {
  if (!conversation) {
    return conversation;
  }

  return {
    ...conversation,
    participants: conversation.participants.map((participant) =>
      participant.userId === userId
        ? {
            ...participant,
            ...(nextState.lastDeliveredMessageId !== undefined
              ? { lastDeliveredMessageId: nextState.lastDeliveredMessageId }
              : {}),
            ...(nextState.lastReadMessageId !== undefined
              ? { lastReadMessageId: nextState.lastReadMessageId }
              : {}),
          }
        : participant
    ),
  };
}

function hasParticipantReachedMessage(messageId, checkpointMessageId, messageOrder) {
  if (!checkpointMessageId) {
    return false;
  }

  const messageIndex = messageOrder.get(messageId);
  const checkpointIndex = messageOrder.get(checkpointMessageId);
  if (messageIndex === undefined || checkpointIndex === undefined) {
    return false;
  }

  return checkpointIndex >= messageIndex;
}

function findLatestIncomingMessage(messages, currentUserId) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].senderId !== currentUserId) {
      return messages[index];
    }
  }

  return null;
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
  if (!type) return "Chỉ số";
  const cleanType = type.replace(/_(max|min|high|low)$/, "");
  const labels = {
    temperature: "Nhiệt độ",
    heart_rate: "Nhịp tim",
    respiratory_rate: "Nhịp thở",
    spo2: "SpO2",
    blood_pressure_systolic: "Huyết áp tâm thu",
    blood_pressure_diastolic: "Huyết áp tâm trương",
    glucose: "Đường huyết",
    sys: "Huyết áp tâm thu",
    bp_diastolic: "Huyết áp tâm trương"
  };
  return labels[cleanType] || labels[type] || type;
}


export default function DoctorChatScreen() {
  const { user } = useAuth();
  const { refreshBadges } = useBadge();
  const currentUserId = user?.id || user?._id;
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketState, setSocketState] = useState("idle");
  const [replyTarget, setReplyTarget] = useState(null);
  const [messageMenu, setMessageMenu] = useState(null);

  const socketRef = useRef(null);
  const scrollViewRef = useRef(null);
  const lastDeliveredSentRef = useRef(null);
  const lastReadSentRef = useRef(null);
  const [alertsCache, setAlertsCache] = useState({});
  const [activeVideoSessionId, setActiveVideoSessionId] = useState(null);

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
      ? conversations.map(normalizeConversation).filter((item) => item?.id)
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

  // Refresh badge count when screen is focused
  useEffect(() => {
    if (isFocused) {
      refreshBadges();
    }
  }, [isFocused, refreshBadges]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    loadChat();
  }, [currentUserId, isFocused]);

  // Batch pre-fetch alert data for system messages to show violations inline
  useEffect(() => {
    const systemAlertIds = [...new Set(
      messages
        .filter((m) => m.messageSource === "system" && m.relatedAlertId)
        .map((m) => m.relatedAlertId)
    )];

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

  useEffect(() => {
    if (!isFocused || conversation?.id) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadChat({ silent: true });
    }, 5000);

    return () => clearInterval(timer);
  }, [conversation?.id, isFocused, currentUserId]);

  // Poll for active video session every 30 seconds
  useEffect(() => {
    if (!conversation?.id || !isFocused) return;

    function checkActiveSession() {
      getActiveVideoSession(conversation.id)
        .then((data) => {
          setActiveVideoSessionId(data?.id || null);
        })
        .catch(() => {
          setActiveVideoSessionId(null);
        });
    }

    checkActiveSession();
    const videoTimer = setInterval(checkActiveSession, 30000);
    return () => clearInterval(videoTimer);
  }, [conversation?.id, isFocused]);

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
        if (isSocketErrorPayload(payload)) {
          setError(payload.error || "Không thể gửi tin nhắn.");
          return;
        }

        if (isMessageEnvelope(payload)) {
          setMessages((current) => mergeMessages(current, [normalizeMessage(payload.data)]));
          return;
        }

        if (isDeliveredEnvelope(payload)) {
          setConversation((current) =>
            updateConversationParticipantState(current, payload.data.userId, {
              lastDeliveredMessageId: payload.data.messageId,
            })
          );
          return;
        }

        if (isReadEnvelope(payload)) {
          setConversation((current) =>
            updateConversationParticipantState(current, payload.data.userId, {
              lastDeliveredMessageId: payload.data.lastReadMessageId,
              lastReadMessageId: payload.data.lastReadMessageId,
            })
          );
          return;
        }

        if (isDirectMessagePayload(payload)) {
          setMessages((current) => mergeMessages(current, [normalizeMessage(payload)]));
        }

        // Handle video call system messages via NEW_MESSAGE
        if (isMessageEnvelope(payload) && payload.data?.messageSource === "system") {
          const content = payload.data?.content || "";
          if (content.includes('"type":"video_call_invite"')) {
            try {
              const parsed = JSON.parse(content);
              if (parsed.videoSessionId) setActiveVideoSessionId(parsed.videoSessionId);
            } catch (_) {}
          }
          if (content.includes('"type":"video_call_ended"')) {
            setActiveVideoSessionId(null);
          }
        }
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

  const otherParticipantState = useMemo(() => {
    if (!conversation?.participants || !currentUserId) {
      return null;
    }

    return (
      conversation.participants.find((participant) => participant.userId !== currentUserId) ||
      null
    );
  }, [conversation?.participants, currentUserId]);

  const handleSelectQuickReply = (text) =>{
    setDraft(text);
    setError(null);
  }
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
    return new Map(messages.map((message) => [message.id, message]));
  }, [messages]);

  const messageOrder = useMemo(() => {
    return new Map(messages.map((message, index) => [message.id, index]));
  }, [messages]);

  useEffect(() => {
    if (!replyTarget) {
      return;
    }

    if (!messageLookup.has(replyTarget.id)) {
      setReplyTarget(null);
    }
  }, [messageLookup, replyTarget]);

  useEffect(() => {
    setReplyTarget(null);
  }, [conversation?.id]);

  useEffect(() => {
    lastDeliveredSentRef.current = null;
    lastReadSentRef.current = null;
  }, [conversation?.id]);

  useEffect(() => {
    setMessageMenu(null);
  }, [conversation?.id]);

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

    const latestIncomingMessage = findLatestIncomingMessage(messages, currentUserId);
    if (!latestIncomingMessage?.id) {
      return;
    }

    if (lastDeliveredSentRef.current !== latestIncomingMessage.id) {
      socketRef.current.send(JSON.stringify(createDeliveredPayload(latestIncomingMessage.id)));
      lastDeliveredSentRef.current = latestIncomingMessage.id;
    }

    if (lastReadSentRef.current !== latestIncomingMessage.id) {
      socketRef.current.send(JSON.stringify(createReadPayload(latestIncomingMessage.id)));
      lastReadSentRef.current = latestIncomingMessage.id;
      
      // Refresh badge count after sending READ event
      // Use setTimeout to allow backend to process the READ event first
      setTimeout(() => {
        refreshBadges();
      }, 300);
    }
  }, [conversation?.id, currentUserId, isFocused, messages, socketState, refreshBadges]);

  const handleSend = (nextContent = draft) => {
    const content = String(nextContent || "").trim();
    if (!content) {
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("Chat realtime chưa sẵn sàng để gửi tin nhắn.");
      return;
    }

    const payload = { content };
    if (replyTarget?.id) {
      payload.replyToMessageId = replyTarget.id;
    }

    socketRef.current.send(JSON.stringify(createSendMessagePayload(payload)));
    setDraft("");
    setReplyTarget(null);
    setError(null);
  };

  const handleReplyFromMessage = (message) => {
    setReplyTarget(message);
    setMessageMenu(null);
  };

  const handleOpenMessageMenu = (event, message, isDoctor) => {
    const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
    const { pageX, pageY, locationX, locationY } = event.nativeEvent;
    const bubbleLeft = pageX - locationX;
    const bubbleRight = pageX + (locationX || 0);

    const left = isDoctor
      ? Math.max(12, Math.min(bubbleLeft, screenWidth - MESSAGE_MENU_WIDTH - 12))
      : Math.max(
          12,
          Math.min(bubbleRight - MESSAGE_MENU_WIDTH, screenWidth - MESSAGE_MENU_WIDTH - 12)
        );

    const top = Math.max(
      12,
      Math.min(pageY + 42, screenHeight - MESSAGE_MENU_HEIGHT - 24)
    );

    setMessageMenu({
      message,
      left,
      top,
    });
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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
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
          </View>

          <View style={[
            styles.headerStatus,
            socketState === "open" ? styles.headerStatusOnline : styles.headerStatusSyncing,
          ]}>
            <View style={[
              styles.headerDot,
              socketState === "open" ? styles.headerDotOnline : styles.headerDotSyncing,
            ]} />
            <Text style={styles.headerStatusText}>
              {socketState === "open" ? "Đã kết nối" : "Đang đồng bộ"}
            </Text>
          </View>

          {/* Video call button */}
          <TouchableOpacity
            style={styles.videoCallBtn}
            onPress={() => {
              if (activeVideoSessionId) {
                navigation.navigate("VideoCall", { videoSessionId: activeVideoSessionId });
              } else {
                // No active session — show friendly toast-like feedback
                setError("Bác sĩ chưa bắt đầu cuộc gọi video nào.");
                setTimeout(() => setError(null), 3000);
              }
            }}
          >
            <Ionicons
              name="videocam"
              size={20}
              color={activeVideoSessionId ? "#22C55E" : "#94A3B8"}
            />
          </TouchableOpacity>
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
            onScrollBeginDrag={() => setMessageMenu(null)}
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
                const isSystemMessage = item.message.messageSource === "system";
                const isDoctor = !isMine && !isSystemMessage;
                const alertMessage = parseAlertLinkedMessage(
                  item.message.content,
                  item.message.relatedAlertId
                );
                const hasAlertTag = Boolean(item.message.relatedAlertId);

                // System messages: 3rd-party participant with shield icon + violations grid
                if (isSystemMessage) {
                  // Intercept video call events
                  if (item.message.content.includes('"type":"video_call_invite"')) {
                    try {
                      const payload = JSON.parse(item.message.content);
                      return (
                        <View key={item.key} style={{ marginVertical: 12, alignItems: 'center' }}>
                          <View style={{ backgroundColor: '#E0F2FE', padding: 12, borderRadius: 16, width: '85%', alignItems: 'center', borderColor: '#BAE6FD', borderWidth: 1 }}>
                            <Ionicons name="videocam" size={24} color="#0284C7" style={{ marginBottom: 8 }} />
                            <Text style={{ fontSize: 13, color: '#0369A1', textAlign: 'center', marginBottom: 10, fontWeight: '500' }}>
                              Bác sĩ đang mời bạn tham gia một cuộc gọi video.
                            </Text>
                            <TouchableOpacity
                              style={{ backgroundColor: '#0284C7', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 }}
                              onPress={() => navigation.navigate("VideoCall", { videoSessionId: payload.videoSessionId })}
                            >
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Tham gia cuộc gọi</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    } catch (e) {
                      // Fallback if parsing fails
                    }
                  }
                  if (item.message.content.includes('"type":"video_call_ended"')) {
                    return (
                      <View key={item.key} style={{ marginVertical: 12, alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#F1F5F9', padding: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="call" size={16} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 12, color: '#64748B' }}>Cuộc gọi video đã kết thúc.</Text>
                        </View>
                      </View>
                    );
                  }

                  const cachedAlert = item.message.relatedAlertId
                    ? alertsCache[item.message.relatedAlertId]
                    : null;
                  const isHigh = cachedAlert?.severity === "high";
                  const isMedium = cachedAlert?.severity === "medium";
                  const violations = cachedAlert?.violations ?? [];

                  return (
                    <View key={item.key} style={styles.systemMsgRow}>
                      {/* Shield avatar */}
                      <View style={[styles.systemAvatar, isHigh ? styles.systemAvatarHigh : isMedium ? styles.systemAvatarWarn : styles.systemAvatarInfo]}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={16}
                          color={isHigh ? "#DC2626" : isMedium ? "#D97706" : "#2563EB"}
                        />
                      </View>

                      <View style={styles.systemMsgBody}>
                        {/* Sender label + severity badge */}
                        <View style={styles.systemMsgHeader}>
                          <Text style={styles.systemSenderLabel}>Hệ thống giám sát</Text>
                          {cachedAlert ? (
                            <View style={[styles.systemSeverityBadge, isHigh ? styles.severityHigh : isMedium ? styles.severityWarn : styles.severityInfo]}>
                              <Ionicons name="warning-outline" size={9} color={isHigh ? "#DC2626" : isMedium ? "#D97706" : "#2563EB"} />
                              <Text style={[styles.systemSeverityText, isHigh ? styles.severityHighText : isMedium ? styles.severityWarnText : styles.severityInfoText]}>
                                {isHigh ? "Nghiêm trọng" : isMedium ? "Cảnh báo" : "Nhẹ"}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Message card */}
                        <View style={[styles.systemCard, isHigh ? styles.systemCardHigh : isMedium ? styles.systemCardWarn : styles.systemCardInfo]}>
                          {/* Violations grid */}
                          {violations.length > 0 ? (
                            <View style={styles.violationsBlock}>
                              <Text style={[styles.violationsTitle, isHigh ? styles.violationsTitleHigh : isMedium ? styles.violationsTitleWarn : styles.violationsTitleInfo]}>
                                {violations.length} chỉ số vượt ngưỡng
                              </Text>
                              <View style={styles.violationsGrid}>
                                {violations.map((v, idx) => (
                                  <View
                                    key={idx}
                                    style={[styles.violationItem, v.severity === "high" ? styles.violationItemHigh : v.severity === "medium" ? styles.violationItemWarn : styles.violationItemInfo]}
                                  >
                                    <Text style={styles.violationLabel}>{getViolationLabel(v.type)}</Text>
                                    <Text style={[styles.violationValue, v.severity === "high" ? styles.violationValueHigh : v.severity === "medium" ? styles.violationValueWarn : styles.violationValueInfo]}>
                                      {v.observed}
                                    </Text>
                                    <Text style={styles.violationThreshold}>Ngưỡng: {v.threshold}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          ) : null}

                          {/* Message text */}
                          <Text style={[styles.systemMsgText, isHigh ? styles.systemMsgTextHigh : isMedium ? styles.systemMsgTextWarn : styles.systemMsgTextInfo]}>
                            {item.message.content}
                          </Text>

                          {/* Time + ack status */}
                          <View style={styles.systemMsgFooter}>
                            <Text style={styles.systemMsgTime}>{formatTime(item.message.createdAt)}</Text>
                            {cachedAlert ? (
                              <Text style={styles.systemMsgStatus}>
                                • {cachedAlert.status === "ack" ? "Đã xác nhận" : "Chờ xử lý"}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }
                const repliedMessage = item.message.replyToMessageId
                  ? messageLookup.get(item.message.replyToMessageId)
                  : null;
                const repliedSenderLabel = repliedMessage
                  ? repliedMessage.senderId === currentUserId
                    ? "Bạn"
                    : "Bác sĩ"
                  : "";
                const isReadByOtherParticipant =
                  isMine &&
                  hasParticipantReachedMessage(
                    item.message.id,
                    otherParticipantState?.lastReadMessageId,
                    messageOrder
                  );

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

                      <Pressable
                        onLongPress={(event) =>
                          handleOpenMessageMenu(event, item.message, isDoctor)
                        }
                        delayLongPress={220}
                        onPress={() => {
                          if (messageMenu) {
                            setMessageMenu(null);
                          }
                        }}
                      >
                        <View
                          style={[
                            styles.bubble,
                            isDoctor ? styles.bubbleDoctor : styles.bubblePatient,
                          ]}
                        >
                          {isDoctor ? (
                            <Text style={styles.senderNameSmall}>Bác sĩ</Text>
                          ) : null}

                          {hasAlertTag && alertMessage?.hasStructuredAlertSummary ? (
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
                            <>
                              {repliedMessage ? (
                                <View
                                  style={[
                                    styles.replyPreviewCard,
                                    isDoctor
                                      ? styles.replyPreviewCardDoctor
                                      : styles.replyPreviewCardPatient,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.replyPreviewSender,
                                      isDoctor
                                        ? styles.replyPreviewSenderDoctor
                                        : styles.replyPreviewSenderPatient,
                                    ]}
                                  >
                                    {repliedSenderLabel}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.replyPreviewText,
                                      isDoctor
                                        ? styles.replyPreviewTextDoctor
                                        : styles.replyPreviewTextPatient,
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {getReplyPreviewContent(repliedMessage)}
                                  </Text>
                                </View>
                              ) : null}
                              {(() => {
                                if (
                                  item.message.content.startsWith("{") &&
                                  item.message.content.includes('"type":"video_call_invite"')
                                ) {
                                  try {
                                    const payload = JSON.parse(item.message.content);
                                    if (payload.type === "video_call_invite") {
                                      return (
                                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                                          <Ionicons name="videocam" size={16} color={!isDoctor ? "#EFF6FF" : "#111827"} style={{ marginRight: 6 }} />
                                          <Text
                                            style={[
                                              styles.messageText,
                                              { fontWeight: "600" },
                                              !isDoctor && styles.messageTextPatient,
                                            ]}
                                          >
                                            Đã gửi lời mời gọi video
                                          </Text>
                                        </View>
                                      );
                                    }
                                  } catch (e) {}
                                }
                                return (
                                  <Text
                                    style={[
                                      styles.messageText,
                                      !isDoctor && styles.messageTextPatient,
                                    ]}
                                  >
                                    {item.message.content}
                                  </Text>
                                );
                              })()}
                            </>
                          )}

                          <View style={styles.messageFooterRow}>
                            <Text
                              style={[
                                styles.timeText,
                                isDoctor ? styles.timeTextDoctor : styles.timeTextPatient,
                              ]}
                            >
                              {formatTime(item.message.createdAt)}
                            </Text>
                            {isMine ? (
                              <Ionicons
                                name={isReadByOtherParticipant ? "checkmark-done" : "checkmark"}
                                size={14}
                                color={isReadByOtherParticipant ? "#BAE6FD" : "#E0E7FF"}
                                style={styles.messageStatusIcon}
                              />
                            ) : null}
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
                onPress={() => handleSelectQuickReply(text)}
                activeOpacity={0.85}
              >
                <Text style={styles.quickChipText}>{text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.composerWrapper}>
          <View style={styles.composerInputWrap}>
            {replyTarget ? (
              <View style={styles.replyComposerCard}>
                <View style={styles.replyComposerBody}>
                  <Text style={styles.replyComposerLabel}>Đang trả lời</Text>
                  <Text style={styles.replyComposerSender}>
                    {replyTarget.senderId === currentUserId ? "Bạn" : "Bác sĩ"}
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
            ) : null}
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
  videoCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
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
  replyPreviewCard: {
    marginBottom: 8,
    borderLeftWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  replyPreviewCardDoctor: {
    backgroundColor: "#F8FAFC",
    borderLeftColor: "#93C5FD",
  },
  replyPreviewCardPatient: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderLeftColor: "#BFDBFE",
  },
  replyPreviewSender: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 3,
  },
  replyPreviewSenderDoctor: {
    color: "#2563EB",
  },
  replyPreviewSenderPatient: {
    color: "#DBEAFE",
  },
  replyPreviewText: {
    fontSize: 12,
    lineHeight: 17,
  },
  replyPreviewTextDoctor: {
    color: "#4B5563",
  },
  replyPreviewTextPatient: {
    color: "rgba(239,246,255,0.92)",
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
  messageFooterRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  messageStatusIcon: {
    marginTop: 4,
    marginLeft: 4,
  },
  messageMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.12)",
  },
  messageMenuPopover: {
    position: "absolute",
    width: MESSAGE_MENU_WIDTH,
    borderRadius: 18,
    backgroundColor: "#1F1F1F",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  messageMenuItem: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  messageMenuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 12,
  },
  messageMenuText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#F8FAFC",
  },
  messageMenuTextMuted: {
    fontSize: 15,
    fontWeight: "500",
    color: "#D1D5DB",
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
  replyComposerCard: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  replyComposerBody: {
    flex: 1,
  },
  replyComposerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  replyComposerSender: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  replyComposerText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#6B7280",
  },
  replyComposerClose: {
    marginLeft: 8,
    padding: 2,
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

  // System message styles
  systemMessageWrapper: {
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  systemMessageBubble: {
    maxWidth: "85%",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  systemMessageBubbleAlert: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  systemAlertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  systemAlertBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 3,
  },
  systemMessageText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
  },
  systemMessageTextAlert: {
    color: "#92400E",
    fontWeight: "500",
  },
  systemMessageHint: {
    marginTop: 5,
    fontSize: 11,
    color: "#B45309",
    textAlign: "center",
    fontStyle: "italic",
  },
  systemMessageTime: {
    marginTop: 4,
    fontSize: 10,
    color: "#94A3B8",
    textAlign: "center",
  },
  // ── New 3rd-party system message styles ──────────────────────────────
  systemMsgRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 3,
    paddingHorizontal: 12,
    gap: 7,
  },
  systemAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    flexShrink: 0,
  },
  systemAvatarHigh: { backgroundColor: "#FEE2E2" },
  systemAvatarWarn: { backgroundColor: "#FEF3C7" },
  systemAvatarInfo: { backgroundColor: "#DBEAFE" },
  systemMsgBody: { flex: 1 },
  systemMsgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  systemSenderLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  systemSeverityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  severityHigh: { backgroundColor: "#FEE2E2" },
  severityWarn: { backgroundColor: "#FEF3C7" },
  severityInfo: { backgroundColor: "#DBEAFE" },
  systemSeverityText: { fontSize: 9, fontWeight: "700" },
  severityHighText: { color: "#DC2626" },
  severityWarnText: { color: "#D97706" },
  severityInfoText: { color: "#1D4ED8" },
  systemCard: {
    borderRadius: 12,
    borderTopLeftRadius: 3,
    padding: 9,
    borderWidth: 1,
  },
  systemCardHigh: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FECACA",
  },
  systemCardWarn: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  systemCardInfo: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  violationsBlock: { marginBottom: 7 },
  violationsTitle: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  violationsTitleHigh: { color: "#DC2626" },
  violationsTitleWarn: { color: "#D97706" },
  violationsTitleInfo: { color: "#1D4ED8" },
  violationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  violationItem: {
    width: "47%",
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
  },
  violationItemHigh: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  violationItemWarn: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  violationItemInfo: {
    backgroundColor: "#DBEAFE",
    borderColor: "#BFDBFE",
  },
  violationLabel: {
    fontSize: 9,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 1,
  },
  violationValue: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 1,
  },
  violationValueHigh: { color: "#DC2626" },
  violationValueWarn: { color: "#D97706" },
  violationValueInfo: { color: "#1D4ED8" },
  violationThreshold: {
    fontSize: 9,
    color: "#64748B",
  },
  systemMsgText: {
    fontSize: 12,
    lineHeight: 17,
  },
  systemMsgTextHigh: { color: "#7F1D1D" },
  systemMsgTextWarn: { color: "#78350F" },
  systemMsgTextInfo: { color: "#1E3A8A" },
  systemMsgFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 5,
  },
  systemMsgTime: {
    fontSize: 9,
    color: "#94A3B8",
  },
  systemMsgStatus: {
    fontSize: 9,
    color: "#94A3B8",
  },
});


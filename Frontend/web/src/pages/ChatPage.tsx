import { useEffect, useMemo, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCheck,
  CornerUpLeft,
  Info,
  Loader2,
  MoreVertical,
  Send,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useRealtimeNotification } from "../context/RealtimeNotificationContext";
import {
  getAlerts,
  getPatientById,
  type PatientDetailResponse,
} from "../services/patientService";
import {
  createConversationSocket,
  ensureConversation,
  getConversationMessages,
  type ConversationResponse,
  type MessageResponse,
} from "../services/chatService";
import type { AlertResponse } from "../types/patient";

type SocketState = "idle" | "connecting" | "open" | "closed";

interface WsErrorPayload {
  type: "error";
  code: string;
  error: string;
}

interface WsMessageEnvelope {
  type: "NEW_MESSAGE";
  data: MessageResponse;
}

interface WsDeliveredEnvelope {
  type: "DELIVERED";
  data: {
    userId: string;
    messageId: string;
  };
}

interface WsReadEnvelope {
  type: "READ";
  data: {
    userId: string;
    lastReadMessageId: string;
  };
}

interface ChatLocationState {
  alertSnapshot?: AlertResponse | null;
  prefilledMessage?: string;
  autoSendMessage?: boolean;
}

interface ChatPageProps {
  patientIdOverride?: string | null;
  activeAlertIdOverride?: string | null;
  embedded?: boolean;
  onBack?: () => void;
  onClose?: () => void;
}

function isWsErrorPayload(payload: unknown): payload is WsErrorPayload {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "type" in payload &&
    "error" in payload &&
    (payload as WsErrorPayload).type === "error",
  );
}

function isWsMessageEnvelope(payload: unknown): payload is WsMessageEnvelope {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "type" in payload &&
    "data" in payload &&
    (payload as WsMessageEnvelope).type === "NEW_MESSAGE",
  );
}

function isDirectMessagePayload(payload: unknown): payload is MessageResponse {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "id" in payload &&
    "content" in payload &&
    "senderId" in payload,
  );
}

function isWsDeliveredEnvelope(
  payload: unknown,
): payload is WsDeliveredEnvelope {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "type" in payload &&
    "data" in payload &&
    (payload as WsDeliveredEnvelope).type === "DELIVERED",
  );
}

function isWsReadEnvelope(payload: unknown): payload is WsReadEnvelope {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "type" in payload &&
    "data" in payload &&
    (payload as WsReadEnvelope).type === "READ",
  );
}

function createSendMessagePayload(data: {
  content: string;
  relatedAlertId?: string;
  replyToMessageId?: string;
}) {
  return {
    type: "SEND_MESSAGE" as const,
    data,
  };
}

function createDeliveredPayload(messageId: string) {
  return {
    type: "DELIVERED" as const,
    data: {
      messageId,
    },
  };
}

function createReadPayload(lastReadMessageId: string) {
  return {
    type: "READ" as const,
    data: {
      lastReadMessageId,
    },
  };
}

function sortMessages(messages: MessageResponse[]) {
  return [...messages].sort((a, b) => {
    const timeDiff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return a.id.localeCompare(b.id);
  });
}

function mergeMessages(
  current: MessageResponse[],
  incoming: MessageResponse[],
) {
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

function parseSocketMessages(rawData: string) {
  return rawData
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

function updateConversationParticipantState(
  conversation: ConversationResponse | null,
  userId: string,
  nextState: {
    lastDeliveredMessageId?: string | null;
    lastReadMessageId?: string | null;
  },
) {
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
        : participant,
    ),
  };
}

function hasParticipantReachedMessage(
  messageId: string,
  checkpointMessageId: string | null | undefined,
  messageOrder: Map<string, number>,
) {
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

function getLatestIncomingMessage(
  messages: MessageResponse[],
  currentUserId: string | null | undefined,
) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].senderId !== currentUserId) {
      return messages[index];
    }
  }

  return null;
}

function findLatestAlertMessage(
  messages: MessageResponse[],
  activeAlertId: string | null,
) {
  if (!activeAlertId) {
    return null;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].relatedAlertId === activeAlertId) {
      return messages[index];
    }
  }

  return null;
}

function parseAlertLinkedMessage(
  content: string,
  relatedAlertId?: string | null,
) {
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
      shortAlertId: relatedAlertId.slice(-8),
    };
  }

  const alertPrefix = "Cảnh báo chỉ số:";
  const firstLine = segments[0];

  if (firstLine.startsWith(alertPrefix)) {
    return {
      hasStructuredAlertSummary: true,
      alertSummary: firstLine.slice(alertPrefix.length).trim(),
      note: segments.slice(1).join("\n").trim(),
      shortAlertId: relatedAlertId.slice(-8),
    };
  }

  return {
    hasStructuredAlertSummary: false,
    alertSummary: "",
    note: segments.join("\n").trim(),
    shortAlertId: relatedAlertId.slice(-8),
  };
}

function getReplyPreviewContent(message: MessageResponse) {
  const alertMessage = parseAlertLinkedMessage(
    message.content,
    message.relatedAlertId,
  );
  if (alertMessage?.hasStructuredAlertSummary && alertMessage.alertSummary) {
    return `Cảnh báo chỉ số: ${alertMessage.alertSummary}`;
  }

  const normalized = String(message.content || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "Tin nhắn không có nội dung";
  }

  return normalized.length > 120
    ? `${normalized.slice(0, 117)}...`
    : normalized;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(iso: string) {
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

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getPatientSummary(patient: PatientDetailResponse) {
  const parts = [
    patient.gender || null,
    patient.patientCode ? `Mã hồ sơ ${patient.patientCode}` : null,
    patient.medicalHistory || null,
  ].filter(Boolean);

  return parts.join(" • ");
}

function getViolationLabel(type: string) {
  const labels: Record<string, string> = {
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

const QUICK_TEMPLATES = [
  "Bác tiếp tục theo dõi thêm 24 giờ nhé.",
  "Bác nhớ uống thuốc đúng giờ và đo lại giúp tôi.",
  "Nếu còn khó chịu, bác liên hệ lại ngay để tôi kiểm tra thêm.",
];

const ChatPage = ({
  patientIdOverride,
  activeAlertIdOverride,
  embedded = false,
  onBack,
  onClose,
}: ChatPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams<{ id: string }>();
  const patientId = patientIdOverride ?? params.id;
  const { user } = useAuth();
  const {
    setActiveConversationId: setGlobalActiveConvId,
    markConversationRead: markGlobalConvRead,
  } = useRealtimeNotification();
  const locationState = (location.state as ChatLocationState | null) ?? null;
  const activeAlertId =
    activeAlertIdOverride !== undefined
      ? activeAlertIdOverride
      : searchParams.get("alertId");

  const initialPrefilledMessageRef = useRef(
    locationState?.prefilledMessage || "",
  );
  const initialAutoSendRef = useRef(
    Boolean(
      locationState?.autoSendMessage && locationState?.prefilledMessage?.trim(),
    ),
  );
  const initialAlertSnapshotRef = useRef<AlertResponse | null>(
    locationState?.alertSnapshot || null,
  );
  const autoSendHandledRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastDeliveredSentRef = useRef<string | null>(null);
  const lastReadSentRef = useRef<string | null>(null);

  const [patient, setPatient] = useState<PatientDetailResponse | null>(null);
  const [conversation, setConversation] = useState<ConversationResponse | null>(
    null,
  );
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [draft, setDraft] = useState(
    initialAutoSendRef.current ? "" : initialPrefilledMessageRef.current,
  );
  const [pendingAutoMessage, setPendingAutoMessage] = useState(
    initialAutoSendRef.current ? initialPrefilledMessageRef.current.trim() : "",
  );
  const [alertContext, setAlertContext] = useState<AlertResponse | null>(
    initialAlertSnapshotRef.current,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertContextError, setAlertContextError] = useState<string | null>(
    null,
  );
  const [alertContextLoading, setAlertContextLoading] = useState(
    Boolean(activeAlertId),
  );
  const [socketState, setSocketState] = useState<SocketState>("idle");
  const [replyTarget, setReplyTarget] = useState<MessageResponse | null>(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(
    null,
  );
  const currentUserId = user?.id || null;

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    navigate(-1);
  };

  useEffect(() => {
    if (embedded) {
      return;
    }

    if (location.state) {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      });
    }
  }, [embedded, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    const latestAlertMessage = findLatestAlertMessage(messages, activeAlertId);
    if (latestAlertMessage?.id) {
      const activeNode = messageRefs.current[latestAlertMessage.id];
      if (activeNode) {
        activeNode.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeAlertId, messages]);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      setError("Không tìm thấy bệnh nhân để mở cuộc trò chuyện.");
      return;
    }

    let cancelled = false;

    const loadConversation = async () => {
      setLoading(true);
      setError(null);
      setMessages([]);

      try {
        const [patientData, conversationData] = await Promise.all([
          getPatientById(patientId),
          ensureConversation(patientId),
        ]);

        if (cancelled) {
          return;
        }

        setPatient(patientData);
        setConversation(conversationData);

        const messageData = await getConversationMessages(conversationData.id);
        if (!cancelled) {
          setMessages(sortMessages(messageData));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              "Không thể tải cuộc trò chuyện.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadConversation();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Set/clear active conversation for realtime notification suppression
  useEffect(() => {
    if (!conversation?.id) return;
    setGlobalActiveConvId(conversation.id);
    markGlobalConvRead(conversation.id);
    return () => {
      setGlobalActiveConvId(null);
    };
  }, [conversation?.id, setGlobalActiveConvId, markGlobalConvRead]);

  useEffect(() => {
    if (!activeAlertId || !patientId) {
      setAlertContext(null);
      setAlertContextError(null);
      setAlertContextLoading(false);
      return;
    }

    let cancelled = false;

    const loadAlertContext = async () => {
      setAlertContextLoading(true);
      setAlertContextError(null);

      try {
        const alertList = await getAlerts({ patientId });
        if (cancelled) {
          return;
        }

        const matchedAlert =
          alertList.find((item) => item.id === activeAlertId) ||
          (initialAlertSnapshotRef.current?.id === activeAlertId
            ? initialAlertSnapshotRef.current
            : null);

        setAlertContext(matchedAlert || null);
        if (!matchedAlert) {
          setAlertContextError(
            "Không tìm thấy chi tiết cảnh báo để hiển thị ngữ cảnh.",
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          if (initialAlertSnapshotRef.current?.id === activeAlertId) {
            setAlertContext(initialAlertSnapshotRef.current);
          } else {
            setAlertContext(null);
            setAlertContextError(
              err?.response?.data?.error || "Không thể tải ngữ cảnh cảnh báo.",
            );
          }
        }
      } finally {
        if (!cancelled) {
          setAlertContextLoading(false);
        }
      }
    };

    void loadAlertContext();

    return () => {
      cancelled = true;
    };
  }, [activeAlertId, patientId]);

  useEffect(() => {
    if (!conversation?.id) {
      return undefined;
    }

    setSocketState("connecting");
    const socket = createConversationSocket(conversation.id);
    socketRef.current = socket;

    socket.onopen = () => {
      setSocketState("open");
      setError(null);
    };

    socket.onmessage = (event) => {
      const payloads = parseSocketMessages(String(event.data || ""));

      payloads.forEach((payload) => {
        if (isWsErrorPayload(payload)) {
          setError(payload.error || "Không thể gửi tin nhắn.");
          return;
        }

        if (isWsMessageEnvelope(payload)) {
          setMessages((current) => mergeMessages(current, [payload.data]));
          return;
        }

        if (isWsDeliveredEnvelope(payload)) {
          setConversation((current) =>
            updateConversationParticipantState(current, payload.data.userId, {
              lastDeliveredMessageId: payload.data.messageId,
            }),
          );
          return;
        }

        if (isWsReadEnvelope(payload)) {
          setConversation((current) =>
            updateConversationParticipantState(current, payload.data.userId, {
              lastDeliveredMessageId: payload.data.lastReadMessageId,
              lastReadMessageId: payload.data.lastReadMessageId,
            }),
          );
          return;
        }

        if (isDirectMessagePayload(payload)) {
          setMessages((current) => mergeMessages(current, [payload]));
        }
      });
    };

    socket.onerror = () => {
      setError(
        "Kết nối thời gian thực đang gặp lỗi. Bạn thử tải lại trang nhé.",
      );
    };

    socket.onclose = () => {
      setSocketState("closed");
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [conversation?.id]);

  useEffect(() => {
    if (
      !pendingAutoMessage ||
      autoSendHandledRef.current ||
      socketState !== "open"
    ) {
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload: { content: string; relatedAlertId?: string } = {
      content: pendingAutoMessage,
    };
    if (activeAlertId) {
      payload.relatedAlertId = activeAlertId;
    }

    socketRef.current.send(JSON.stringify(createSendMessagePayload(payload)));
    autoSendHandledRef.current = true;
    setPendingAutoMessage("");
    setError(null);
  }, [activeAlertId, pendingAutoMessage, socketState]);

  useEffect(() => {
    if (!pendingAutoMessage || socketState !== "closed") {
      return;
    }

    setDraft((current) => current || pendingAutoMessage);
    setPendingAutoMessage("");
    setError(
      "Không thể tự gửi lời nhắn đã chuẩn bị. Nội dung đã được giữ lại ở ô soạn tin.",
    );
  }, [pendingAutoMessage, socketState]);

  useEffect(() => {
    setReplyTarget(null);
  }, [conversation?.id]);

  useEffect(() => {
    lastDeliveredSentRef.current = null;
    lastReadSentRef.current = null;
  }, [conversation?.id]);

  useEffect(() => {
    setOpenMessageMenuId(null);
  }, [conversation?.id]);

  useEffect(() => {
    if (!openMessageMenuId) {
      return undefined;
    }

    const handleDocumentClick = () => {
      setOpenMessageMenuId(null);
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [openMessageMenuId]);

  const messageItems = useMemo(() => {
    const items: Array<
      | { type: "day"; key: string; label: string }
      | { type: "message"; key: string; message: MessageResponse }
    > = [];

    let lastLabel = "";
    messages.forEach((message) => {
      const label = formatDayLabel(message.createdAt);
      if (label !== lastLabel) {
        items.push({
          type: "day",
          key: `day-${message.id}`,
          label,
        });
        lastLabel = label;
      }

      items.push({
        type: "message",
        key: message.id,
        message,
      });
    });

    return items;
  }, [messages]);

  const messageLookup = useMemo(() => {
    return new Map(messages.map((message) => [message.id, message]));
  }, [messages]);

  const messageOrder = useMemo(() => {
    return new Map(messages.map((message, index) => [message.id, index]));
  }, [messages]);

  const otherParticipantState = useMemo(() => {
    if (!conversation?.participants || !currentUserId) {
      return null;
    }

    return (
      conversation.participants.find(
        (participant) => participant.userId !== currentUserId,
      ) || null
    );
  }, [conversation?.participants, currentUserId]);

  useEffect(() => {
    if (!replyTarget) {
      return;
    }

    if (!messageLookup.has(replyTarget.id)) {
      setReplyTarget(null);
    }
  }, [messageLookup, replyTarget]);

  useEffect(() => {
    if (
      !conversation?.id ||
      socketState !== "open" ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    const latestIncomingMessage = getLatestIncomingMessage(
      messages,
      currentUserId,
    );
    if (!latestIncomingMessage?.id) {
      return;
    }

    if (lastDeliveredSentRef.current !== latestIncomingMessage.id) {
      socketRef.current.send(
        JSON.stringify(createDeliveredPayload(latestIncomingMessage.id)),
      );
      lastDeliveredSentRef.current = latestIncomingMessage.id;
    }

    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      lastReadSentRef.current !== latestIncomingMessage.id
    ) {
      socketRef.current.send(
        JSON.stringify(createReadPayload(latestIncomingMessage.id)),
      );
      lastReadSentRef.current = latestIncomingMessage.id;
    }
  }, [conversation?.id, currentUserId, messages, socketState]);

  const sendMessage = (rawContent: string) => {
    const content = rawContent.trim();
    if (!content) {
      return false;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("Kết nối chat chưa sẵn sàng để gửi tin nhắn.");
      return false;
    }

    const payload: {
      content: string;
      relatedAlertId?: string;
      replyToMessageId?: string;
    } = { content };
    if (activeAlertId) {
      payload.relatedAlertId = activeAlertId;
    }
    if (replyTarget?.id) {
      payload.replyToMessageId = replyTarget.id;
    }

    socketRef.current.send(JSON.stringify(createSendMessagePayload(payload)));
    setError(null);
    return true;
  };

  const handleSend = (nextContent = draft) => {
    if (!sendMessage(nextContent)) {
      return;
    }

    if (nextContent === draft) {
      setDraft("");
    }
    setReplyTarget(null);
  };

  const clearAlertContext = () => {
    if (activeAlertIdOverride !== undefined) {
      setAlertContext(null);
      setAlertContextError(null);
      setAlertContextLoading(false);
      setPendingAutoMessage("");
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("alertId");
    setSearchParams(nextParams, { replace: true });
    setAlertContext(null);
    setAlertContextError(null);
    setAlertContextLoading(false);
    setPendingAutoMessage("");
  };

  const handleReplyFromMessage = (message: MessageResponse) => {
    setReplyTarget(message);
    setOpenMessageMenuId(null);
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setOpenMessageMenuId(null);
    } catch {
      setError("Không thể sao chép nội dung tin nhắn.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#F0F2F5] dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-[#F0F2F5] px-4 text-center dark:bg-slate-950">
        <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
        <button
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
          onClick={() => navigate(-1)}
        >
          Quay lại
        </button>
      </div>
    );
  }

  const patientSummary = patient ? getPatientSummary(patient) : "";
  const containerClassName = embedded
    ? "flex h-full min-h-0 flex-col overflow-hidden bg-[#F0F2F5] dark:bg-slate-950"
    : "flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded bg-[#F0F2F5] dark:bg-slate-950 dark:ring-1 dark:ring-slate-800/80";

  return (
    <div className={containerClassName}>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3  dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={handleBack}
            >
              <ArrowLeft size={22} />
            </button>

            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-base font-bold leading-tight text-gray-800 dark:text-slate-100">
                  {patient?.name || "Bệnh nhân"}
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {patientSummary || "Trao đổi trực tiếp với bệnh nhân"}
                </p>
              </div>
            </div>
          </div>

          {onClose ? (
            <button
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={onClose}
              aria-label="Đóng chat nhanh"
            >
              <X size={20} />
            </button>
          ) : (
            <button className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800">
              <MoreVertical size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        {error && conversation ? (
          <div className="mb-4 rounded border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {activeAlertId ? (
          <section className="mb-4 rounded border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-500/20 dark:bg-slate-900 dark:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300">
                  Ngữ cảnh cảnh báo
                </div>
                <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  Tin nhắn mới sẽ được gắn với cảnh báo này
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Alert ID:{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {activeAlertId}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={clearAlertContext}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                <X size={16} />
                Bỏ ngữ cảnh
              </button>
            </div>
            <div className="mt-4 rounded-lg bg-amber-50/70 p-4 dark:bg-amber-500/10">
              {alertContextLoading ? (
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải chi tiết cảnh báo...
                </div>
              ) : alertContext ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium ${
                        alertContext.severity === "high"
                          ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                      }`}
                    >
                      {alertContext.severity === "high" ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <Info size={14} />
                      )}
                      {alertContext.severity === "high"
                        ? "Nghiêm trọng"
                        : "Thông tin"}
                    </span>
                    <span
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        alertContext.status === "ack"
                          ? "bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {alertContext.status === "ack"
                        ? "Đã xác nhận"
                        : "Chờ xử lý"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Đo lúc {formatDateTime(alertContext.createdAt)}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {alertContext.violations.map((violation, index) => (
                      <div
                        key={`${alertContext.id}-${index}`}
                        className="rounded-lg border border-white/80 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950/70"
                      >
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {getViolationLabel(violation.type)}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-red-600 dark:text-red-300">
                          {violation.observed}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Ngưỡng tham chiếu: {violation.threshold}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-amber-700 dark:text-amber-200">
                  {alertContextError ||
                    "Không có dữ liệu chi tiết cho cảnh báo này."}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {messageItems.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm rounded-lg border border-dashed border-gray-300 bg-white px-6 py-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Cuộc trò chuyện này chưa có tin nhắn nào. Bạn có thể gửi lời nhắn
              đầu tiên cho bệnh nhân ở khung bên dưới.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messageItems.map((item) => {
              if (item.type === "day") {
                return (
                  <div key={item.key} className="flex justify-center">
                    <span className="rounded-md bg-gray-200 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                      {item.label}
                    </span>
                  </div>
                );
              }

              const isMe = item.message.senderId === currentUserId;
              const isActiveAlertMessage =
                Boolean(activeAlertId) &&
                item.message.relatedAlertId === activeAlertId;
              const hasAlertTag = Boolean(item.message.relatedAlertId);
              const alertMessage = parseAlertLinkedMessage(
                item.message.content,
                item.message.relatedAlertId,
              );
              const repliedMessage = item.message.replyToMessageId
                ? messageLookup.get(item.message.replyToMessageId)
                : null;
              const repliedSenderLabel = repliedMessage
                ? repliedMessage.senderId === currentUserId
                  ? "Bạn"
                  : patient?.name || "Bệnh nhân"
                : "";
              const isReadByOtherParticipant =
                isMe &&
                hasParticipantReachedMessage(
                  item.message.id,
                  otherParticipantState?.lastReadMessageId,
                  messageOrder,
                );

              return (
                <div
                  key={item.key}
                  ref={(node) => {
                    messageRefs.current[item.message.id] = node;
                  }}
                  className={`group flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative flex items-center gap-2 ${isMe ? "flex-row" : "flex-row-reverse"}`}
                  >
                    <div
                      className={`pointer-events-none flex items-center gap-1 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 ${
                        openMessageMenuId === item.message.id
                          ? "pointer-events-auto opacity-100"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleReplyFromMessage(item.message)}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <CornerUpLeft size={16} />
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMessageMenuId((current) =>
                              current === item.message.id
                                ? null
                                : item.message.id,
                            );
                          }}
                          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openMessageMenuId === item.message.id ? (
                          <div
                            className={`absolute top-full z-20 mt-2 min-w-42.5 rounded-2xl border border-slate-200 bg-white p-2 text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${
                              isMe ? "left-0" : "right-0"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCopyMessage(item.message.content);
                              }}
                              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Sao chép nội dung
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={`max-w-[78%] rounded-lg px-4 py-3 text-sm shadow-sm ${
                        isMe
                          ? "rounded-tr-sm bg-blue-600 text-white dark:bg-blue-500"
                          : "rounded-tl-sm border border-gray-100 bg-white text-gray-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      } ${isActiveAlertMessage ? "ring-2 ring-amber-300 ring-offset-2 dark:ring-amber-400/70 dark:ring-offset-slate-950" : ""}`}
                    >
                      {hasAlertTag ? (
                        <div
                          className={`mb-3 inline-flex rounded-md px-2.5 py-1 text-[11px] font-medium ${
                            isMe
                              ? "bg-white/15 text-blue-50 dark:bg-white/10 dark:text-blue-100"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                          }`}
                        >
                          {isActiveAlertMessage
                            ? "Đang xem từ cảnh báo này"
                            : "Tin nhắn có gắn cảnh báo"}
                        </div>
                      ) : null}

                      {hasAlertTag &&
                      alertMessage?.hasStructuredAlertSummary ? (
                        <div className="space-y-3">
                          <div
                            className={`rounded-lg border px-3 py-3 ${
                              isMe
                                ? "border-white/15 bg-white/10 text-blue-50"
                                : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
                            }`}
                          >
                            <div
                              className={`mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                isMe
                                  ? "text-blue-100"
                                  : "text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              <AlertTriangle size={14} />
                              Thông tin cảnh báo
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {alertMessage.alertSummary ||
                                "Tin nhắn này được gửi trong ngữ cảnh một cảnh báo theo dõi sức khỏe."}
                            </p>
                            <div
                              className={`mt-3 text-[11px] ${
                                isMe
                                  ? "text-blue-100/90"
                                  : "text-amber-700/80 dark:text-amber-300/80"
                              }`}
                            >
                              Alert #{alertMessage.shortAlertId}
                            </div>
                          </div>

                          {alertMessage.note ? (
                            <div
                              className={`rounded-lg px-3 py-3 ${
                                isMe
                                  ? "bg-white/12 text-white"
                                  : "border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
                              }`}
                            >
                              <div
                                className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                  isMe
                                    ? "text-blue-100"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                Lời nhắn bác sĩ
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed">
                                {alertMessage.note}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          {repliedMessage ? (
                            <div
                              className={`mb-3 rounded-lg border-l-4 px-3 py-2 ${
                                isMe
                                  ? "border-white/55 bg-white/12 text-blue-50"
                                  : "border-blue-300 bg-slate-50 text-slate-600 dark:border-blue-500/60 dark:bg-slate-900 dark:text-slate-300"
                              }`}
                            >
                              <div
                                className={`text-[11px] font-semibold ${
                                  isMe
                                    ? "text-blue-100"
                                    : "text-blue-700 dark:text-blue-300"
                                }`}
                              >
                                {repliedSenderLabel}
                              </div>
                              <div className="mt-1 text-[13px] leading-5 opacity-90">
                                {getReplyPreviewContent(repliedMessage)}
                              </div>
                            </div>
                          ) : null}
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {item.message.content}
                          </p>
                        </>
                      )}

                      <div
                        className={`mt-3 flex items-center justify-end gap-1 text-[11px] ${
                          isMe
                            ? "text-blue-100"
                            : "text-gray-400 dark:text-slate-500"
                        }`}
                      >
                        <span>{formatTime(item.message.createdAt)}</span>
                        {isMe ? (
                          isReadByOtherParticipant ? (
                            <CheckCheck size={14} className="text-cyan-200" />
                          ) : (
                            <Check size={14} className="text-blue-100" />
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-gray-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/70">
          {QUICK_TEMPLATES.map((template) => (
            <button
              key={template}
              className="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50 dark:border-blue-500/20 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-500/10"
              onClick={() => setDraft(template)}
            >
              {template}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-3 p-3">
          <div className="flex-1 rounded-3xl bg-gray-100 px-4 py-3 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 dark:bg-slate-800 dark:focus-within:bg-slate-800 dark:focus-within:ring-blue-500/40">
            {replyTarget ? (
              <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-2 dark:border-blue-500/20 dark:bg-slate-900">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                    Đang trả lời
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                    {replyTarget.senderId === currentUserId
                      ? "Bạn"
                      : patient?.name || "Bệnh nhân"}
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                    {getReplyPreviewContent(replyTarget)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}
            <textarea
              placeholder={
                activeAlertId
                  ? "Nhập tư vấn cho bệnh nhân, tin nhắn sẽ gắn với cảnh báo đang mở..."
                  : "Nhập tư vấn hoặc nhận xét..."
              }
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              className="max-h-32 min-h-6 w-full resize-none border-none bg-transparent py-1 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-slate-700"
            disabled={!draft.trim()}
            onClick={() => handleSend()}
          >
            <Send size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatPage;

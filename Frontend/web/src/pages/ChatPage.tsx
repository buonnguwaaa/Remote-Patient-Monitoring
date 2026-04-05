import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CornerUpLeft,
  Info,
  Loader2,
  MoreVertical,
  Send,
  User,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { getAlerts, getPatientById, type PatientDetailResponse } from "../services/patientService";
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

interface ChatLocationState {
  alertSnapshot?: AlertResponse | null;
  prefilledMessage?: string;
  autoSendMessage?: boolean;
}

function isWsErrorPayload(payload: unknown): payload is WsErrorPayload {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "type" in payload &&
      "error" in payload &&
      (payload as WsErrorPayload).type === "error"
  );
}

function sortMessages(messages: MessageResponse[]) {
  return [...messages].sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return a.id.localeCompare(b.id);
  });
}

function mergeMessages(current: MessageResponse[], incoming: MessageResponse[]) {
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

function findLatestAlertMessage(
  messages: MessageResponse[],
  activeAlertId: string | null
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
  relatedAlertId?: string | null
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
  const alertMessage = parseAlertLinkedMessage(message.content, message.relatedAlertId);
  if (alertMessage?.hasStructuredAlertSummary && alertMessage.alertSummary) {
    return `Cảnh báo chỉ số: ${alertMessage.alertSummary}`;
  }

  const normalized = String(message.content || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Tin nhắn không có nội dung";
  }

  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
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

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: patientId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const locationState = (location.state as ChatLocationState | null) ?? null;
  const activeAlertId = searchParams.get("alertId");

  const initialPrefilledMessageRef = useRef(locationState?.prefilledMessage || "");
  const initialAutoSendRef = useRef(
    Boolean(locationState?.autoSendMessage && locationState?.prefilledMessage?.trim())
  );
  const initialAlertSnapshotRef = useRef<AlertResponse | null>(
    locationState?.alertSnapshot || null
  );
  const autoSendHandledRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [patient, setPatient] = useState<PatientDetailResponse | null>(null);
  const [conversation, setConversation] = useState<ConversationResponse | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [draft, setDraft] = useState(
    initialAutoSendRef.current ? "" : initialPrefilledMessageRef.current
  );
  const [pendingAutoMessage, setPendingAutoMessage] = useState(
    initialAutoSendRef.current ? initialPrefilledMessageRef.current.trim() : ""
  );
  const [alertContext, setAlertContext] = useState<AlertResponse | null>(
    initialAlertSnapshotRef.current
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertContextError, setAlertContextError] = useState<string | null>(null);
  const [alertContextLoading, setAlertContextLoading] = useState(Boolean(activeAlertId));
  const [socketState, setSocketState] = useState<SocketState>("idle");
  const [replyTarget, setReplyTarget] = useState<MessageResponse | null>(null);

  useEffect(() => {
    if (location.state) {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      });
    }
  }, [location.pathname, location.search, location.state, navigate]);

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
            err?.response?.data?.error || err?.message || "Không thể tải cuộc trò chuyện."
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
          setAlertContextError("Không tìm thấy chi tiết cảnh báo để hiển thị ngữ cảnh.");
        }
      } catch (err: any) {
        if (!cancelled) {
          if (initialAlertSnapshotRef.current?.id === activeAlertId) {
            setAlertContext(initialAlertSnapshotRef.current);
          } else {
            setAlertContext(null);
            setAlertContextError(
              err?.response?.data?.error || "Không thể tải ngữ cảnh cảnh báo."
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

        setMessages((current) => mergeMessages(current, [payload as MessageResponse]));
      });
    };

    socket.onerror = () => {
      setError("Kết nối thời gian thực đang gặp lỗi. Bạn thử tải lại trang nhé.");
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
    if (!pendingAutoMessage || autoSendHandledRef.current || socketState !== "open") {
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

    socketRef.current.send(JSON.stringify(payload));
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
    setError("Không thể tự gửi lời nhắn đã chuẩn bị. Nội dung đã được giữ lại ở ô soạn tin.");
  }, [pendingAutoMessage, socketState]);

  useEffect(() => {
    setReplyTarget(null);
  }, [conversation?.id]);

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

  useEffect(() => {
    if (!replyTarget) {
      return;
    }

    if (!messageLookup.has(replyTarget.id)) {
      setReplyTarget(null);
    }
  }, [messageLookup, replyTarget]);

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

    socketRef.current.send(JSON.stringify(payload));
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
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("alertId");
    setSearchParams(nextParams, { replace: true });
    setAlertContext(null);
    setAlertContextError(null);
    setAlertContextLoading(false);
    setPendingAutoMessage("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#F0F2F5]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-[#F0F2F5] px-4 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          onClick={() => navigate(-1)}
        >
          Quay lại
        </button>
      </div>
    );
  }

  const patientSummary = patient ? getPatientSummary(patient) : "";

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl bg-[#F0F2F5] shadow-sm">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={22} />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 text-indigo-600">
                <User size={20} />
              </div>

              <div>
                <h1 className="text-base font-bold leading-tight text-gray-800">
                  {patient?.name || "Bệnh nhân"}
                </h1>
                <p className="text-xs text-gray-500">
                  {patientSummary || "Trao đổi trực tiếp với bệnh nhân"}
                </p>
                <p
                  className={`mt-1 text-[11px] font-medium ${
                    socketState === "open" ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  {socketState === "open"
                    ? "Đang kết nối thời gian thực"
                    : "Đang đồng bộ cuộc trò chuyện"}
                </p>
              </div>
            </div>
          </div>

          <button className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        {error && conversation ? (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {activeAlertId ? (
          <section className="mb-4 rounded-3xl border border-amber-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                  Ngữ cảnh cảnh báo
                </div>
                <h2 className="mt-2 text-base font-semibold text-slate-900">
                  Tin nhắn mới sẽ được gắn với cảnh báo này
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Alert ID: <span className="font-medium text-slate-700">{activeAlertId}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={clearAlertContext}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <X size={16} />
                Bỏ ngữ cảnh
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-amber-50/70 p-4">
              {alertContextLoading ? (
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải chi tiết cảnh báo...
                </div>
              ) : alertContext ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        alertContext.severity === "high"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {alertContext.severity === "high" ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <Info size={14} />
                      )}
                      {alertContext.severity === "high" ? "Nghiêm trọng" : "Thông tin"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        alertContext.status === "ack"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {alertContext.status === "ack" ? "Đã xác nhận" : "Chờ xử lý"}
                    </span>
                    <span className="text-xs text-slate-500">
                      Đo lúc {formatDateTime(alertContext.createdAt)}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {alertContext.violations.map((violation, index) => (
                      <div
                        key={`${alertContext.id}-${index}`}
                        className="rounded-2xl border border-white/80 bg-white px-4 py-3"
                      >
                        <div className="text-sm font-medium text-slate-800">
                          {getViolationLabel(violation.type)}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-red-600">
                          {violation.observed}
                        </div>
                        <div className="text-xs text-slate-500">
                          Ngưỡng tham chiếu: {violation.threshold}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-amber-700">
                  {alertContextError || "Không có dữ liệu chi tiết cho cảnh báo này."}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {messageItems.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-8 text-center text-sm text-gray-500">
              Cuộc trò chuyện này chưa có tin nhắn nào. Bạn có thể gửi lời nhắn đầu tiên
              cho bệnh nhân ở khung bên dưới.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messageItems.map((item) => {
              if (item.type === "day") {
                return (
                  <div key={item.key} className="flex justify-center">
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      {item.label}
                    </span>
                  </div>
                );
              }

              const isMe = item.message.senderId === user?.id;
              const isActiveAlertMessage =
                Boolean(activeAlertId) && item.message.relatedAlertId === activeAlertId;
              const hasAlertTag = Boolean(item.message.relatedAlertId);
              const alertMessage = parseAlertLinkedMessage(
                item.message.content,
                item.message.relatedAlertId
              );
              const repliedMessage = item.message.replyToMessageId
                ? messageLookup.get(item.message.replyToMessageId)
                : null;
              const repliedSenderLabel = repliedMessage
                ? repliedMessage.senderId === user?.id
                  ? "Bạn"
                  : patient?.name || "Bệnh nhân"
                : "";

              return (
                <div
                  key={item.key}
                  ref={(node) => {
                    messageRefs.current[item.message.id] = node;
                  }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
                      isMe
                        ? "rounded-tr-md bg-blue-600 text-white"
                        : "rounded-tl-md border border-gray-100 bg-white text-gray-800"
                    } ${isActiveAlertMessage ? "ring-2 ring-amber-300 ring-offset-2" : ""}`}
                  >
                    {hasAlertTag ? (
                      <div
                        className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          isMe
                            ? "bg-white/15 text-blue-50"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isActiveAlertMessage ? "Đang xem từ cảnh báo này" : "Tin nhắn có gắn cảnh báo"}
                      </div>
                    ) : null}

                    {hasAlertTag && alertMessage?.hasStructuredAlertSummary ? (
                      <div className="space-y-3">
                        <div
                          className={`rounded-2xl border px-3 py-3 ${
                            isMe
                              ? "border-white/15 bg-white/10 text-blue-50"
                              : "border-amber-200 bg-amber-50 text-amber-950"
                          }`}
                        >
                          <div
                            className={`mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                              isMe ? "text-blue-100" : "text-amber-700"
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
                              isMe ? "text-blue-100/90" : "text-amber-700/80"
                            }`}
                          >
                            Alert #{alertMessage.shortAlertId}
                          </div>
                        </div>

                        {alertMessage.note ? (
                          <div
                            className={`rounded-2xl px-3 py-3 ${
                              isMe
                                ? "bg-white/12 text-white"
                                : "border border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div
                              className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                isMe ? "text-blue-100" : "text-slate-500"
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
                            className={`mb-3 rounded-2xl border-l-4 px-3 py-2 ${
                              isMe
                                ? "border-white/55 bg-white/12 text-blue-50"
                                : "border-blue-300 bg-slate-50 text-slate-600"
                            }`}
                          >
                            <div
                              className={`text-[11px] font-semibold ${
                                isMe ? "text-blue-100" : "text-blue-700"
                              }`}
                            >
                              {repliedSenderLabel}
                            </div>
                            <div className="mt-1 text-[13px] leading-5 opacity-90">
                              {getReplyPreviewContent(repliedMessage)}
                            </div>
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap leading-relaxed">{item.message.content}</p>
                      </>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setReplyTarget(item.message)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                          isMe
                            ? "bg-white/12 text-blue-50 hover:bg-white/18"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <CornerUpLeft size={12} />
                        Trả lời
                      </button>

                      <div
                        className={`text-right text-[11px] ${
                          isMe ? "text-blue-100" : "text-gray-400"
                        }`}
                      >
                        {formatTime(item.message.createdAt)}
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

      <footer className="border-t border-gray-200 bg-white">
        <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-gray-50 px-4 py-2">
          {QUICK_TEMPLATES.map((template) => (
            <button
              key={template}
              className="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
              onClick={() => setDraft(template)}
            >
              {template}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-3 p-3">
          <div className="flex-1 rounded-3xl bg-gray-100 px-4 py-3 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500">
            {replyTarget ? (
              <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                    Đang trả lời
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-700">
                    {replyTarget.senderId === user?.id ? "Bạn" : patient?.name || "Bệnh nhân"}
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-500">
                    {getReplyPreviewContent(replyTarget)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
              className="max-h-32 min-h-[24px] w-full resize-none border-none bg-transparent py-1 text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>

          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
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

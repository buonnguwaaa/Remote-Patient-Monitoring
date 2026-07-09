import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaCommentDots, FaSearch, FaSyncAlt } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import ChatPage from "./ChatPage";
import { useAuth } from "../context/AuthContext";
import { useRealtimeNotification } from "../context/RealtimeNotificationContext";
import {
  getUserConversations,
  type MessageResponse,
} from "../services/chatService";
import { getMyPatients } from "../services/patientService";

interface ConversationPreview {
  conversationId: string;
  patientId: string | null;
  patientName: string;
  lastMessage: MessageResponse | null;
  updatedAt: string;
}

const formatListTime = (value: string) => {
  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

const normalizePreview = (message: MessageResponse | null, isMe: boolean, t: (key: string) => string) => {
  if (!message) {
    return t("chat.noMessages");
  }

  const textContent = message.content || "";

  if (textContent.includes('"type":"SYSTEM_CALL_STARTED"')) {
    return "📞 Bác sĩ đang gọi video...";
  } else if (textContent.includes('"type":"SYSTEM_CALL_ENDED"')) {
    return "📞 Cuộc gọi video đã kết thúc";
  } else if (textContent.includes('"type":"video_call_invite"')) {
    return "📞 Lời mời gọi video";
  } else if (textContent.includes('"type":"video_call_ended"')) {
    return "📞 Cuộc gọi video đã kết thúc";
  } else if (textContent.includes('"type":"SYSTEM_')) {
    return "📞 Cuộc gọi video";
  }

  const normalized = String(textContent)
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return t("chat.noContent");
  }

  const prefix = isMe ? `${t("chat.you")}: ` : "";
  const snippet =
    normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
  return `${prefix}${snippet}`;
};

const ChatListPage = () => {
  const navigate = useNavigate();
  const { id: selectedPatientId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const {
    unreadByConversation,
    lastChatEvent,
    markConversationRead,
  } = useRealtimeNotification();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadConversations = async () => {
    if (!user?.id) {
      setError(t("chat.loadingError"));
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      setError(null);

      const [assignmentList, conversationPayload] = await Promise.all([
        getMyPatients(),
        getUserConversations({ limit: 30 }),
      ]);

      const assignmentMap = new Map(
        assignmentList.map((assignment) => [assignment.patientId, assignment]),
      );

      // lastMessage is already embedded by the backend on each conversation
      // (see GetUserConversations), so no per-conversation message fetch is
      // needed here anymore.
      const previews = conversationPayload.conversations.map(
        (conversation) => {
          const otherParticipant =
            conversation.participants.find((p) => p.userId !== user.id)
              ?.userId ||
            conversation.participants[0]?.userId ||
            null;

          const assignment = otherParticipant
            ? assignmentMap.get(otherParticipant)
            : undefined;

          const lastMessage: MessageResponse | null =
            conversation.lastMessage || null;

          return {
            conversationId: conversation.id,
            patientId: otherParticipant,
            patientName: assignment?.patientName || t("chat.patient"),
            lastMessage,
            updatedAt: lastMessage?.createdAt || conversation.updatedAt,
          } as ConversationPreview;
        },
      );

      previews.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      const seen = new Set<string>();
      const deduped: ConversationPreview[] = [];

      previews.forEach((item) => {
        const key = item.patientId || item.conversationId;
        if (seen.has(key)) {
          return;
        }

        seen.add(key);
        deduped.push(item);
      });

      setConversations(deduped);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          t("chat.cannotLoadConversations"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, [user?.id]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conversations;

    return conversations.filter((conversation) =>
      conversation.patientName.toLowerCase().includes(normalizedQuery),
    );
  }, [conversations, query]);

  // React to lastChatEvent: update preview and reorder
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!lastChatEvent) return;

    const convId = lastChatEvent.data.conversationId;
    const existing = conversations.find((c) => c.conversationId === convId);

    if (existing) {
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.conversationId !== convId) return c;
          return {
            ...c,
            lastMessage: lastChatEvent.data.message
              ? {
                  id: lastChatEvent.data.message.id,
                  conversationId: lastChatEvent.data.message.conversationId,
                  senderId: lastChatEvent.data.message.senderId || "",
                  content: lastChatEvent.data.message.content,
                  createdAt: lastChatEvent.data.message.createdAt,
                  updatedAt: lastChatEvent.data.message.updatedAt,
                }
              : c.lastMessage,
            updatedAt: lastChatEvent.createdAt,
          };
        });
        return updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      });
    } else {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      refreshDebounceRef.current = setTimeout(() => {
        void loadConversations();
      }, 2000);
    }

    return () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
  }, [lastChatEvent]);

  const handleOpenChat = (item: ConversationPreview) => {
    if (!item.patientId) {
      return;
    }

    markConversationRead(item.conversationId);

    const target =
      window.innerWidth >= 1024
        ? `/patient/chats/${item.patientId}`
        : `/patient/chat/${item.patientId}`;
    navigate(target);
  };

  return (
    <div className="h-full min-h-screen bg-gray-50 p-2 dark:bg-slate-950 sm:p-4">
      <div className="grid h-full gap-2 lg:grid-cols-[360px_1fr]">
        <section className="h-full rounded border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("chat.searchPatients")}
                  className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-500/20"
                />
              </div>
              <button
                type="button"
                onClick={() => void loadConversations()}
                disabled={refreshing}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("chat.loadingConversations")}
              
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("chat.noConversations")}
               
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const isMe = conversation.lastMessage?.senderId === user?.id;
                const preview = normalizePreview(
                  conversation.lastMessage,
                  Boolean(isMe),
                  t,
                );
                const timeLabel = formatListTime(conversation.updatedAt);
                const isActive =
                  Boolean(selectedPatientId) &&
                  conversation.patientId === selectedPatientId;

                return (
                  <button
                    key={conversation.conversationId}
                    type="button"
                    onClick={() => handleOpenChat(conversation)}
                    className={`flex w-full flex-col gap-2 border-b border-slate-100 px-4 py-3 text-left transition dark:border-slate-800 ${
                      isActive
                        ? "bg-blue-50/70 dark:bg-blue-500/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {conversation.patientName}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          {preview}
                        </div>
                      </div>
                      <div className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
                        {timeLabel}
                      </div>
                      {(unreadByConversation[conversation.conversationId] || 0) > 0 && (
                        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {unreadByConversation[conversation.conversationId] > 99
                            ? "99+"
                            : unreadByConversation[conversation.conversationId]}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="hidden lg:block">
          {selectedPatientId ? (
            <ChatPage />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <FaCommentDots className="mb-3 text-3xl text-slate-300 dark:text-slate-600" />
                {t("chat.selectConversation")}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ChatListPage;

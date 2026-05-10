import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageCircle, RefreshCcw, Search, X } from "lucide-react";

import ChatPage from "../../pages/ChatPage.tsx";
import { useAuth } from "../../context/AuthContext";
import {
  getConversationMessages,
  getUserConversations,
  type MessageResponse,
} from "../../services/chatService";
import { getMyPatients } from "../../services/patientService";

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

const normalizePreview = (message: MessageResponse | null, isMe: boolean) => {
  if (!message) {
    return "Chua co tin nhan";
  }

  const normalized = String(message.content || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "Tin nhan khong co noi dung";
  }

  const prefix = isMe ? "Ban: " : "";
  const snippet =
    normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
  return `${prefix}${snippet}`;
};

const QuickChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");
  const [activeConversation, setActiveConversation] =
    useState<ConversationPreview | null>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const hasLoadedRef = useRef(false);

  const loadConversations = async (mode: "initial" | "refresh" = "initial") => {
    if (!user?.id) {
      setError("Khong tim thay thong tin bac si de tai cuoc tro chuyen.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (mode === "initial") {
      setLoading(true);
    }
    if (mode === "refresh") {
      setRefreshing(true);
    }

    try {
      setError(null);

      const [assignmentList, conversationPayload] = await Promise.all([
        getMyPatients(),
        getUserConversations({ limit: 20 }),
      ]);

      const assignmentMap = new Map(
        assignmentList.map((assignment) => [assignment.patientId, assignment]),
      );

      const previews = await Promise.all(
        conversationPayload.conversations.map(async (conversation) => {
          const otherParticipant =
            conversation.participants.find(
              (participant) => participant.userId !== user.id,
            )?.userId ||
            conversation.participants[0]?.userId ||
            null;

          const assignment = otherParticipant
            ? assignmentMap.get(otherParticipant)
            : undefined;

          let lastMessage: MessageResponse | null = null;
          try {
            const messages = await getConversationMessages(conversation.id, 1);
            lastMessage = messages[0] || null;
          } catch {
            lastMessage = null;
          }

          return {
            conversationId: conversation.id,
            patientId: otherParticipant,
            patientName: assignment?.patientName || "Benh nhan",
            lastMessage,
            updatedAt: lastMessage?.createdAt || conversation.updatedAt,
          } as ConversationPreview;
        }),
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
      hasLoadedRef.current = true;
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Khong the tai danh sach cuoc tro chuyen.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!hasLoadedRef.current) {
      void loadConversations("initial");
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setView("list");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setConversations([]);
    setError(null);
    setQuery("");
  }, [user?.id]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) =>
      conversation.patientName.toLowerCase().includes(normalizedQuery),
    );
  }, [conversations, query]);

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setView("list");
      }
      return next;
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setView("list");
  };

  const handleOpenChat = (conversation: ConversationPreview) => {
    if (!conversation.patientId) {
      return;
    }

    setActiveConversation(conversation);
    setView("chat");
  };

  const handleBackToList = () => {
    setView("list");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls="quick-chat-panel"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        <MessageCircle size={22} />
      </button>

      {isOpen ? (
        <div
          id="quick-chat-panel"
          className="fixed bottom-24 right-4 z-50 flex h-130 w-90 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:right-6"
        >
          {view === "list" ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  <MessageCircle size={18} />
                  Tin nhan nhanh
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Dong chat nhanh"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tim benh nhan..."
                    className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void loadConversations("refresh")}
                  disabled={refreshing}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Lam moi danh sach chat"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    Dang tai cuoc tro chuyen...
                  </div>
                ) : error ? (
                  <div className="p-4 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    Khong co cuoc tro chuyen phu hop.
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const isMe =
                      conversation.lastMessage?.senderId === user?.id;
                    const preview = normalizePreview(
                      conversation.lastMessage,
                      Boolean(isMe),
                    );
                    const timeLabel = formatListTime(conversation.updatedAt);
                    const isActive =
                      activeConversation?.patientId === conversation.patientId;

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
                          <div className="whitespace-nowrap text-[11px] text-slate-400 dark:text-slate-500">
                            {timeLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : activeConversation?.patientId ? (
            <div className="flex h-full min-h-0 flex-col">
              <ChatPage
                key={activeConversation.patientId}
                patientIdOverride={activeConversation.patientId}
                activeAlertIdOverride={null}
                embedded
                onBack={handleBackToList}
                onClose={handleClose}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-sm text-slate-500 dark:text-slate-400">
              Khong tim thay benh nhan de mo chat.
            </div>
          )}
        </div>
      ) : null}
    </>
  );
};

export default QuickChatWidget;

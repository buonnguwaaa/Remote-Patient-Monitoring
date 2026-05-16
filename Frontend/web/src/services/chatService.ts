import api from "./api";

export interface ConversationParticipantResponse {
  userId: string;
  lastReadMessageId?: string | null;
  lastDeliveredMessageId?: string | null;
}

export interface ConversationResponse {
  id: string;
  participants: ConversationParticipantResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationPaging {
  hasMore: boolean;
  nextCursor?: string;
}

export interface GetConversationsResponse {
  conversations: ConversationResponse[];
  paging: ConversationPaging;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  replyToMessageId?: string | null;
  relatedAlertId?: string | null;
  messageSource?: "user" | "system";
  createdAt: string;
  updatedAt: string;
}

interface MessagesApiPayload {
  messages?: MessageResponse[] | null;
}

interface ConversationApiResponse {
  id: string;
  participants?: Array<{
    userId: string;
    lastReadMessageId?: string | null;
    lastDeliveredMessageId?: string | null;
  }> | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversationsApiPayload {
  conversations?: ConversationApiResponse[] | null;
  paging?: {
    hasMore?: boolean;
    nextCursor?: string;
  } | null;
}

function normalizeConversationResponse(
  conversation: ConversationApiResponse,
): ConversationResponse {
  return {
    id: conversation.id,
    participants: (conversation.participants || []).map((participant) => ({
      userId: participant.userId,
      lastReadMessageId: participant.lastReadMessageId || null,
      lastDeliveredMessageId: participant.lastDeliveredMessageId || null,
    })),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function getWebSocketBaseUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api`;
}

export async function ensureConversation(
  participantId: string,
): Promise<ConversationResponse> {
  const response = await api.post<{ data: ConversationApiResponse }>(
    "/chat/conversations",
    {
      participantIds: [participantId],
    },
  );

  return normalizeConversationResponse(response.data.data);
}

export async function getUserConversations(params?: {
  limit?: number;
  cursor?: string;
}): Promise<GetConversationsResponse> {
  const response = await api.get<{ data: ConversationsApiPayload }>(
    "/chat/conversations",
    {
      params: {
        limit: params?.limit,
        cursor: params?.cursor,
      },
    },
  );

  const payload = response.data.data || {};
  const conversations = (payload.conversations || []).map(
    normalizeConversationResponse,
  );
  const paging = payload.paging || {};

  return {
    conversations,
    paging: {
      hasMore: Boolean(paging.hasMore),
      nextCursor: paging.nextCursor,
    },
  };
}

export async function getConversationMessages(
  conversationId: string,
  limit = 100,
): Promise<MessageResponse[]> {
  const response = await api.get<{ data: MessagesApiPayload }>(
    `/chat/conversations/${conversationId}/messages`,
    {
      params: { limit },
    },
  );

  return response.data.data?.messages || [];
}

export function createConversationSocket(conversationId: string) {
  return new WebSocket(
    `${getWebSocketBaseUrl()}/chat/ws?conversationId=${encodeURIComponent(
      conversationId,
    )}`,
  );
}

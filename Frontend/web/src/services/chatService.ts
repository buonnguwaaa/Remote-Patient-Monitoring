import api from "./api";

export interface ConversationResponse {
  id: string;
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  replyToMessageId?: string | null;
  relatedAlertId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MessagesApiPayload {
  messages?: MessageResponse[] | null;
}

function getWebSocketBaseUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api`;
}

export async function ensureConversation(
  participantId: string
): Promise<ConversationResponse> {
  const response = await api.post<{ data: ConversationResponse }>(
    "/chat/conversations",
    {
      participantIds: [participantId],
    }
  );

  return response.data.data;
}

export async function getConversationMessages(
  conversationId: string,
  limit = 100
): Promise<MessageResponse[]> {
  const response = await api.get<{ data: MessagesApiPayload }>(
    `/chat/conversations/${conversationId}/messages`,
    {
      params: { limit },
    }
  );

  return response.data.data?.messages || [];
}

export function createConversationSocket(conversationId: string) {
  return new WebSocket(
    `${getWebSocketBaseUrl()}/chat/ws?conversationId=${encodeURIComponent(
      conversationId
    )}`
  );
}

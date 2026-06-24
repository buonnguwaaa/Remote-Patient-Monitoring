import type { MessageResponse } from "./chatService";

export interface RealtimeChatEventData {
  conversationId: string;
  messageId: string;
  senderId: string | null;
  messageSource: "user" | "system";
  patientId?: string | null;
  relatedAlertId?: string | null;
  severity?: "low" | "medium" | "high" | null;
  preview: string;
  message?: MessageResponse | null;
}

export interface RealtimeEvent {
  type: "chat.new_message" | "chat.alert_message";
  eventId: string;
  createdAt: string;
  data: RealtimeChatEventData;
}

function getRealtimeWebSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || "";
  const wsUrl = apiUrl.replace(/^http/, "ws");
  return `${wsUrl}/realtime/ws`;
}

export function createRealtimeSocket(): WebSocket {
  return new WebSocket(getRealtimeWebSocketUrl());
}

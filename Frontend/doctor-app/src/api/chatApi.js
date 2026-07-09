import request, { BASE_URL } from "./httpClient";

function withQuery(path, params = {}) {
  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  return queryString ? `${path}?${queryString}` : path;
}

export async function getConversations(limit = 20, cursor) {
  return request(withQuery("/chat/conversations", { limit, cursor }), {
    method: "GET",
  });
}

export async function getConversationMessages(conversationId, limit = 100, cursor) {
  return request(
    withQuery(`/chat/conversations/${conversationId}/messages`, {
      limit,
      cursor,
    }),
    { method: "GET" }
  );
}

export async function ensureConversation(patientId) {
  return request("/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ participantIds: [patientId] }),
  });
}

import * as SecureStore from "../utils/secureStoreHelper";

export async function buildConversationSocketUrl(conversationId) {
  const wsBase = BASE_URL.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  let token = "";
  try {
    token = await SecureStore.getItemAsync("staff_accessToken");
    if (!token) token = await SecureStore.getItemAsync("doctor_accessToken");
  } catch (e) {}
  
  return `${wsBase}/chat/ws?conversationId=${encodeURIComponent(conversationId)}&token=${encodeURIComponent(token || "")}`;
}

export async function buildRealtimeSocketUrl() {
  const wsBase = BASE_URL.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  let token = "";
  try {
    token = await SecureStore.getItemAsync("staff_accessToken");
    if (!token) token = await SecureStore.getItemAsync("doctor_accessToken");
  } catch (e) {}

  return `${wsBase}/realtime/ws?token=${encodeURIComponent(token || "")}`;
}

export default {
  getConversations,
  getConversationMessages,
  ensureConversation,
  buildConversationSocketUrl,
  buildRealtimeSocketUrl,
};

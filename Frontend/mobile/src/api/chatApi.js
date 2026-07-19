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

import AsyncStorage from "@react-native-async-storage/async-storage";

export async function buildConversationSocketUrl(conversationId) {
  const wsBase = BASE_URL.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  let token = "";
  try {
    token = await AsyncStorage.getItem("accessToken");
  } catch (e) {}

  return `${wsBase}/chat/ws?conversationId=${encodeURIComponent(conversationId)}&token=${encodeURIComponent(token || "")}`;
}

export default {
  getConversations,
  getConversationMessages,
  buildConversationSocketUrl,
};

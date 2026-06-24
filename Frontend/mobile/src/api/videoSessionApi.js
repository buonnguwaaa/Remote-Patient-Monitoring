import { request } from "./httpClient";

async function callApi(path, method = "GET", body = undefined) {
  const options = { method };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await request(path, options);
  if (!res.ok) {
    const msg = res.body?.error || res.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.body?.data ?? res.body;
}

export async function getVideoSession(id) {
  return callApi(`/video-sessions/${id}`);
}

/**
 * Patient calls this to get a joinUrl.
 * Backend validates membership before returning the URL.
 */
export async function joinVideoSession(id) {
  return callApi(`/video-sessions/${id}/join`, "POST");
}

export async function endVideoSession(id) {
  return callApi(`/video-sessions/${id}/end`, "POST");
}

export async function rejectVideoSession(id) {
  return callApi(`/video-sessions/${id}/reject`, "POST");
}

export async function getActiveVideoSession(conversationId) {
  const query = conversationId
    ? `?conversationId=${encodeURIComponent(conversationId)}`
    : "";
  return callApi(`/video-sessions/active${query}`);
}

export default {
  getVideoSession,
  joinVideoSession,
  endVideoSession,
  rejectVideoSession,
  getActiveVideoSession,
};

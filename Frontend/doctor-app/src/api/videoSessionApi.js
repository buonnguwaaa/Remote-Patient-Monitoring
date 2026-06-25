import request from "./httpClient";

export async function createVideoSession(patientId, conversationId) {
  return request("/video-sessions", {
    method: "POST",
    body: JSON.stringify({ patientId, conversationId }),
  });
}

export async function joinVideoSession(id) {
  return request(`/video-sessions/${id}/join`, {
    method: "POST",
  });
}

export async function endVideoSession(id) {
  return request(`/video-sessions/${id}/end`, {
    method: "POST",
  });
}

export async function getActiveVideoSession(conversationId) {
  const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
  return request(`/video-sessions/active${query}`, {
    method: "GET",
  });
}

export default {
  createVideoSession,
  joinVideoSession,
  endVideoSession,
  getActiveVideoSession,
};

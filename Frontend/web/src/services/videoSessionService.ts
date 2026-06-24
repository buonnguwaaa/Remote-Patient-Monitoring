import api from "./api";

export interface VideoSessionResponse {
  id: string;
  conversationId: string;
  doctorId: string;
  patientId: string;
  provider: string;
  roomName: string;
  /** Only populated after a successful join call */
  joinUrl?: string;
  status: "pending" | "active" | "ended" | "rejected" | "missed" | "expired";
  startedAt?: string | null;
  endedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoSessionParams {
  patientId: string;
  conversationId?: string;
}

interface ApiDataWrapper<T> {
  data: T;
  message?: string;
}

export async function createVideoSession(
  params: CreateVideoSessionParams,
): Promise<VideoSessionResponse> {
  const res = await api.post<ApiDataWrapper<VideoSessionResponse>>(
    "/video-sessions",
    {
      patientId: params.patientId,
      conversationId: params.conversationId ?? undefined,
    },
  );
  return res.data.data;
}

export async function getVideoSession(id: string): Promise<VideoSessionResponse> {
  const res = await api.get<ApiDataWrapper<VideoSessionResponse>>(
    `/video-sessions/${id}`,
  );
  return res.data.data;
}

/**
 * Join a video session. Backend validates that the caller is a session participant
 * and only then returns the joinUrl.
 */
export async function joinVideoSession(id: string): Promise<VideoSessionResponse> {
  const res = await api.post<ApiDataWrapper<VideoSessionResponse>>(
    `/video-sessions/${id}/join`,
  );
  return res.data.data;
}

export async function endVideoSession(id: string): Promise<VideoSessionResponse> {
  const res = await api.post<ApiDataWrapper<VideoSessionResponse>>(
    `/video-sessions/${id}/end`,
  );
  return res.data.data;
}

export async function rejectVideoSession(id: string): Promise<VideoSessionResponse> {
  const res = await api.post<ApiDataWrapper<VideoSessionResponse>>(
    `/video-sessions/${id}/reject`,
  );
  return res.data.data;
}

export async function getActiveVideoSession(params: {
  conversationId?: string;
  patientId?: string;
}): Promise<VideoSessionResponse | null> {
  const res = await api.get<ApiDataWrapper<VideoSessionResponse | null>>(
    "/video-sessions/active",
    { params },
  );
  return res.data.data ?? null;
}

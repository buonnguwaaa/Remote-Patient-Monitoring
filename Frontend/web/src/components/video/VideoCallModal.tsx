import { useEffect, useRef, useState } from "react";
import { MdClose, MdPhone, MdPhoneDisabled, MdOpenInNew } from "react-icons/md";
import { FaVideo, FaSpinner } from "react-icons/fa";
import {
  createVideoSession,
  joinVideoSession,
  endVideoSession,
  getActiveVideoSession,
  type VideoSessionResponse,
} from "../../services/videoSessionService";

interface VideoCallModalProps {
  /** Patient's user ID (MongoDB _id) */
  patientId: string;
  patientName?: string;
  /** Optional: existing conversationId to avoid creating a new one */
  conversationId?: string;
  onClose: () => void;
}

type CallState =
  | "creating"   // creating session
  | "waiting"    // session pending, waiting for patient
  | "active"     // session active (patient joined)
  | "error"
  | "ended";

export default function VideoCallModal({
  patientId,
  patientName,
  conversationId,
  onClose,
}: VideoCallModalProps) {
  const [callState, setCallState] = useState<CallState>("creating");
  const [session, setSession] = useState<VideoSessionResponse | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<VideoSessionResponse | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Create session and join as doctor on mount.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. Get active session or create a new one
        let currentSession = await getActiveVideoSession({ conversationId, patientId });
        
        if (!currentSession) {
          currentSession = await createVideoSession({
            patientId,
            conversationId,
          });
        }
        
        if (cancelled) return;
        setSession(currentSession);
        sessionRef.current = currentSession;
        setCallState("waiting");

        // 2. Doctor immediately joins to get the joinUrl.
        const joined = await joinVideoSession(currentSession.id);
        if (cancelled) return;
        setSession(joined);
        sessionRef.current = joined;
        if (joined.joinUrl) {
          setJoinUrl(joined.joinUrl);
        }
        setCallState("waiting"); // still waiting for patient, but iframe is ready
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Không thể tạo phòng gọi video.";
        setError(msg);
        setCallState("error");
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [patientId, conversationId]);

  const handleEnd = async () => {
    const s = sessionRef.current;
    if (s && s.status !== "ended") {
      try {
        await endVideoSession(s.id);
      } catch (_) {
        // best-effort
      }
    }
    setCallState("ended");
    onClose();
  };

  // Open Jitsi in new tab as fallback (if iframe is blocked by browser policy).
  const handleOpenExternal = () => {
    if (joinUrl) {
      window.open(joinUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <FaVideo className="text-blue-400" size={16} />
          <div>
            <p className="text-sm font-semibold text-white">
              Gọi video
              {patientName && (
                <span className="text-blue-300 ml-1">• {patientName}</span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {callState === "creating" && "Đang tạo phòng gọi..."}
              {callState === "waiting" && "Đang chờ bệnh nhân tham gia..."}
              {callState === "active" && "Đang trong cuộc gọi"}
              {callState === "error" && "Lỗi kết nối"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {joinUrl && (
            <button
              onClick={handleOpenExternal}
              title="Mở trong tab mới"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            >
              <MdOpenInNew size={18} />
            </button>
          )}
          <button
            onClick={handleEnd}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
          >
            <MdPhoneDisabled size={16} />
            Kết thúc cuộc gọi
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
          >
            <MdClose size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 relative">
        {callState === "creating" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
            <FaSpinner className="animate-spin text-blue-400" size={32} />
            <p className="text-sm text-gray-300">Đang tạo phòng gọi...</p>
          </div>
        )}

        {callState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 max-w-sm text-center">
              <MdPhone className="text-red-400 mx-auto mb-3" size={32} />
              <p className="text-white font-medium mb-1">Không thể kết nối</p>
              <p className="text-sm text-gray-400">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {joinUrl && callState !== "error" && (
          <>
            {/* Waiting banner — shown until patient joins */}
            {callState === "waiting" && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm border border-gray-700/60 rounded-full px-4 py-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-gray-300">
                  Đang chờ bệnh nhân tham gia...
                </span>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={joinUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              allowFullScreen
              className="w-full h-full border-0"
              title="Jitsi Video Call"
            />
          </>
        )}
      </div>
    </div>
  );
}

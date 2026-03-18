import {
  ArrowLeft,
  MoreVertical,
  User,
  Activity,
  Droplet,
  HeartPulse,
  Send,
  FileText,
  Calendar,
  Clock,
} from "lucide-react";

export interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  measurementId?: string;
  timestamp: Date;
}

interface ChatPageProps {
  chat: {
    doctorId: string;
    patientId: string;
  };
  chatItems: ChatMessage[];
}

interface MeasurementData {
  id: string;
  type: "BP" | "GLUCOSE" | "SPO2";
  value: string;
  unit?: string;
  subValue?: string;
  context?: string;
  timestamp: string;
}

const mockChatInfo = {
  doctorId: "doc_current_user",
  patientId: "pat_nguyen_van_a",
};

const mockPatientInfo = {
  name: "Nguyễn Văn A",
  age: 54,
  gender: "Nam",
  history: "Tiền sử Tăng huyết áp",
};

const mockMeasurements: Record<string, MeasurementData> = {
  m_bp_1: {
    id: "m_bp_1",
    type: "BP",
    value: "150/92",
    unit: "mmHg",
    subValue: "88 bpm",
    context: "Đo tại nhà - Trước ăn",
    timestamp: "15:30",
  },
  m_glu_1: {
    id: "m_glu_1",
    type: "GLUCOSE",
    value: "145",
    unit: "mg/dL",
    context: "Đo sau ăn 2h",
    timestamp: "14:10",
  },
  m_spo2_1: {
    id: "m_spo2_1",
    type: "SPO2",
    value: "96%",
    unit: "",
    context: "Độ bão hòa oxy máu",
    timestamp: "16:00",
  },
};

const mockChatMessages: ChatMessage[] = [
  {
    id: "msg_1",
    senderId: "doc_current_user",
    message: "Chào bác A, tôi thấy chỉ số huyết áp hôm nay hơi cao.",
    measurementId: "m_bp_1",
    timestamp: new Date("2025-12-11T15:40:00"),
  },
  {
    id: "msg_2",
    senderId: "pat_nguyen_van_a",
    message: "Dạ vâng, trưa nay tôi có lỡ ăn hơi mặn chút ạ.",
    timestamp: new Date("2025-12-11T15:42:00"),
  },
  {
    id: "msg_3",
    senderId: "doc_current_user",
    message:
      "Kết quả đường huyết sau ăn của bác đang ở mức cao nhẹ. Bác cố gắng giảm đồ ngọt, tinh bột tinh chế trong các bữa sau nhé.",
    measurementId: "m_glu_1",
    timestamp: new Date("2025-12-11T15:55:00"),
  },
  {
    id: "msg_4",
    senderId: "doc_current_user",
    message:
      "SpO2 vẫn trong giới hạn an toàn. Bác cứ tiếp tục vận động nhẹ nhàng, tránh nằm lâu một chỗ.",
    measurementId: "m_spo2_1",
    timestamp: new Date("2025-12-11T16:05:00"),
  },
  {
    id: "msg_5",
    senderId: "pat_nguyen_van_a",
    message: "Cảm ơn bác sĩ. Tôi sẽ lưu ý.",
    timestamp: new Date("2025-12-11T17:10:00"),
  },
];

const MeasurementCard = ({ measurementId }: { measurementId: string }) => {
  const data = mockMeasurements[measurementId];
  if (!data) return null;

  let icon, colorClass, title;

  switch (data.type) {
    case "BP":
      icon = <Activity size={18} />;
      colorClass = "text-red-600 bg-red-100";
      title = "Huyết áp";
      break;
    case "GLUCOSE":
      icon = <Droplet size={18} />;
      colorClass = "text-blue-600 bg-blue-100";
      title = "Đường huyết";
      break;
    case "SPO2":
      icon = <HeartPulse size={18} />;
      colorClass = "text-green-600 bg-green-100";
      title = "SpO₂";
      break;
    default:
      icon = <Activity size={18} />;
      colorClass = "text-gray-600 bg-gray-100";
      title = "Chỉ số";
  }

  return (
    <div className="mt-3 mb-1 p-3 bg-white rounded-xl w-full border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-full ${colorClass}`}>{icon}</div>
          <span className="text-xs font-bold text-gray-700 uppercase">
            {title}
          </span>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">
          #{measurementId.split("_")[1]}
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-2xl font-bold text-gray-900">{data.value}</span>
        {data.unit && (
          <span className="text-xs font-medium text-gray-500">{data.unit}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {data.subValue && (
          <p className="text-xs text-gray-600 font-medium">{data.subValue}</p>
        )}
        <div className="flex items-center text-[10px] text-gray-400 mt-1 pt-2 border-t border-gray-100">
          <Clock className="w-3 h-3 mr-1" /> {data.timestamp} • {data.context}
        </div>
      </div>
    </div>
  );
};

const ChatPage = () => {
  const chatProps: ChatPageProps = {
    chat: mockChatInfo,
    chatItems: mockChatMessages,
  };

  const { chat, chatItems } = chatProps;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#F0F2F5] font-sans">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={22} />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200">
                  <User size={20} />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>

              <div>
                <h1 className="font-bold text-gray-800 text-base leading-tight">
                  {mockPatientInfo.name}
                </h1>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {mockPatientInfo.gender}, {mockPatientInfo.age} tuổi •{" "}
                  <span className="text-orange-500 font-medium">
                    {mockPatientInfo.history}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="text-center my-4">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider bg-gray-200 px-2 py-1 rounded">
            Hôm nay
          </span>
        </div>

        {chatItems.map((msg) => {
          const isMe = msg.senderId === chat.doctorId;

          return (
            <div
              key={msg.id}
              className={`flex w-full ${
                isMe ? "justify-end" : "justify-start"
              }`}
            >
              {!isMe && (
                <div className="mr-2 shrink-0 self-end mb-1">
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center">
                    <span className="text-xs font-bold">BN</span>
                  </div>
                </div>
              )}

              <div
                className={`flex flex-col max-w-[75%] ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`relative px-4 py-3 shadow-sm text-sm ${
                    isMe
                      ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                      : "bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100"
                  }`}
                >
                  {msg.message && (
                    <p className="leading-relaxed whitespace-pre-wrap">
                      {msg.message}
                    </p>
                  )}

                  {msg.measurementId && (
                    <div className="mt-1">
                      <MeasurementCard measurementId={msg.measurementId} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1 mx-1">
                  <span className="text-[10px] text-gray-400">
                    {formatTime(msg.timestamp)}
                  </span>
                  {isMe && (
                    <span className="text-[10px] text-blue-500 font-medium">
                      Đã xem
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-gray-50 border-b border-gray-100">
          <button className="flex items-center gap-1 shrink-0 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 transition">
            <Calendar size={14} /> Hẹn tái khám
          </button>
          <button className="flex items-center gap-1 shrink-0 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 transition">
            <FileText size={14} /> Kê đơn thuốc
          </button>
          <button className="shrink-0 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition">
            Tiếp tục theo dõi
          </button>
          <button className="shrink-0 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition">
            Cần nhập viện
          </button>
        </div>

        <div className="p-3 flex items-end gap-2">
          <button className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition mb-0.5">
            <MoreVertical size={20} />
          </button>

          <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition duration-200">
            <textarea
              placeholder="Nhập tư vấn hoặc nhận xét..."
              rows={1}
              className="w-full bg-transparent border-none text-sm focus:ring-0 outline-none resize-none py-1 max-h-32 text-gray-800 placeholder-gray-400"
              style={{ minHeight: "24px" }}
            />
          </div>

          <button className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition shadow-lg active:scale-95 mb-0.5">
            <Send size={18} fill="currentColor" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatPage;

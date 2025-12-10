// pages/PatientDetailPage.tsx

import { useState } from "react"; // Thêm useState
import { useParams, useNavigate } from "react-router-dom";
import {
  MdOutlineKeyboardBackspace,
  MdOutlineCake,
  MdPerson,
  MdPhoneInTalk,
  MdContactEmergency,
  MdShowChart, // Icon biểu đồ
  MdDateRange, // Icon lịch
} from "react-icons/md";
import { FaHeartbeat, FaTemperatureHigh, FaTint } from "react-icons/fa";
import { GiHeartBeats } from "react-icons/gi";

// --- 1. IMPORT RECHARTS ---
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const mockPatient = {
  id: 1,
  name: "Trần Anh Khoa",
  img: "https://picsum.photos/id/237/400/400",
  dob: "1990-05-15",
  gender: "Nam",
  emergencyContactName: "Quách Thành Kiệt",
  emergencyContactPhone: "0123456789",
  status: "Bình thường",
  threshold: {
    temperature: { min: 36.5, max: 37.5 },
    systolic: { min: 90, max: 120 },
    diastolic: { min: 60, max: 80 },
    pulse: { min: 60, max: 100 },
    glucose: { min: 70, max: 140 },
  },
  measurement: [
    // Đảo ngược thứ tự để biểu đồ chạy từ trái (cũ) sang phải (mới)
    {
      systolic: 125,
      diastolic: 82,
      pulse: 70,
      glucose: 92,
      updateAt: "2024-04-01 10:00",
    },
    {
      systolic: 130,
      diastolic: 85,
      pulse: 75,
      glucose: 95,
      updateAt: "2024-04-02 10:00",
    },
    {
      systolic: 120,
      diastolic: 80,
      pulse: 72,
      glucose: 90,
      updateAt: "2024-04-03 10:00",
    },
    // Thêm dữ liệu giả để biểu đồ nhìn đẹp hơn
    {
      systolic: 118,
      diastolic: 78,
      pulse: 68,
      glucose: 88,
      updateAt: "2024-04-04 09:00",
    },
    {
      systolic: 122,
      diastolic: 79,
      pulse: 74,
      glucose: 110,
      updateAt: "2024-04-05 08:30",
    },
  ],
};

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-sm">
    <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
      <Icon size={18} />
    </div>
    <div>
      <p className="text-gray-500 text-xs font-medium">{label}</p>
      <p className="text-gray-900 font-semibold">{value}</p>
    </div>
  </div>
);

// --- Component phụ hiển thị Threshold ---
const ThresholdCard = ({ icon: Icon, label, data, unit, colorClass }: any) => (
  <div
    className={`p-4 rounded-xl bg-white shadow-sm border-l-4 ${colorClass} flex items-center`}
  >
    <div
      className={`p-3 rounded-full mr-4 bg-gray-50 ${colorClass.replace(
        "border",
        "text"
      )}`}
    >
      <Icon size={24} />
    </div>
    <div>
      <h4 className="text-gray-500 text-sm font-medium mb-1">{label}</h4>
      <div className="flex items-baseline">
        <span className="font-bold text-xl text-gray-800">
          {data.min} - {data.max}
        </span>
        <span className="text-gray-500 ml-1 text-sm">{unit}</span>
      </div>
    </div>
  </div>
);

const PatientDetailPage = () => {
  const navigate = useNavigate();
  const p = mockPatient;

  // --- State cho biểu đồ ---
  const [chartType, setChartType] = useState<"bp" | "glucose">("bp"); // 'bp' (Huyết áp) hoặc 'glucose' (Đường huyết)
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");

  // Format ngày tháng ngắn gọn cho trục X (VD: 03/04)
  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    } catch {
      return tickItem;
    }
  };

  const getStatusColorObj = (status: string) => {
    switch (status) {
      case "Bình thường":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          border: "border-green-200",
        };
      case "Cảnh báo":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-800",
          border: "border-yellow-200",
        };
      case "Nguy hiểm":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          border: "border-red-200",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          border: "border-gray-200",
        };
    }
  };
  const statusColors = getStatusColorObj(p.status);

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Nút Back */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center mb-4 rounded hover:bg-gray-200 p-2 transition-all"
        >
          <MdOutlineKeyboardBackspace size={24} />
          <span className="text-gray-700 font-medium whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 transition-all duration-500 ease-in-out">
            Quay lại trang trước
          </span>
        </button>

        {/* --- Header Section --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center relative z-10">
            <img
              src={p.img}
              alt={p.name}
              className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-full border-4 border-white shadow-lg"
            />
            <div className="sm:ml-8 mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {p.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <span className="text-gray-500 text-sm">
                  ID Bệnh nhân: #{p.id}
                </span>
                <span
                  className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                >
                  {p.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Main Grid Content --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Cột 1: Thông tin cá nhân & Liên hệ */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
                Thông tin cá nhân
              </h3>
              <div className="space-y-3">
                <InfoItem
                  icon={MdOutlineCake}
                  label="Ngày sinh"
                  value={p.dob}
                />
                <InfoItem icon={MdPerson} label="Giới tính" value={p.gender} />
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
                Liên hệ khẩn cấp
              </h3>
              <div className="space-y-3">
                <InfoItem
                  icon={MdContactEmergency}
                  label="Người liên hệ"
                  value={p.emergencyContactName}
                />
                <InfoItem
                  icon={MdPhoneInTalk}
                  label="Số điện thoại"
                  value={p.emergencyContactPhone}
                />
              </div>
            </section>
          </div>

          {/* Cột 2 & 3: Ngưỡng chỉ số an toàn */}
          <div className="lg:col-span-2">
            <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full">
              <h3 className="text-lg font-bold text-gray-800 mb-6 pb-2 border-b flex items-center">
                <GiHeartBeats className="mr-2 text-red-500" size={24} />
                Ngưỡng chỉ số an toàn
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ThresholdCard
                  icon={FaTemperatureHigh}
                  label="Nhiệt độ"
                  data={p.threshold.temperature}
                  unit="°C"
                  colorClass="border-orange-400 text-orange-500"
                />
                <ThresholdCard
                  icon={GiHeartBeats}
                  label="Nhịp tim"
                  data={p.threshold.pulse}
                  unit="bpm"
                  colorClass="border-red-400 text-red-500"
                />
                <ThresholdCard
                  icon={FaHeartbeat}
                  label="Huyết áp tâm thu"
                  data={p.threshold.systolic}
                  unit="mmHg"
                  colorClass="border-purple-400 text-purple-500"
                />
                <ThresholdCard
                  icon={FaHeartbeat}
                  label="Huyết áp tâm trương"
                  data={p.threshold.diastolic}
                  unit="mmHg"
                  colorClass="border-indigo-400 text-indigo-500"
                />
                <ThresholdCard
                  icon={FaTint}
                  label="Đường huyết"
                  data={p.threshold.glucose}
                  unit="mg/dL"
                  colorClass="border-blue-400 text-blue-500"
                />
              </div>
            </section>
          </div>
        </div>

        {/* --- SECTION BIỂU ĐỒ (LINE CHART) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-4 mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center mb-4 md:mb-0">
              <MdShowChart className="mr-2 text-blue-500" size={24} />
              Biểu đồ sức khỏe
            </h3>

            {/* Controls Filter */}
            <div className="flex flex-wrap gap-2 md:gap-4">
              {/* Toggle Loại Biểu Đồ */}
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChartType("bp")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    chartType === "bp"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Huyết áp
                </button>
                <button
                  onClick={() => setChartType("glucose")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    chartType === "glucose"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Đường huyết
                </button>
              </div>

              {/* Toggle Thời Gian */}
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTimeRange("week")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${
                    timeRange === "week"
                      ? "bg-white text-green-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <MdDateRange className="mr-1" /> Tuần
                </button>
                <button
                  onClick={() => setTimeRange("month")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${
                    timeRange === "month"
                      ? "bg-white text-green-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <MdDateRange className="mr-1" /> Tháng
                </button>
              </div>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={p.measurement}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />
                <XAxis
                  dataKey="updateAt"
                  tickFormatter={formatXAxis}
                  stroke="#9ca3af"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                  }}
                  itemStyle={{ fontSize: "13px", fontWeight: 500 }}
                  labelStyle={{ marginBottom: "5px", color: "#6b7280" }}
                />
                <Legend wrapperStyle={{ paddingTop: "10px" }} />

                {/* Render lines dựa trên chartType */}
                {chartType === "bp" ? (
                  <>
                    <Line
                      name="Tâm thu (Systolic)"
                      type="monotone"
                      dataKey="systolic"
                      stroke="#8884d8" // Màu tím
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      name="Tâm trương (Diastolic)"
                      type="monotone"
                      dataKey="diastolic"
                      stroke="#82ca9d" // Màu xanh lá nhạt
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                  </>
                ) : (
                  <Line
                    name="Đường huyết (Glucose)"
                    type="monotone"
                    dataKey="glucose"
                    stroke="#3b82f6" // Màu xanh dương
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center italic">
            * Dữ liệu hiển thị theo{" "}
            {timeRange === "week" ? "7 ngày" : "30 ngày"} gần nhất.
          </p>
        </section>

        {/* --- Section: Lịch sử đo gần đây --- */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-5 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">
              Lịch sử đo gần đây
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Huyết áp (mmHg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nhịp tim (bpm)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Đường huyết (mg/dL)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Đảo ngược mảng để hiển thị mới nhất lên đầu trong Table, 
                    nhưng giữ nguyên xuôi thời gian trong Chart */}
                {[...p.measurement].reverse().map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {item.updateAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item.systolic} / {item.diastolic}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                      <span className="inline-flex items-center">
                        <GiHeartBeats className="mr-1 text-red-400" size={14} />{" "}
                        {item.pulse}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                      {item.glucose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {p.measurement.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              Chưa có dữ liệu đo.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PatientDetailPage;

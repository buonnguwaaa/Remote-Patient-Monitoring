import { type doctor } from "../types";
import {
  Building2,
  Award,
  Calendar,
  FileBadge,
  User,
  Clock,
} from "lucide-react";

// Dữ liệu mẫu (Giữ nguyên)
const mockDoctor: doctor = {
  id: "1",
  name: "Dr. John Doe",
  specialization: "Cardiology (Tim mạch)",
  licenseNumber: "MD123456",
  workplace: "Bệnh viện Đa khoa Thành phố",
  yearsOfExperience: 10,
  status: "active",
  profileImageUrl: "https://avatar.iran.liara.run/public/boy",
  gender: "male",
  dateOfBirth: "1980-01-01",
};

// Component hiển thị từng dòng thông tin
const InfoItem = ({
  icon: Icon,
  label,
  value,
  colorClass = "text-gray-700",
}: any) => (
  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
    <div className={`p-2 rounded-full bg-purple-50 text-purple-600`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className={`font-medium ${colorClass}`}>{value}</p>
    </div>
  </div>
);

const DoctorProfile = () => {
  // Tính tuổi (Optional)
  const age =
    new Date().getFullYear() - new Date(mockDoctor.dateOfBirth).getFullYear();

  // Xử lý hiển thị trạng thái
  const isActive = mockDoctor.status === "active";

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-6">
      {/* Main Card Container */}
      <div className="mt-12 bg-white w-full  rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        {/* === LEFT SIDEBAR: Avatar & Primary Info === */}
        <div className="w-full md:w-1/3 bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-8 flex flex-col items-center justify-center relative">
          {/* Decorative Background Circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-10 -translate-y-10 blur-xl"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-900/10 rounded-full translate-x-10 translate-y-10 blur-xl"></div>

          {/* Avatar Area */}
          <div className="relative group">
            <div className="w-36 h-36 rounded-full p-1 bg-white/20 backdrop-blur-sm shadow-lg mb-4">
              <img
                src={mockDoctor.profileImageUrl}
                alt={mockDoctor.name}
                className="w-full h-full rounded-full object-cover border-4 border-white shadow-sm group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Status Badge */}
            <div
              className={`absolute bottom-6 right-2 px-3 py-1 rounded-full text-xs font-bold border-2 border-white shadow-sm flex items-center gap-1
              ${
                isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full bg-white ${
                  isActive ? "animate-pulse" : ""
                }`}
              ></span>
              {isActive ? "Đang hoạt động" : "Nghỉ"}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-1 text-shadow">
            {mockDoctor.name}
          </h2>
          <p className="text-purple-100 font-medium bg-white/10 px-4 py-1 rounded-full text-sm backdrop-blur-md">
            {mockDoctor.specialization}
          </p>
        </div>

        {/* === RIGHT CONTENT: Detailed Info === */}
        <div className="w-full md:w-2/3 p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <User className="text-purple-500" />
              Hồ sơ bác sĩ
            </h3>
            <span className="text-sm text-gray-400">ID: #{mockDoctor.id}</span>
          </div>

          <hr className="border-gray-100 mb-6" />

          {/* Grid Layout cho thông tin chi tiết */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cột 1: Thông tin hành nghề */}
            <div className="space-y-2">
              <InfoItem
                icon={FileBadge}
                label="Số chứng chỉ hành nghề"
                value={mockDoctor.licenseNumber}
              />
              <InfoItem
                icon={Building2}
                label="Nơi làm việc"
                value={mockDoctor.workplace}
              />
              <InfoItem
                icon={Award}
                label="Kinh nghiệm"
                value={`${mockDoctor.yearsOfExperience} Năm`}
                colorClass="text-purple-600 font-bold"
              />
            </div>

            {/* Cột 2: Thông tin cá nhân */}
            <div className="space-y-2">
              <InfoItem
                icon={User}
                label="Giới tính"
                value={mockDoctor.gender === "male" ? "Nam" : "Nữ"}
                colorClass="capitalize"
              />
              <InfoItem
                icon={Calendar}
                label="Ngày sinh"
                value={mockDoctor.dateOfBirth}
              />
              <InfoItem icon={Clock} label="Tuổi" value={`${age} tuổi`} />
            </div>
          </div>

          {/* Action Buttons (Ví dụ thêm)
          <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
            <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-purple-200">
              Đặt lịch hẹn
            </button>
            <button className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-lg font-medium transition-colors">
              Xem lịch sử
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;

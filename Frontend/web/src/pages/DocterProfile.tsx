import { type doctor } from "../types";
import {
  Building2,
  Award,
  Calendar,
  FileBadge,
  User,
  Clock,
  Mail,
  Phone,
  Briefcase,
  Stethoscope,
  MapPin,
} from "lucide-react";

const mockDoctor: doctor = {
  id: "1",
  name: "Dr. John Doe",
  specialization: "Cardiology (Tim mạch)",
  licenseNumber: "MD123456",
  workplace: "Bệnh viện Đa khoa Thành phố",
  department: "Khoa Tim Mạch",
  yearsOfExperience: 10,
  status: "active",
  profileImageUrl: "https://avatar.iran.liara.run/public/boy",
  gender: "male",
  dateOfBirth: "1980-01-01",
  email: "dr.johndoe@hospital.com",
  phone: "+84 123 456 789",
};

const InfoItem = ({
  icon: Icon,
  label,
  value,
  colorClass = "text-gray-800",
}: any) => (
  <div className="group flex items-start gap-3 p-4 rounded-xl hover:bg-gray-50 transition-all duration-300 cursor-default border border-gray-100 hover:border-purple-200 hover:shadow-sm">
    <div className="p-2.5 rounded-lg bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform duration-300">
      <Icon size={20} strokeWidth={2.5} />
    </div>
    <div className="flex-1">
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`font-semibold ${colorClass} text-sm`}>{value}</p>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, bgColor, textColor }: any) => (
  <div className={`relative overflow-hidden rounded-2xl ${bgColor} p-6 ${textColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
    <div className="relative">
      <Icon size={28} className="mb-3 opacity-90" strokeWidth={2} />
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm font-medium opacity-90">{label}</p>
    </div>
  </div>
);

const DoctorProfile = () => {
  const age =
    new Date().getFullYear() - new Date(mockDoctor.dateOfBirth).getFullYear();
  const isActive = mockDoctor.status === "active";

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Hồ sơ bác sĩ</h1>
          <p className="text-gray-600">Thông tin chi tiết và chuyên môn</p>
        </div>
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
          <div className="h-48 bg-blue-600 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
          </div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20 relative z-10">
              <div className="relative group">
                <div className="w-40 h-40 rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-white">
                  <img
                    src={mockDoctor.profileImageUrl}
                    alt={mockDoctor.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div
                  className={`absolute -bottom-2 -right-2 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 ${isActive
                    ? "bg-green-500 text-white"
                    : "bg-gray-400 text-white"
                    }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full bg-white ${isActive ? "animate-pulse" : ""
                      }`}
                  ></span>
                  {isActive ? "Đang hoạt động" : "Nghỉ"}
                </div>
              </div>

              <div className="flex-1">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {mockDoctor.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm">
                      <Stethoscope size={16} />
                      {mockDoctor.specialization}
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                      <Briefcase size={16} />
                      {mockDoctor.department}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm flex items-center gap-2">
                    <span className="text-gray-400">ID:</span>
                    <span className="font-mono font-semibold">#{mockDoctor.id}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <StatCard
                icon={Award}
                label="Kinh nghiệm"
                value={`${mockDoctor.yearsOfExperience} năm`}
                bgColor="bg-blue-600"
                textColor="text-white"
              />
              <StatCard
                icon={Clock}
                label="Tuổi"
                value={`${age} tuổi`}
                bgColor="bg-purple-600"
                textColor="text-white"
              />
              <StatCard
                icon={FileBadge}
                label="Chứng chỉ"
                value={mockDoctor.licenseNumber}
                bgColor="bg-indigo-600"
                textColor="text-white"
              />
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
                Thông tin chi tiết
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User size={16} />
                    Thông tin cá nhân
                  </h4>
                  <InfoItem
                    icon={User}
                    label="Giới tính"
                    value={mockDoctor.gender === "male" ? "Nam" : "Nữ"}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Ngày sinh"
                    value={new Date(mockDoctor.dateOfBirth).toLocaleDateString('vi-VN')}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building2 size={16} />
                    Thông tin công việc
                  </h4>
                  <InfoItem
                    icon={MapPin}
                    label="Nơi làm việc"
                    value={mockDoctor.workplace}
                  />
                  <InfoItem
                    icon={Briefcase}
                    label="Phòng ban"
                    value={mockDoctor.department || "Chưa phân công"}
                    colorClass="text-purple-600"
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Phone size={16} />
                    Thông tin liên hệ
                  </h4>
                  <InfoItem
                    icon={Mail}
                    label="Email"
                    value={mockDoctor.email || "Chưa cập nhật"}
                    colorClass="text-blue-600"
                  />
                  <InfoItem
                    icon={Phone}
                    label="Số điện thoại"
                    value={mockDoctor.phone || "Chưa cập nhật"}
                    colorClass="text-green-600"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
              <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3.5 px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <Mail size={18} />
                Gửi tin nhắn
              </button>
              <button className="flex-1 bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 py-3.5 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2">
                <Calendar size={18} />
                Xem lịch làm việc
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;

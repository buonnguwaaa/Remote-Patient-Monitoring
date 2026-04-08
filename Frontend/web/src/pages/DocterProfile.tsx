import { useEffect, useState } from "react";
import { type Doctor, type Department } from "../types";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Stethoscope,
  MapPin,
  Calendar,
  FileBadge,
  Award,
  Loader2,
} from "lucide-react";

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 py-3">
    <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300">
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">
        {value || "Chưa cập nhật"}
      </p>
    </div>
  </div>
);

function normalizeObjectId(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && "$oid" in value) {
    return String((value as { $oid?: string }).$oid || "");
  }

  if (typeof value === "object" && value !== null && "id" in value) {
    return String((value as { id?: string }).id || "");
  }

  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id?: string })._id || "");
  }

  return String(value);
}

function resolveDepartmentName(profile: Doctor, departments: Department[]): string {
  const directDepartmentName = (profile as any)?.departmentName
    || (profile as any)?.department?.name
    || (typeof (profile as any)?.department === "string" ? (profile as any).department : "");

  if (directDepartmentName) {
    return String(directDepartmentName);
  }

  const departmentId = normalizeObjectId(
    profile.departmentId || (profile as any)?.department?.id || (profile as any)?.department?._id
  );

  if (!departmentId) {
    return "";
  }

  const matchedDepartment = departments.find((department) => {
    return normalizeObjectId(department.id) === departmentId;
  });

  return matchedDepartment?.name || "";
}

const DoctorProfile = () => {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctor = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const [doctorResponse, departmentResponse] = await Promise.all([
          api.get(`/users/doctors/${user.id}`),
          api.get("/departments").catch(() => ({ data: { data: [] } })),
        ]);

        setDoctor(doctorResponse.data?.data || null);
        setDepartments(departmentResponse.data?.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || "Không thể tải thông tin bác sĩ");
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50 dark:bg-slate-900">
        <Loader2 className="animate-spin text-gray-400 dark:text-slate-500" size={32} />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-gray-50 dark:bg-slate-900">
        <p className="text-gray-500 dark:text-slate-400">{error || "Không tìm thấy thông tin"}</p>
      </div>
    );
  }

  const formatGender = (g: string) => {
    if (g === "M") return "Nam";
    if (g === "F") return "Nữ";
    return "Khác";
  };

  const formatDate = (d: string) => {
    if (!d) return "Chưa cập nhật";
    return new Date(d).toLocaleDateString("vi-VN");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 flex-shrink-0">
              {doctor.avatarUrl ? (
                <img
                  src={doctor.avatarUrl}
                  alt={doctor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500">
                  <User size={32} />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {doctor.name}
              </h1>
              {doctor.specialization && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                  <Stethoscope size={14} />
                  {doctor.specialization}
                </p>
              )}
              {doctor.workplace && (
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <MapPin size={14} />
                  {doctor.workplace}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              Thông tin cá nhân
            </h2>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              <InfoItem icon={User} label="Giới tính" value={formatGender(doctor.gender)} />
              <InfoItem icon={Calendar} label="Ngày sinh" value={formatDate(doctor.dob)} />
              <InfoItem icon={Mail} label="Email" value={doctor.email} />
              <InfoItem icon={Phone} label="Số điện thoại" value={doctor.phone || ""} />
            </div>
          </div>

          {/* Work Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              Thông tin công việc
            </h2>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              <InfoItem icon={Stethoscope} label="Chuyên khoa" value={doctor.specialization || ""} />
              <InfoItem icon={Building2} label="Khoa/Phòng" value={resolveDepartmentName(doctor, departments)} />
              <InfoItem icon={MapPin} label="Nơi làm việc" value={doctor.workplace || ""} />
              <InfoItem icon={FileBadge} label="Số giấy phép" value={doctor.licenseNumber || ""} />
              <InfoItem
                icon={Award}
                label="Kinh nghiệm"
                value={doctor.yearsOfExperience ? `${doctor.yearsOfExperience} năm` : ""}
              />
              <InfoItem icon={Briefcase} label="Vai trò" value="Bác sĩ" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;

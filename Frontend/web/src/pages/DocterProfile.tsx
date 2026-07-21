import { useEffect, useState, useCallback } from "react";
import { type Doctor, type Department } from "../types";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { useTranslation } from "react-i18next";
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
  History,
  Activity,
  LogIn,
  Pill,
  Bell,
  CalendarDays,
  TriangleAlert,
  Settings2,
  ChevronDown,
  Edit2,
} from "lucide-react";

import EditDoctorModal from "../components/profile/EditDoctorModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClinicalHistoryItem {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  resource?: string;
  resourceId?: string;
  patientId?: string;
  patientName?: string;
  createdAt: string;
  timestamp: string;
  date: string;
}

interface ActivityLogPage {
  data: ClinicalHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

function normalizeObjectId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "$oid" in value)
    return String((value as { $oid?: string }).$oid || "");
  if (typeof value === "object" && value !== null && "id" in value)
    return String((value as { id?: string }).id || "");
  if (typeof value === "object" && value !== null && "_id" in value)
    return String((value as { _id?: string })._id || "");
  return String(value);
}

function resolveDepartmentName(profile: Doctor, departments: Department[]): string {
  const directDepartmentName =
    (profile as any)?.departmentName ||
    (profile as any)?.department?.name ||
    (typeof (profile as any)?.department === "string" ? (profile as any).department : "");
  if (directDepartmentName) return String(directDepartmentName);

  const departmentId = normalizeObjectId(
    profile.departmentId ||
      (profile as any)?.department?.id ||
      (profile as any)?.department?._id,
  );
  if (!departmentId) return "";
  return departments.find((d) => normalizeObjectId(d.id) === departmentId)?.name || "";
}

function groupByDate(items: ClinicalHistoryItem[]): Map<string, ClinicalHistoryItem[]> {
  const map = new Map<string, ClinicalHistoryItem[]>();
  for (const item of items) {
    if (!map.has(item.date)) map.set(item.date, []);
    map.get(item.date)!.push(item);
  }
  return map;
}

function formatDateLabel(dateStr: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (dateStr === fmt(today)) return "Hôm nay";
  if (dateStr === fmt(yesterday)) return "Hôm qua";

  return new Date(dateStr).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getResourceIcon(resource?: string, action?: string) {
  if (action?.includes("Đăng nhập") || action?.includes("Đăng xuất")) return LogIn;
  switch (resource) {
    case "prescriptions":
    case "medication-intakes":
      return Pill;
    case "measurements":
      return Activity;
    case "reminders":
      return Bell;
    case "follow-up-appointments":
      return CalendarDays;
    case "alerts":
      return TriangleAlert;
    case "thresholds":
      return Settings2;
    case "patients":
    case "doctors":
    case "nurses":
      return User;
    default:
      return History;
  }
}

function getActivityTypeStyle(resource?: string, action?: string) {
  if (action?.includes("Đăng nhập") || action?.includes("Đăng xuất"))
    return { bg: "bg-blue-100 dark:bg-blue-900/30", icon: "text-blue-600 dark:text-blue-400" };
  if (action?.includes("Xóa"))
    return { bg: "bg-red-100 dark:bg-red-900/30", icon: "text-red-600 dark:text-red-400" };
  if (action?.includes("Tạo") || action?.includes("Ghi nhận") || action?.includes("Thêm"))
    return { bg: "bg-green-100 dark:bg-green-900/30", icon: "text-green-600 dark:text-green-400" };
  if (action?.includes("Cập nhật") || action?.includes("Kích hoạt") || action?.includes("Vô hiệu"))
    return { bg: "bg-amber-100 dark:bg-amber-900/30", icon: "text-amber-600 dark:text-amber-400" };
  switch (resource) {
    case "prescriptions":
    case "medication-intakes":
      return { bg: "bg-purple-100 dark:bg-purple-900/30", icon: "text-purple-600 dark:text-purple-400" };
    case "measurements":
      return { bg: "bg-cyan-100 dark:bg-cyan-900/30", icon: "text-cyan-600 dark:text-cyan-400" };
    case "reminders":
      return { bg: "bg-orange-100 dark:bg-orange-900/30", icon: "text-orange-600 dark:text-orange-400" };
    case "follow-up-appointments":
      return { bg: "bg-sky-100 dark:bg-sky-900/30", icon: "text-sky-600 dark:text-sky-400" };
    case "alerts":
      return { bg: "bg-red-100 dark:bg-red-900/30", icon: "text-red-600 dark:text-red-400" };
    default:
      return { bg: "bg-gray-100 dark:bg-slate-700", icon: "text-gray-500 dark:text-slate-400" };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">
          {value || t("common.notUpdated")}
        </p>
      </div>
    </div>
  );
};

const ActivityItem = ({ item }: { item: ClinicalHistoryItem }) => {
  const Icon = getResourceIcon(item.resource, item.action);
  const style = getActivityTypeStyle(item.resource, item.action);

  return (
    <div className="flex items-start gap-3 py-3.5 group">
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${style.bg}`}>
        <Icon size={16} className={style.icon} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-slate-100 leading-snug">
          {item.action}
        </p>
        {item.patientId && (
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {item.patientName ? `Bệnh nhân: ${item.patientName}` : "Có liên quan bệnh nhân"}
          </p>
        )}
      </div>

      {/* Time */}
      <span className="flex-shrink-0 text-xs text-gray-400 dark:text-slate-500 mt-0.5 font-mono">
        {item.timestamp}
      </span>
    </div>
  );
};

const EmptyActivityState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
      <History size={28} className="text-gray-400 dark:text-slate-500" />
    </div>
    <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Chưa có hoạt động nào</p>
    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
      Các thao tác lâm sàng của bạn sẽ xuất hiện tại đây
    </p>
  </div>
);

// ─── Tab: Activity History ────────────────────────────────────────────────────
const ActivityHistoryTab = () => {
  const [items, setItems] = useState<ClinicalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number, append = false) => {
    try {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await api.get("/activity-logs/me", {
        params: { page: p, pageSize: PAGE_SIZE },
      });
      const body: ActivityLogPage = res.data;

      setItems((prev) => (append ? [...prev, ...body.data] : body.data));
      setTotalPages(body.totalPages);
      setPage(body.page);
      setError(null);
    } catch {
      setError("Không thể tải lịch sử hoạt động. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchPage(page + 1, true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gray-400 dark:text-slate-500" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        <button
          onClick={() => fetchPage(1)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (items.length === 0) return <EmptyActivityState />;

  const grouped = groupByDate(items);

  return (
    <div className="space-y-2">

      {/* Grouped list */}
      {Array.from(grouped.entries()).map(([date, dayItems]) => (
        <div key={date}>
          {/* Date header */}
          <div className="flex items-center gap-2 py-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              {formatDateLabel(date)}
            </span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-slate-700" />
            <span className="text-xs text-gray-400 dark:text-slate-500">{dayItems.length} hoạt động</span>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 px-4 divide-y divide-gray-100 dark:divide-slate-700">
            {dayItems.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}

      {/* Load more */}
      {page < totalPages && (
        <div className="pt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ChevronDown size={14} />
            )}
            {loadingMore ? "Đang tải..." : "Xem thêm"}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Profile Info ────────────────────────────────────────────────────────
const ProfileInfoTab = ({ doctor, departments }: { doctor: Doctor; departments: Department[] }) => {
  const { t } = useTranslation();

  const formatGender = (g: string) => {
    if (g === "M") return "Nam";
    if (g === "F") return t("common.female");
    return t("common.other");
  };

  const formatDate = (d: string) => {
    if (!d) return t("common.notUpdated");
    return new Date(d).toLocaleDateString("vi-VN");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Personal Info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          {t("profile.title")}
        </h2>
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          <InfoItem icon={User} label={t("profile.gender")} value={formatGender(doctor.gender)} />
          <InfoItem icon={Calendar} label={t("profile.dateOfBirth")} value={formatDate(doctor.dob)} />
          <InfoItem icon={Mail} label="Email" value={doctor.email} />
          <InfoItem icon={Phone} label={t("profile.phone")} value={doctor.phone || ""} />
        </div>
      </div>

      {/* Work Info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          {t("profile.workInfo")}
        </h2>
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {doctor.academicDegreeLabel && (
            <InfoItem icon={Award} label="Học vị" value={doctor.academicDegreeLabel} />
          )}
          {doctor.professionalQualificationLabel && (
            <InfoItem icon={Award} label="Trình độ chuyên môn" value={doctor.professionalQualificationLabel} />
          )}
          {doctor.academicTitleLabel && (
            <InfoItem icon={Award} label="Chức danh" value={doctor.academicTitleLabel} />
          )}
          <InfoItem icon={Stethoscope} label={t("profile.specialization")} value={doctor.specialization || ""} />
          <InfoItem icon={Building2} label={t("profile.department")} value={resolveDepartmentName(doctor, departments)} />
          <InfoItem icon={MapPin} label={t("profile.workplace")} value={doctor.workplace || ""} />
          <InfoItem icon={FileBadge} label={t("profile.licenseNumber")} value={doctor.licenseNumber || ""} />
          <InfoItem
            icon={Award}
            label={t("profile.experience")}
            value={doctor.yearsOfExperience ? `${doctor.yearsOfExperience} năm` : ""}
          />
          <InfoItem icon={Briefcase} label={t("profile.role")} value={t("profile.doctor")} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "profile" | "activity";

const DoctorProfile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [showEditModal, setShowEditModal] = useState(false);

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
        setError(err?.response?.data?.error || t("profile.loadingError"));
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
        <p className="text-gray-500 dark:text-slate-400">{error || t("profile.notFound")}</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "profile", label: "Thông tin cá nhân", icon: User },
    { key: "activity", label: "Lịch sử hoạt động", icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-slate-900">
      <div className="w-full space-y-4 px-4 py-8 pb-24 sm:px-6 lg:px-8">

        {/* ── Header card ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 flex-shrink-0">
                {doctor.avatarUrl ? (
                  <img src={doctor.avatarUrl} alt={doctor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500">
                    <User size={32} />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{doctor.displayName || doctor.name}</h1>
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
            <div>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-200 dark:shadow-none"
              >
                <Edit2 size={16} /> Chỉnh sửa hồ sơ
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-1.5 flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${activeTab === key
                  ? "bg-gray-900 dark:bg-slate-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                }
              `}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        <div>
          {activeTab === "profile" && (
            <ProfileInfoTab doctor={doctor} departments={departments} />
          )}
          {activeTab === "activity" && (
            <ActivityHistoryTab />
          )}
        </div>
      </div>

      {showEditModal && doctor && (
        <EditDoctorModal
          doctor={doctor}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            window.location.reload(); // Simple reload to get fresh data
          }}
        />
      )}
    </div>
  );
};

export default DoctorProfile;

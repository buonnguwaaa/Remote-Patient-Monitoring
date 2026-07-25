import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import api from "../services/api";

interface DashboardCounts {
  doctors: number;
  patients: number;
  nurses: number;
}

interface RecentActivity {
  id: string;
  type: "login" | "create" | "update" | "delete" | "system";
  userName: string;
  action: string;
  timestamp: string;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
  memberCount: number;
}

interface DoctorWorkload {
  id: string;
  name: string;
  department: string;
  patientCount: number;
}

const refreshIntervalMs = 30000;

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { toast, showToast, hideToast } = useToast(4000);
  
  const [counts, setCounts] = useState<DashboardCounts>({
    doctors: 0,
    patients: 0,
    nurses: 0,
  });
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [unassignedPatientsCount, setUnassignedPatientsCount] = useState(0);
  const [inactivePatientsCount, setInactivePatientsCount] = useState(0);
  const [topWorkloads, setTopWorkloads] = useState<DoctorWorkload[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const fetchDashboardData = async (options?: { showErrorToast?: boolean; isInitialLoad?: boolean }) => {
    const showErrorToast = options?.showErrorToast ?? false;
    const isInitialLoad = options?.isInitialLoad ?? false;

    try {
      if (isInitialLoad) setLoadingStats(true);

      const [doctorsRes, patientsRes, nursesRes, deptRes, assignRes] = await Promise.all([
        api.get("/users/doctors?limit=1000&sortOrder=desc"),
        api.get("/users/patients?limit=1000&sortOrder=desc"),
        api.get("/users/nurses?limit=1000&sortOrder=desc"),
        api.get("/departments"),
        api.get("/assignments?limit=5000"),
      ]);

      const doctors = doctorsRes.data?.data || [];
      const patients = patientsRes.data?.data || [];
      const nurses = nursesRes.data?.data || [];
      const depts = deptRes.data?.data || [];
      const assignments = assignRes.data?.data || [];

      // Calculate unassigned active patients
      const unassignedPatients = patients.filter((p: any) => p.status === 'active' && !assignments.some((a: any) => a.patientId === p.id)).length;

      // Calculate inactive patients (waiting for verification)
      const inactivePatients = patients.filter((p: any) => p.status === 'inactive').length;

      // Calculate doctor workloads
      const workloadMap = new Map<string, number>();
      assignments.forEach((a: any) => {
        if (a.doctorId) {
          workloadMap.set(a.doctorId, (workloadMap.get(a.doctorId) || 0) + 1);
        }
      });

      const workloads: DoctorWorkload[] = doctors.map((d: any) => ({
        id: d.id,
        name: d.displayName || d.name,
        department: d.department || "Khác",
        patientCount: workloadMap.get(d.id) || 0
      }))
      .sort((a: DoctorWorkload, b: DoctorWorkload) => b.patientCount - a.patientCount)
      .slice(0, 10);

      setCounts({
        doctors: doctors.length,
        patients: patients.length,
        nurses: nurses.length,
      });
      setDepartments(depts);
      setUnassignedPatientsCount(unassignedPatients);
      setInactivePatientsCount(inactivePatients);
      setTopWorkloads(workloads);

    } catch (error) {
      console.error("Error fetching dashboard stats", error);
      if (showErrorToast) {
        showToast(t("dashboard.cannotLoadData") || "Không thể tải dữ liệu", "error", {
          title: t("dashboard.loadDataFailed") || "Lỗi tải dữ liệu",
        });
      }
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      setLoadingActivities(true);
      const response = await api.get("/activity-logs", {
        params: { pageSize: 8 },
      });
      setRecentActivities(response.data.data || []);
    } catch (error) {
      console.error("Error fetching recent activities", error);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData({ showErrorToast: true, isInitialLoad: true });
    void fetchRecentActivities();

    const intervalId = window.setInterval(() => {
      void fetchDashboardData();
      void fetchRecentActivities();
    }, refreshIntervalMs);

    return () => window.clearInterval(intervalId);
  }, []);

  const getActivityColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "login": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
      case "create": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "update": return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
      case "delete": return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
      case "system": return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400";
      default: return "bg-slate-500/10 text-slate-700 dark:text-slate-400";
    }
  };

  const getActivityTypeName = (type: string) => {
    switch (type.toLowerCase()) {
      case "login": return "ĐĂNG NHẬP";
      case "create": return "TẠO MỚI";
      case "update": return "CẬP NHẬT";
      case "delete": return "XÓA";
      case "system": return "HỆ THỐNG";
      default: return type;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const diffMins = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${Math.floor(diffHours / 24)} ngày trước`;
  };

  const totalUsers = counts.doctors + counts.nurses + counts.patients;
  const maxWorkload = Math.max(...topWorkloads.map(w => w.patientCount)) || 1;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen font-sans">
      <Toast toast={toast} onClose={hideToast} />

      {/* System Pulse - Minimal Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            Xin chào, Quản trị viên
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Điều hành hệ thống giám sát bệnh nhân từ xa
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">⏱ Cập nhật: {new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards - Actionable & Direct */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Total Users */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700/60 transition-all hover:shadow-md">
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
            Tổng Tài Khoản
          </div>
          <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            {loadingStats ? "..." : totalUsers.toLocaleString()}
          </div>
          <div className="space-y-2">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div style={{ width: `${(counts.doctors / (totalUsers || 1)) * 100}%` }} className="bg-indigo-500"></div>
              <div style={{ width: `${(counts.nurses / (totalUsers || 1)) * 100}%` }} className="bg-purple-500"></div>
              <div style={{ width: `${(counts.patients / (totalUsers || 1)) * 100}%` }} className="bg-emerald-500"></div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>BS: {counts.doctors}</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span>YT: {counts.nurses}</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>BN: {counts.patients}</div>
            </div>
          </div>
        </div>

        {/* Card 2: Departments */}
        <Link to="/departments" className="group rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700/60 transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 flex flex-col justify-between cursor-pointer">
          <div>
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 group-hover:text-blue-500 transition-colors">
              Khoa / Phòng
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {loadingStats ? "..." : departments.length}
            </div>
          </div>
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-4 inline-flex items-center">
            Quản lý khoa phòng <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
          </div>
        </Link>

        {/* Card 3: Unassigned Patients */}
        <Link to="/assignments" className={`group rounded-2xl p-6 shadow-sm border transition-all hover:shadow-md flex flex-col justify-between cursor-pointer ${unassignedPatientsCount > 0 ? 'bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 hover:border-amber-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'}`}>
          <div>
            <div className={`text-xs font-bold uppercase tracking-widest mb-4 transition-colors ${unassignedPatientsCount > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'}`}>
              Bệnh nhân chưa có bác sĩ phụ trách
            </div>
            <div className={`text-4xl font-black tracking-tight ${unassignedPatientsCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
              {loadingStats ? "..." : unassignedPatientsCount}
            </div>
          </div>
          <div className={`text-sm font-bold mt-4 inline-flex items-center ${unassignedPatientsCount > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700'}`}>
             {unassignedPatientsCount > 0 ? 'Gán bác sĩ phụ trách' : 'Đã phân công toàn bộ'} <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
          </div>
        </Link>

        {/* Card 4: Inactive Patients */}
        <Link to="/patients" className={`group rounded-2xl p-6 shadow-sm border transition-all hover:shadow-md flex flex-col justify-between cursor-pointer ${inactivePatientsCount > 0 ? 'bg-rose-50/30 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/50 hover:border-rose-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'}`}>
          <div>
            <div className={`text-xs font-bold uppercase tracking-widest mb-4 transition-colors ${inactivePatientsCount > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'}`}>
              Tài khoản bệnh nhân chờ phê duyệt
            </div>
            <div className={`text-4xl font-black tracking-tight ${inactivePatientsCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {loadingStats ? "..." : inactivePatientsCount}
            </div>
          </div>
          <div className={`text-sm font-bold mt-4 inline-flex items-center ${inactivePatientsCount > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700'}`}>
            {inactivePatientsCount > 0 ? 'Phê duyệt tài khoản' : 'Không có yêu cầu chờ'} <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Activity Logs (col-span-2) */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Nhật Ký Hoạt Động</h2>
            <Link to="/activity-history" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors">
              Xem toàn bộ &rarr;
            </Link>
          </div>
          <div className="flex-1 p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60">
                <tr>
                  <th className="px-6 py-4 font-bold">Thời gian</th>
                  <th className="px-6 py-4 font-bold">Tài khoản</th>
                  <th className="px-6 py-4 font-bold">Thao tác</th>
                  <th className="px-6 py-4 font-bold">Phân loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loadingActivities ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                ) : recentActivities.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">Không có hoạt động nào gần đây</td></tr>
                ) : (
                  recentActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs font-medium">
                        {getTimeAgo(activity.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                        {activity.userName}
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate text-slate-600 dark:text-slate-400">
                        {activity.action}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getActivityColor(activity.type)}`}>
                          {getActivityTypeName(activity.type)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Doctor Workload */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 shadow-sm p-6 flex flex-col">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">Khối lượng tiếp nhận của bác sĩ</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Top bác sĩ tiếp nhận nhiều bệnh nhân nhất</p>
            </div>
            <Link to="/assignments" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors">
              Phân công &rarr;
            </Link>
          </div>
          
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar pr-2">
            {loadingStats ? (
               <div className="py-10 text-center text-slate-500">Đang phân tích...</div>
            ) : topWorkloads.length === 0 ? (
               <div className="py-10 text-center text-slate-500 flex flex-col items-center">
                 <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                   <span className="text-slate-400 text-xl">🛌</span>
                 </div>
                 Chưa có bác sĩ nào
               </div>
            ) : (
              topWorkloads.map((doc) => {
                const percentage = Math.max(2, Math.round((doc.patientCount / maxWorkload) * 100));
                
                return (
                  <div key={doc.id} className="group cursor-pointer" onClick={() => window.location.href = `/assignments?doctorId=${doc.id}`}>
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex flex-col pr-4 overflow-hidden">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold truncate">{doc.department}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {doc.patientCount} <span className="text-xs font-medium text-slate-400">bệnh nhân</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 group-hover:opacity-80 ${percentage >= 80 ? 'bg-rose-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-blue-600 dark:bg-indigo-500'}`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;

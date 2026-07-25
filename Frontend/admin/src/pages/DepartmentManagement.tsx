import React, { useState, useEffect } from "react";
import { FaBuilding, FaPlus, FaSearch, FaUserMd, FaArrowLeft, FaEdit, FaTrash } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import type { Department, doctor, Nurse } from "../types";
import { DoctorFormWizard } from "../components/users/DoctorFormWizard";
import NurseFormWizard from "../components/users/NurseFormWizard";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "../styles/buttonStyles";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
    avatar?: string;
    createdAt: string;
}

interface CandidateMember {
    id: string;
    name: string;
    email?: string;
    role?: string;
    departmentId?: string;
    currentDepartmentName?: string;
}

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

    return String(value);
}

function resolveDepartmentNameById(departments: Department[], departmentId: unknown): string {
    const normalizedDepartmentId = normalizeObjectId(departmentId);
    if (!normalizedDepartmentId) {
        return "";
    }

    const matchedDepartment = departments.find((department) => {
        return normalizeObjectId(department.id) === normalizedDepartmentId;
    });

    return matchedDepartment?.name || "";
}

const getDepartmentImage = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("tim mạch")) return "/images/departments/cardiology.png";
    if (n.includes("nội tiết")) return "/images/departments/endocrinology.png";
    if (n.includes("thận") || n.includes("tiết niệu")) return "/images/departments/nephrology.png";
    // Default medical/hospital image for others (General Medicine, etc)
    return "/images/departments/general.png";
};

const DepartmentManagement: React.FC = () => {
    const { t } = useTranslation();
    const { toast, showToast, hideToast } = useToast();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [loading, setLoading] = useState(true);

    const [viewingDept, setViewingDept] = useState<Department | null>(null);
    const [deptMembers, setDeptMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [candidates, setCandidates] = useState<CandidateMember[]>([]);

    const [viewingDoctor, setViewingDoctor] = useState<doctor | null>(null);
    const [showDoctorWizard, setShowDoctorWizard] = useState(false);
    const [viewingNurse, setViewingNurse] = useState<Nurse | null>(null);
    const [showNurseWizard, setShowNurseWizard] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const res = await api.get("/departments");
            setDepartments(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMembers = async (deptId: string) => {
        try {
            setLoadingMembers(true);
            const res = await api.get(`/departments/${deptId}/members`);
            setDeptMembers(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch members", error);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleMemberClick = async (member: Member) => {
        try {
            if (member.role.includes('doctor')) {
                const res = await api.get(`/users/doctors/${member.id}`);
                const u = res.data.data;
                const doc: doctor = {
                    id: u.id,
                    name: u.name,
                    displayName: u.displayName || u.name,
                    academicDegree: u.academicDegree,
                    academicDegreeLabel: u.academicDegreeLabel,
                    professionalQualification: u.professionalQualification,
                    professionalQualificationLabel: u.professionalQualificationLabel,
                    academicTitle: u.academicTitle,
                    academicTitleLabel: u.academicTitleLabel,
                    email: u.email,
                    gender: u.gender === "M" ? "Nam" : u.gender === "F" ? "Nữ" : "Khác",
                    dateOfBirth: u.dob,
                    phone: u.phone || "",
                    specialization: u.specialization || "",
                    licenseNumber: u.licenseNumber || "",
                    departmentId: u.departmentId,
                    department: resolveDepartmentNameById(departments, u.departmentId),
                    workplace: u.workplace || "",
                    yearsOfExperience: u.yearsOfExperience || 0,
                    status: u.status === "inactive" ? "inactive" : "active",
                    profileImageUrl: u.avatarUrl || "/avartar.jpg",
                };
                setViewingDoctor(doc);
                setShowDoctorWizard(true);
            } else {
                const res = await api.get(`/users/nurses/${member.id}`);
                const u = res.data.data;
                const n: Nurse = {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    gender: u.gender === "M" ? "Nam" : u.gender === "F" ? "Nữ" : "Khác",
                    dateOfBirth: u.dob,
                    phone: u.phone || "",
                    departmentId: u.departmentId,
                    department: resolveDepartmentNameById(departments, u.departmentId),
                    workplace: u.workplace || "",
                    yearsOfExperience: u.yearsOfExperience || 0,
                    licenseNumber: u.licenseNumber || "",
                    status: u.status === "inactive" ? "inactive" : "active",
                    profileImageUrl: u.avatarUrl || "/avartar.jpg",
                };
                setViewingNurse(n);
                setShowNurseWizard(true);
            }
        } catch (err) {
            console.error("Failed to load user details", err);
            showToast(t("system.error") || "Không thể tải thông tin chi tiết", "error");
        }
    };

    const handleViewDept = (dept: Department) => {
        setViewingDept(dept);
        fetchMembers(dept.id);
    };

    const handleBack = () => {
        setViewingDept(null);
        setDeptMembers([]);
    };

    const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
        };

        try {
            await api.post("/departments", data);
            setShowCreateModal(false);
            fetchDepartments();
            showToast(t("departmentManagement.createSuccess") || "Thêm khoa thành công", "success");
        } catch (error) {
            console.error("Failed to save department", error);
            showToast(t("departmentManagement.createError") || "Có lỗi xảy ra khi thêm khoa", "error");
        }
    };

    const handleEditClick = (e: React.MouseEvent, dept: Department) => {
        e.stopPropagation();
        setEditingDept(dept);
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingDept) return;

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
        };

        try {
            await api.put(`/departments/${editingDept.id}`, data);
            setShowEditModal(false);
            setEditingDept(null);
            fetchDepartments();
            showToast(t("departmentManagement.updateSuccess") || "Cập nhật khoa thành công", "success");
        } catch (error) {
            console.error("Failed to update department", error);
            showToast(t("departmentManagement.updateError") || "Có lỗi xảy ra khi cập nhật khoa", "error");
        }
    };

    const handleDeleteClick = async (e: React.MouseEvent, dept: Department) => {
        e.stopPropagation();
        
        const confirmed = window.confirm(
            t("departmentManagement.confirmDelete", { name: dept.name }) || 
            `Bạn có chắc chắn muốn xóa khoa "${dept.name}"?\n\nLưu ý: Chỉ có thể xóa khoa không còn thành viên.`
        );
        
        if (!confirmed) return;

        try {
            await api.delete(`/departments/${dept.id}`);
            fetchDepartments();
            showToast(t("departmentManagement.deleteSuccess") || "Xóa khoa thành công", "success");
        } catch (error: any) {
            console.error("Failed to delete department", error);
            const errorMsg = error.response?.data?.error || t("departmentManagement.deleteError") || "Có lỗi xảy ra khi xóa khoa";
            showToast(errorMsg, "error");
        }
    };

    const openAddMemberModal = async () => {
        setShowAddMemberModal(true);
        try {
            const [resDoctors, resNurses] = await Promise.all([
                api.get("/users/doctors?limit=100"),
                api.get("/users/nurses?limit=100")
            ]);
            const extract = (res: any) => res.data?.data || [];
            const all = [...extract(resDoctors), ...extract(resNurses)].map((candidate: any) => {
                const currentDepartmentName = resolveDepartmentNameById(departments, candidate.departmentId);
                return {
                    ...candidate,
                    currentDepartmentName,
                } as CandidateMember;
            });
            const existingIds = new Set(deptMembers.map(m => m.id));
            setCandidates(all.filter((c: CandidateMember) => !existingIds.has(c.id)));
        } catch (error) {
            console.error("Failed to fetch candidates");
        }
    };

    const handleAddMember = async (userId: string) => {
        if (!viewingDept) return;

        const selectedCandidate = candidates.find((candidate) => candidate.id === userId);
        const fromDepartment = selectedCandidate?.currentDepartmentName || t("departmentManagement.noDepartment");
        const toDepartment = viewingDept.name;
        const shouldTransfer = window.confirm(
            `${t("departmentManagement.confirmTransfer")}\n\n${t("departmentManagement.from")} ${fromDepartment}\n${t("departmentManagement.to")} ${toDepartment}`
        );

        if (!shouldTransfer) {
            return;
        }

        try {
            await api.post(`/departments/${viewingDept.id}/members`, { userId });
            setShowAddMemberModal(false);
            fetchMembers(viewingDept.id);
            fetchDepartments();
        } catch (error) {
            console.error("Failed to add member", error);
            alert(t("departmentManagement.addMemberError"));
        }
    };

    const filtered = departments.filter((d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (viewingDept) {
        return (
            <div className="p-4 md:p-6">
                <Toast toast={toast} onClose={hideToast} />
                <button
                    onClick={handleBack}
                    className="mb-6 flex items-center text-gray-600 transition hover:text-slate-900 dark:text-gray-400 dark:hover:text-slate-100"
                >
                    <FaArrowLeft className="mr-2" /> {t("departmentManagement.backToList")}
                </button>

                <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h1 className="flex items-center text-2xl font-bold leading-tight text-gray-800 dark:text-white md:text-3xl">
                            <FaBuilding className="mr-3 text-slate-700 dark:text-blue-400" />
                            {viewingDept.name}
                        </h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 md:text-lg">{viewingDept.description}</p>
                    </div>
                    <button
                        onClick={openAddMemberModal}
                        className={`${adminPrimaryButtonClass} w-full md:w-auto`}
                    >
                        <FaPlus className="mr-2" />
                        {t("departmentManagement.addMember")}
                    </button>
                </div>

                <div className="overflow-hidden rounded-xl bg-white shadow-md dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
                    <div className="border-b border-gray-100 p-4 dark:border-gray-700 md:p-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white md:text-xl">{t("departmentManagement.staffList", { count: deptMembers.length })}</h3>
                    </div>

                    {loadingMembers ? (
                        <div className="p-10 text-center text-gray-500">{t("departmentManagement.loadingList")}</div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {deptMembers.map(member => (
                                <div 
                                    key={member.id} 
                                    onClick={() => handleMemberClick(member)}
                                    className="flex items-center justify-between p-4 transition hover:bg-gray-50 dark:hover:bg-slate-800/80 cursor-pointer"
                                >
                                    <div className="flex items-center">
                                        <div className={`mr-4 flex h-10 w-10 overflow-hidden items-center justify-center rounded-full ${member.role.includes('doctor') ? 'bg-slate-100 text-slate-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                                            {member.avatarUrl || member.avatar ? (
                                                <img src={member.avatarUrl || member.avatar} alt={member.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} alt={member.name} className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-100">{member.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                                        </div>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${member.role.includes('doctor') ? 'bg-slate-100 text-slate-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                                        {member.role.includes('doctor') ? t("departmentManagement.roles.doctor") : t("departmentManagement.roles.nurse")}
                                    </span>
                                </div>
                            ))}
                            {deptMembers.length === 0 && (
                                <div className="p-10 text-center italic text-gray-500 dark:text-slate-400">
                                    {t("departmentManagement.noStaff")}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {showAddMemberModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold dark:text-white">{t("departmentManagement.selectStaff")}</h2>
                                <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-red-500">
                                    &times;
                                </button>
                            </div>
                            <div className="space-y-2">
                                {candidates.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800">
                                        <div>
                                            <p className="font-medium dark:text-gray-100">{c.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{c.role === 'user.doctor' ? t("departmentManagement.roles.doctor") : t("departmentManagement.roles.nurse")} - {c.email}</p>
                                            <p className="text-xs text-amber-600 dark:text-amber-300">
                                                {t("departmentManagement.currentDepartment")} {c.currentDepartmentName || t("departmentManagement.noDepartment")}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleAddMember(c.id)}
                                            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            {t("departmentManagement.transfer")}
                                        </button>
                                    </div>
                                ))}
                                {candidates.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">{t("departmentManagement.noAvailableStaff")}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {showDoctorWizard && viewingDoctor && (
                    <DoctorFormWizard
                        isOpen={showDoctorWizard}
                        onClose={() => setShowDoctorWizard(false)}
                        editingDoctor={viewingDoctor}
                        modalMode="view"
                        departments={departments}
                        onSuccess={() => {}}
                        showToast={showToast}
                    />
                )}
                {showNurseWizard && viewingNurse && (
                    <NurseFormWizard
                        isOpen={showNurseWizard}
                        onClose={() => setShowNurseWizard(false)}
                        editingNurse={viewingNurse}
                        modalMode="view"
                        departments={departments}
                        onSuccess={() => {}}
                        showToast={showToast}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50/50 dark:bg-slate-900 min-h-screen">
            <Toast toast={toast} onClose={hideToast} />
            
            {/* Header & Toolbar */}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="flex items-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        <FaBuilding className="mr-3 text-indigo-500" />
                        {t("departmentManagement.title")}
                    </h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
                        {t("departmentManagement.totalCount", { count: departments.length })}
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Pill Search Bar */}
                    <div className="relative w-full sm:w-72">
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t("departmentManagement.searchPlaceholder")}
                            className="w-full rounded-full border-none bg-white py-2.5 pl-11 pr-4 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:ring-slate-700 dark:text-white dark:placeholder-slate-500 transition-shadow hover:shadow-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all hover:shadow-md"
                    >
                        <FaPlus className="mr-2" />
                        {t("departmentManagement.addDepartment")}
                    </button>
                </div>
            </div>

            {/* Department Cards Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((dept) => (
                    <div
                        key={dept.id}
                        className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:bg-slate-800 dark:ring-slate-700"
                    >
                        {/* Cover Image */}
                        <div 
                            className="h-40 w-full overflow-hidden bg-slate-100 cursor-pointer relative"
                            onClick={() => handleViewDept(dept)}
                        >
                            <img 
                                src={getDepartmentImage(dept.name)} 
                                alt={dept.name} 
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            {/* Overlay Gradient for contrast */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20"></div>
                            
                            {/* Actions (Edit/Delete) - appear on hover */}
                            <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                <button
                                    onClick={(e) => handleEditClick(e, dept)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors"
                                    title={t("common.edit")}
                                >
                                    <FaEdit size={14} />
                                </button>
                                <button
                                    onClick={(e) => handleDeleteClick(e, dept)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-red-200 hover:bg-red-500/80 hover:text-white transition-colors"
                                    title={t("common.delete")}
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-1 flex-col justify-between p-6 cursor-pointer" onClick={() => handleViewDept(dept)}>
                            <div>
                                <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {dept.name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {dept.description || t("departmentManagement.noDescription")}
                                </p>
                            </div>

                            {/* Assignments Badge */}
                            <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-4">
                                <div className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                        <FaUserMd size={14} />
                                    </div>
                                    <span>{dept.memberCount} Nhân sự</span>
                                </div>
                                <span className="text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                                    Chi tiết &rarr;
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="col-span-full py-20 text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600"></div>
                        <p className="mt-4 text-slate-500 font-medium">{t("common.loading")}</p>
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 py-24 text-center dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <FaSearch className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">Không tìm thấy khoa nào</p>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{t("departmentManagement.notFound")}</p>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
                        <h2 className="text-2xl font-bold mb-4 dark:text-white">
                            {t("departmentManagement.addDepartment")}
                        </h2>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("departmentManagement.fields.name")}
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Khoa Tim Mạch"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("departmentManagement.fields.description")}
                                </label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    placeholder="Mô tả chức năng, nhiệm vụ..."
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-slate-700"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className={adminSecondaryButtonClass}
                                >
                                    {t("common.cancel")}
                                </button>
                                <button
                                    type="submit"
                                    className={adminPrimaryButtonClass}
                                >
                                    {t("common.add")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && editingDept && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
                        <h2 className="text-2xl font-bold mb-4 dark:text-white">
                            {t("departmentManagement.editDepartment")}
                        </h2>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("departmentManagement.fields.name")}
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    defaultValue={editingDept.name}
                                    placeholder="Ví dụ: Khoa Tim Mạch"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("departmentManagement.fields.description")}
                                </label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    defaultValue={editingDept.description}
                                    placeholder="Mô tả chức năng, nhiệm vụ..."
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-slate-700"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingDept(null);
                                    }}
                                    className={adminSecondaryButtonClass}
                                >
                                    {t("common.cancel")}
                                </button>
                                <button
                                    type="submit"
                                    className={adminPrimaryButtonClass}
                                >
                                    {t("common.update")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentManagement;

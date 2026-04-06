import React, { useState, useEffect } from "react";
import { FaBuilding, FaPlus, FaSearch, FaUserMd, FaUserNurse, FaArrowLeft } from "react-icons/fa";
import api from "../services/api";
import type { Department, doctor, Nurse } from "../types";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "../styles/buttonStyles";

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
    createdAt: string;
}

const DepartmentManagement: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [viewingDept, setViewingDept] = useState<Department | null>(null);
    const [deptMembers, setDeptMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [candidates, setCandidates] = useState<(doctor | Nurse)[]>([]);

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
        } catch (error) {
            console.error("Failed to save department", error);
            alert("Có lỗi xảy ra khi lưu khoa phòng");
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
            const all = [...extract(resDoctors), ...extract(resNurses)];
            const existingIds = new Set(deptMembers.map(m => m.id));
            setCandidates(all.filter((c: any) => !existingIds.has(c.id)));
        } catch (error) {
            console.error("Failed to fetch candidates");
        }
    };

    const handleAddMember = async (userId: string) => {
        if (!viewingDept) return;
        try {
            await api.post(`/departments/${viewingDept.id}/members`, { userId });
            setShowAddMemberModal(false);
            fetchMembers(viewingDept.id);
            fetchDepartments();
        } catch (error) {
            console.error("Failed to add member", error);
            alert("Lỗi khi thêm thành viên");
        }
    };

    const filtered = departments.filter((d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (viewingDept) {
        return (
            <div className="p-6">
                <button
                    onClick={handleBack}
                    className="mb-6 flex items-center text-gray-600 transition hover:text-slate-900 dark:text-gray-400 dark:hover:text-slate-100"
                >
                    <FaArrowLeft className="mr-2" /> Quay lại danh sách
                </button>

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                            <FaBuilding className="mr-3 text-slate-700 dark:text-blue-400" />
                            {viewingDept.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">{viewingDept.description}</p>
                    </div>
                    <button
                        onClick={openAddMemberModal}
                        className={adminPrimaryButtonClass}
                    >
                        <FaPlus className="mr-2" />
                        Thêm Thành Viên
                    </button>
                </div>

                <div className="overflow-hidden rounded-xl bg-white shadow-md dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Danh sách nhân sự ({deptMembers.length})</h3>
                    </div>

                    {loadingMembers ? (
                        <div className="p-10 text-center text-gray-500">Đang tải danh sách...</div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {deptMembers.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-4 transition hover:bg-gray-50 dark:hover:bg-slate-800/80">
                                    <div className="flex items-center">
                                        <div className={`mr-4 flex h-10 w-10 items-center justify-center rounded-full ${member.role.includes('doctor') ? 'bg-slate-100 text-slate-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                                            {member.role.includes('doctor') ? <FaUserMd /> : <FaUserNurse />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-100">{member.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                                        </div>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${member.role.includes('doctor') ? 'bg-slate-100 text-slate-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>
                                        {member.role.includes('doctor') ? 'Bác sĩ' : 'Y tá'}
                                    </span>
                                </div>
                            ))}
                            {deptMembers.length === 0 && (
                                <div className="p-10 text-center italic text-gray-500 dark:text-slate-400">
                                    Chưa có nhân sự nào trong khoa này.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {showAddMemberModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold dark:text-white">Chọn nhân sự thêm vào khoa</h2>
                                <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-red-500">
                                    &times;
                                </button>
                            </div>
                            <div className="space-y-2">
                                {candidates.map((c: any) => (
                                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800">
                                        <div>
                                            <p className="font-medium dark:text-gray-100">{c.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{c.role === 'user.doctor' ? 'Bác sĩ' : 'Y tá'} - {c.email}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddMember(c.id)}
                                            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                            Thêm
                                        </button>
                                    </div>
                                ))}
                                {candidates.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">Không còn nhân sự trống nào.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
                        <FaBuilding className="mr-3 text-slate-700 dark:text-blue-400" />
                        Quản lý Khoa / Phòng
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Tổng số: {departments.length} khoa phòng
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className={adminPrimaryButtonClass}
                >
                    <FaPlus className="mr-2" />
                    Thêm Khoa
                </button>
            </div>

            <div className="mb-6 rounded-lg bg-white p-4 shadow-md dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm khoa phòng..."
                        className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 dark:focus:ring-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((dept) => (
                    <div
                        key={dept.id}
                        onClick={() => handleViewDept(dept)}
                        className="group cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition duration-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="mb-2 text-xl font-bold text-gray-800 transition group-hover:text-slate-900 dark:text-white dark:group-hover:text-blue-300">
                                        {dept.name}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                                        {dept.description || "Chưa có mô tả"}
                                    </p>
                                </div>
                                <div className="rounded-full bg-slate-100 p-3 transition group-hover:bg-slate-200 dark:bg-slate-800 dark:group-hover:bg-slate-700">
                                    <FaBuilding className="text-xl text-slate-600 dark:text-blue-300" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                                        Thành viên
                                    </span>
                                    <span className="text-lg font-bold text-gray-700 dark:text-gray-200">
                                        {dept.memberCount}
                                    </span>
                                </div>
                                <span className="mb-0 flex self-end pb-0 text-sm text-slate-500 opacity-0 transition group-hover:opacity-100 dark:text-blue-300">
                                    Xem chi tiết &rarr;
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        Đang tải dữ liệu...
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="col-span-full rounded-lg border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                        Không tìm thấy khoa phòng nào.
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
                        <h2 className="text-2xl font-bold mb-4 dark:text-white">
                            Thêm Khoa / Phòng mới
                        </h2>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tên Khoa/Phòng
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
                                    Mô tả
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
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className={adminPrimaryButtonClass}
                                >
                                    Tạo mới
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

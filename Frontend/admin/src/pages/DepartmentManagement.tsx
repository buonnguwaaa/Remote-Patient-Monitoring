import React, { useState, useEffect } from "react";
import { FaBuilding, FaPlus, FaSearch, FaUserMd, FaUserNurse, FaArrowLeft } from "react-icons/fa";
import api from "../services/api";
import type { Department, doctor, Nurse } from "../types";

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

    // Detail View State
    const [viewingDept, setViewingDept] = useState<Department | null>(null);
    const [deptMembers, setDeptMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    // Candidates for adding
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
        // Fetch candidates (doctors and nurses)
        try {
            const [resDoctors, resNurses] = await Promise.all([
                api.get("/users?role=user.doctor&limit=100"),
                api.get("/users?role=user.nurse&limit=100")
            ]);
            const extract = (res: any) => res.data?.data || [];
            const all = [...extract(resDoctors), ...extract(resNurses)];
            // Filter out existing members
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
            fetchMembers(viewingDept.id); // Refresh list
            fetchDepartments(); // Refresh member count in main list
        } catch (error) {
            console.error("Failed to add member", error);
            alert("Lỗi khi thêm thành viên");
        }
    };

    const filtered = departments.filter((d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Render Detail View
    if (viewingDept) {
        return (
            <div className="p-6">
                <button
                    onClick={handleBack}
                    className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition"
                >
                    <FaArrowLeft className="mr-2" /> Quay lại danh sách
                </button>

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                            <FaBuilding className="mr-3 text-blue-600" />
                            {viewingDept.name}
                        </h1>
                        <p className="text-gray-600 mt-2 text-lg">{viewingDept.description}</p>
                    </div>
                    <button
                        onClick={openAddMemberModal}
                        className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-md"
                    >
                        <FaPlus className="mr-2" />
                        Thêm Thành Viên
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800">Danh sách nhân sự ({deptMembers.length})</h3>
                    </div>

                    {loadingMembers ? (
                        <div className="p-10 text-center text-gray-500">Đang tải danh sách...</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {deptMembers.map(member => (
                                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                    <div className="flex items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${member.role.includes('doctor') ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                            {member.role.includes('doctor') ? <FaUserMd /> : <FaUserNurse />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{member.name}</p>
                                            <p className="text-sm text-gray-500">{member.email}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${member.role.includes('doctor') ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                        {member.role.includes('doctor') ? 'Bác sĩ' : 'Y tá'}
                                    </span>
                                </div>
                            ))}
                            {deptMembers.length === 0 && (
                                <div className="p-10 text-center text-gray-500 italic">
                                    Chưa có nhân sự nào trong khoa này.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Member Modal */}
                {showAddMemberModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Chọn nhân sự thêm vào khoa</h2>
                                <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-red-500">
                                    &times;
                                </button>
                            </div>
                            <div className="space-y-2">
                                {candidates.map((c: any) => (
                                    <div key={c.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                                        <div>
                                            <p className="font-medium">{c.name}</p>
                                            <p className="text-sm text-gray-500">{c.role === 'user.doctor' ? 'Bác sĩ' : 'Y tá'} - {c.email}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddMember(c.id)}
                                            className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm font-semibold"
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

    // Main List View
    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <FaBuilding className="mr-3 text-blue-600" />
                        Quản lý Khoa / Phòng
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Tổng số: {departments.length} khoa phòng
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <FaPlus className="mr-2" />
                    Thêm Khoa
                </button>
            </div>

            <div className="mb-6 bg-white rounded-lg shadow-md p-4">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm khoa phòng..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition duration-300 border border-gray-100 cursor-pointer group"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition">
                                        {dept.name}
                                    </h3>
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                                        {dept.description || "Chưa có mô tả"}
                                    </p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-full group-hover:bg-blue-100 transition">
                                    <FaBuilding className="text-blue-500 text-xl" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 uppercase font-semibold">
                                        Thành viên
                                    </span>
                                    <span className="text-lg font-bold text-gray-700">
                                        {dept.memberCount}
                                    </span>
                                </div>
                                <span className="text-sm text-blue-500 opacity-0 group-hover:opacity-100 transition pb-0 mb-0 flex self-end">
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
                    <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                        Không tìm thấy khoa phòng nào.
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">
                            Thêm Khoa / Phòng mới
                        </h2>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên Khoa/Phòng
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Khoa Tim Mạch"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mô tả
                                </label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    placeholder="Mô tả chức năng, nhiệm vụ..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

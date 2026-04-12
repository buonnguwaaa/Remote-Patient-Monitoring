import React, { useState, useEffect } from "react";
import { FaUserNurse, FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import api from "../services/api";
import { uploadAvatar } from "../services/uploadService";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import AvatarUploader from "../components/ui/AvatarUploader";
import type { Department, Nurse } from "../types";
import { mapGenderToDisplay, mapGenderToApi } from "../utils/genderConverter";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "../styles/buttonStyles";

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

function resolveDepartmentName(departments: Department[], departmentId: unknown): string {
  const normalizedDepartmentId = normalizeObjectId(departmentId);
  if (!normalizedDepartmentId) {
    return "";
  }

  const matchedDepartment = departments.find((department) => {
    return normalizeObjectId(department.id) === normalizedDepartmentId;
  });

  return matchedDepartment?.name || "";
}

const NurseManagement: React.FC = () => {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchPageData = async () => {
    try {
      const [nurseResponse, departmentResponse] = await Promise.all([
        api.get("/users/nurses"),
        api.get("/departments").catch(() => ({ data: { data: [] } })),
      ]);

      const availableDepartments = departmentResponse.data?.data || [];

      if (nurseResponse.data?.data) {
        const apiNurses = nurseResponse.data.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          gender: mapGenderToDisplay(u.gender),
          dateOfBirth: u.dob,
          phone: u.phone || "",
          workplace: u.workplace || "",
          licenseNumber: u.licenseNumber || "",
          departmentId: normalizeObjectId(u.departmentId),
          department: resolveDepartmentName(availableDepartments, u.departmentId),
          yearsOfExperience: u.yearsOfExperience || 0,
          status: u.status === "inactive" ? "inactive" : "active",
          profileImageUrl: u.avatarUrl || "/avartar.jpg",
        }));
        setNurses(apiNurses);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách y tá", err);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleEdit = (nurse: Nurse) => {
    setEditingNurse(nurse);
    setAvatarFile(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa y tá này?")) {
      try {
        await api.delete(`/users/${id}`);
        setNurses(nurses.filter((n) => n.id !== id));
        showToast("Xóa y tá thành công!");
      } catch (err) {
        console.error("Lỗi xóa y tá", err);
        showToast("Có lỗi xảy ra khi xóa.", "error");
      }
    }
  };

  const handleAdd = () => {
    setEditingNurse(null);
    setAvatarFile(null);
    setShowModal(true);
  };

  const filteredNurses = nurses.filter((nurse) =>
    nurse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nurse.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nurse.workplace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderNurseCard = (nurse: Nurse) => {
    return (
      <div
        key={nurse.id}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-start gap-3">
          <img
            className="h-12 w-12 rounded-full object-cover"
            src={nurse.profileImageUrl || "/avartar.jpg"}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/avartar.jpg";
            }}
            onClick={() => setPreviewImage(nurse.profileImageUrl || "/avartar.jpg")}
            title="Nhấn để xem ảnh"
          />

          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
              {nurse.name}
            </div>
            <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {nurse.gender} - {nurse.dateOfBirth}
            </div>
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {nurse.department || "Chưa gán"}
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${nurse.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
          >
            {nurse.status === "active" ? "Hoạt động" : "Không hoạt động"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Nơi làm việc: </span>
            <span className="font-medium">{nurse.workplace || "Chưa cập nhật"}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Số giấy phép: </span>
            <span className="font-medium">{nurse.licenseNumber || "Chưa cập nhật"}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Kinh nghiệm: </span>
            <span className="font-medium">{nurse.yearsOfExperience} năm</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-gray-500 dark:text-gray-400">Liên hệ: </span>
            <span className="font-medium">{nurse.email}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => handleEdit(nurse)}
            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-900 dark:hover:bg-blue-900/20"
            aria-label="Chỉnh sửa y tá"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(nurse.id)}
            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-900 dark:hover:bg-red-900/20"
            aria-label="Xóa y tá"
          >
            <FaTrash />
          </button>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const gender = formData.get("gender") as "Nam" | "Nữ";
    const phone = formData.get("phone") as string;
    const licenseNumber = formData.get("licenseNumber") as string;
    const workplace = formData.get("workplace") as string;
    const yearsOfExperience = parseInt(formData.get("yearsOfExperience") as string) || 0;
    const status = formData.get("status") as "active" | "inactive";

    const apiGender = mapGenderToApi(gender);
    try {
      let savedUserId = editingNurse?.id;

      if (editingNurse?.id) {
        await api.patch(`/users/nurses/${editingNurse.id}`, {
          name,
          email,
          gender: apiGender,
          phone,
          licenseNumber,
          workplace,
          yearsOfExperience,
        });
        await api.patch(`/users/${editingNurse.id}/status`, { status });
      } else {
        const password = formData.get("password") as string;
        if (!password || password.length < 8) {
          showToast("Mật khẩu phải có ít nhất 8 ký tự!", "error");
          return;
        }
        await api.post("/auth/register", {
          name, email, password, confirmedPassword: password,
          role: "user.nurse", gender: apiGender, dob: "1990-01-01",
        });
        const resp = await api.get("/users/nurses?sortOrder=desc&limit=1");
        const newUser = resp.data?.data?.[0];
        savedUserId = newUser?.id;
        if (savedUserId) {
          await api.patch(`/users/nurses/${savedUserId}`, {
            phone,
            licenseNumber,
            workplace,
            yearsOfExperience,
          });
          await api.patch(`/users/${savedUserId}/status`, { status });
        }
      }

      if (avatarFile && savedUserId) {
        await uploadAvatar(savedUserId, avatarFile);
      }

      fetchPageData();
      setShowModal(false);
      setAvatarFile(null);
      showToast(editingNurse?.id ? "Cập nhật y tá thành công!" : "Thêm y tá thành công!");
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi: " + (err.response?.data?.error || err.message), "error");
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">
            <FaUserNurse className="mr-3 text-purple-600" />
            Quản lý y tá
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Tổng số: {nurses.length} y tá</p>
        </div>
        <button onClick={handleAdd} className={`${adminPrimaryButtonClass} w-full md:w-auto`}>
          <FaPlus className="mr-2" />Thêm y tá
        </button>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, khoa/phòng, nơi làm việc..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {filteredNurses.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow-md dark:bg-gray-800 dark:text-gray-400">
            Không có dữ liệu hiển thị.
          </div>
        ) : (
          filteredNurses.map((nurse) => renderNurseCard(nurse))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg bg-white shadow-md md:block dark:bg-gray-800">
        <div className="overflow-x-auto thin-scrollbar">
        <table className="w-full min-w-[1350px]">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Y tá</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Khoa/phòng</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nơi làm việc</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Số giấy phép</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kinh nghiệm</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Liên hệ</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNurses.map((nurse) => (
              <tr key={nurse.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4" style={{ minWidth: "250px" }}>
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-400 hover:scale-110 transition-transform duration-150"
                      src={nurse.profileImageUrl || "/avartar.jpg"}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avartar.jpg"; }}
                      onClick={() => setPreviewImage(nurse.profileImageUrl || "/avartar.jpg")}
                      title="Nhấn để xem ảnh"
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{nurse.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{nurse.gender} - {nurse.dateOfBirth}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{nurse.department || "Chưa gán"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{nurse.workplace || "Chưa cập nhật"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{nurse.licenseNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{nurse.yearsOfExperience} năm</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${nurse.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {nurse.status === "active" ? "Hoạt động" : "Không hoạt động"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>{nurse.email}</div>
                  <div className="text-gray-500 dark:text-gray-400">{nurse.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button onClick={() => handleEdit(nurse)} className="text-blue-600 hover:text-blue-900 mr-3"><FaEdit className="inline" /></button>
                  <button onClick={() => handleDelete(nurse.id)} className="text-red-600 hover:text-red-900"><FaTrash className="inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 md:p-6 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold dark:text-white md:text-2xl">{editingNurse ? "Chỉnh sửa y tá" : "Thêm y tá mới"}</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <AvatarUploader
                currentUrl={editingNurse?.profileImageUrl}
                onFileSelect={(file) => setAvatarFile(file)}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Họ tên</label>
                  <input name="name" type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Khoa/phòng</label>
                  <input
                    type="text"
                    disabled
                    value={editingNurse?.department || ""}
                    placeholder="Gán tại Quản lý Khoa / Phòng"
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded-lg cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số giấy phép</label>
                  <input name="licenseNumber" type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.licenseNumber} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nơi làm việc</label>
                  <input name="workplace" type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.workplace} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kinh nghiệm (năm)</label>
                  <input name="yearsOfExperience" type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.yearsOfExperience} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input name="email" type="email" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input name="phone" type="tel" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.phone} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                  <select name="gender" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.gender}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select name="status" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.status || "active"}>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                  </select>
                </div>
                {!editingNurse && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu <span className="text-gray-400 font-normal">(tài khoản đăng nhập)</span></label>
                    <input name="password" type="password" required minLength={8} placeholder="Tối thiểu 8 ký tự" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end md:space-x-3">
                <button type="button" onClick={() => setShowModal(false)} className={`${adminSecondaryButtonClass} w-full md:w-auto`}>Hủy</button>
                <button type="submit" className={`${adminPrimaryButtonClass} w-full md:w-auto`}>{editingNurse ? "Cập nhật" : "Thêm mới"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={() => setPreviewImage(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()} style={{ animation: "scaleIn 0.2s ease" }}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-4 -right-4 bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg hover:bg-gray-100 transition">✕</button>
            <img src={previewImage} alt="Ảnh đại diện" className="rounded-2xl shadow-2xl object-contain" style={{ maxWidth: "80vw", maxHeight: "80vh" }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avartar.jpg"; }} />
          </div>
          <style>{`@keyframes scaleIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      )}
    </div>
  );
};

export default NurseManagement;

import React, { useState, useEffect } from "react";
import { FaUserNurse, FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import api from "../services/api";
import { uploadAvatar } from "../services/uploadService";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import AvatarUploader from "../components/ui/AvatarUploader";
import type { Nurse } from "../types";
import { mapGenderToDisplay, mapGenderToApi } from "../utils/genderConverter";

const NurseManagement: React.FC = () => {
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchNurses = async () => {
    try {
      const response = await api.get("/users?role=user.nurse");
      if (response.data?.data) {
        const apiNurses = response.data.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          gender: mapGenderToDisplay(u.gender),
          dateOfBirth: u.dob,
          phone: u.phone || "",
          licenseNumber: u.nurseProfile?.licenseNumber || "",
          department: u.nurseProfile?.department || "",
          yearsOfExperience: u.nurseProfile?.yearsOfExperience || 0,
          status: u.isActive ? "active" : "inactive",
          profileImageUrl: u.avatarUrl || "/avartar.jpg",
        }));
        setNurses(apiNurses);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách y tá", err);
    }
  };

  useEffect(() => {
    fetchNurses();
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
    nurse.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const gender = formData.get("gender") as "Nam" | "Nữ";
    const phone = formData.get("phone") as string;
    const licenseNumber = formData.get("licenseNumber") as string;
    const department = formData.get("department") as string;
    const yearsOfExperience = parseInt(formData.get("yearsOfExperience") as string) || 0;
    const status = formData.get("status") as "active" | "inactive";

    const apiGender = mapGenderToApi(gender);
    const isActive = status !== "inactive";

    try {
      let savedUserId = editingNurse?.id;

      if (editingNurse?.id) {
        await api.patch(`/users/${editingNurse.id}`, {
          name, email, gender: apiGender, phone,
          nurseLicenseNumber: licenseNumber,
          department,
          nurseYearsOfExperience: yearsOfExperience,
          isActive,
          roles: ["user.nurse"],
        });
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
        const resp = await api.get("/users?role=user.nurse&sortOrder=desc&limit=1");
        const newUser = resp.data?.data?.[0];
        savedUserId = newUser?.id;
        if (savedUserId) {
          await api.patch(`/users/${savedUserId}`, {
            phone,
            nurseLicenseNumber: licenseNumber,
            department,
            nurseYearsOfExperience: yearsOfExperience,
            isActive,
          });
        }
      }

      if (avatarFile && savedUserId) {
        await uploadAvatar(savedUserId, avatarFile);
      }

      fetchNurses();
      setShowModal(false);
      setAvatarFile(null);
      showToast(editingNurse?.id ? "Cập nhật y tá thành công!" : "Thêm y tá thành công!");
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi: " + (err.response?.data?.error || err.message), "error");
    }
  };

  return (
    <div className="p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <FaUserNurse className="mr-3 text-purple-600" />
            Quản lý y tá
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Tổng số: {nurses.length} y tá</p>
        </div>
        <button onClick={handleAdd} className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition">
          <FaPlus className="mr-2" />Thêm y tá
        </button>
      </div>

      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc khoa..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Y tá</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Khoa</th>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{nurse.department}</td>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">{editingNurse ? "Chỉnh sửa y tá" : "Thêm y tá mới"}</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <AvatarUploader
                currentUrl={editingNurse?.profileImageUrl}
                onFileSelect={(file) => setAvatarFile(file)}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Họ tên</label>
                  <input name="name" type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Khoa</label>
                  <input name="department" type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.department} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số giấy phép</label>
                  <input name="licenseNumber" type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" defaultValue={editingNurse?.licenseNumber} />
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
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">{editingNurse ? "Cập nhật" : "Thêm mới"}</button>
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

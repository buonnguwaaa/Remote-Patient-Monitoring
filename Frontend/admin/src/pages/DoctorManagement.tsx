import React, { useState, useEffect } from "react";
import { FaUserMd, FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import api from "../services/api";
import { uploadAvatar } from "../services/uploadService";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import AvatarUploader from "../components/ui/AvatarUploader";
import type { doctor } from "../types";
import { mapGenderToDisplay, mapGenderToApi } from "../utils/genderConverter";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "../styles/buttonStyles";

const DoctorManagement: React.FC = () => {
  const [doctors, setDoctors] = useState<doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<doctor | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchDoctors = async () => {
    try {
      const response = await api.get("/users/doctors");
      if (response.data && response.data.data) {
        const apiDoctors = response.data.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          gender: mapGenderToDisplay(u.gender),
          dateOfBirth: u.dob,
          phone: u.phone || "",
          specialization: u.specialization || "",
          licenseNumber: u.licenseNumber || "",
          workplace: u.workplace || "",
          yearsOfExperience: u.yearsOfExperience || 0,
          status: u.status === "inactive" ? "inactive" : "active",
          profileImageUrl: u.avatarUrl || "/default-avatar.svg",
        }));
        setDoctors(apiDoctors);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách bác sĩ", err);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bác sĩ này?")) {
      try {
        await api.delete(`/users/${id}`);
        setDoctors(doctors.filter((doc) => doc.id !== id));
      } catch (err) {
        console.error("Lỗi xóa bác sĩ", err);
        alert("Có lỗi xảy ra khi xóa.");
      }
    }
  };

  const handleAdd = () => {
    setEditingDoctor(null);
    setAvatarFile(null);
    setShowModal(true);
  };

  const handleEdit = (doctor: doctor) => {
    setEditingDoctor(doctor);
    setAvatarFile(null);
    setShowModal(true);
  };

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const gender = formData.get("gender") as "Nam" | "Nữ";
    const phone = formData.get("phone") as string;
    const specialization = formData.get("specialization") as string;
    const licenseNumber = formData.get("licenseNumber") as string;
    const workplace = formData.get("workplace") as string;
    const yearsOfExperience = parseInt(formData.get("yearsOfExperience") as string) || 0;
    const status = formData.get("status") as "active" | "inactive";

    const apiGender = mapGenderToApi(gender);
    try {
      let savedUserId = editingDoctor?.id;

      if (editingDoctor?.id) {
        await api.patch(`/users/${editingDoctor.id}`, {
          name, email, gender: apiGender, phone, specialization,
          licenseNumber, workplace, yearsOfExperience, roles: ["user.doctor"],
        });
        await api.patch(`/users/${editingDoctor.id}/status`, { status });
      } else {
        const password = formData.get("password") as string;
        if (!password || password.length < 8) {
          alert("Mật khẩu phải có ít nhất 8 ký tự!");
          return;
        }
        await api.post("/auth/register", {
          name, email, password, confirmedPassword: password,
          role: "user.doctor", gender: apiGender, dob: "1980-01-01",
        });
        const resp = await api.get("/users/doctors?sortOrder=desc&limit=1");
        const newUser = resp.data?.data?.[0];
        savedUserId = newUser?.id;
        if (savedUserId) {
          await api.patch(`/users/${savedUserId}`, {
            phone, specialization, licenseNumber, workplace, yearsOfExperience,
          });
          await api.patch(`/users/${savedUserId}/status`, { status });
        }
      }

      if (avatarFile && savedUserId) {
        await uploadAvatar(savedUserId, avatarFile);
      }

      fetchDoctors();
      setShowModal(false);
      setAvatarFile(null);
      showToast(editingDoctor?.id ? "Cập nhật bác sĩ thành công!" : "Thêm bác sĩ thành công!");
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
            <FaUserMd className="mr-3 text-blue-600" />
            Quản lý bác sĩ
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Tổng số: {doctors.length} bác sĩ
          </p>
        </div>
        <button
          onClick={handleAdd}
          className={adminPrimaryButtonClass}
        >
          <FaPlus className="mr-2" />
          Thêm bác sĩ
        </button>
      </div>

      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc chuyên khoa..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Bác sĩ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Chuyên khoa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Số giấy phép
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Nơi làm việc
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Kinh nghiệm
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Liên hệ
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDoctors.map((doctor) => (
              <tr key={doctor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4" style={{ minWidth: '250px' }}>
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 hover:scale-110 transition-transform duration-150"
                      src={doctor.profileImageUrl || "/avartar.jpg"}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avartar.jpg"; }}
                      onClick={() => setPreviewImage(doctor.profileImageUrl || "/avartar.jpg")}
                      title="Nhấn để xem ảnh"
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {doctor.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {doctor.gender} - {doctor.dateOfBirth}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {doctor.specialization}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {doctor.licenseNumber}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {doctor.workplace}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {doctor.yearsOfExperience} năm
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${doctor.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {doctor.status === "active" ? "Hoạt động" : "Không hoạt động"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  <div>{doctor.email}</div>
                  <div className="text-gray-500 dark:text-gray-400">{doctor.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => handleEdit(doctor)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <FaEdit className="inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(doctor.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <FaTrash className="inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">
              {editingDoctor ? "Chỉnh sửa bác sĩ" : "Thêm bác sĩ mới"}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <AvatarUploader
                currentUrl={editingDoctor?.profileImageUrl}
                onFileSelect={(file) => setAvatarFile(file)}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Họ tên
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.name}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Chuyên khoa
                  </label>
                  <input
                    name="specialization"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.specialization}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Số giấy phép
                  </label>
                  <input
                    name="licenseNumber"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.licenseNumber}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nơi làm việc
                  </label>
                  <input
                    name="workplace"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.workplace}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kinh nghiệm (năm)
                  </label>
                  <input
                    name="yearsOfExperience"
                    type="number"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.yearsOfExperience}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.email}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.phone}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Giới tính
                  </label>
                  <select
                    name="gender"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.gender}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tráº¡ng thÃ¡i
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.status || "active"}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                  </select>
                </div>
                {!editingDoctor && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mật khẩu <span className="text-gray-400 font-normal">(tài khoản đăng nhập)</span>
                    </label>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Tối thiểu 8 ký tự"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={adminSecondaryButtonClass}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={adminPrimaryButtonClass}
                >
                  {editingDoctor ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div >
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "scaleIn 0.2s ease" }}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg hover:bg-gray-100 transition"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Ảnh đại diện"
              className="rounded-2xl shadow-2xl object-cover"
              style={{ maxWidth: "80vw", maxHeight: "80vh", minWidth: 200, minHeight: 200 }}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avartar.jpg"; }}
            />
          </div>
          <style>{`
            @keyframes scaleIn {
              from { transform: scale(0.85); opacity: 0; }
              to   { transform: scale(1);    opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default DoctorManagement;

import React, { useState } from "react";
import { FaUserMd, FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import type { doctor } from "../../types";

const DoctorManagement: React.FC = () => {
  const [doctors, setDoctors] = useState<doctor[]>([
    {
      id: "1",
      name: "Dr. Nguyễn Văn A",
      specialization: "Tim mạch",
      licenseNumber: "BS-001",
      workplace: "Bệnh viện Chợ Rẫy",
      yearsOfExperience: 10,
      status: "active",
      email: "nguyenvana@hospital.com",
      phone: "0901234567",
      profileImageUrl: "/default-avatar.svg",
      gender: "Nam",
      dateOfBirth: "1985-05-15",
    },
    {
      id: "2",
      name: "Dr. Trần Thị B",
      specialization: "Nội khoa",
      licenseNumber: "BS-002",
      workplace: "Bệnh viện 115",
      yearsOfExperience: 8,
      status: "active",
      email: "tranthib@hospital.com",
      phone: "0907654321",
      profileImageUrl: "/default-avatar.svg",
      gender: "Nữ",
      dateOfBirth: "1987-08-20",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<doctor | null>(null);

  const handleEdit = (doctor: doctor) => {
    setEditingDoctor(doctor);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bác sĩ này?")) {
      setDoctors(doctors.filter((doc) => doc.id !== id));
    }
  };

  const handleAdd = () => {
    setEditingDoctor(null);
    setShowModal(true);
  };

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newDoctor: doctor = {
      id: editingDoctor?.id || Math.random().toString(),
      name: formData.get("name") as string,
      specialization: formData.get("specialization") as string,
      licenseNumber: formData.get("licenseNumber") as string,
      workplace: formData.get("workplace") as string,
      yearsOfExperience: parseInt(formData.get("yearsOfExperience") as string) || 0,
      status: "active", // Defaulting to active as there is no status field in UI yet, or add it? Unsure, mock data has it.
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      gender: formData.get("gender") as "Nam" | "Nữ",
      dateOfBirth: "1990-01-01", // Default/Placeholder as not in form
      profileImageUrl: editingDoctor?.profileImageUrl || "",
    };

    if (editingDoctor?.id) {
      setDoctors(doctors.map((d) => (d.id === newDoctor.id ? newDoctor : d)));
    } else {
      setDoctors([...doctors, newDoctor]);
    }
    setShowModal(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <FaUserMd className="mr-3 text-blue-600" />
            Quản lý bác sĩ
          </h1>
          <p className="text-gray-600 mt-2">
            Tổng số: {doctors.length} bác sĩ
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <FaPlus className="mr-2" />
          Thêm bác sĩ
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc chuyên khoa..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Doctors Table - keeping as is, assuming it works */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bác sĩ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Chuyên khoa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Số giấy phép
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nơi làm việc
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kinh nghiệm
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Liên hệ
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDoctors.map((doctor, index) => (
              <tr key={doctor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4" style={{ minWidth: '250px' }}>
                  <div className="flex items-center">
                    {doctor.profileImageUrl ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={doctor.profileImageUrl}
                        onError={(e) => (e.currentTarget.src = "/default-avatar.svg")}
                      />
                    ) : (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src="/default-avatar.svg"
                      />
                    )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {doctor.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {doctor.gender} - {doctor.dateOfBirth}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doctor.specialization}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doctor.licenseNumber}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {doctor.workplace}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doctor.yearsOfExperience} năm
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>{doctor.email}</div>
                  <div className="text-gray-500">{doctor.phone}</div>
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

      {/* Modal for Add/Edit Doctor */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingDoctor ? "Chỉnh sửa bác sĩ" : "Thêm bác sĩ mới"}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Upload ảnh */}
              <div className="flex items-center space-x-4 pb-4 border-b">
                <div className="flex-shrink-0">
                  <img
                    src={editingDoctor?.profileImageUrl || "/default-avatar.svg"}
                    alt="Preview"
                    className="h-20 w-20 rounded-full object-cover border-2 border-gray-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ảnh đại diện
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingDoctor((prev) =>
                            prev
                              ? { ...prev, profileImageUrl: reader.result as string }
                              : {
                                id: Math.random().toString(),
                                name: "",
                                specialization: "",
                                licenseNumber: "",
                                workplace: "",
                                yearsOfExperience: 0,
                                status: "active",
                                email: "",
                                phone: "",
                                profileImageUrl: reader.result as string,
                                gender: "Nam",
                                dateOfBirth: ""
                              }
                          );
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ tên
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.name}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chuyên khoa
                  </label>
                  <input
                    name="specialization"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.specialization}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số giấy phép
                  </label>
                  <input
                    name="licenseNumber"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.licenseNumber}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nơi làm việc
                  </label>
                  <input
                    name="workplace"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.workplace}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kinh nghiệm (năm)
                  </label>
                  <input
                    name="yearsOfExperience"
                    type="number"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.yearsOfExperience}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.email}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.phone}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giới tính
                  </label>
                  <select
                    name="gender"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={editingDoctor?.gender}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingDoctor ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div >
      )}
    </div >
  );
};

export default DoctorManagement;

import React, { useState } from "react";
import { FaUserNurse, FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import type { Nurse } from "../../types";

const NurseManagement: React.FC = () => {
  const [nurses, setNurses] = useState<Nurse[]>([
    {
      id: "1",
      name: "Lê Thị Cẩm Tú",
      licenseNumber: "YT-001",
      department: "Khoa nội",
      yearsOfExperience: 5,
      status: "active",
      email: "lecamtu@hospital.com",
      phone: "0908888888",
      profileImageUrl: "/default-avatar.svg",
      gender: "Nữ",
      dateOfBirth: "1990-03-10",
    },
    {
      id: "2",
      name: "Phạm Văn Đức",
      licenseNumber: "YT-002",
      department: "Khoa cấp cứu",
      yearsOfExperience: 3,
      status: "active",
      email: "phamvanduc@hospital.com",
      phone: "0907777777",
      profileImageUrl: "/default-avatar.svg",
      gender: "Nam",
      dateOfBirth: "1992-07-25",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);

  const handleEdit = (nurse: Nurse) => {
    setEditingNurse(nurse);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa y tá này?")) {
      setNurses(nurses.filter((n) => n.id !== id));
    }
  };

  const handleAdd = () => {
    setEditingNurse(null);
    setShowModal(true);
  };

  const filteredNurses = nurses.filter((nurse) =>
    nurse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nurse.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newNurse: Nurse = {
      id: editingNurse?.id || Math.random().toString(),
      name: formData.get("name") as string,
      department: formData.get("department") as string,
      licenseNumber: formData.get("licenseNumber") as string,
      yearsOfExperience: parseInt(formData.get("yearsOfExperience") as string) || 0,
      status: formData.get("status") as "active" | "inactive",
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      gender: formData.get("gender") as "Nam" | "Nữ",
      dateOfBirth: "1990-01-01", // Default/Placeholder as not in form
      profileImageUrl: editingNurse?.profileImageUrl || "",
    };

    if (editingNurse?.id) {
      setNurses(nurses.map((n) => (n.id === newNurse.id ? newNurse : n)));
    } else {
      setNurses([...nurses, newNurse]);
    }
    setShowModal(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <FaUserNurse className="mr-3 text-purple-600" />
            Quản lý y tá
          </h1>
          <p className="text-gray-600 mt-2">
            Tổng số: {nurses.length} y tá
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <FaPlus className="mr-2" />
          Thêm y tá
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc khoa..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Nurses Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Y tá
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Khoa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Số giấy phép
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kinh nghiệm
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
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
            {filteredNurses.map((nurse, index) => (
              <tr key={nurse.id} className="hover:bg-gray-50">
                <td className="px-6 py-4" style={{ minWidth: '250px' }}>
                  <div className="flex items-center">
                    {nurse.profileImageUrl ? (
                      <img
                        className="h-10 w-10 rounded-full object-cover"
                        src={nurse.profileImageUrl}
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
                        {nurse.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {nurse.gender} - {nurse.dateOfBirth}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {nurse.department}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {nurse.licenseNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {nurse.yearsOfExperience} năm
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${nurse.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                      }`}
                  >
                    {nurse.status === "active" ? "Hoạt động" : "Không hoạt động"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>{nurse.email}</div>
                  <div className="text-gray-500">{nurse.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => handleEdit(nurse)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <FaEdit className="inline" />
                  </button>
                  <button
                    onClick={() => handleDelete(nurse.id)}
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

      {/* Modal for Add/Edit Nurse */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingNurse ? "Chỉnh sửa y tá" : "Thêm y tá mới"}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Upload ảnh */}
              <div className="flex items-center space-x-4 pb-4 border-b">
                <div className="flex-shrink-0">
                  <img
                    src={editingNurse?.profileImageUrl || "/default-avatar.svg"}
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
                          setEditingNurse((prev) =>
                            prev
                              ? { ...prev, profileImageUrl: reader.result as string }
                              : {
                                id: Math.random().toString(),
                                name: "",
                                department: "",
                                licenseNumber: "",
                                yearsOfExperience: 0,
                                status: "active",
                                email: "",
                                phone: "",
                                profileImageUrl: reader.result as string,
                                gender: "Nữ",
                                dateOfBirth: ""
                              }
                          );
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    defaultValue={editingNurse?.name}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Khoa
                  </label>
                  <input
                    name="department"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    defaultValue={editingNurse?.department}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    defaultValue={editingNurse?.licenseNumber}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    defaultValue={editingNurse?.yearsOfExperience}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    defaultValue={editingNurse?.status}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    defaultValue={editingNurse?.email}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    defaultValue={editingNurse?.phone}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giới tính
                  </label>
                  <select
                    name="gender"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    defaultValue={editingNurse?.gender}
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {editingNurse ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseManagement;

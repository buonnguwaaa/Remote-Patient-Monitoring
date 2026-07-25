import React, { useState, useEffect } from "react";
import { FaUserNurse, FaEdit, FaTrash, FaPlus, FaSearch, FaEye } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import Pagination from "../components/ui/Pagination";
import type { Department, Nurse } from "../types";
import { mapGenderToDisplay } from "../utils/genderConverter";
import { adminPrimaryButtonClass } from "../styles/buttonStyles";
import NurseFormWizard from "../components/users/NurseFormWizard";

function normalizeObjectId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "$oid" in value) {
    return String((value as { $oid?: string }).$oid || "");
  }
  return String(value);
}

function resolveDepartmentName(departments: Department[], departmentId: unknown): string {
  const normalizedDepartmentId = normalizeObjectId(departmentId);
  if (!normalizedDepartmentId) return "";
  const matchedDepartment = departments.find((dept) => normalizeObjectId(dept.id) === normalizedDepartmentId);
  return matchedDepartment?.name || "";
}

const NurseManagement: React.FC = () => {
  const { t } = useTranslation();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchPageData = async () => {
    try {
      const [nurseResponse, departmentResponse] = await Promise.all([
        api.get("/users/nurses?limit=1000&sortOrder=desc"),
        api.get("/departments").catch(() => ({ data: { data: [] } })),
      ]);

      const availableDepartments = departmentResponse.data?.data || [];
      setDepartments(availableDepartments);

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
    setModalMode("edit");
    setShowWizard(true);
  };

  const handleView = (nurse: Nurse) => {
    setEditingNurse(nurse);
    setModalMode("view");
    setShowWizard(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t("nurseManagement.confirmDelete"))) {
      try {
        await api.delete(`/users/${id}`);
        setNurses(nurses.filter((n) => n.id !== id));
        showToast(t("nurseManagement.deleteSuccess"));
      } catch (err) {
        console.error("Lỗi xóa y tá", err);
        showToast(t("nurseManagement.deleteErrorMessage"), "error");
      }
    }
  };

  const handleAdd = () => {
    setEditingNurse(null);
    setModalMode("add");
    setShowWizard(true);
  };

  const filteredNurses = nurses.filter(
    (nurse) =>
      nurse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nurse.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nurse.workplace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredNurses.length / itemsPerPage);
  const paginatedNurses = filteredNurses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (nurses.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const viewId = urlParams.get("viewId");
      if (viewId && !showWizard) {
        const nurseToView = nurses.find((n) => n.id === viewId);
        if (nurseToView) {
          handleView(nurseToView);
        }
      }
    }
  }, [nurses]);

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">
            <FaUserNurse className="mr-3 text-purple-600" />
            {t("nurseManagement.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t("nurseManagement.totalCount", { count: nurses.length })}
          </p>
        </div>
        <button onClick={handleAdd} className={`${adminPrimaryButtonClass} w-full md:w-auto`}>
          <FaPlus className="mr-2" />
          {t("nurseManagement.addNurse")}
        </button>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("nurseManagement.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {paginatedNurses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{t("nurseManagement.noNurses")}</p>
        </div>
      ) : (
        <>
          {/* Nurses Table View */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700/60 dark:text-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Điều dưỡng</th>
                  <th scope="col" className="px-6 py-4 font-bold">Giới tính / Ngày sinh</th>
                  <th scope="col" className="px-6 py-4 font-bold">Khoa / Phòng công tác</th>
                  <th scope="col" className="px-6 py-4 font-bold">Giấy phép / Kinh nghiệm</th>
                  <th scope="col" className="px-6 py-4 font-bold text-center">Trạng thái</th>
                  <th scope="col" className="px-6 py-4 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedNurses.map((nurse) => (
                  <tr key={nurse.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          className="h-10 w-10 rounded-full object-cover cursor-pointer shrink-0"
                          src={nurse.profileImageUrl || "/avartar.jpg"}
                          alt={nurse.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/avartar.jpg";
                          }}
                          onClick={() => setPreviewImage(nurse.profileImageUrl || "/avartar.jpg")}
                          title="Click xem ảnh avatar"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">
                            {nurse.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {nurse.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{nurse.gender}</span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1.5">•</span>
                      <span className="text-gray-600 dark:text-gray-400">{nurse.dateOfBirth}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {nurse.department || "Chưa gán khoa"}
                      </div>
                      {nurse.workplace && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{nurse.workplace}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap">
                      <div>
                        <span className="text-gray-400">Giấy phép:</span>{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{nurse.licenseNumber || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Kinh nghiệm:</span>{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{nurse.yearsOfExperience} năm</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          nurse.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {nurse.status === "active" ? "Hoạt động" : "Tạm khóa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(nurse)}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700 transition"
                          title={t("common.viewDetails")}
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleEdit(nurse)}
                          className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-gray-700 transition"
                          title={t("common.edit")}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(nurse.id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700 transition"
                          title={t("common.delete")}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
            </div>
          )}
        </>
      )}

      {/* Nurse 2-Step Form Wizard Modal */}
      <NurseFormWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        editingNurse={editingNurse}
        modalMode={modalMode}
        departments={departments}
        onSuccess={fetchPageData}
        showToast={showToast}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-gray-700 shadow-lg hover:bg-gray-100 transition"
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Avatar Preview"
              className="max-h-[80vh] max-w-[80vw] rounded-2xl object-contain shadow-2xl"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/avartar.jpg";
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseManagement;

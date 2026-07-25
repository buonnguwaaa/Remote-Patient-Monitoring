import React, { useState, useEffect } from "react";
import { FaUserMd, FaEdit, FaTrash, FaPlus, FaSearch, FaEye } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import Pagination from "../components/ui/Pagination";
import type { Department, doctor } from "../types";
import { mapGenderToDisplay } from "../utils/genderConverter";
import { adminPrimaryButtonClass } from "../styles/buttonStyles";
import DoctorFormWizard from "../components/users/DoctorFormWizard";

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

const DoctorManagement: React.FC = () => {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState<doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [editingDoctor, setEditingDoctor] = useState<doctor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchPageData = async () => {
    try {
      const [doctorResponse, departmentResponse] = await Promise.all([
        api.get("/users/doctors?limit=1000&sortOrder=desc"),
        api.get("/departments").catch(() => ({ data: { data: [] } })),
      ]);

      const availableDepartments = departmentResponse.data?.data || [];
      setDepartments(availableDepartments);

      if (doctorResponse.data?.data) {
        const apiDoctors = doctorResponse.data.data.map((u: any) => ({
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
          gender: mapGenderToDisplay(u.gender),
          dateOfBirth: u.dob,
          phone: u.phone || "",
          specialization: u.specialization || "",
          licenseNumber: u.licenseNumber || "",
          departmentId: normalizeObjectId(u.departmentId),
          department: resolveDepartmentName(availableDepartments, u.departmentId),
          workplace: u.workplace || "",
          yearsOfExperience: u.yearsOfExperience || 0,
          status: u.status === "inactive" ? "inactive" : "active",
          profileImageUrl: u.avatarUrl || "/avartar.jpg",
        }));
        setDoctors(apiDoctors);
      }
    } catch (err) {
      console.error(t("doctorManagement.loadError"), err);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm(t("doctorManagement.confirmDelete"))) {
      try {
        await api.delete(`/users/${id}`);
        setDoctors(doctors.filter((doc) => doc.id !== id));
        showToast(t("doctorManagement.deleteSuccess"));
      } catch (err) {
        console.error(t("doctorManagement.deleteError"), err);
        showToast(t("doctorManagement.deleteErrorMessage"), "error");
      }
    }
  };

  const handleAdd = () => {
    setEditingDoctor(null);
    setModalMode("add");
    setShowWizard(true);
  };

  const handleEdit = (doc: doctor) => {
    setEditingDoctor(doc);
    setModalMode("edit");
    setShowWizard(true);
  };

  const handleView = (doc: doctor) => {
    setEditingDoctor(doc);
    setModalMode("view");
    setShowWizard(true);
  };

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.workplace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
  const paginatedDoctors = filteredDoctors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (doctors.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const viewId = urlParams.get("viewId");
      if (viewId && !showWizard) {
        const docToView = doctors.find((d) => d.id === viewId);
        if (docToView) {
          handleView(docToView);
        }
      }
    }
  }, [doctors]);

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">
            <FaUserMd className="mr-3 text-blue-600" />
            {t("doctorManagement.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t("doctorManagement.totalCount", { count: doctors.length })}
          </p>
        </div>
        <button onClick={handleAdd} className={`${adminPrimaryButtonClass} w-full md:w-auto`}>
          <FaPlus className="mr-2" />
          {t("doctorManagement.addDoctor")}
        </button>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("doctorManagement.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {paginatedDoctors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{t("doctorManagement.noDoctors")}</p>
        </div>
      ) : (
        <>
          {/* Doctors Table View */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700/60 dark:text-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Bác sĩ</th>
                  <th scope="col" className="px-6 py-4 font-bold">Chuyên khoa & Trình độ</th>
                  <th scope="col" className="px-6 py-4 font-bold">Khoa / Phòng công tác</th>
                  <th scope="col" className="px-6 py-4 font-bold">Giấy phép / Kinh nghiệm</th>
                  <th scope="col" className="px-6 py-4 font-bold text-center">Trạng thái</th>
                  <th scope="col" className="px-6 py-4 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          className="h-10 w-10 rounded-full object-cover cursor-pointer shrink-0"
                          src={doc.profileImageUrl || "/avartar.jpg"}
                          alt={doc.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/avartar.jpg";
                          }}
                          onClick={() => setPreviewImage(doc.profileImageUrl || "/avartar.jpg")}
                          title="Click xem ảnh avatar"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">
                            {doc.displayName || doc.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {doc.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {doc.specialization || "Chưa cập nhật"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {[doc.academicTitleLabel, doc.academicDegreeLabel, doc.professionalQualificationLabel].filter(Boolean).join(" • ") || "Bác sĩ"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {doc.department || "Chưa gán khoa"}
                      </div>
                      {doc.workplace && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{doc.workplace}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs whitespace-nowrap">
                      <div>
                        <span className="text-gray-400">Giấy phép:</span>{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{doc.licenseNumber || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Kinh nghiệm:</span>{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">{doc.yearsOfExperience} năm</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          doc.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {doc.status === "active" ? "Hoạt động" : "Tạm khóa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(doc)}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700 transition"
                          title={t("common.viewDetails")}
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleEdit(doc)}
                          className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-gray-700 transition"
                          title={t("common.edit")}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
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

      {/* Doctor 2-Step Form Wizard Modal */}
      <DoctorFormWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        editingDoctor={editingDoctor}
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

export default DoctorManagement;

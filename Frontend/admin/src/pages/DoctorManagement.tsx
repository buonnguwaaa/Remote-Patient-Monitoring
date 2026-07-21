import React, { useState, useEffect } from "react";
import { FaUserMd, FaEdit, FaTrash, FaPlus, FaSearch, FaEye } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { uploadAvatar } from "../services/uploadService";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import AvatarUploader from "../components/ui/AvatarUploader";
import Pagination from "../components/ui/Pagination";
import type { Department, doctor } from "../types";
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

const DoctorManagement: React.FC = () => {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState<doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [editingDoctor, setEditingDoctor] = useState<doctor | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedAcademicDegree, setSelectedAcademicDegree] = useState<string>("");
  const { toast, showToast, hideToast } = useToast();

  const fetchPageData = async () => {
    try {
      const [doctorResponse, departmentResponse] = await Promise.all([
        api.get("/users/doctors?limit=1000&sortOrder=desc"),
        api.get("/departments").catch(() => ({ data: { data: [] } })),
      ]);

      const availableDepartments = departmentResponse.data?.data || [];
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
          profileImageUrl: u.avatarUrl || "/default-avatar.svg",
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
    setAvatarFile(null);
    setModalMode("add");
    setSelectedAcademicDegree("");
    setShowModal(true);
  };

  const handleEdit = (doctor: doctor) => {
    setEditingDoctor(doctor);
    setAvatarFile(null);
    setModalMode("edit");
    setSelectedAcademicDegree(doctor.academicDegree || "");
    setShowModal(true);
  };

  const handleView = (doctor: doctor) => {
    setEditingDoctor(doctor);
    setAvatarFile(null);
    setModalMode("view");
    setSelectedAcademicDegree(doctor.academicDegree || "");
    setShowModal(true);
  };

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.workplace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
  const paginatedDoctors = filteredDoctors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const renderDoctorCard = (doctor: doctor) => {
    return (
      <div
        key={doctor.id}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-start gap-3">
          <img
            className="h-12 w-12 rounded-full object-cover"
            src={doctor.profileImageUrl || "/avartar.jpg"}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/avartar.jpg";
            }}
            onClick={() => setPreviewImage(doctor.profileImageUrl || "/avartar.jpg")}
            title="Nhấn để xem ảnh"
          />

          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
              {doctor.displayName || doctor.name}
            </div>
            <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {doctor.gender} - {doctor.dateOfBirth}
            </div>
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {doctor.department || t("common.notAssigned")}
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${doctor.status === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
          >
            {doctor.status === "active" ? t("common.active") : t("common.inactive")}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2">
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("doctorManagement.labels.specialization")} </span>
            <span className="font-medium">{doctor.specialization || t("common.notUpdated")}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("doctorManagement.labels.workplace")} </span>
            <span className="font-medium">{doctor.workplace || t("common.notUpdated")}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("doctorManagement.labels.licenseNumber")} </span>
            <span className="font-medium">{doctor.licenseNumber || t("common.notUpdated")}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("doctorManagement.labels.experience")} </span>
            <span className="font-medium">{doctor.yearsOfExperience} {t("doctorManagement.labels.years")}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-gray-500 dark:text-gray-400">{t("doctorManagement.labels.contact")} </span>
            <span className="font-medium">{doctor.email}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => handleView(doctor)}
            className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 hover:text-green-900 dark:hover:bg-green-900/20"
            aria-label={t("common.viewDetails") || "View"}
          >
            <FaEye />
          </button>
          <button
            onClick={() => handleEdit(doctor)}
            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-900 dark:hover:bg-blue-900/20"
            aria-label={t("doctorManagement.editDoctor")}
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(doctor.id)}
            className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-900 dark:hover:bg-red-900/20"
            aria-label={t("common.delete")}
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
    const specialization = formData.get("specialization") as string;
    const licenseNumber = formData.get("licenseNumber") as string;
    const workplace = formData.get("workplace") as string;
    const yearsOfExperience = parseInt(formData.get("yearsOfExperience") as string) || 0;
    const status = formData.get("status") as "active" | "inactive";
    const academicDegree = formData.get("academicDegree") as string;
    const professionalQualification = formData.get("professionalQualification") as string;
    const academicTitle = formData.get("academicTitle") as string;

    const apiGender = mapGenderToApi(gender);
    try {
      let savedUserId = editingDoctor?.id;

      if (editingDoctor?.id) {
        await api.patch(`/users/doctors/${editingDoctor.id}`, {
          name, email, gender: apiGender, phone, specialization,
          licenseNumber, workplace, yearsOfExperience,
          academicDegree, professionalQualification, academicTitle,
        });
        await api.patch(`/users/${editingDoctor.id}/status`, { status });
      } else {
        const password = formData.get("password") as string;
        if (!password || password.length < 8) {
          showToast(t("auth.passwordMinLength"), "error");
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
          await api.patch(`/users/doctors/${savedUserId}`, {
            phone, specialization, licenseNumber, workplace, yearsOfExperience,
            academicDegree, professionalQualification, academicTitle,
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
      showToast(editingDoctor?.id ? t("doctorManagement.updateSuccess") : t("doctorManagement.addSuccess"));
    } catch (err: any) {
      console.error(err);
      showToast(t("doctorManagement.errorPrefix") + " " + (err.response?.data?.error || err.message), "error");
    }
  };

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

      <div className="mb-6 rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("doctorManagement.searchPlaceholder")}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {paginatedDoctors.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow-md dark:bg-gray-800 dark:text-gray-400">
            {t("common.noData")}
          </div>
        ) : (
          paginatedDoctors.map((doctor) => renderDoctorCard(doctor))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg bg-white shadow-md dark:bg-gray-800 md:block">
        <div className="overflow-x-auto thin-scrollbar">
        <table className="w-full min-w-[1400px]">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("doctorManagement.fields.name")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("doctorManagement.fields.department")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("doctorManagement.fields.specialization")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("doctorManagement.fields.workplace")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("doctorManagement.fields.licenseNumber")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("doctorManagement.fields.yearsOfExperience")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("doctorManagement.fields.status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("doctorManagement.fields.contact")}
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedDoctors.map((doctor) => (
              <tr key={doctor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4" style={{ minWidth: '250px' }}>
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 hover:scale-110 transition-transform duration-150"
                      src={doctor.profileImageUrl || "/avartar.jpg"}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avartar.jpg"; }}
                      onClick={() => setPreviewImage(doctor.profileImageUrl || "/avartar.jpg")}
                      title={t("doctorManagement.clickToViewImage")}
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {doctor.displayName || doctor.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {doctor.gender} - {doctor.dateOfBirth}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {doctor.department || t("common.notAssigned")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {doctor.specialization}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {doctor.workplace || t("common.notUpdated")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {doctor.licenseNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {doctor.yearsOfExperience} {t("doctorManagement.labels.years")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${doctor.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {doctor.status === "active" ? t("common.active") : t("common.inactive")}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  <div>{doctor.email}</div>
                  <div className="text-gray-500 dark:text-gray-400">{doctor.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => handleView(doctor)}
                    className="text-green-600 hover:text-green-900 mr-3"
                    title={t("common.viewDetails") || "View details"}
                  >
                    <FaEye className="inline" />
                  </button>
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
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 md:p-6 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold dark:text-white md:text-2xl">
              {modalMode === "view" ? t("common.viewDetails") || "Chi tiết" : modalMode === "edit" ? t("doctorManagement.editDoctor") : t("doctorManagement.addNewDoctor")}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <AvatarUploader
                currentUrl={editingDoctor?.profileImageUrl}
                onFileSelect={(file) => setAvatarFile(file)}
                disabled={modalMode === "view"}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.name")}
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.name}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.department")}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingDoctor?.department || ""}
                    placeholder={t("doctorManagement.assignAtDepartment")}
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded-lg cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.academicDegree") || "Học vị"}
                  </label>
                  <select
                    name="academicDegree"
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    value={selectedAcademicDegree}
                    onChange={(e) => {
                      setSelectedAcademicDegree(e.target.value);
                      if (e.target.value !== "phd") {
                        const titleSelect = document.querySelector('select[name="academicTitle"]') as HTMLSelectElement;
                        if (titleSelect) titleSelect.value = "";
                      }
                    }}
                  >
                    <option value="">-- Không có --</option>
                    <option value="bachelor">Cử nhân (BS)</option>
                    <option value="master">Thạc sĩ (ThS)</option>
                    <option value="phd">Tiến sĩ (TS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.professionalQualification") || "Trình độ chuyên môn"}
                  </label>
                  <select
                    name="professionalQualification"
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.professionalQualification || ""}
                  >
                    <option value="">-- Không có --</option>
                    <option value="resident">Nội trú</option>
                    <option value="cki">Chuyên khoa I (CKI)</option>
                    <option value="ckii">Chuyên khoa II (CKII)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.academicTitle") || "Chức danh"}
                  </label>
                  <select
                    name="academicTitle"
                    disabled={modalMode === "view" || selectedAcademicDegree !== "phd"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.academicTitle || ""}
                  >
                    <option value="">-- Không có --</option>
                    <option value="associate_professor">Phó Giáo sư (PGS)</option>
                    <option value="professor">Giáo sư (GS)</option>
                  </select>
                  {selectedAcademicDegree !== "phd" && modalMode !== "view" && (
                    <p className="text-xs text-red-500 mt-1">Yêu cầu học vị Tiến sĩ</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.specialization")}
                  </label>
                  <input
                    name="specialization"
                    type="text"
                    required
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.specialization}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.licenseNumber")}
                  </label>
                  <input
                    name="licenseNumber"
                    type="text"
                    required
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.licenseNumber}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.workplace")}
                  </label>
                  <input
                    name="workplace"
                    type="text"
                    required
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.workplace}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.yearsOfExperience")}
                  </label>
                  <input
                    name="yearsOfExperience"
                    type="number"
                    required
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.yearsOfExperience}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.email")}
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.email}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.phone")}
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.phone}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.gender")}
                  </label>
                  <select
                    name="gender"
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.gender}
                  >
                    <option value="Nam">{t("common.male")}</option>
                    <option value="Nữ">{t("common.female")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("doctorManagement.fields.status")}
                  </label>
                  <select
                    name="status"
                    disabled={modalMode === "view"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                    defaultValue={editingDoctor?.status || "active"}
                  >
                    <option value="active">{t("common.active")}</option>
                    <option value="inactive">{t("common.inactive")}</option>
                  </select>
                </div>
                {!editingDoctor && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("doctorManagement.fields.password")}
                    </label>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      placeholder={t("auth.passwordMinLength")}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end md:space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`${adminSecondaryButtonClass} w-full md:w-auto`}
                >
                  {modalMode === "view" ? t("common.close") || "Close" : t("common.cancel")}
                </button>
                {modalMode !== "view" && (
                  <button
                    type="submit"
                    className={`${adminPrimaryButtonClass} w-full md:w-auto`}
                  >
                    {modalMode === "edit" ? t("common.update") : t("common.add")}
                  </button>
                )}
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
              alt={t("avatarUploader.title")}
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

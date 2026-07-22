import React, { useState, useEffect } from "react";
import { FaUserNurse, FaEdit, FaTrash, FaPlus, FaSearch, FaEye } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { uploadAvatar } from "../services/uploadService";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import AvatarUploader from "../components/ui/AvatarUploader";
import Pagination from "../components/ui/Pagination";
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
  const { t } = useTranslation();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [editingNurse, setEditingNurse] = useState<Nurse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchPageData = async () => {
    try {
      const [nurseResponse, departmentResponse] = await Promise.all([
        api.get("/users/nurses?limit=1000&sortOrder=desc"),
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
    setModalMode("edit");
    setShowModal(true);
  };

  const handleView = (nurse: Nurse) => {
    setEditingNurse(nurse);
    setAvatarFile(null);
    setModalMode("view");
    setShowModal(true);
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
    setAvatarFile(null);
    setModalMode("add");
    setShowModal(true);
  };

  const filteredNurses = nurses.filter((nurse) =>
    nurse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nurse.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nurse.workplace.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredNurses.length / itemsPerPage);
  const paginatedNurses = filteredNurses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
            {nurse.status === "active" ? t("common.active") : t("common.inactive")}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2">
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("nurseManagement.labels.workplace")} </span>
            <span className="font-medium">{nurse.workplace || t("common.notUpdated")}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("nurseManagement.labels.licenseNumber")} </span>
            <span className="font-medium">{nurse.licenseNumber || t("common.notUpdated")}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("nurseManagement.labels.experience")} </span>
            <span className="font-medium">{nurse.yearsOfExperience} {t("nurseManagement.labels.years")}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-gray-500 dark:text-gray-400">{t("nurseManagement.labels.contact")} </span>
            <span className="font-medium">{nurse.email}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => handleView(nurse)}
            className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 hover:text-green-900 dark:hover:bg-green-900/20"
            aria-label={t("common.viewDetails") || "View"}
          >
            <FaEye />
          </button>
          <button
            onClick={() => handleEdit(nurse)}
            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-900 dark:hover:bg-blue-900/20"
            aria-label={t("nurseManagement.editNurse")}
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(nurse.id)}
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
          showToast(t("auth.passwordMinLength"), "error");
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
      showToast(editingNurse?.id ? t("nurseManagement.updateSuccess") : t("nurseManagement.addSuccess"));
    } catch (err: any) {
      console.error(err);
      showToast(t("nurseManagement.errorPrefix") + " " + (err.response?.data?.error || err.message), "error");
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">
            <FaUserNurse className="mr-3 text-purple-600" />
            {t("nurseManagement.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t("nurseManagement.totalCount", { count: nurses.length })}</p>
        </div>
        <button onClick={handleAdd} className={`${adminPrimaryButtonClass} w-full md:w-auto`}>
          <FaPlus className="mr-2" />{t("nurseManagement.addNurse")}
        </button>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4  dark:bg-gray-800">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("nurseManagement.searchPlaceholder")}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {paginatedNurses.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow-md dark:bg-gray-800 dark:text-gray-400">
            {t("common.noData")}
          </div>
        ) : (
          paginatedNurses.map((nurse) => renderNurseCard(nurse))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg bg-white shadow-md md:block dark:bg-gray-800">
        <div className="overflow-x-auto thin-scrollbar">
        <table className="w-full min-w-[1350px]">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("nurseManagement.fields.name")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("nurseManagement.fields.department")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("nurseManagement.fields.workplace")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("nurseManagement.fields.licenseNumber")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("nurseManagement.fields.yearsOfExperience")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("nurseManagement.fields.status")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("nurseManagement.fields.contact")}</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedNurses.map((nurse) => (
              <tr key={nurse.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4" style={{ minWidth: "250px" }}>
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-400 hover:scale-110 transition-transform duration-150"
                      src={nurse.profileImageUrl || "/avartar.jpg"}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avartar.jpg"; }}
                      onClick={() => setPreviewImage(nurse.profileImageUrl || "/avartar.jpg")}
                      title={t("doctorManagement.clickToViewImage")}
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{nurse.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{nurse.gender} - {nurse.dateOfBirth}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{nurse.department || t("common.notAssigned")}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{nurse.workplace || t("common.notUpdated")}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{nurse.licenseNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{nurse.yearsOfExperience} {t("nurseManagement.labels.years")}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${nurse.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                    {nurse.status === "active" ? t("common.active") : t("common.inactive")}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  <div>{nurse.email}</div>
                  <div className="text-gray-500 dark:text-gray-400">{nurse.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button onClick={() => handleView(nurse)} className="text-green-600 hover:text-green-900 mr-3" title={t("common.viewDetails") || "View details"}><FaEye className="inline" /></button>
                  <button onClick={() => handleEdit(nurse)} className="text-blue-600 hover:text-blue-900 mr-3"><FaEdit className="inline" /></button>
                  <button onClick={() => handleDelete(nurse.id)} className="text-red-600 hover:text-red-900"><FaTrash className="inline" /></button>
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
            <h2 className="mb-4 text-xl font-bold dark:text-white md:text-2xl">{modalMode === "view" ? t("common.viewDetails") || "Chi tiết" : modalMode === "edit" ? t("nurseManagement.editNurse") : t("nurseManagement.addNewNurse")}</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <AvatarUploader
                currentUrl={editingNurse?.profileImageUrl}
                onFileSelect={(file) => setAvatarFile(file)}
                disabled={modalMode === "view"}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("nurseManagement.fields.name")}</label>
                  <input name="name" type="text" required disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-70" defaultValue={editingNurse?.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("nurseManagement.fields.department")}</label>
                  <input
                    type="text"
                    disabled
                    value={editingNurse?.department || ""}
                    placeholder={t("doctorManagement.assignAtDepartment")}
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded-lg cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("nurseManagement.fields.licenseNumber")}</label>
                  <input name="licenseNumber" type="text" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-70" defaultValue={editingNurse?.licenseNumber} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("nurseManagement.fields.workplace")}</label>
                  <input name="workplace" type="text" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-70" defaultValue={editingNurse?.workplace} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("nurseManagement.fields.yearsOfExperience")}</label>
                  <input name="yearsOfExperience" type="number" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-70" defaultValue={editingNurse?.yearsOfExperience} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("nurseManagement.fields.email")}</label>
                  <input name="email" type="email" required disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-70" defaultValue={editingNurse?.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("nurseManagement.fields.phone")}</label>
                  <input name="phone" type="tel" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-70" defaultValue={editingNurse?.phone} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("nurseManagement.fields.gender")}</label>
                  <select name="gender" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-70" defaultValue={editingNurse?.gender}>
                    <option value="Nam">{t("common.male")}</option>
                    <option value="Nữ">{t("common.female")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("nurseManagement.fields.status")}</label>
                  <select name="status" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-70" defaultValue={editingNurse?.status || "active"}>
                    <option value="active">{t("common.active")}</option>
                    <option value="inactive">{t("common.inactive")}</option>
                  </select>
                </div>
                {!editingNurse && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("nurseManagement.fields.password")}</label>
                    <input name="password" type="password" required minLength={8} placeholder={t("auth.passwordMinLength")} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end md:space-x-3">
                <button type="button" onClick={() => setShowModal(false)} className={`${adminSecondaryButtonClass} w-full md:w-auto`}>{modalMode === "view" ? t("common.close") || "Close" : t("common.cancel")}</button>
                {modalMode !== "view" && (
                  <button type="submit" className={`${adminPrimaryButtonClass} w-full md:w-auto`}>{editingNurse ? t("common.update") : t("common.add")}</button>
                )}
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

import React, { useState, useEffect, useRef } from "react";
import { FaRegUser, FaEdit, FaTrash, FaPlus, FaSearch, FaEye, FaUserCheck, FaSpinner } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { uploadAvatar } from "../services/uploadService";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import AvatarUploader from "../components/ui/AvatarUploader";
import Pagination from "../components/ui/Pagination";
import type { Patient } from "../types";
import { mapGenderToDisplay, mapGenderToApi } from "../utils/genderConverter";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "../styles/buttonStyles";

const PatientManagementAdmin: React.FC = () => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | "verify">("add");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const submitActionRef = useRef<"save" | "activate">("save");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/users/patients?limit=1000&sortOrder=desc");
      if (response.data?.data) {
        const apiPatients = response.data.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          gender: mapGenderToDisplay(u.gender),
          dateOfBirth: u.dob,
          phone: u.phone || "",
          address: "",
          status: u.status === "inactive" ? "inactive" : "active",
          profileImageUrl: u.avatarUrl || "/avartar.jpg",
          cccd: u.cccd || "",
          insuranceNumber: u.insuranceNumber || "",
          emergencyContactName: u.emergencyContactName || "",
          emergencyContactPhone: u.emergencyContactPhone || "",
          medicalHistory: u.medicalHistory || "",
        }));
        setPatients(apiPatients);
      }
    } catch (err) {
      console.error(t("patientManagement.loadError"), err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setAvatarFile(null);
    setModalMode("edit");
    setShowModal(true);
  };

  const handleVerify = (patient: Patient) => {
    setEditingPatient(patient);
    setAvatarFile(null);
    setModalMode("verify");
    setShowModal(true);
  };

  const handleView = (patient: Patient) => {
    setEditingPatient(patient);
    setAvatarFile(null);
    setModalMode("view");
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t("patientManagement.confirmDelete"))) {
      setDeletingId(id);
      try {
        await api.delete(`/users/${id}`);
        setPatients(patients.filter((p) => p.id !== id));
        showToast(t("patientManagement.deleteSuccess"));
      } catch (err) {
        console.error(t("patientManagement.deleteError"), err);
        showToast(t("patientManagement.deleteErrorMessage"), "error");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleAdd = () => {
    setEditingPatient(null);
    setAvatarFile(null);
    setModalMode("add");
    setShowModal(true);
  };

  const pendingPatientsCount = patients.filter((p) => p.status === "inactive").length;

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (patient.phone && patient.phone.includes(searchTerm));
    if (activeTab === "pending") {
      return matchesSearch && patient.status === "inactive";
    }
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const renderPatientCard = (patient: Patient) => {
    return (
      <div
        key={patient.id}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("img")) return;
          if (patient.status === "inactive") {
            handleVerify(patient);
          } else {
            handleView(patient);
          }
        }}
        className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 transition cursor-pointer ${
          patient.status === "inactive"
            ? "border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-900/10 hover:shadow-md"
            : "hover:shadow-md"
        }`}
      >
        <div className="flex items-start gap-3">
          <img
            className="h-12 w-12 rounded-full object-cover"
            src={patient.profileImageUrl || "/avartar.jpg"}
            alt={patient.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/avartar.jpg";
            }}
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImage(patient.profileImageUrl || "/avartar.jpg");
            }}
            title={t("doctorManagement.clickToViewImage")}
          />

          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
              {patient.name}
            </div>
            <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {patient.gender} - {patient.dateOfBirth}
            </div>
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {patient.email}
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              patient.status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            {patient.status === "active" ? t("common.active") : t("common.inactive")}
          </span>
        </div>

        {patient.medicalHistory && (
          <div className="mt-3 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800 p-3 text-xs text-blue-950 dark:text-blue-200 shadow-sm">
            <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300 mb-1 text-sm">
              <span>📋</span> Tiền sử bệnh lý & Sức khỏe:
            </div>
            <p className="leading-relaxed whitespace-pre-line text-xs">{patient.medicalHistory}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300 sm:grid-cols-2">
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("patientManagement.labels.address")} </span>
            <span className="font-medium">{patient.address || t("common.notUpdated")}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("patientManagement.labels.phone")} </span>
            <span className="font-medium">{patient.phone || t("common.notUpdated")}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {patient.status === "inactive" ? (
            <>
              <button
                onClick={() => handleEdit(patient)}
                className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-900 dark:hover:bg-blue-900/20"
                title={t("patientManagement.editPatient")}
              >
                <FaEdit />
              </button>
              <button
                onClick={() => handleVerify(patient)}
                className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-900 dark:hover:bg-emerald-900/20 font-bold"
                title="Kiểm duyệt & Kích hoạt tài khoản"
              >
                <FaUserCheck className="inline text-lg" />
              </button>
              <button
                onClick={() => handleDelete(patient.id)}
                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-900 dark:hover:bg-red-900/20"
                title={t("common.delete")}
              >
                <FaTrash />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleView(patient)}
                className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 hover:text-green-900 dark:hover:bg-green-900/20"
                aria-label={t("common.viewDetails") || "View"}
              >
                <FaEye />
              </button>
              <button
                onClick={() => handleEdit(patient)}
                className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-900 dark:hover:bg-blue-900/20"
                aria-label={t("patientManagement.editPatient")}
              >
                <FaEdit />
              </button>
              <button
                onClick={() => handleDelete(patient.id)}
                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50 hover:text-red-900 dark:hover:bg-red-900/20"
                aria-label={t("common.delete")}
              >
                <FaTrash />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const gender = formData.get("gender") as "Nam" | "Nữ";
    const phone = formData.get("phone") as string;
    const dateOfBirth = formData.get("dateOfBirth") as string;
    const status = formData.get("status") as "active" | "inactive";
    const cccd = formData.get("cccd") as string;
    const insuranceNumber = formData.get("insuranceNumber") as string;
    const emergencyContactName = formData.get("emergencyContactName") as string;
    const emergencyContactPhone = formData.get("emergencyContactPhone") as string;
    const medicalHistory = formData.get("medicalHistory") as string;

    const apiGender = mapGenderToApi(gender);
    try {
      let savedUserId = editingPatient?.id;

      if (editingPatient?.id) {
        await api.patch(`/users/${editingPatient.id}`, {
          name, email, gender: apiGender, phone,
          cccd, insuranceNumber, emergencyContactName, emergencyContactPhone, medicalHistory,
          roles: ["user.patient"],
        });
        const targetStatus = submitActionRef.current === "activate" ? "active" : status;
        await api.patch(`/users/${editingPatient.id}/status`, { status: targetStatus });
      } else {
        const password = formData.get("password") as string;
        if (!password || password.length < 8) {
          showToast(t("auth.passwordMinLength"), "error");
          return;
        }
        await api.post("/auth/register", {
          name, email, password, confirmedPassword: password,
          role: "user.patient", gender: apiGender,
          dob: dateOfBirth || "1990-01-01",
          cccd, insuranceNumber, emergencyContactName, emergencyContactPhone, medicalHistory,
        });
        const resp = await api.get("/users/patients?sortOrder=desc&limit=1");
        savedUserId = resp.data?.data?.[0]?.id;
        if (savedUserId) {
          await api.patch(`/users/${savedUserId}`, { phone });
          await api.patch(`/users/${savedUserId}/status`, { status });
        }
      }

      if (avatarFile && savedUserId) {
        await uploadAvatar(savedUserId, avatarFile);
      }

      fetchPatients();
      setShowModal(false);
      setAvatarFile(null);
      const successMsg = submitActionRef.current === "activate"
        ? "Đã kiểm duyệt & kích hoạt tài khoản cho bệnh nhân thành công!"
        : (editingPatient?.id ? t("patientManagement.updateSuccess") : t("patientManagement.addSuccess"));
      showToast(successMsg);
    } catch (err: any) {
      console.error(err);
      showToast(t("patientManagement.errorPrefix") + " " + (err.response?.data?.error || err.message), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">
            <FaRegUser className="mr-3 text-green-600" />
            {t("patientManagement.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t("patientManagement.totalCount", { count: patients.length })}</p>
        </div>
        <button onClick={handleAdd} className={`${adminPrimaryButtonClass} w-full md:w-auto`}>
          <FaPlus className="mr-2" />{t("patientManagement.addPatient")}
        </button>
      </div>

      <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700 space-x-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 font-semibold text-base md:text-lg border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "all"
              ? "border-green-600 text-green-600 dark:border-green-400 dark:text-green-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <FaRegUser /> Tất cả bệnh nhân ({patients.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 font-semibold text-base md:text-lg border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "pending"
              ? "border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <FaUserCheck className="text-amber-500" /> Chờ xác minh & Kích hoạt
          {pendingPatientsCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
              {pendingPatientsCount}
            </span>
          )}
        </button>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4  dark:bg-gray-800">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("patientManagement.searchPlaceholder")}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl bg-white dark:bg-gray-800 p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <FaSpinner className="mx-auto text-3xl text-green-600 dark:text-green-400 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Đang tải dữ liệu bệnh nhân...</p>
        </div>
      ) : paginatedPatients.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-gray-800 p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <FaRegUser className="mx-auto text-4xl text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">Danh sách rỗng</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Không có bệnh nhân nào hiển thị trong bảng dữ liệu.</p>
        </div>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {paginatedPatients.map((patient) => renderPatientCard(patient))}
          </div>

          <div className="hidden overflow-hidden rounded-lg bg-white shadow-md md:block dark:bg-gray-800">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("patientManagement.fields.name")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Giới tính / Ngày sinh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("patientManagement.fields.address")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("patientManagement.fields.status")}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("doctorManagement.fields.contact")}</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("img")) return;
                      if (patient.status === "inactive") {
                        handleVerify(patient);
                      } else {
                        handleView(patient);
                      }
                    }}
                    className={`transition cursor-pointer ${
                      patient.status === "inactive"
                        ? "bg-amber-50/40 hover:bg-amber-50/80 dark:bg-amber-900/10 dark:hover:bg-amber-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-10 w-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-green-400 hover:scale-110 transition-transform duration-150 shrink-0"
                          src={patient.profileImageUrl || "/avartar.jpg"}
                          alt={patient.name}
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avartar.jpg"; }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(patient.profileImageUrl || "/avartar.jpg");
                          }}
                          title={t("doctorManagement.clickToViewImage")}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      <div>{patient.gender}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{patient.dateOfBirth}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{patient.address || t("common.notUpdated")}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${patient.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                        {patient.status === "active" ? t("common.active") : t("common.inactive")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div>{patient.email}</div>
                      <div className="text-gray-500 dark:text-gray-400">{patient.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      {patient.status === "inactive" ? (
                        <>
                          <button onClick={() => handleEdit(patient)} className="text-blue-600 hover:text-blue-900 mr-3" title={t("patientManagement.editPatient")}><FaEdit className="inline text-lg" /></button>
                          <button onClick={() => handleVerify(patient)} className="text-emerald-600 hover:text-emerald-900 mr-3" title="Kiểm duyệt & Kích hoạt tài khoản"><FaUserCheck className="inline text-lg" /></button>
                          <button onClick={() => handleDelete(patient.id)} disabled={deletingId === patient.id} className="text-red-600 hover:text-red-900 disabled:opacity-50" title={t("common.delete")}>
                            {deletingId === patient.id ? <FaSpinner className="inline animate-spin text-lg" /> : <FaTrash className="inline text-lg" />}
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleView(patient)} className="text-green-600 hover:text-green-900 mr-3" title={t("common.viewDetails") || "View details"}><FaEye className="inline text-lg" /></button>
                          <button onClick={() => handleEdit(patient)} className="text-blue-600 hover:text-blue-900 mr-3" title={t("patientManagement.editPatient")}><FaEdit className="inline text-lg" /></button>
                          <button onClick={() => handleDelete(patient.id)} disabled={deletingId === patient.id} className="text-red-600 hover:text-red-900 disabled:opacity-50" title={t("common.delete")}>
                            {deletingId === patient.id ? <FaSpinner className="inline animate-spin text-lg" /> : <FaTrash className="inline text-lg" />}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 md:p-6 dark:bg-gray-800 shadow-xl">
            {isSubmitting && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-[1px] flex flex-col items-center justify-center z-50 rounded-lg">
                <FaSpinner className="animate-spin text-3xl text-green-600 dark:text-green-400 mb-2.5" />
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Đang gửi yêu cầu & xử lý dữ liệu...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vui lòng chờ trong giây lát</p>
              </div>
            )}
            <h2 className="mb-4 text-xl font-bold dark:text-white md:text-2xl">
              {modalMode === "view"
                ? t("common.viewDetails") || "Chi tiết"
                : modalMode === "verify"
                ? "Kiểm duyệt & Kích hoạt tài khoản bệnh nhân"
                : modalMode === "edit"
                ? t("patientManagement.editPatient")
                : t("patientManagement.addNewPatient")}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <AvatarUploader
                currentUrl={editingPatient?.profileImageUrl}
                onFileSelect={(file) => setAvatarFile(file)}
                disabled={modalMode === "view"}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.name")}</label>
                  <input name="name" type="text" required disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.email")}</label>
                  <input name="email" type="email" required disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.phone")}</label>
                  <input name="phone" type="tel" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.phone} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.gender")}</label>
                  <select name="gender" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.gender}>
                    <option value="Nam">{t("common.male")}</option>
                    <option value="Nữ">{t("common.female")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.dateOfBirth")}</label>
                  <input name="dateOfBirth" type="date" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.dateOfBirth} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.status")}</label>
                  <select name="status" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.status || "active"}>
                    <option value="active">{t("common.active")}</option>
                    <option value="inactive">{t("common.inactive")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CCCD</label>
                  <input name="cccd" type="text" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.cccd || ""} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số BHYT</label>
                  <input name="insuranceNumber" type="text" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.insuranceNumber || ""} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Người liên hệ khẩn cấp</label>
                  <input name="emergencyContactName" type="text" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.emergencyContactName || ""} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SĐT liên hệ khẩn cấp</label>
                  <input name="emergencyContactPhone" type="text" disabled={modalMode === "view"} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70" defaultValue={editingPatient?.emergencyContactPhone || ""} />
                </div>
                <div className="md:col-span-2 mt-2">
                  <label className="flex items-center gap-2 text-sm md:text-base font-bold text-gray-800 dark:text-gray-100 mb-2">
                    <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 p-1.5 rounded-lg text-base">📋</span>
                    Tiền sử bệnh lý & Sức khỏe (Bệnh nền, dị ứng, phẫu thuật, thuốc đang dùng...)
                  </label>
                  {modalMode === "view" ? (
                    <div className="w-full min-h-[110px] p-4 bg-amber-50/60 dark:bg-slate-700/60 border border-amber-200/80 dark:border-slate-600 rounded-xl text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed text-sm md:text-base shadow-inner">
                      {editingPatient?.medicalHistory ? (
                        editingPatient.medicalHistory
                      ) : (
                        <span className="text-gray-400 italic">Không có thông tin tiền sử bệnh lý nào được ghi nhận.</span>
                      )}
                    </div>
                  ) : (
                    <textarea
                      name="medicalHistory"
                      rows={5}
                      placeholder="Ghi chú chi tiết về các bệnh lý nền (tim mạch, huyết áp, tiểu đường...), dị ứng thuốc, tiền sử phẫu thuật..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm md:text-base leading-relaxed shadow-sm"
                      defaultValue={editingPatient?.medicalHistory || ""}
                    />
                  )}
                </div>
                {!editingPatient && modalMode !== "view" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.password")} <span className="text-gray-400 font-normal">({t("patientManagement.loginAccount")})</span></label>
                    <input name="password" type="password" required minLength={8} placeholder={t("auth.passwordMinLength")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} disabled={isSubmitting} className={`${adminSecondaryButtonClass} w-full md:w-auto disabled:opacity-60`}>{modalMode === "view" ? (t("common.close") || "Close") : t("common.cancel")}</button>
                {modalMode === "verify" ? (
                  <>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      onClick={() => { submitActionRef.current = "save"; }}
                      className={`${adminSecondaryButtonClass} w-full md:w-auto border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-60 flex items-center justify-center gap-1.5`}
                    >
                      {isSubmitting ? <FaSpinner className="animate-spin" /> : <span>💾</span>} Lưu chỉnh sửa (Chưa kích hoạt)
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      onClick={() => { submitActionRef.current = "activate"; }}
                      className="w-full md:w-auto rounded-lg bg-emerald-600 px-4 py-2 text-white font-bold transition hover:bg-emerald-700 shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaUserCheck />} Duyệt & Kích hoạt tài khoản
                    </button>
                  </>
                ) : modalMode !== "view" && (
                  <button type="submit" disabled={isSubmitting} onClick={() => { submitActionRef.current = "save"; }} className={`${adminPrimaryButtonClass} w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-60`}>
                    {isSubmitting && <FaSpinner className="animate-spin" />}
                    {editingPatient?.id ? t("common.update") : t("common.add")}
                  </button>
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
            <img src={previewImage} alt={t("avatarUploader.title")} className="rounded-2xl shadow-2xl object-contain" style={{ maxWidth: "80vw", maxHeight: "80vh" }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avartar.jpg"; }} />
          </div>
          <style>{`@keyframes scaleIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
        </div>
      )}
    </div>
  );
};

export default PatientManagementAdmin;

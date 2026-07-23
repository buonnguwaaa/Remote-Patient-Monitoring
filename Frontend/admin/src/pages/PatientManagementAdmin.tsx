import React, { useState, useEffect } from "react";
import { FaRegUser, FaEdit, FaTrash, FaPlus, FaSearch, FaEye, FaUserCheck, FaSpinner } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import Pagination from "../components/ui/Pagination";
import type { Patient } from "../types";
import { mapGenderToDisplay } from "../utils/genderConverter";
import { adminPrimaryButtonClass } from "../styles/buttonStyles";
import PatientFormWizard from "../components/users/PatientFormWizard";
import VerifySuccessDialog from "../components/ui/VerifySuccessDialog";

const PatientManagementAdmin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");

  useEffect(() => {
    if (location.state?.tab === "pending") {
      setActiveTab("pending");
    }
  }, [location.state]);
  const [showWizard, setShowWizard] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | "verify">("add");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Verify & Create Dialog state
  const [verifySuccess, setVerifySuccess] = useState<{
    isOpen: boolean;
    patientName?: string;
    patientId?: string;
    mode?: "create" | "verify";
  }>({ isOpen: false });

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
          diseaseTypes: u.diseaseTypes || { bloodPressure: false, glucose: false },
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
    setModalMode("edit");
    setShowWizard(true);
  };

  const handleVerify = (patient: Patient) => {
    setEditingPatient(patient);
    setModalMode("verify");
    setShowWizard(true);
  };

  const handleView = (patient: Patient) => {
    setEditingPatient(patient);
    setModalMode("view");
    setShowWizard(true);
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
    setModalMode("add");
    setShowWizard(true);
  };

  const handleWizardSuccess = (createdPatientId?: string, isVerify?: boolean, patientName?: string) => {
    fetchPatients();

    if (createdPatientId) {
      setVerifySuccess({
        isOpen: true,
        patientName,
        patientId: createdPatientId,
        mode: isVerify ? "verify" : "create",
      });
    }
  };

  const pendingPatientsCount = patients.filter((p) => p.status === "inactive").length;

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.phone && patient.phone.includes(searchTerm));
    if (activeTab === "pending") {
      return matchesSearch && patient.status === "inactive";
    }
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} onClose={hideToast} />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-800 dark:text-white md:text-3xl">
            <FaRegUser className="mr-3 text-green-600" />
            {t("patientManagement.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t("patientManagement.totalCount", { count: patients.length })}
          </p>
        </div>
        <button onClick={handleAdd} className={`${adminPrimaryButtonClass} w-full md:w-auto`}>
          <FaPlus className="mr-2" />
          {t("patientManagement.addPatient")}
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

      <div className="mb-6 rounded-lg bg-white p-4 dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("patientManagement.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <FaSpinner className="animate-spin text-3xl text-green-600" />
        </div>
      ) : paginatedPatients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">{t("patientManagement.noPatients")}</p>
        </div>
      ) : (
        <>
          {/* Patients Table View */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700/60 dark:text-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Bệnh nhân</th>
                  <th scope="col" className="px-6 py-4 font-bold">Giới tính / Ngày sinh</th>
                  <th scope="col" className="px-6 py-4 font-bold">Số điện thoại</th>
                  <th scope="col" className="px-6 py-4 font-bold">CCCD / BHYT</th>
                  <th scope="col" className="px-6 py-4 font-bold text-center">Trạng thái</th>
                  <th scope="col" className="px-6 py-4 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          className="h-10 w-10 rounded-full object-cover cursor-pointer shrink-0"
                          src={patient.profileImageUrl || "/avartar.jpg"}
                          alt={patient.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/avartar.jpg";
                          }}
                          onClick={() => setPreviewImage(patient.profileImageUrl || "/avartar.jpg")}
                          title="Click xem ảnh avatar"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">
                            {patient.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {patient.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{patient.gender}</span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1.5">•</span>
                      <span className="text-gray-600 dark:text-gray-400">{patient.dateOfBirth}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.phone || <span className="text-gray-400 italic">Chưa cập nhật</span>}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {patient.cccd && (
                        <div>
                          <span className="text-gray-400">CCCD:</span>{" "}
                          <span className="font-medium text-gray-700 dark:text-gray-300">{patient.cccd}</span>
                        </div>
                      )}
                      {patient.insuranceNumber && (
                        <div>
                          <span className="text-gray-400">BHYT:</span>{" "}
                          <span className="font-medium text-gray-700 dark:text-gray-300">{patient.insuranceNumber}</span>
                        </div>
                      )}
                      {!patient.cccd && !patient.insuranceNumber && (
                        <span className="text-gray-400 italic">Chưa có</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          patient.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {patient.status === "active" ? "Hoạt động" : "Chờ xác minh"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {patient.status === "inactive" ? (
                          <button
                            onClick={() => handleVerify(patient)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                          >
                            <FaUserCheck /> Duyệt & Kích hoạt
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleView(patient)}
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700 transition"
                              title={t("common.viewDetails")}
                            >
                              <FaEye />
                            </button>
                            <button
                              onClick={() => handleEdit(patient)}
                              className="rounded-lg p-2 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-gray-700 transition"
                              title={t("common.edit")}
                            >
                              <FaEdit />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(patient.id)}
                          disabled={deletingId === patient.id}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700 transition disabled:opacity-50"
                          title={t("common.delete")}
                        >
                          {deletingId === patient.id ? <FaSpinner className="animate-spin" /> : <FaTrash />}
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

      {/* Patient 2-Step Form Wizard Modal */}
      <PatientFormWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        editingPatient={editingPatient}
        modalMode={modalMode}
        onSuccess={handleWizardSuccess}
        showToast={showToast}
      />

      {/* Verify Patient Success Confirmation Dialog */}
      <VerifySuccessDialog
        isOpen={verifySuccess.isOpen}
        patientName={verifySuccess.patientName}
        mode={verifySuccess.mode}
        onClose={() => setVerifySuccess({ isOpen: false })}
        onGoToAssignment={() => {
          const pid = verifySuccess.patientId;
          setVerifySuccess({ isOpen: false });
          if (pid) {
            navigate("/assignments", { state: { patientId: pid } });
          } else {
            navigate("/assignments");
          }
        }}
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

export default PatientManagementAdmin;

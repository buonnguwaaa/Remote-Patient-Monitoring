import React, { useState, useEffect } from "react";
import { FaRegUser, FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { uploadAvatar } from "../services/uploadService";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import AvatarUploader from "../components/ui/AvatarUploader";
import type { Patient } from "../types";
import { mapGenderToDisplay, mapGenderToApi } from "../utils/genderConverter";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "../styles/buttonStyles";

const PatientManagementAdmin: React.FC = () => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const fetchPatients = async () => {
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
        }));
        setPatients(apiPatients);
      }
    } catch (err) {
      console.error(t("patientManagement.loadError"), err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setAvatarFile(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t("patientManagement.confirmDelete"))) {
      try {
        await api.delete(`/users/${id}`);
        setPatients(patients.filter((p) => p.id !== id));
        showToast(t("patientManagement.deleteSuccess"));
      } catch (err) {
        console.error(t("patientManagement.deleteError"), err);
        showToast(t("patientManagement.deleteErrorMessage"), "error");
      }
    }
  };

  const handleAdd = () => {
    setEditingPatient(null);
    setAvatarFile(null);
    setShowModal(true);
  };

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderPatientCard = (patient: Patient) => {
    return (
      <div
        key={patient.id}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
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
            onClick={() => setPreviewImage(patient.profileImageUrl || "/avartar.jpg")}
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

        <div className="mt-4 flex items-center justify-end gap-2">
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
    const dateOfBirth = formData.get("dateOfBirth") as string;
    const status = formData.get("status") as "active" | "inactive";

    const apiGender = mapGenderToApi(gender);
    try {
      let savedUserId = editingPatient?.id;

      if (editingPatient?.id) {
        await api.patch(`/users/${editingPatient.id}`, {
          name, email, gender: apiGender, phone,
          roles: ["user.patient"],
        });
        await api.patch(`/users/${editingPatient.id}/status`, { status });
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
      showToast(editingPatient?.id ? t("patientManagement.updateSuccess") : t("patientManagement.addSuccess"));
    } catch (err: any) {
      console.error(err);
      showToast(t("patientManagement.errorPrefix") + " " + (err.response?.data?.error || err.message), "error");
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

      <div className="mb-6 rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
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

      <div className="space-y-4 md:hidden">
        {filteredPatients.length === 0 ? (
          <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow-md dark:bg-gray-800 dark:text-gray-400">
            {t("common.noData")}
          </div>
        ) : (
          filteredPatients.map((patient) => renderPatientCard(patient))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg bg-white shadow-md md:block dark:bg-gray-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("patientManagement.fields.name")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("patientManagement.fields.address")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("patientManagement.fields.status")}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("doctorManagement.fields.contact")}</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t("common.edit")}</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4" style={{ minWidth: "250px" }}>
                  <div className="flex items-center">
                    <img
                      className="h-10 w-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-green-400 hover:scale-110 transition-transform duration-150"
                      src={patient.profileImageUrl || "/avartar.jpg"}
                      alt={patient.name}
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avartar.jpg"; }}
                      onClick={() => setPreviewImage(patient.profileImageUrl || "/avartar.jpg")}
                      title={t("doctorManagement.clickToViewImage")}
                    />
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{patient.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{patient.gender} - {patient.dateOfBirth}</div>
                    </div>
                  </div>
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
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button onClick={() => handleEdit(patient)} className="text-blue-600 hover:text-blue-900 mr-3"><FaEdit className="inline" /></button>
                  <button onClick={() => handleDelete(patient.id)} className="text-red-600 hover:text-red-900"><FaTrash className="inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 md:p-6 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold dark:text-white md:text-2xl">{editingPatient ? t("patientManagement.editPatient") : t("patientManagement.addNewPatient")}</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <AvatarUploader
                currentUrl={editingPatient?.profileImageUrl}
                onFileSelect={(file) => setAvatarFile(file)}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.name")}</label>
                  <input name="name" type="text" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" defaultValue={editingPatient?.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.email")}</label>
                  <input name="email" type="email" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" defaultValue={editingPatient?.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.phone")}</label>
                  <input name="phone" type="tel" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" defaultValue={editingPatient?.phone} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.gender")}</label>
                  <select name="gender" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" defaultValue={editingPatient?.gender}>
                    <option value="Nam">{t("common.male")}</option>
                    <option value="Nữ">{t("common.female")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.dateOfBirth")}</label>
                  <input name="dateOfBirth" type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" defaultValue={editingPatient?.dateOfBirth} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.status")}</label>
                  <select name="status" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" defaultValue={editingPatient?.status || "active"}>
                    <option value="active">{t("common.active")}</option>
                    <option value="inactive">{t("common.inactive")}</option>
                  </select>
                </div>
                {!editingPatient && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("patientManagement.fields.password")} <span className="text-gray-400 font-normal">({t("patientManagement.loginAccount")})</span></label>
                    <input name="password" type="password" required minLength={8} placeholder={t("auth.passwordMinLength")} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                )}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end md:space-x-3">
                <button type="button" onClick={() => setShowModal(false)} className={`${adminSecondaryButtonClass} w-full md:w-auto`}>{t("common.cancel")}</button>
                <button type="submit" className={`${adminPrimaryButtonClass} w-full md:w-auto`}>{editingPatient?.id ? t("common.update") : t("common.add")}</button>
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

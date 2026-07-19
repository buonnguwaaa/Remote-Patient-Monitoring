import React, { useEffect, useMemo, useState } from "react";
import { FaEdit, FaExchangeAlt, FaSave, FaTrash, FaUserMd, FaUserNurse } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import api from "../services/api";
import type { Assignment, Nurse, Patient, doctor } from "../types";
import {
  adminPrimaryButtonClass,
  adminPrimaryButtonDisabledClass,
  adminSecondaryButtonClass,
} from "../styles/buttonStyles";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";
import SearchableSelect from "../components/ui/SearchableSelect";

const AssignmentManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast, showToast, hideToast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<doctor[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedNurse, setSelectedNurse] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  const extractList = (response: any) => {
    const data = response.data?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(response.data)) return response.data;
    return [];
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPatients, resDoctors, resNurses, resAssignments] = await Promise.all([
        api.get("/users/patients?limit=1000&sortOrder=desc"),
        api.get("/users/doctors?limit=1000&sortOrder=desc"),
        api.get("/users/nurses?limit=1000&sortOrder=desc"),
        api.get("/assignments"),
      ]);

      setPatients(extractList(resPatients));
      setDoctors(extractList(resDoctors));
      setNurses(extractList(resNurses));
      setAssignments(extractList(resAssignments));
    } catch (error) {
      console.error("Error fetching assignment data", error);
      showToast(t("assignmentManagement.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const refreshAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const response = await api.get("/assignments");
      setAssignments(extractList(response));
    } catch (error) {
      console.error("Error refreshing assignments", error);
      showToast(t("assignmentManagement.refreshError"), "error");
    } finally {
      setLoadingAssignments(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient("");
    setSelectedDoctor("");
    setSelectedNurse("");
    setEditingAssignmentId(null);
  };

  const assignmentByPatientId = useMemo(() => {
    return new Map(assignments.map((assignment) => [assignment.patientId, assignment]));
  }, [assignments]);

  const patientOptions = useMemo(() => {
    if (editingAssignmentId) {
      return patients.filter((patient) => patient.id === selectedPatient);
    }

    return patients.filter((patient) => !assignmentByPatientId.has(patient.id));
  }, [assignmentByPatientId, editingAssignmentId, patients, selectedPatient]);

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedPatient) {
      showToast(t("assignmentManagement.selectPatientError"), "error");
      return;
    }

    if (!selectedDoctor && !selectedNurse) {
      showToast(t("assignmentManagement.selectStaffError"), "error");
      return;
    }

    const existingAssignment = assignmentByPatientId.get(selectedPatient);
    if (existingAssignment && existingAssignment.id !== editingAssignmentId) {
      showToast(t("assignmentManagement.alreadyAssigned"), "error");
      return;
    }

    try {
      setLoading(true);
      await api.post("/assignments/assign", {
        patientId: selectedPatient,
        doctorId: selectedDoctor,
        nurseId: selectedNurse,
      });

      showToast(
        editingAssignmentId ? t("assignmentManagement.updateSuccess") : t("assignmentManagement.assignSuccess"),
        "success"
      );
      resetForm();
      await refreshAssignments();
    } catch (error) {
      console.error("Assign error", error);
      showToast(t("assignmentManagement.saveError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setSelectedPatient(assignment.patientId);
    setSelectedDoctor(assignment.doctorId || "");
    setSelectedNurse(assignment.nurseId || "");
    setEditingAssignmentId(assignment.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    const confirmed = window.confirm(
      t("assignmentManagement.confirmDelete", { name: assignment.patientName || assignment.patientId })
    );
    if (!confirmed) return;

    try {
      setLoadingAssignments(true);
      await api.delete(`/assignments/${assignment.id}`);
      if (editingAssignmentId === assignment.id) {
        resetForm();
      }
      showToast(t("assignmentManagement.deleteSuccess"), "success");
      await refreshAssignments();
    } catch (error) {
      console.error("Delete assignment error", error);
      showToast(t("assignmentManagement.deleteError"), "error");
    } finally {
      setLoadingAssignments(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    if (!normalizedQuery) return assignments;

    return assignments.filter((assignment) => {
      return [
        assignment.patientName,
        assignment.patientCode,
        assignment.doctorName,
        assignment.nurseName,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [assignments, searchTerm]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <Toast toast={toast} onClose={hideToast} />
      <h1 className="mb-8 flex items-center text-3xl font-bold text-gray-800 dark:text-white">
        <FaExchangeAlt className="mr-3 text-slate-700 dark:text-slate-200" />
        {t("assignmentManagement.title")}
      </h1>

      <div className="rounded-xl bg-white p-8 shadow-md dark:bg-gray-800">
        <form onSubmit={handleAssign} className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <label className="block text-lg font-medium text-gray-700 dark:text-gray-300">
              {t("assignmentManagement.selectPatient")}
            </label>
            {editingAssignmentId && (
              <button
                type="button"
                onClick={resetForm}
                className={adminSecondaryButtonClass}
              >
                {t("assignmentManagement.cancelEdit")}
              </button>
            )}
          </div>

          <SearchableSelect
            options={patientOptions.map((p) => ({ value: p.id, label: `${p.name} (${p.email})` }))}
            value={selectedPatient}
            onChange={setSelectedPatient}
            placeholder={t("assignmentManagement.selectPatientPlaceholder")}
            disabled={Boolean(editingAssignmentId)}
            searchPlaceholder={t("common.search")}
            noOptionsText={t("common.noData")}
          />

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {editingAssignmentId
              ? t("assignmentManagement.editMode")
              : t("assignmentManagement.unassignedOnly")}
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
              <label className="mb-3 flex items-center text-lg font-medium text-slate-800 dark:text-slate-200">
                <FaUserMd className="mr-2" />
                {t("assignmentManagement.selectDoctor")}
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: t("assignmentManagement.notSpecified") },
                  ...doctors.map((d) => ({ value: d.id, label: `BS. ${d.name}` }))
                ]}
                value={selectedDoctor}
                onChange={setSelectedDoctor}
                placeholder={t("assignmentManagement.notSpecified")}
                searchPlaceholder={t("common.search")}
                noOptionsText={t("common.noData")}
              />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t("assignmentManagement.doctorResponsibility")}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
              <label className="mb-3 flex items-center text-lg font-medium text-slate-800 dark:text-slate-200">
                <FaUserNurse className="mr-2" />
                {t("assignmentManagement.selectNurse")}
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: t("assignmentManagement.notSpecified") },
                  ...nurses.map((n) => ({ value: n.id, label: `YT. ${n.name}` }))
                ]}
                value={selectedNurse}
                onChange={setSelectedNurse}
                placeholder={t("assignmentManagement.notSpecified")}
                searchPlaceholder={t("common.search")}
                noOptionsText={t("common.noData")}
              />
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t("assignmentManagement.nurseResponsibility")}
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className={`${adminPrimaryButtonClass} px-8 py-3 text-lg hover:scale-105 ${
                loading
                  ? adminPrimaryButtonDisabledClass
                  : ""
              }`}
            >
              {loading ? (
                t("common.processing")
              ) : (
                <>
                  <FaSave className="mr-2" />
                  {editingAssignmentId ? t("assignmentManagement.updateAssignment") : t("assignmentManagement.saveAssignment")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 rounded-xl bg-white p-8 shadow-md dark:bg-gray-800">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("assignmentManagement.assignmentList")}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("assignmentManagement.assignmentListDesc")}
            </p>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("assignmentManagement.searchPlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:max-w-md dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">{t("assignmentManagement.tableHeaders.patient")}</th>
                <th className="px-4 py-3">{t("assignmentManagement.tableHeaders.patientCode")}</th>
                <th className="px-4 py-3">{t("assignmentManagement.tableHeaders.doctor")}</th>
                <th className="px-4 py-3">{t("assignmentManagement.tableHeaders.nurse")}</th>
                <th className="px-4 py-3">{t("assignmentManagement.tableHeaders.updated")}</th>
                <th className="px-4 py-3 text-center">{t("assignmentManagement.tableHeaders.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {assignment.patientName || t("common.noName")}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{assignment.patientId}</div>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {assignment.patientCode || t("common.noCode")}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                    {assignment.doctorName || t("common.notSpecified")}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                    {assignment.nurseName || t("common.notSpecified")}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {assignment.updatedAt ? new Date(assignment.updatedAt).toLocaleString("vi-VN") : "N/A"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditAssignment(assignment)}
                        className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/60"
                      >
                        <FaEdit className="mr-2" />
                        {t("assignmentManagement.buttons.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(assignment)}
                        className="inline-flex items-center rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <FaTrash className="mr-2" />
                        {t("assignmentManagement.buttons.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loadingAssignments && filteredAssignments.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("assignmentManagement.noAssignments")}
          </div>
        )}

        {loadingAssignments && (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("assignmentManagement.loadingAssignments")}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentManagement;

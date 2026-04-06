import React, { useEffect, useMemo, useState } from "react";
import { FaEdit, FaExchangeAlt, FaSave, FaTrash, FaUserMd, FaUserNurse } from "react-icons/fa";

import api from "../services/api";
import type { Assignment, Nurse, Patient, doctor } from "../types";
import {
  adminPrimaryButtonClass,
  adminPrimaryButtonDisabledClass,
  adminSecondaryButtonClass,
} from "../styles/buttonStyles";

const AssignmentManagement: React.FC = () => {
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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
        api.get("/users/patients?limit=100"),
        api.get("/users/doctors?limit=100"),
        api.get("/users/nurses?limit=100"),
        api.get("/assignments"),
      ]);

      setPatients(extractList(resPatients));
      setDoctors(extractList(resDoctors));
      setNurses(extractList(resNurses));
      setAssignments(extractList(resAssignments));
    } catch (error) {
      console.error("Error fetching assignment data", error);
      setMessage({ type: "error", text: "Không thể tải dữ liệu phân công." });
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
      setMessage({ type: "error", text: "Không thể tải lại danh sách phân công." });
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
    setMessage(null);

    if (!selectedPatient) {
      setMessage({ type: "error", text: "Vui lòng chọn bệnh nhân." });
      return;
    }

    if (!selectedDoctor && !selectedNurse) {
      setMessage({ type: "error", text: "Vui lòng chọn ít nhất một bác sĩ hoặc y tá." });
      return;
    }

    const existingAssignment = assignmentByPatientId.get(selectedPatient);
    if (existingAssignment && existingAssignment.id !== editingAssignmentId) {
      setMessage({
        type: "error",
        text: "Bệnh nhân này đã được phân công. Hãy dùng nút Sửa trong danh sách bên dưới.",
      });
      return;
    }

    try {
      setLoading(true);
      await api.post("/assignments/assign", {
        patientId: selectedPatient,
        doctorId: selectedDoctor,
        nurseId: selectedNurse,
      });

      setMessage({
        type: "success",
        text: editingAssignmentId ? "Cập nhật phân công thành công!" : "Phân công thành công!",
      });
      resetForm();
      await refreshAssignments();
    } catch (error) {
      console.error("Assign error", error);
      setMessage({ type: "error", text: "Lỗi khi lưu phân công. Vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setSelectedPatient(assignment.patientId);
    setSelectedDoctor(assignment.doctorId || "");
    setSelectedNurse(assignment.nurseId || "");
    setEditingAssignmentId(assignment.id);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    const confirmed = window.confirm(
      `Xóa phân công của bệnh nhân ${assignment.patientName || assignment.patientId}?`
    );
    if (!confirmed) return;

    try {
      setLoadingAssignments(true);
      await api.delete(`/assignments/${assignment.id}`);
      if (editingAssignmentId === assignment.id) {
        resetForm();
      }
      setMessage({ type: "success", text: "Đã xóa phân công." });
      await refreshAssignments();
    } catch (error) {
      console.error("Delete assignment error", error);
      setMessage({ type: "error", text: "Không thể xóa phân công." });
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
      <h1 className="mb-8 flex items-center text-3xl font-bold text-gray-800 dark:text-white">
        <FaExchangeAlt className="mr-3 text-slate-700 dark:text-slate-200" />
        Phân công Bệnh nhân
      </h1>

      <div className="rounded-xl bg-white p-8 shadow-md dark:bg-gray-800">
        {message && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              message.type === "success"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleAssign} className="space-y-8">
          <div className="flex items-center justify-between gap-4">
            <label className="block text-lg font-medium text-gray-700 dark:text-gray-300">
              1. Chọn Bệnh nhân
            </label>
            {editingAssignmentId && (
              <button
                type="button"
                onClick={resetForm}
                className={adminSecondaryButtonClass}
              >
                Hủy chỉnh sửa
              </button>
            )}
          </div>

          <select
            className="w-full rounded-lg border border-gray-300 p-3 text-lg focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
            value={selectedPatient}
            onChange={(event) => setSelectedPatient(event.target.value)}
            disabled={Boolean(editingAssignmentId)}
            required
          >
            <option value="">-- Chọn bệnh nhân --</option>
            {patientOptions.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.email})
              </option>
            ))}
          </select>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {editingAssignmentId
              ? "Đang ở chế độ chỉnh sửa. Bệnh nhân đã được khóa, bạn chỉ cập nhật bác sĩ và y tá."
              : "Chỉ hiển thị bệnh nhân chưa được phân công. Bệnh nhân đã có phân công sẽ được sửa trong danh sách bên dưới."}
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
              <label className="mb-3 flex items-center text-lg font-medium text-slate-800 dark:text-slate-200">
                <FaUserMd className="mr-2" />
                2. Chọn Bác sĩ phụ trách
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white p-3 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-gray-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
                value={selectedDoctor}
                onChange={(event) => setSelectedDoctor(event.target.value)}
              >
                <option value="">-- Không chỉ định --</option>
                {doctors.map((doctorOption) => (
                  <option key={doctorOption.id} value={doctorOption.id}>
                    BS. {doctorOption.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Bác sĩ chịu trách nhiệm chính về chuyên môn.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
              <label className="mb-3 flex items-center text-lg font-medium text-slate-800 dark:text-slate-200">
                <FaUserNurse className="mr-2" />
                3. Chọn Y tá theo dõi
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white p-3 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-gray-800 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
                value={selectedNurse}
                onChange={(event) => setSelectedNurse(event.target.value)}
              >
                <option value="">-- Không chỉ định --</option>
                {nurses.map((nurseOption) => (
                  <option key={nurseOption.id} value={nurseOption.id}>
                    YT. {nurseOption.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Y tá theo dõi chỉ số hằng ngày.
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
                "Đang xử lý..."
              ) : (
                <>
                  <FaSave className="mr-2" />
                  {editingAssignmentId ? "Cập nhật phân công" : "Lưu Phân công"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 rounded-xl bg-white p-8 shadow-md dark:bg-gray-800">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Danh sách phân công</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Theo dõi, chỉnh sửa hoặc xóa nhanh các phân công hiện có.
            </p>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo bệnh nhân, mã hồ sơ, bác sĩ, y tá..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 md:max-w-md dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Bệnh nhân</th>
                <th className="px-4 py-3">Mã hồ sơ</th>
                <th className="px-4 py-3">Bác sĩ</th>
                <th className="px-4 py-3">Y tá</th>
                <th className="px-4 py-3">Cập nhật</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {assignment.patientName || "Chưa có tên"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{assignment.patientId}</div>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {assignment.patientCode || "Chưa có mã"}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                    {assignment.doctorName || "Chưa chỉ định"}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                    {assignment.nurseName || "Chưa chỉ định"}
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
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(assignment)}
                        className="inline-flex items-center rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <FaTrash className="mr-2" />
                        Xóa
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
            Chưa có phân công nào để hiển thị.
          </div>
        )}

        {loadingAssignments && (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Đang tải danh sách phân công...
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentManagement;

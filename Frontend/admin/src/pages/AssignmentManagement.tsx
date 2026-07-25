import React, { useEffect, useMemo, useState } from "react";
import { FaEdit, FaExchangeAlt, FaSave, FaTrash, FaUserMd, FaUserNurse, FaSearch, FaCheck, FaFilter, FaFileMedical } from "react-icons/fa";
import { MdBloodtype } from "react-icons/md";
import { GiMedicines } from "react-icons/gi";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";

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
import Pagination from "../components/ui/Pagination";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export interface FilterCategory {
  id: string;
  label: string;
  keywords: string[];
}

function getSuggestedFilters(diseaseTypes?: { bloodPressure: boolean; glucose: boolean }): FilterCategory[] {
  if (!diseaseTypes) return [];
  const { bloodPressure, glucose } = diseaseTypes;
  if (!bloodPressure && !glucose) return [];

  const filters: FilterCategory[] = [];

  // Từ khóa khoa Nội dùng chung
  filters.push({
    id: "noi-tong-quat",
    label: "Nội Tổng quát",
    keywords: ["nội tổng hợp", "noi tong hop", "tổng hợp", "tong hop", "nội tổng quát", "noi tong quat", "tổng quát", "tong quat"]
  });

  if (bloodPressure) {
    filters.push({
      id: "tim-mach",
      label: "Tim mạch",
      keywords: ["tim mạch", "tim mach", "cardio", "huyết áp", "huyet ap", "hypertension"]
    });
  }

  if (glucose) {
    filters.push({
      id: "noi-tiet",
      label: "Nội tiết",
      keywords: ["nội tiết", "noi tiet", "endocrin", "tiểu đường", "tieu duong", "đái tháo", "dai thao"]
    });
  }

  return filters;
}

function getDiseaseLabel(diseaseTypes?: { bloodPressure: boolean; glucose: boolean }) {
  if (!diseaseTypes) return [];
  const labels: { label: string; color: string; icon: React.ReactNode }[] = [];
  if (diseaseTypes.bloodPressure) labels.push({ label: "Huyết áp", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: <MdBloodtype className="inline mr-1" /> });
  if (diseaseTypes.glucose) labels.push({ label: "Đái tháo đường", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", icon: <GiMedicines className="inline mr-1" /> });
  return labels;
}

/** Badge màu số bệnh nhân */
function PatientCountBadge({ count }: { count: number }) {
  let colorClass = "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  if (count >= 11) colorClass = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  else if (count >= 6) colorClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
      {count} BN
    </span>
  );
}

// ─── Patient Info Card ─────────────────────────────────────────────────────────

function calculateAge(dobStr?: string): number | string {
  if (!dobStr) return "N/A";
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return "N/A";
  const diff = Date.now() - dob.getTime();
  const age = new Date(diff).getUTCFullYear() - 1970;
  return age > 0 ? age : "N/A";
}

function PatientInfoCard({ patient }: { patient: Patient }) {
  const diseaseLabels = getDiseaseLabel(patient.diseaseTypes);
  const age = calculateAge(patient.dateOfBirth);
  const g = patient.gender?.toLowerCase() || "";
  const genderStr = (g === "male" || g === "m") ? "Nam" : (g === "female" || g === "f") ? "Nữ" : patient.gender || "Khác";

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50 p-4 dark:border-blue-800 dark:from-blue-950/40 dark:to-blue-950/40 space-y-4">
      {/* Header: Avatar + Tên + Email */}
      <div className="flex items-center gap-4">
        <img
          src={patient.profileImageUrl || "/avartar.jpg"}
          alt={patient.name}
          onError={(e) => { e.currentTarget.src = "/avartar.jpg"; }}
          className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-blue-300 dark:ring-blue-600"
        />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 dark:text-white text-base">{patient.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{patient.email}</div>
        </div>

      </div>

      {/* Main Info: Tuổi, Giới tính, Bệnh lý */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-blue-200/50 dark:border-blue-800/50 pt-4">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Tuổi: <span className="font-medium text-gray-900 dark:text-white">{age}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Giới tính: <span className="font-medium text-gray-900 dark:text-white">{genderStr}</span>
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Bệnh lý:</div>
          <div className="flex flex-wrap gap-1.5">
            {diseaseLabels.length > 0 ? (
              diseaseLabels.map((d) => (
                <span key={d.label} className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${d.color}`}>
                  {d.icon}{d.label}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500">Không có bệnh mãn tính cụ thể</span>
            )}
          </div>
        </div>
      </div>

      {/* Tiền sử bệnh án */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-100 dark:border-blue-900/50">
        <div className="flex items-center text-sm font-medium text-red-600 dark:text-red-400 mb-2">
          <FaFileMedical className="mr-2" />
          Tiền sử bệnh án
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {patient.medicalHistory || "Không có thông tin"}
        </div>
      </div>

    </div>
  );
}

// ─── Staff Card ────────────────────────────────────────────────────────────────

interface DoctorCardProps {
  doc: doctor;
  isSelected: boolean;
  patientCount: number;
  onClick: () => void;
}

function DoctorCard({ doc, isSelected, patientCount, onClick }: DoctorCardProps) {
  const isInactive = doc.status === "inactive";
  const titleParts = [doc.academicTitleLabel, doc.academicDegreeLabel, doc.professionalQualificationLabel].filter(Boolean);

  return (
    <button
      type="button"
      disabled={isInactive}
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-all duration-150 ${
        isInactive
          ? "cursor-not-allowed opacity-40 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          : isSelected
          ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40 shadow-sm"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img
            src={doc.profileImageUrl || "/avartar.jpg"}
            alt={doc.name}
            onError={(e) => { e.currentTarget.src = "/avartar.jpg"; }}
            className={`h-10 w-10 rounded-full object-cover ${isSelected ? "ring-2 ring-blue-500" : "ring-1 ring-gray-200 dark:ring-gray-600"}`}
          />
          {isSelected && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white">
              <FaCheck className="text-[9px]" />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
            {doc.displayName || `BS. ${doc.name}`}
          </div>
          {titleParts.length > 0 && (
            <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate">
              {titleParts.join(" · ")}
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* Dept badge */}
            {doc.department && (
              <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {doc.department}
              </span>
            )}
            {/* Experience */}
            {doc.yearsOfExperience > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {doc.yearsOfExperience} năm KN
              </span>
            )}
            {/* Patient count */}
            <PatientCountBadge count={patientCount} />
          </div>

          {/* License */}
          {doc.licenseNumber && (
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate">
              GP: {doc.licenseNumber}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

interface NurseCardProps {
  nurse: Nurse;
  isSelected: boolean;
  patientCount: number;
  onClick: () => void;
}

function NurseCard({ nurse, isSelected, patientCount, onClick }: NurseCardProps) {
  const isInactive = nurse.status === "inactive";

  return (
    <button
      type="button"
      disabled={isInactive}
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition-all duration-150 ${
        isInactive
          ? "cursor-not-allowed opacity-40 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          : isSelected
          ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40 shadow-sm"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img
            src={nurse.profileImageUrl || "/avartar.jpg"}
            alt={nurse.name}
            onError={(e) => { e.currentTarget.src = "/avartar.jpg"; }}
            className={`h-10 w-10 rounded-full object-cover ${isSelected ? "ring-2 ring-blue-500" : "ring-1 ring-gray-200 dark:ring-gray-600"}`}
          />
          {isSelected && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-white">
              <FaCheck className="text-[9px]" />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-sm leading-tight ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-white"}`}>
            YT. {nurse.name}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {nurse.department && (
              <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {nurse.department}
              </span>
            )}
            {nurse.yearsOfExperience > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {nurse.yearsOfExperience} năm KN
              </span>
            )}
            <PatientCountBadge count={patientCount} />
          </div>

          {nurse.licenseNumber && (
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 truncate">
              GP: {nurse.licenseNumber}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Staff Picker List ────────────────────────────────────────────────────────

interface DoctorPickerProps {
  doctors: doctor[];
  filteredDoctors: doctor[];
  selectedDoctor: string;
  onSelect: (id: string) => void;
  doctorPatientCounts: Record<string, number>;
  search: string;
  onSearchChange: (v: string) => void;
  activeFilterIds?: string[];
  suggestedFilters?: FilterCategory[];
  onToggleFilter?: (id: string) => void;
  onClearFilters?: () => void;
}

function DoctorPickerList({ doctors, filteredDoctors, selectedDoctor, onSelect, doctorPatientCounts, search, onSearchChange, suggestedFilters, activeFilterIds, onToggleFilter, onClearFilters }: DoctorPickerProps) {
  const searched = useMemo(() => {
    let list = search
      ? filteredDoctors.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || (d.displayName || "").toLowerCase().includes(search.toLowerCase()))
      : filteredDoctors;
    return [...list].sort((a, b) => (doctorPatientCounts[a.id] || 0) - (doctorPatientCounts[b.id] || 0));
  }, [filteredDoctors, search, doctorPatientCounts]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-2">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm bác sĩ..."
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 pl-8 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Filter chips */}
      {suggestedFilters && suggestedFilters.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 border border-blue-100 dark:border-blue-900/50">
          <FaFilter className="text-blue-500 text-xs shrink-0 mr-1" />
          {suggestedFilters.map(f => {
            const isActive = activeFilterIds?.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onToggleFilter?.(f.id)}
                className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium shadow-sm border transition-colors focus:outline-none ${
                  isActive
                    ? "bg-blue-500 text-white border-blue-600 hover:bg-blue-600 dark:border-blue-500 dark:hover:bg-blue-400"
                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline ml-auto font-medium"
          >
            {activeFilterIds?.length === 0 ? "Khôi phục" : "Bỏ lọc"}
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-0.5">
        {searched.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            Không tìm thấy bác sĩ phù hợp
          </div>
        ) : (
          searched.map((doc) => (
            <DoctorCard
              key={doc.id}
              doc={doc}
              isSelected={selectedDoctor === doc.id}
              patientCount={doctorPatientCounts[doc.id] ?? 0}
              onClick={() => onSelect(selectedDoctor === doc.id ? "" : doc.id)}
            />
          ))
        )}
      </div>

      {/* Count summary */}
      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
        {searched.length}/{doctors.length} bác sĩ
        {activeFilterIds && activeFilterIds.length > 0 ? " (đã lọc)" : ""}
      </div>
    </div>
  );
}

interface NursePickerProps {
  nurses: Nurse[];
  filteredNurses: Nurse[];
  selectedNurse: string;
  onSelect: (id: string) => void;
  nursePatientCounts: Record<string, number>;
  search: string;
  onSearchChange: (v: string) => void;
  activeFilterIds?: string[];
  suggestedFilters?: FilterCategory[];
  onToggleFilter?: (id: string) => void;
  onClearFilters?: () => void;
}

function NursePickerList({ nurses, filteredNurses, selectedNurse, onSelect, nursePatientCounts, search, onSearchChange, suggestedFilters, activeFilterIds, onToggleFilter, onClearFilters }: NursePickerProps) {
  const searched = useMemo(() => {
    let list = search 
      ? filteredNurses.filter(n => n.name.toLowerCase().includes(search.toLowerCase())) 
      : filteredNurses;
    return [...list].sort((a, b) => (nursePatientCounts[a.id] || 0) - (nursePatientCounts[b.id] || 0));
  }, [filteredNurses, search, nursePatientCounts]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-2">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm y tá..."
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 pl-8 pr-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Filter chips */}
      {suggestedFilters && suggestedFilters.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 border border-blue-100 dark:border-blue-900/50">
          <FaFilter className="text-blue-500 text-xs shrink-0 mr-1" />
          {suggestedFilters.map(f => {
            const isActive = activeFilterIds?.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onToggleFilter?.(f.id)}
                className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium shadow-sm border transition-colors focus:outline-none ${
                  isActive
                    ? "bg-blue-500 text-white border-blue-600 hover:bg-blue-600 dark:border-blue-500 dark:hover:bg-blue-400"
                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline ml-auto font-medium"
          >
            {activeFilterIds?.length === 0 ? "Khôi phục" : "Bỏ lọc"}
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-0.5">
        {searched.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            Không tìm thấy y tá phù hợp
          </div>
        ) : (
          searched.map((nurse) => (
            <NurseCard
              key={nurse.id}
              nurse={nurse}
              isSelected={selectedNurse === nurse.id}
              patientCount={nursePatientCounts[nurse.id] ?? 0}
              onClick={() => onSelect(selectedNurse === nurse.id ? "" : nurse.id)}
            />
          ))
        )}
      </div>

      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
        {searched.length}/{nurses.length} y tá
        {activeFilterIds && activeFilterIds.length > 0 ? " (đã lọc)" : ""}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const AssignmentManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast, showToast, hideToast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<doctor[]>([]);
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [doctorPatientCounts, setDoctorPatientCounts] = useState<Record<string, number>>({});
  const [nursePatientCounts, setNursePatientCounts] = useState<Record<string, number>>({});

  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedNurse, setSelectedNurse] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [nurseSearch, setNurseSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  
  const [suggestedFilters, setSuggestedFilters] = useState<FilterCategory[]>([]);
  const [doctorActiveFilterIds, setDoctorActiveFilterIds] = useState<string[]>([]);
  const [nurseActiveFilterIds, setNurseActiveFilterIds] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const targetPatientId = (location.state as any)?.patientId || searchParams.get("patientId") || "";

  useEffect(() => { void fetchData(); }, []);

  useEffect(() => {
    if (targetPatientId) setSelectedPatient(targetPatientId);
  }, [targetPatientId]);

  const targetDoctorId = (location.state as any)?.doctorId || searchParams.get("doctorId") || "";

  useEffect(() => {
    if (targetDoctorId && doctors.length > 0) {
      const targetDoc = doctors.find(d => d.id === targetDoctorId);
      if (targetDoc) {
        setSearchTerm(targetDoc.name);
      }
    }
  }, [targetDoctorId, doctors]);

  const extractList = (response: any) => {
    const data = response.data?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(response.data)) return response.data;
    return [];
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPatients, resDoctors, resNurses, resAssignments, resDepartments, resDoctorCounts, resNurseCounts] = await Promise.all([
        api.get("/users/patients?limit=1000&sortOrder=desc"),
        api.get("/users/doctors?limit=1000&sortOrder=desc"),
        api.get("/users/nurses?limit=1000&sortOrder=desc"),
        api.get("/assignments"),
        api.get("/departments").catch(() => ({ data: { data: [] } })),
        api.get("/assignments/doctor-patient-counts").catch(() => ({ data: { data: {} } })),
        api.get("/assignments/nurse-patient-counts").catch(() => ({ data: { data: {} } })),
      ]);

      // Build dept lookup map: id → name
      const deptList: { id: string; name: string }[] = ressDepts(resDepartments);
      const deptMap = new Map(deptList.map((d) => [d.id, d.name]));

      const resolveDept = (departmentId: string) => {
        if (!departmentId) return "";
        return deptMap.get(departmentId) || "";
      };

      setPatients(extractList(resPatients).map((u: any) => ({
        ...u,
        dateOfBirth: u.dob || u.dateOfBirth,
        gender: u.gender || u.sex,
        diseaseTypes: u.diseaseTypes || { bloodPressure: false, glucose: false },
        profileImageUrl: u.avatarUrl || "/avartar.jpg",
      })));

      setDoctors(extractList(resDoctors).map((u: any) => {
        const deptId = typeof u.departmentId === "object" && u.departmentId?.$oid ? u.departmentId.$oid : (u.departmentId || "");
        return {
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
          gender: u.gender,
          dateOfBirth: u.dob,
          phone: u.phone || "",
          specialization: u.specialization || "",
          licenseNumber: u.licenseNumber || "",
          department: resolveDept(deptId),
          departmentId: deptId,
          workplace: u.workplace || "",
          yearsOfExperience: u.yearsOfExperience || 0,
          status: u.status === "inactive" ? "inactive" : "active",
          profileImageUrl: u.avatarUrl || "/avartar.jpg",
        };
      }));

      setNurses(extractList(resNurses).map((u: any) => {
        const deptId = typeof u.departmentId === "object" && u.departmentId?.$oid ? u.departmentId.$oid : (u.departmentId || "");
        return {
          id: u.id,
          name: u.name,
          licenseNumber: u.licenseNumber || "",
          workplace: u.workplace || "",
          department: resolveDept(deptId),
          departmentId: deptId,
          yearsOfExperience: u.yearsOfExperience || 0,
          status: u.status === "inactive" ? "inactive" : "active",
          email: u.email,
          phone: u.phone || "",
          profileImageUrl: u.avatarUrl || "/avartar.jpg",
          gender: u.gender,
          dateOfBirth: u.dob,
        };
      }));

      setAssignments(extractList(resAssignments));
      setDoctorPatientCounts(resDoctorCounts.data?.data || {});
      setNursePatientCounts(resNurseCounts.data?.data || {});
    } catch (error) {
      console.error("Error fetching assignment data", error);
      showToast(t("assignmentManagement.loadError"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper: extract department list from API response
  const ressDepts = (response: any): { id: string; name: string }[] => {
    const data = response.data?.data;
    if (Array.isArray(data)) return data.map((d: any) => ({ id: d.id || d._id, name: d.name }));
    return [];
  };

  const refreshAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const [response, resDoctorCounts, resNurseCounts] = await Promise.all([
        api.get("/assignments"),
        api.get("/assignments/doctor-patient-counts").catch(() => ({ data: { data: {} } })),
        api.get("/assignments/nurse-patient-counts").catch(() => ({ data: { data: {} } })),
      ]);
      setAssignments(extractList(response));
      setDoctorPatientCounts(resDoctorCounts.data?.data || {});
      setNursePatientCounts(resNurseCounts.data?.data || {});
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
    setDoctorSearch("");
    setNurseSearch("");
    setEditingAssignmentId(null);
  };

  const assignmentByPatientId = useMemo(() =>
    new Map(assignments.map((a) => [a.patientId, a])),
    [assignments]
  );

  const patientOptions = useMemo(() => {
    if (editingAssignmentId) return patients.filter((p) => p.id === selectedPatient);
    return patients.filter((p) => p.status === 'active' && !assignmentByPatientId.has(p.id));
  }, [assignmentByPatientId, editingAssignmentId, patients, selectedPatient]);

  // Thông tin bệnh nhân được chọn
  const selectedPatientInfo = useMemo(() =>
    patients.find((p) => p.id === selectedPatient),
    [patients, selectedPatient]
  );

  useEffect(() => {
    if (selectedPatientInfo) {
      const filters = getSuggestedFilters(selectedPatientInfo.diseaseTypes);
      setSuggestedFilters(filters);
      setDoctorActiveFilterIds(filters.map(f => f.id));
      setNurseActiveFilterIds(filters.map(f => f.id));
    } else {
      setSuggestedFilters([]);
      setDoctorActiveFilterIds([]);
      setNurseActiveFilterIds([]);
    }
  }, [selectedPatientInfo]);

  const doctorActiveKeywords = useMemo(() => 
    suggestedFilters.filter(f => doctorActiveFilterIds.includes(f.id)).flatMap(f => f.keywords), 
    [suggestedFilters, doctorActiveFilterIds]
  );

  const nurseActiveKeywords = useMemo(() => 
    suggestedFilters.filter(f => nurseActiveFilterIds.includes(f.id)).flatMap(f => f.keywords), 
    [suggestedFilters, nurseActiveFilterIds]
  );

  // Filter bác sĩ theo khoa phù hợp: match department name hoặc specialization
  const filteredDoctors = useMemo(() => {
    if (doctorActiveKeywords.length === 0) return doctors;
    return doctors.filter((d) => {
      const deptStr = (d.department || "").toLowerCase();
      const specStr = (d.specialization || "").toLowerCase();
      return doctorActiveKeywords.some((t) => deptStr.includes(t) || specStr.includes(t));
    });
  }, [doctors, doctorActiveKeywords]);

  // Filter y tá theo khoa phù hợp: match department name
  const filteredNurses = useMemo(() => {
    if (nurseActiveKeywords.length === 0) return nurses;
    return nurses.filter((n) => {
      const deptStr = (n.department || "").toLowerCase();
      return nurseActiveKeywords.some((t) => deptStr.includes(t));
    });
  }, [nurses, nurseActiveKeywords]);

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
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    const confirmed = window.confirm(
      t("assignmentManagement.confirmDelete", { name: assignment.patientName || assignment.patientId })
    );
    if (!confirmed) return;
    try {
      setLoadingAssignments(true);
      await api.delete(`/assignments/${assignment.id}`);
      if (editingAssignmentId === assignment.id) resetForm();
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
    const q = searchTerm.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) =>
      [a.patientName, a.patientCode, a.patientPublicId, a.doctorName, a.nurseName]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [assignments, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / itemsPerPage));
  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAssignments.slice(start, start + itemsPerPage);
  }, [filteredAssignments, currentPage]);

  return (
    <div className="p-4 md:p-6">
      <Toast toast={toast} onClose={hideToast} />
      <div className="mb-8">
        <h1 className="flex items-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          <FaExchangeAlt className="mr-3 text-blue-600" />
          {t("assignmentManagement.title")}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
          {t("assignmentManagement.subtitle") || "Quản lý và điều phối luồng công việc giữa Bệnh nhân và Y bác sĩ"}
        </p>
      </div>

      {/* ── Form Panel ── */}
      <div className="rounded-xl bg-white p-6 shadow-md dark:bg-gray-800 md:p-8">
        <form onSubmit={handleAssign} className="space-y-6">

          {/* Patient selector */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-4">
              <label className="block text-lg font-medium text-gray-700 dark:text-gray-300">
                {t("assignmentManagement.selectPatient")}
              </label>
              {editingAssignmentId && (
                <button type="button" onClick={resetForm} className={adminSecondaryButtonClass}>
                  {t("assignmentManagement.cancelEdit")}
                </button>
              )}
            </div>
            <SearchableSelect
              options={patientOptions.map((p) => ({ value: p.id, label: `${p.name} (${p.email})` }))}
              value={selectedPatient}
              onChange={(v) => {
                setSelectedPatient(v);
                setSelectedDoctor("");
                setSelectedNurse("");
                setDoctorSearch("");
                setNurseSearch("");
              }}
              placeholder={t("assignmentManagement.selectPatientPlaceholder")}
              disabled={Boolean(editingAssignmentId)}
              searchPlaceholder={t("common.search")}
              noOptionsText={t("common.noData")}
            />
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              {editingAssignmentId ? t("assignmentManagement.editMode") : t("assignmentManagement.unassignedOnly")}
            </p>
          </div>

          {/* Patient Info Card – hiện khi đã chọn */}
          {selectedPatientInfo && (
            <PatientInfoCard patient={selectedPatientInfo} />
          )}

          {/* ── Doctor & Nurse Picker ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Doctor panel */}
            <div className="flex flex-col h-[400px] sm:h-[480px] rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
              <label className="mb-4 flex items-center text-base font-semibold text-slate-800 dark:text-slate-200">
                <FaUserMd className="mr-2 text-blue-500" />
                {t("assignmentManagement.selectDoctor")}
              </label>
              <div className="flex-1 min-h-0 flex flex-col">
                <DoctorPickerList
                  doctors={doctors}
                  filteredDoctors={filteredDoctors}
                  selectedDoctor={selectedDoctor}
                  onSelect={setSelectedDoctor}
                  doctorPatientCounts={doctorPatientCounts}
                  search={doctorSearch}
                  onSearchChange={setDoctorSearch}
                  suggestedFilters={suggestedFilters}
                  activeFilterIds={doctorActiveFilterIds}
                  onToggleFilter={(id) => setDoctorActiveFilterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  onClearFilters={() => {
                    if (doctorActiveFilterIds.length === 0) {
                      setDoctorActiveFilterIds(suggestedFilters.map(f => f.id)); // Khôi phục
                    } else {
                      setDoctorActiveFilterIds([]); // Bỏ lọc
                    }
                  }}
                />
              </div>
            </div>

            {/* Nurse panel */}
            <div className="flex flex-col h-[400px] sm:h-[480px] rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/60">
              <label className="mb-4 flex items-center text-base font-semibold text-slate-800 dark:text-slate-200">
                <FaUserNurse className="mr-2 text-blue-500" />
                {t("assignmentManagement.selectNurse")}
              </label>
              <div className="flex-1 min-h-0 flex flex-col">
                <NursePickerList
                  nurses={nurses}
                  filteredNurses={filteredNurses}
                  selectedNurse={selectedNurse}
                  onSelect={setSelectedNurse}
                  nursePatientCounts={nursePatientCounts}
                  search={nurseSearch}
                  onSearchChange={setNurseSearch}
                  suggestedFilters={suggestedFilters}
                  activeFilterIds={nurseActiveFilterIds}
                  onToggleFilter={(id) => setNurseActiveFilterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  onClearFilters={() => {
                    if (nurseActiveFilterIds.length === 0) {
                      setNurseActiveFilterIds(suggestedFilters.map(f => f.id)); // Khôi phục
                    } else {
                      setNurseActiveFilterIds([]); // Bỏ lọc
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
            <button
              type="submit"
              disabled={loading}
              className={`${adminPrimaryButtonClass} px-8 py-3 text-lg hover:scale-105 ${loading ? adminPrimaryButtonDisabledClass : ""}`}
            >
              {loading ? t("common.processing") : (
                <>
                  <FaSave className="mr-2" />
                  {editingAssignmentId ? t("assignmentManagement.updateAssignment") : t("assignmentManagement.saveAssignment")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Assignment List ── */}
      <div className="mt-8 rounded-xl bg-white p-6 shadow-md dark:bg-gray-800 md:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t("assignmentManagement.assignmentList")}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("assignmentManagement.assignmentListDesc")}</p>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
              {paginatedAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {assignment.patientName || t("common.noName")}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {assignment.patientPublicId || assignment.patientCode || t("common.noCode")}
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

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => setCurrentPage(page)} />
          </div>
        )}

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

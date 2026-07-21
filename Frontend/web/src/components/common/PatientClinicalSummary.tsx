import { useEffect, useState } from "react";
import { getPatientById, type PatientDetailResponse } from "../../services/patientService";
import { FaHeartbeat, FaNotesMedical, FaExternalLinkAlt, FaSpinner } from "react-icons/fa";
import { GiHeartBeats } from "react-icons/gi";
import { Link } from "react-router-dom";

interface Props {
  patientId: string;
}

export default function PatientClinicalSummary({ patientId }: Props) {
  const [patient, setPatient] = useState<PatientDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setPatient(null);
      return;
    }
    
    let isMounted = true;
    const fetchPatient = async () => {
      setLoading(true);
      try {
        const data = await getPatientById(patientId);
        if (isMounted) setPatient(data);
      } catch (error) {
        console.error("Failed to fetch patient details:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPatient();
    return () => {
      isMounted = false;
    };
  }, [patientId]);

  if (!patientId) return null;

  if (loading) {
    return (
      <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3 text-slate-500">
        <FaSpinner className="animate-spin" /> Đang tải thông tin lâm sàng...
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="mt-3 bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          Tóm tắt lâm sàng
        </h4>
        <Link
          to={`/patient/${patientId}`}
          target="_blank"
          className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-800"
        >
          Hồ sơ chi tiết <FaExternalLinkAlt size={10} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Info */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <p><span className="font-medium text-slate-500 dark:text-slate-400">Tuổi:</span> {patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : "N/A"}</p>
          <p><span className="font-medium text-slate-500 dark:text-slate-400">Giới tính:</span> {patient.gender === "M" ? "Nam" : patient.gender === "F" ? "Nữ" : patient.gender}</p>
        </div>

        {/* Diseases */}
        <div>
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Bệnh lý nền:</span>
          <div className="flex gap-2 flex-wrap">
            {patient.diseaseTypes?.bloodPressure && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 text-[11px] font-semibold rounded border border-rose-100 dark:border-rose-800 flex items-center gap-1"><FaHeartbeat /> Huyết áp</span>}
            {patient.diseaseTypes?.glucose && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 text-[11px] font-semibold rounded border border-amber-100 dark:border-amber-800 flex items-center gap-1"><GiHeartBeats /> Tiểu đường</span>}
            {!patient.diseaseTypes?.bloodPressure && !patient.diseaseTypes?.glucose && <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">Không ghi nhận</span>}
          </div>
        </div>
      </div>

      {/* Medical History with Scroll */}
      <div className="mt-3">
        <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
          <FaNotesMedical className="text-rose-500" /> Tiền sử bệnh án
        </span>
        <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded border border-slate-100 dark:border-slate-700 max-h-[80px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {patient.medicalHistory || "Chưa có thông tin tiền sử bệnh."}
        </div>
      </div>
    </div>
  );
}

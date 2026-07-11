import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaUserInjured,
  FaClock,
  FaCalendarAlt,
  FaCapsules,
  FaEdit,
  FaBan,
  FaCheckCircle,
} from "react-icons/fa";

import Toast from "../components/ui/Toast";
import { useToast } from "../hooks/useToast";
import { getPrescriptions, getMedicationAdherence, updatePrescriptionStatus } from "../services/prescriptionService";
import { getReminders } from "../services/reminderService";
import { getPatientById } from "../services/patientService";
import type { Prescription, MedicationAdherence, PrescriptionStatus } from "../types/index";
import type { ReminderRecord } from "../services/reminderService";
import type { PatientDetailResponse } from "../services/patientService";

const getStatusLabel = (status: PrescriptionStatus) => {
  switch (status) {
    case "active": return "Đang hiệu lực";
    case "completed": return "Đã hoàn thành";
    case "discontinued": return "Đã dừng";
    case "expired": return "Hết hạn";
  }
};

const getStatusClasses = (status: PrescriptionStatus) => {
  switch (status) {
    case "active": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "completed": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    case "discontinued": return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    case "expired": return "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  }
};

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function PrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientDetailResponse | null>(null);
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [adherence, setAdherence] = useState<MedicationAdherence | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // We only have getPrescriptions array fetch, no get by ID currently exposed easily without knowing patientId, wait, getPrescriptions with no patientId returns all.
        const all = await getPrescriptions({});
        const found = all.find(p => p.id === id);
        if (!found) {
          showToast("Không tìm thấy đơn thuốc", "error");
          setLoading(false);
          return;
        }
        setPrescription(found);

        // Fetch patient
        try {
          const pt = await getPatientById(found.patientId);
          setPatientInfo(pt);
        } catch (e) {
          console.error("Patient fetch failed", e);
        }

        // Fetch reminders
        const patientReminders = await getReminders({ patientId: found.patientId, kind: "medication" });
        setReminders(patientReminders.filter(r => r.prescriptionId === found.id));

        // Fetch adherence (last 14 days)
        try {
          const adh = await getMedicationAdherence({ patientId: found.patientId, days: 14 });
          setAdherence(adh);
        } catch (e) {
          console.error("Adherence fetch failed", e);
        }

      } catch (e) {
        showToast("Lỗi tải chi tiết đơn thuốc", "error");
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [id]);

  const handleStop = async () => {
    if (!prescription) return;
    if (!window.confirm("Bạn có chắc chắn muốn dừng đơn thuốc này? Lịch nhắc thuốc cũng sẽ bị dừng.")) return;
    try {
      setStopping(true);
      await updatePrescriptionStatus(prescription.id, "discontinued");
      setPrescription({ ...prescription, status: "discontinued" });
      showToast("Đã dừng đơn thuốc thành công", "success");
    } catch (e) {
      showToast("Lỗi khi dừng đơn thuốc", "error");
    } finally {
      setStopping(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>;
  }

  if (!prescription) {
    return (
      <div className="p-8">
        <button onClick={() => navigate("/prescriptions")} className="flex items-center text-blue-600 hover:underline mb-4">
          <FaArrowLeft className="mr-2"/> Quay lại danh sách
        </button>
        <div className="bg-white p-8 rounded-xl shadow text-center">Không tìm thấy đơn thuốc.</div>
      </div>
    );
  }

  // Aggregate adherence for THIS prescription
  const prescriptionAdherence = { expected: 0, taken: 0, missed: 0 };
  if (adherence) {
    adherence.days.forEach(day => {
      day.medications.forEach(med => {
        if (med.prescriptionId === prescription.id) {
          prescriptionAdherence.expected += med.expected;
          prescriptionAdherence.taken += med.taken;
          prescriptionAdherence.missed += med.missed;
        }
      });
    });
  }
  const adhRate = prescriptionAdherence.expected > 0 ? Math.round((prescriptionAdherence.taken / prescriptionAdherence.expected) * 100) : 0;

  return (
    <div className="w-full px-4 py-8 pb-24 sm:px-6 lg:px-8">
      {toast && <Toast toast={toast} onClose={hideToast} />}
      
      <button onClick={() => navigate("/prescriptions")} className="flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition font-medium">
        <FaArrowLeft className="mr-2"/> Quay lại danh sách
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
        <div className="bg-blue-50 dark:bg-slate-900/50 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${getStatusClasses(prescription.status)}`}>
                {getStatusLabel(prescription.status)}
              </span>
              <span className="text-sm text-slate-500 font-medium font-mono">#{prescription.id.substring(0,8)}</span>
            </div>
            <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <FaUserInjured /> {patientInfo ? patientInfo.name : `Patient ID: ${prescription.patientId}`}
            </h1>
            {patientInfo?.patientCode && (
               <p className="text-slate-500 text-sm mt-1">Mã BN: {patientInfo.patientCode}</p>
            )}
          </div>
          {prescription.status === "active" && (
            <div className="flex gap-3">
              <button 
                onClick={() => navigate(`/prescriptions?patientId=${prescription.patientId}`)} 
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 transition shadow-sm"
              >
                <FaEdit /> Chỉnh sửa
              </button>
              <button 
                onClick={handleStop}
                disabled={stopping}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-60 flex items-center gap-2"
              >
                <FaBan /> Dừng đơn thuốc
              </button>
            </div>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div className="bg-blue-100 text-blue-600 p-2.5 rounded-lg"><FaCalendarAlt size={20}/></div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Thời gian hiệu lực</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date(prescription.startDate).toLocaleDateString("vi-VN")}
                {prescription.endDate ? ` - ${new Date(prescription.endDate).toLocaleDateString("vi-VN")}` : " - Vô thời hạn"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div className="bg-amber-100 text-amber-600 p-2.5 rounded-lg"><FaClock size={20}/></div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Lặp lại</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {prescription.daysOfWeek.length === 7 ? "Mỗi ngày" : prescription.daysOfWeek.map(d => WEEKDAYS[d]).join(", ")}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
            <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg"><FaCheckCircle size={20}/></div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Tuân thủ (14 ngày)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-emerald-600">{adhRate}%</span>
                <span className="text-xs text-slate-500">({prescriptionAdherence.taken}/{prescriptionAdherence.expected} liều)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <FaCapsules className="text-blue-500"/> Chi tiết các loại thuốc ({prescription.medications.length})
          </h2>
          
          {prescription.medications.map((med, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{med.drugName}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-600">
                      Liều: {med.dosage}
                    </span>
                    {med.route && (
                      <span className="px-2.5 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-semibold rounded-md border border-sky-100 dark:border-sky-800">
                        Đường: {med.route}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {med.instructions && (
                <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/50 text-sm text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Hướng dẫn:</span> {med.instructions}
                </div>
              )}
              
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Lịch uống thuốc</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {med.schedule.map((dose, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                        {dose.hour !== undefined ? `${String(dose.hour).padStart(2,'0')}:${String(dose.minute).padStart(2,'0')}` : (dose.timeOfDay === 'morning' ? 'Sáng' : dose.timeOfDay === 'noon' ? 'Trưa' : 'Tối')}
                      </div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">{dose.pillCount} viên</div>
                      {dose.mealTiming && (
                        <div className="text-[10px] text-slate-500 uppercase">{dose.mealTiming === 'pre_meal' ? 'Trước ăn' : 'Sau ăn'}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div>
           <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
             <FaClock className="text-blue-500"/> Lịch nhắc đã tạo
           </h2>
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 sticky top-6">
             {reminders.length === 0 ? (
               <p className="text-sm text-slate-500 text-center py-4">Đơn thuốc chưa sinh nhắc nhở nào.</p>
             ) : (
               <div className="space-y-4">
                 {reminders.map(r => {
                   const times = (r.times && r.times.length > 0) ? r.times : [];
                   const mealTimingLabel = (mt?: string) => {
                     if (mt === 'pre_meal') return 'trước ăn';
                     if (mt === 'post_meal' || mt === 'after meal' || mt === 'post meal') return 'sau ăn';
                     return '';
                   };

                   // Compute drugs for each time slot from prescription.medications
                   const slotDrugs = times.map(t => {
                     const drugs: string[] = [];
                     prescription.medications.forEach(med => {
                       med.schedule.forEach(dose => {
                         const dh = dose.hour ?? (dose.timeOfDay === 'morning' ? 8 : dose.timeOfDay === 'noon' ? 12 : 20);
                         const dm = dose.minute ?? 0;
                         if (dh === t.hour && dm === t.minute) {
                           const meal = mealTimingLabel(dose.mealTiming);
                           drugs.push(`${dose.pillCount} viên ${med.drugName}${meal ? ` (${meal})` : ''}`);
                         }
                       });
                     });
                     return { time: `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`, drugs };
                   });

                   return (
                     <div key={r.id}>
                       <div className="flex items-center justify-between mb-2">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                         }`}>
                           {r.status === 'active' ? 'Đang nhắc' : r.status}
                         </span>
                       </div>
                       <div className="space-y-2">
                         {slotDrugs.map((slot, i) => (
                           <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600">
                             <div className="shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded-md min-w-[52px] text-center">
                               {slot.time}
                             </div>
                             <div className="flex-1 min-w-0">
                               {slot.drugs.length === 0 ? (
                                 <span className="text-xs text-slate-400 italic">Không có thuốc nào trong giờ này</span>
                               ) : (
                                 <ul className="space-y-0.5">
                                   {slot.drugs.map((drug, j) => (
                                     <li key={j} className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                       <span className="text-blue-400 mt-0.5">•</span>
                                       <span>{drug}</span>
                                     </li>
                                   ))}
                                 </ul>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

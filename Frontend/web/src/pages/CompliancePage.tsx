import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  MdOutlineCheckCircle, 
  MdOutlineCancel, 
  MdOutlineHelpOutline,
  MdOutlineCalendarMonth,
  MdExpandMore,
  MdExpandLess,
  MdOutlineMedicalServices,
  MdOutlineDownload,
} from "react-icons/md";
import { FaUserCircle } from "react-icons/fa";
import { getMyPatients, getAdherence, type AdherenceResponse } from "../services/patientService";
import type { AssignmentResponse } from "../types/patient";
import { exportComplianceToExcel } from "../utils/export";

export default function CompliancePage() {
  useTranslation();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patientId");
  
  const [patients, setPatients] = useState<AssignmentResponse[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [daysCount, setDaysCount] = useState<number>(7);
  const [adherence, setAdherence] = useState<AdherenceResponse | null>(null);
  
  const [loadingPatients, setLoadingPatients] = useState<boolean>(true);
  const [loadingAdherence, setLoadingAdherence] = useState<boolean>(false);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState<boolean>(false);

  // 1. Fetch Patients
  useEffect(() => {
    const fetchPatientsList = async () => {
      try {
        setLoadingPatients(true);
        const list = await getMyPatients();
        setPatients(list);
        if (patientIdParam && list.some(p => p.patientId === patientIdParam)) {
          setSelectedPatientId(patientIdParam);
        } else if (list.length > 0) {
          setSelectedPatientId(list[0].patientId);
        }
      } catch (err) {
        console.error("Failed to load patients", err);
      } finally {
        setLoadingPatients(false);
      }
    };
    void fetchPatientsList();
  }, [patientIdParam]);

  // 2. Fetch Adherence data
  const fetchAdherenceData = useCallback(async () => {
    if (!selectedPatientId) return;
    try {
      setLoadingAdherence(true);
      const data = await getAdherence({
        patientId: selectedPatientId,
        days: daysCount
      });
      setAdherence(data);
      // Auto-expand first day
      if (data.days && data.days.length > 0) {
        setExpandedDays({ [data.days[0].date]: true });
      } else {
        setExpandedDays({});
      }
    } catch (err) {
      console.error("Failed to load adherence data", err);
      setAdherence(null);
    } finally {
      setLoadingAdherence(false);
    }
  }, [selectedPatientId, daysCount]);

  useEffect(() => {
    void fetchAdherenceData();
  }, [fetchAdherenceData]);

  const toggleDay = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const handleExport = async () => {
    if (!adherence || !selectedPatientId) return;
    const patient = patients.find(p => p.patientId === selectedPatientId);
    setExporting(true);
    try {
      await exportComplianceToExcel({
        adherence,
        patientName: patient?.patientName || 'Bệnh nhân',
        patientCode: patient?.patientCode || patient?.patientPublicId || '-',
        daysCount,
      });
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const getAdherenceBg = (rate: number) => {
    if (rate >= 80) return "bg-emerald-500";
    if (rate >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getAdherenceText = (rate: number) => {
    if (rate >= 80) return "text-emerald-500 dark:text-emerald-400";
    if (rate >= 50) return "text-amber-500 dark:text-amber-400";
    return "text-rose-500 dark:text-rose-400";
  };

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getMealTimingText = (timing: string) => {
    switch (timing) {
      case "before_meal":
        return "Trước ăn";
      case "after_meal":
        return "Sau ăn";
      case "with_meal":
        return "Trong bữa ăn";
      default:
        return "Không chỉ định";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tuân thủ dùng thuốc (Compliance)
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Theo dõi chi tiết lịch uống thuốc và mức độ tuân thủ của bệnh nhân
          </p>
        </div>

        {/* Time range switch */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setDaysCount(d)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  daysCount === d 
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
                }`}
              >
                {d} ngày
              </button>
            ))}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={!adherence || exporting}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              !adherence || exporting
                ? "bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
            }`}
          >
            {exporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
            ) : (
              <MdOutlineDownload size={18} />
            )}
            {exporting ? "Đang xuất..." : "Xuất xlsx"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Patient selection list */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-4 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider">
            Danh sách bệnh nhân
          </h2>

          {loadingPatients ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-r-transparent" />
            </div>
          ) : patients.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
              Không có bệnh nhân nào được gán.
            </p>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {patients.map(p => {
                const isActive = p.patientId === selectedPatientId;
                return (
                  <button
                    key={p.patientId}
                    onClick={() => setSelectedPatientId(p.patientId)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      isActive 
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40"
                        : "hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.patientName || "")}&background=6366f1&color=fff&size=40`}
                      alt={p.patientName}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{p.patientName}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">Mã HS: {p.patientCode || "—"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Compliance Dashboard */}
        <div className="lg:col-span-3 space-y-6">
          {loadingAdherence ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-500 border-r-transparent" />
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Đang xử lý dữ liệu tuân thủ...
              </p>
            </div>
          ) : adherence ? (
            <>
              {/* Summary Dashboard Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-1 flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700">
                  <span className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-2">
                    Tỷ lệ tuân thủ chung
                  </span>
                  <div className="relative flex items-center justify-center w-28 h-28">
                    {/* Circle Background */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="#F3F4F6"
                        className="dark:stroke-slate-700"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="currentColor"
                        className={`${getAdherenceText(adherence.summary.adherenceRate)}`}
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={301.6}
                        strokeDashoffset={301.6 - (301.6 * adherence.summary.adherenceRate) / 100}
                      />
                    </svg>
                    <span className="absolute text-2xl font-extrabold text-gray-900 dark:text-white">
                      {Math.round(adherence.summary.adherenceRate)}%
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Đã uống
                    </span>
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-2 block">
                      {adherence.summary.taken}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                      liều đúng lịch
                    </span>
                  </div>

                  <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                      Bỏ lỡ
                    </span>
                    <span className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-2 block">
                      {adherence.summary.missed}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                      liều đã quên
                    </span>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider block">
                      Tổng liều
                    </span>
                    <span className="text-2xl font-bold text-gray-700 dark:text-slate-300 mt-2 block">
                      {adherence.summary.expected}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 block">
                      theo đơn chỉ định
                    </span>
                  </div>
                </div>
              </div>

              {/* Day logs list */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MdOutlineCalendarMonth className="text-blue-500" />
                  Nhật ký chi tiết hàng ngày
                </h3>

                {adherence.days.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 text-center text-gray-400">
                    Bệnh nhân này chưa được thiết lập lịch đơn thuốc.
                  </div>
                ) : (
                  adherence.days.map(day => {
                    const isExpanded = expandedDays[day.date];
                    const dayRate = day.expected > 0 ? (day.taken / day.expected) * 100 : 0;

                    return (
                      <div 
                        key={day.date} 
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
                      >
                        {/* Day Header Accordion Trigger */}
                        <button
                          onClick={() => toggleDay(day.date)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30 transition"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {formatDate(day.date)}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-slate-400">
                              Đã uống {day.taken}/{day.expected} liều
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {day.expected > 0 ? (
                              <span className={`text-sm font-extrabold px-2 py-0.5 rounded-full text-white ${getAdherenceBg(dayRate)}`}>
                                {Math.round(dayRate)}%
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Không có lịch</span>
                            )}
                            {isExpanded ? <MdExpandLess size={20} className="text-gray-400" /> : <MdExpandMore size={20} className="text-gray-400" />}
                          </div>
                        </button>

                        {/* Day Body Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30 p-4 space-y-4">
                            {day.medications.length === 0 ? (
                              <p className="text-sm text-gray-400 dark:text-slate-500 italic text-center">
                                Không có lịch dùng thuốc cho ngày này.
                              </p>
                            ) : (
                              day.medications.map((med, idx) => (
                                <div 
                                  key={`${med.prescriptionId}-${idx}`} 
                                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3"
                                >
                                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                                    <MdOutlineMedicalServices className="text-indigo-500" />
                                    <span>{med.drugName}</span>
                                    <span className="text-xs font-normal text-gray-400">({med.dosage})</span>
                                  </div>

                                  <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                    {med.slots.map((slot, sIdx) => (
                                      <div 
                                        key={sIdx} 
                                        className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-2"
                                      >
                                        <div className="flex items-center gap-3">
                                          {slot.status === "taken" ? (
                                            <MdOutlineCheckCircle size={18} className="text-emerald-500 shrink-0" />
                                          ) : slot.status === "missed" ? (
                                            <MdOutlineCancel size={18} className="text-rose-500 shrink-0" />
                                          ) : (
                                            <MdOutlineHelpOutline size={18} className="text-gray-400 shrink-0" />
                                          )}
                                          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                                            {slot.time}
                                          </span>
                                          <span className="text-xs text-gray-400 dark:text-slate-500">
                                            ({getMealTimingText(slot.mealTiming)} · {slot.pillCount} viên)
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-3 self-end sm:self-auto">
                                          {slot.status === "taken" && slot.takenAt && (
                                            <span className="text-[11px] text-gray-400 dark:text-slate-500">
                                              Uống lúc: {new Date(slot.takenAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                          )}
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            slot.status === "taken"
                                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                                              : slot.status === "missed"
                                              ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                                              : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                                          }`}>
                                            {slot.status === "taken" ? "Đã uống" : slot.status === "missed" ? "Bỏ lỡ" : "Chờ uống"}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
              <FaUserCircle size={40} className="text-gray-300" />
              <p>Chưa có dữ liệu tuân thủ của bệnh nhân này.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  MdOutlineKeyboardBackspace, 
  MdCheckCircle, 
  MdCancel, 
  MdExpandMore, 
  MdExpandLess,
  MdPendingActions
} from "react-icons/md";
import { FaHeartbeat, FaUserInjured } from "react-icons/fa";

import { getMedicationAdherence } from "../services/prescriptionService";
import { getPatientById, type PatientDetailResponse } from "../services/patientService";
import type { MedicationAdherence, MedicationAdherenceDay } from "../types";

export default function PatientAdherencePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<PatientDetailResponse | null>(null);
  const [adherence, setAdherence] = useState<MedicationAdherence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [patientData, adherenceData] = await Promise.all([
          getPatientById(id),
          getMedicationAdherence({ patientId: id, days: 7 })
        ]);
        setPatient(patientData);
        setAdherence(adherenceData);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || "Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [id]);

  const groupSlotsByTimeOfDay = (medications: any[]) => {
    const groups: Record<string, any[]> = { morning: [], noon: [], evening: [], night: [], other: [] };
    medications.forEach(med => {
      med.slots.forEach((slot: any) => {
        const t = slot.timeOfDay || "other";
        const key = t === "afternoon" ? "noon" : t;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ drugName: med.drugName, dosage: med.dosage, ...slot });
      });
    });
    return groups;
  };

  const getTimeLabel = (t: string) => {
    switch (t) {
      case "morning": return "Buổi sáng";
      case "noon": return "Buổi trưa";
      case "evening": return "Buổi tối";
      case "night": return "Trước khi ngủ";
      default: return "Khác";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-slate-900">
        <p className="text-red-500 font-medium text-lg">{error ?? "Không tìm thấy bệnh nhân"}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-lg hover:bg-gray-300 transition"
        >
          Quay lại
        </button>
      </div>
    );
  }

  // Hôm nay
  const todayStr = adherence?.to;
  const todayData = adherence?.days?.find(d => d.date === todayStr);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-12">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 space-y-6">
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition"
        >
          <MdOutlineKeyboardBackspace size={20} />
          <span className="font-medium">Quay lại hồ sơ bệnh nhân</span>
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
              <FaUserInjured size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                Theo dõi uống thuốc
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Bệnh nhân: <span className="font-semibold text-gray-700 dark:text-slate-300">{patient.name}</span> {patient.patientCode ? `(${patient.patientCode})` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lịch sử 7 ngày (Left - 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <MdCheckCircle className="text-blue-500" />
              Tổng quan 7 ngày qua
            </h2>

            {/* Summary Cards */}
            {adherence && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Tỷ lệ uống</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {Math.round(adherence.summary.adherenceRate * 100)}%
                  </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Đã uống</div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {adherence.summary.taken}/{adherence.summary.expected}
                  </div>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 rounded-xl p-4 text-center">
                  <div className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1">Bỏ lỡ</div>
                  <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    {adherence.summary.missed}
                  </div>
                </div>
              </div>
            )}

            {/* History List */}
            {adherence && adherence.days && adherence.days.length > 0 ? (
              <div className="space-y-4">
                {[...adherence.days].reverse().map((day: MedicationAdherenceDay) => {
                  const dateObj = new Date(day.date);
                  const dateStr = dateObj.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
                  const dayRate = day.expected > 0 ? Math.round((day.taken / day.expected) * 100) : 0;
                  const isExpanded = expandedDate === day.date;
                  
                  let badgeColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
                  let badgeText = "Tốt";
                  if (dayRate < 50) {
                    badgeColor = "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400";
                    badgeText = "Bỏ lỡ nhiều";
                  } else if (dayRate < 100) {
                    badgeColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
                    badgeText = "Cần chú ý";
                  }

                  return (
                    <div key={day.date} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden transition-all">
                      <div 
                        className="p-4 flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedDate(isExpanded ? null : day.date)}
                      >
                        <div>
                          <div className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">{dateStr}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                            Đã uống {day.taken}/{day.expected} liều • {dayRate}%
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${badgeColor}`}>
                            {badgeText}
                          </span>
                          {isExpanded ? <MdExpandLess size={20} className="text-gray-400" /> : <MdExpandMore size={20} className="text-gray-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-4">
                          {(() => {
                            if (day.medications.length === 0) {
                              return <p className="text-sm text-gray-500 text-center">Không có thuốc cho ngày này.</p>;
                            }
                            const groups = groupSlotsByTimeOfDay(day.medications);
                            const timeKeys = ["morning", "noon", "evening", "night", "other"];
                            let hasMed = false;

                            return timeKeys.map(tk => {
                              if (!groups[tk] || groups[tk].length === 0) return null;
                              hasMed = true;
                              return (
                                <div key={tk} className="mb-4 last:mb-0">
                                  <h4 className="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mb-2 tracking-wider">
                                    {getTimeLabel(tk)}
                                  </h4>
                                  <div className="space-y-2">
                                    {groups[tk].map((slot: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                                        <div>
                                          <div className="text-sm font-semibold text-gray-800 dark:text-slate-200">{slot.drugName}</div>
                                          <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{slot.pillCount} viên • {slot.dosage}</div>
                                        </div>
                                        <div>
                                          {slot.status === "taken" ? (
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded">
                                              <MdCheckCircle size={14} /> Đã uống
                                            </span>
                                          ) : slot.status === "missed" ? (
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-1 rounded">
                                              <MdCancel size={14} /> Bỏ lỡ
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded">
                                              <MdPendingActions size={14} /> Chờ uống
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center text-gray-500">
                Chưa có dữ liệu lịch sử dùng thuốc.
              </div>
            )}
          </div>

          {/* Hôm nay (Right - 1 col) */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <FaHeartbeat className="text-rose-500" />
              Hôm nay
            </h2>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 sticky top-6">
              {!todayData || todayData.medications.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MdCheckCircle size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Bệnh nhân không có thuốc cần uống hôm nay.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-3">
                    <span className="text-sm font-semibold text-gray-600 dark:text-slate-300">Tiến độ hôm nay</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {todayData.taken}/{todayData.expected} liều
                    </span>
                  </div>

                  {(() => {
                    const groups = groupSlotsByTimeOfDay(todayData.medications);
                    const timeKeys = ["morning", "noon", "evening", "night", "other"];

                    return timeKeys.map(tk => {
                      if (!groups[tk] || groups[tk].length === 0) return null;
                      return (
                        <div key={tk}>
                          <h4 className="text-[11px] font-bold uppercase text-gray-400 dark:text-slate-500 mb-2 tracking-wider">
                            {getTimeLabel(tk)}
                          </h4>
                          <div className="space-y-2.5">
                            {groups[tk].map((slot: any, idx: number) => (
                              <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600">
                                <div className="flex items-start justify-between">
                                  <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{slot.drugName}</span>
                                  {slot.status === "taken" ? (
                                    <MdCheckCircle size={18} className="text-emerald-500" />
                                  ) : slot.status === "missed" ? (
                                    <MdCancel size={18} className="text-rose-500" />
                                  ) : (
                                    <MdPendingActions size={18} className="text-amber-500" />
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">
                                  {slot.pillCount} viên • {slot.dosage}
                                </div>
                                {slot.takenAt && (
                                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                    Uống lúc: {new Date(slot.takenAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

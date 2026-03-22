import React, { useState, useEffect } from "react";
import { FaUserMd, FaUserNurse, FaExchangeAlt, FaSave } from "react-icons/fa";
import api from "../services/api";
import type { Patient, doctor, Nurse } from "../types";

interface SelectionOption {
    value: string;
    label: string;
    role: string;
}

const AssignmentManagement: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<doctor[]>([]);
    const [nurses, setNurses] = useState<Nurse[]>([]);

    const [selectedPatient, setSelectedPatient] = useState<string>("");
    const [selectedDoctor, setSelectedDoctor] = useState<string>("");
    const [selectedNurse, setSelectedNurse] = useState<string>("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [resPatients, resDoctors, resNurses] = await Promise.all([
                api.get("/users?role=user.patient&limit=100"),
                api.get("/users?role=user.doctor&limit=100"),
                api.get("/users?role=user.nurse&limit=100")
            ]);

            const extract = (res: any) => {
                const data = res.data?.data;
                if (Array.isArray(data)) return data;
                if (Array.isArray(res.data)) return res.data;
                return [];
            };

            setPatients(extract(resPatients));
            setDoctors(extract(resDoctors));
            setNurses(extract(resNurses));

        } catch (error) {
            console.error("Error fetching data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!selectedPatient) {
            setMessage({ type: 'error', text: "Vui lòng chọn bệnh nhân" });
            return;
        }
        if (!selectedDoctor && !selectedNurse) {
            setMessage({ type: 'error', text: "Vui lòng chọn ít nhất một Bác sĩ hoặc Y tá" });
            return;
        }

        try {
            setLoading(true);
            await api.post("/assignments/assign", {
                patientId: selectedPatient,
                doctorId: selectedDoctor,
                nurseId: selectedNurse
            });
            setMessage({ type: 'success', text: "Phân công thành công!" });
            setSelectedPatient("");
            setSelectedDoctor("");
            setSelectedNurse("");
        } catch (error) {
            console.error("Assign error", error);
            setMessage({ type: 'error', text: "Lỗi khi phân công. Vui lòng thử lại." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 flex items-center">
                <FaExchangeAlt className="mr-3 text-purple-600" />
                Phân công Bệnh nhân
            </h1>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAssign} className="space-y-8">
                    <div>
                        <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                            1. Chọn Bệnh nhân
                        </label>
                        <select
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                            value={selectedPatient}
                            onChange={(e) => setSelectedPatient(e.target.value)}
                            required
                        >
                            <option value="">-- Chọn bệnh nhân --</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
                            <label className="block text-lg font-medium text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                                <FaUserMd className="mr-2" />
                                2. Chọn Bác sĩ phụ trách
                            </label>
                            <select
                                className="w-full p-3 border border-blue-200 dark:border-blue-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={selectedDoctor}
                                onChange={(e) => setSelectedDoctor(e.target.value)}
                            >
                                <option value="">-- Không chỉ định --</option>
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>
                                        BS. {d.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                                * Bác sĩ sẽ chịu trách nhiệm chính về chuyên môn.
                            </p>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800">
                            <label className="block text-lg font-medium text-green-800 dark:text-green-300 mb-3 flex items-center">
                                <FaUserNurse className="mr-2" />
                                3. Chọn Y tá theo dõi
                            </label>
                            <select
                                className="w-full p-3 border border-green-200 dark:border-green-700 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
                                value={selectedNurse}
                                onChange={(e) => setSelectedNurse(e.target.value)}
                            >
                                <option value="">-- Không chỉ định --</option>
                                {nurses.map(n => (
                                    <option key={n.id} value={n.id}>
                                        YT. {n.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                                * Y tá thực hiện theo dõi chỉ số hàng ngày.
                            </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`
                            flex items-center px-8 py-3 rounded-lg text-white font-bold text-lg shadow-lg
                            transition-all duration-200 transform hover:scale-105
                            ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'}
                        `}
                        >
                            {loading ? 'Đang xử lý...' : (
                                <>
                                    <FaSave className="mr-2" />
                                    Lưu Phân Công
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignmentManagement;

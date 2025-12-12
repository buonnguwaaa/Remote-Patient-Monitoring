import { useState } from "react";
import { mockPatientList } from "../data/mockData";
import { FaSave, FaUndo } from "react-icons/fa";

interface ThresholdFormData {
  patientId: string;
  temperatureMin: string;
  temperatureMax: string;
  systolicMin: string;
  systolicMax: string;
  diastolicMin: string;
  diastolicMax: string;
  pulseMin: string;
  pulseMax: string;
  glucoseMin: string;
  glucoseMax: string;
  spo2Min: string;
  effectiveFrom: string;
  effectiveTo: string;
}

const ThresholdSettingsPage = () => {
  const [formData, setFormData] = useState<ThresholdFormData>({
    patientId: "",
    temperatureMin: "36.0",
    temperatureMax: "37.5",
    systolicMin: "90",
    systolicMax: "140",
    diastolicMin: "60",
    diastolicMax: "90",
    pulseMin: "60",
    pulseMax: "100",
    glucoseMin: "70",
    glucoseMax: "180",
    spo2Min: "90",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate saving
    console.log("Saving threshold settings:", formData);
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleReset = () => {
    setFormData({
      patientId: "",
      temperatureMin: "36.0",
      temperatureMax: "37.5",
      systolicMin: "90",
      systolicMax: "140",
      diastolicMin: "60",
      diastolicMax: "90",
      pulseMin: "60",
      pulseMax: "100",
      glucoseMin: "70",
      glucoseMax: "180",
      spo2Min: "90",
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Cấu Hình Ngưỡng Cảnh Báo</h1>
        <p className="text-gray-600 mt-2">
          Thiết lập ngưỡng an toàn cho từng bệnh nhân
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
          <FaSave />
          <span>Cài đặt ngưỡng đã được lưu thành công!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
        {/* Patient Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chọn Bệnh Nhân <span className="text-red-500">*</span>
          </label>
          <select
            name="patientId"
            value={formData.patientId}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Chọn bệnh nhân --</option>
            {mockPatientList.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} (ID: {patient.id})
              </option>
            ))}
          </select>
        </div>

        {/* Threshold Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Temperature */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              🌡️ Nhiệt độ (°C)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối thiểu</label>
                <input
                  type="number"
                  step="0.1"
                  name="temperatureMin"
                  value={formData.temperatureMin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="36.0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối đa</label>
                <input
                  type="number"
                  step="0.1"
                  name="temperatureMax"
                  value={formData.temperatureMax}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="37.5"
                />
              </div>
            </div>
          </div>

          {/* Blood Pressure - Systolic */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              💓 Huyết áp tâm thu (mmHg)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối thiểu</label>
                <input
                  type="number"
                  name="systolicMin"
                  value={formData.systolicMin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="90"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối đa</label>
                <input
                  type="number"
                  name="systolicMax"
                  value={formData.systolicMax}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="140"
                />
              </div>
            </div>
          </div>

          {/* Blood Pressure - Diastolic */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              💗 Huyết áp tâm trương (mmHg)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối thiểu</label>
                <input
                  type="number"
                  name="diastolicMin"
                  value={formData.diastolicMin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="60"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối đa</label>
                <input
                  type="number"
                  name="diastolicMax"
                  value={formData.diastolicMax}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="90"
                />
              </div>
            </div>
          </div>

          {/* Heart Rate */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              ❤️ Nhịp tim (bpm)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối thiểu</label>
                <input
                  type="number"
                  name="pulseMin"
                  value={formData.pulseMin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="60"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối đa</label>
                <input
                  type="number"
                  name="pulseMax"
                  value={formData.pulseMax}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          {/* Blood Glucose */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              🩸 Đường huyết (mg/dL)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối thiểu</label>
                <input
                  type="number"
                  name="glucoseMin"
                  value={formData.glucoseMin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="70"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối đa</label>
                <input
                  type="number"
                  name="glucoseMax"
                  value={formData.glucoseMax}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="180"
                />
              </div>
            </div>
          </div>

          {/* SpO2 */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              🫁 Nồng độ oxy máu SpO2 (%)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tối thiểu</label>
                <input
                  type="number"
                  name="spo2Min"
                  value={formData.spo2Min}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="90"
                />
              </div>
            </div>
          </div>

          {/* Effective Dates */}
          <div className="col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              📅 Thời gian hiệu lực
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Từ ngày <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="effectiveFrom"
                  value={formData.effectiveFrom}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Đến ngày (Tùy chọn)</label>
                <input
                  type="date"
                  name="effectiveTo"
                  value={formData.effectiveTo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <FaUndo />
            Đặt lại
          </button>
          <button
            type="submit"
            disabled={!formData.patientId}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FaSave />
            Lưu cài đặt
          </button>
        </div>
      </form>
    </div>
  );
};

export default ThresholdSettingsPage;

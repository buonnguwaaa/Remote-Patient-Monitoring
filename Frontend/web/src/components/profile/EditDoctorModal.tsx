import React, { useState } from "react";
import type { Doctor } from "../../types";
import api from "../../services/api";
import { useTranslation } from "react-i18next";
import { X, Upload, Loader2 } from "lucide-react";

interface EditDoctorModalProps {
  doctor: Doctor;
  onClose: () => void;
  onSuccess: () => void;
}

const EditDoctorModal: React.FC<EditDoctorModalProps> = ({ doctor, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(doctor.avatarUrl || "/avartar.jpg");
  const [selectedAcademicDegree, setSelectedAcademicDegree] = useState(doctor.academicDegree || "");

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const payload: any = Object.fromEntries(formData.entries());
      
      if (payload.yearsOfExperience) {
        payload.yearsOfExperience = parseInt(payload.yearsOfExperience as string, 10);
      }
      
      // Update textual data
      await api.patch("/users/doctors/me", payload);

      // Upload avatar if selected
      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.append("file", avatarFile);
        await api.post("/users/doctors/me/avatar", avatarData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Cập nhật hồ sơ thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-xl mt-10 md:mt-0 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Chỉnh sửa hồ sơ cá nhân
        </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <img
                src={preview}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                onError={(e) => { e.currentTarget.src = "/avartar.jpg"; }}
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Upload size={20} />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarSelect} />
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-2">Nhấn vào ảnh để thay đổi</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("doctorManagement.fields.name")}
              </label>
              <input
                name="name"
                type="text"
                required
                defaultValue={doctor.name}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("doctorManagement.fields.gender")}
              </label>
              <select
                name="gender"
                required
                defaultValue={doctor.gender}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="M">{t("common.male")}</option>
                <option value="F">{t("common.female")}</option>
                <option value="O">{t("common.other")}</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("doctorManagement.fields.phone")}
              </label>
              <input
                name="phone"
                type="tel"
                required
                defaultValue={doctor.phone}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Academic Degree */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Học vị
              </label>
              <select
                name="academicDegree"
                value={selectedAcademicDegree}
                onChange={(e) => {
                  setSelectedAcademicDegree(e.target.value);
                  if (e.target.value !== "phd") {
                    const titleSelect = document.querySelector('select[name="academicTitle"]') as HTMLSelectElement;
                    if (titleSelect) titleSelect.value = "";
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Không có --</option>
                <option value="bachelor">Cử nhân (BS)</option>
                <option value="master">Thạc sĩ (ThS)</option>
                <option value="phd">Tiến sĩ (TS)</option>
              </select>
            </div>

            {/* Academic Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chức danh
              </label>
              <select
                name="academicTitle"
                disabled={selectedAcademicDegree !== "phd"}
                defaultValue={doctor.academicTitle || ""}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">-- Không có --</option>
                <option value="associate_professor">Phó Giáo sư (PGS)</option>
                <option value="professor">Giáo sư (GS)</option>
              </select>
            </div>

            {/* Professional Qualification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trình độ chuyên môn
              </label>
              <select
                name="professionalQualification"
                defaultValue={doctor.professionalQualification || ""}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Không có --</option>
                <option value="resident">Nội trú</option>
                <option value="cki">Chuyên khoa I (CKI)</option>
                <option value="ckii">Chuyên khoa II (CKII)</option>
              </select>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chuyên khoa
              </label>
              <input
                name="specialization"
                type="text"
                required
                defaultValue={doctor.specialization}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Years of Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kinh nghiệm (Năm)
              </label>
              <input
                name="yearsOfExperience"
                type="number"
                min="0"
                required
                defaultValue={doctor.yearsOfExperience}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* License Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Số chứng chỉ hành nghề
              </label>
              <input
                name="licenseNumber"
                type="text"
                required
                defaultValue={doctor.licenseNumber}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Workplace */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nơi công tác
              </label>
              <input
                name="workplace"
                type="text"
                required
                defaultValue={doctor.workplace}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 min-w-[120px]"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDoctorModal;

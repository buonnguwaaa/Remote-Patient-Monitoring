import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { uploadAvatar } from "../../services/uploadService";
import FormWizardModal from "../ui/FormWizardModal";
import AvatarUploader from "../ui/AvatarUploader";
import { mapGenderToApi } from "../../utils/genderConverter";
import type { Patient } from "../../types";

interface PatientFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  editingPatient: Patient | null;
  modalMode: "add" | "edit" | "view" | "verify";
  onSuccess: (createdPatientId?: string, isVerify?: boolean, patientName?: string) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const PatientFormWizard: React.FC<PatientFormWizardProps> = ({
  isOpen,
  onClose,
  editingPatient,
  modalMode,
  onSuccess,
  showToast,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>("");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Nam");
  const [dateOfBirth, setDateOfBirth] = useState("1990-01-01");
  const [cccd, setCccd] = useState("");
  const [status, setStatus] = useState("active");

  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [diseaseTypes, setDiseaseTypes] = useState({
    bloodPressure: false,
    glucose: false,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingPatient) {
      setName(editingPatient.name || "");
      setEmail(editingPatient.email || "");
      setPhone(editingPatient.phone || "");
      setGender(editingPatient.gender || "Nam");
      setDateOfBirth(editingPatient.dateOfBirth || "1990-01-01");
      setCccd(editingPatient.cccd || "");
      setStatus(editingPatient.status || "active");

      setInsuranceNumber(editingPatient.insuranceNumber || "");
      setEmergencyContactName(editingPatient.emergencyContactName || "");
      setEmergencyContactPhone(editingPatient.emergencyContactPhone || "");
      setMedicalHistory(editingPatient.medicalHistory || "");
      setDiseaseTypes((editingPatient as any).diseaseTypes || { bloodPressure: false, glucose: false });
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setGender("Nam");
      setDateOfBirth("1990-01-01");
      setCccd("");
      setStatus("active");

      setInsuranceNumber("");
      setEmergencyContactName("");
      setEmergencyContactPhone("");
      setMedicalHistory("");
      setDiseaseTypes({ bloodPressure: false, glucose: false });
    }
    setCurrentStep(1);
    setErrors({});
    setAvatarFile(null);
    setAvatarPreviewUrl("");
  }, [editingPatient, isOpen]);

  const validateStep1 = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = "Họ tên là bắt buộc";
    if (!email.trim() || !email.includes("@")) errs.email = "Email hợp lệ là bắt buộc";
    if (!dateOfBirth) errs.dateOfBirth = "Ngày sinh là bắt buộc";

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast("Vui lòng điền đầy đủ thông tin bắt buộc ở Bước 1", "error");
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      return validateStep1();
    }
    return true;
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    if (currentStep < 2 && modalMode !== "view") {
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    const apiGender = mapGenderToApi(gender);

    try {
      if (editingPatient?.id) {
        // Edit or Verify Flow
        if (modalMode === "verify") {
          // Admin Verify Patient
          await api.patch(`/users/${editingPatient.id}/status`, { status: "active" });
          if (avatarFile) {
            await uploadAvatar(editingPatient.id, avatarFile);
          }
          showToast("Đã duyệt & kích hoạt tài khoản bệnh nhân thành công!");
          onClose();
          onSuccess(editingPatient.id, true, editingPatient.name);
          return;
        }

        // Edit Patient Profile
        await api.patch(`/users/patients/${editingPatient.id}`, {
          name,
          email,
          phone,
          gender: apiGender,
          insuranceNumber,
          cccd,
          emergencyContactName,
          emergencyContactPhone,
          medicalHistory,
          diseaseTypes,
        });
        await api.patch(`/users/${editingPatient.id}/status`, { status });
        if (avatarFile) {
          await uploadAvatar(editingPatient.id, avatarFile);
        }
        showToast("Cập nhật thông tin bệnh nhân thành công!");
        onClose();
        onSuccess();
      } else {
        // Admin Create Patient Flow -> POST /users/patients
        const res = await api.post("/users/patients", {
          name,
          email,
          phone,
          gender: apiGender,
          dob: dateOfBirth,
          insuranceNumber,
          cccd,
          emergencyContactName,
          emergencyContactPhone,
          medicalHistory,
          diseaseTypes,
        });

        const createdPatient = res.data?.data;
        const createdId = createdPatient?.id;

        if (avatarFile && createdId) {
          await uploadAvatar(createdId, avatarFile);
        }

        showToast("Đã tạo tài khoản bệnh nhân thành công!");
        onClose();
        onSuccess(createdId, false, name);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || "Lỗi khi lưu thông tin bệnh nhân";
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    if (modalMode === "view") return "Chi tiết hồ sơ bệnh nhân";
    if (modalMode === "verify") return "Duyệt & Kích hoạt tài khoản bệnh nhân";
    if (modalMode === "edit") return "Chỉnh sửa hồ sơ bệnh nhân";
    return "Tạo mới bệnh nhân";
  };

  return (
    <FormWizardModal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      subtitle="Quản lý hồ sơ bệnh nhân và theo dõi sức khỏe"
      currentStep={currentStep}
      totalSteps={2}
      stepTitles={["Thông tin cá nhân", "Thông tin y tế & Tiền sử"]}
      onNext={async () => {
        const ok = await handleNext();
        if (ok) setCurrentStep(2);
        return ok;
      }}
      onBack={handleBack}
      onSubmit={handleSubmit}
      onStepClick={(step) => setCurrentStep(step)}
      isSubmitting={isSubmitting}
      submitText={modalMode === "verify" ? "Duyệt & Kích hoạt" : editingPatient ? "Lưu thay đổi" : "Tạo bệnh nhân"}
      isViewOnly={modalMode === "view"}
    >
      {currentStep === 1 && (
        <div className="space-y-4">
          <AvatarUploader
            currentUrl={editingPatient?.profileImageUrl}
            previewUrl={avatarPreviewUrl}
            initialFileName={avatarFile?.name}
            onFileSelect={(file, previewUrl) => {
              setAvatarFile(file);
              setAvatarPreviewUrl(previewUrl);
            }}
            disabled={modalMode === "view"}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={modalMode === "view"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 disabled:opacity-70 ${
                  errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
                placeholder="Nguyễn Văn A"
              />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                disabled={modalMode === "view"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 disabled:opacity-70 ${
                  errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
                placeholder="patient@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số điện thoại</label>
              <input
                type="tel"
                disabled={modalMode === "view"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                placeholder="0912345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Giới tính</label>
              <select
                disabled={modalMode === "view"}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ngày sinh <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                disabled={modalMode === "view"}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số CCCD / CMND</label>
              <input
                type="text"
                disabled={modalMode === "view"}
                value={cccd}
                onChange={(e) => setCccd(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                placeholder="001090123456"
              />
            </div>

            {editingPatient && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trạng thái tài khoản</label>
                <select
                  disabled={modalMode === "view" || modalMode === "verify"}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Chưa kích hoạt / Khóa</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số BHYT</label>
              <input
                type="text"
                disabled={modalMode === "view"}
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                placeholder="DN4010123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Họ tên người liên hệ khẩn cấp</label>
              <input
                type="text"
                disabled={modalMode === "view"}
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                placeholder="Nguyễn Văn B (Thân nhân)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SĐT người liên hệ khẩn cấp</label>
              <input
                type="tel"
                disabled={modalMode === "view"}
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                placeholder="0987654321"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Chỉ số & Loại bệnh lý theo dõi:
              </label>
              <div className="flex flex-wrap gap-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={modalMode === "view"}
                    checked={diseaseTypes.bloodPressure}
                    onChange={(e) => setDiseaseTypes({ ...diseaseTypes, bloodPressure: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Huyết áp</span>
                </label>
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={modalMode === "view"}
                    checked={diseaseTypes.glucose}
                    onChange={(e) => setDiseaseTypes({ ...diseaseTypes, glucose: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Đái tháo đường</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tiền sử bệnh lý & Ghi chú y tế
              </label>
              <textarea
                rows={4}
                disabled={modalMode === "view"}
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                placeholder="Ghi chú tiền sử bệnh lý nền, phẫu thuật, dị ứng thuốc..."
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 text-sm leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
    </FormWizardModal>
  );
};

export default PatientFormWizard;

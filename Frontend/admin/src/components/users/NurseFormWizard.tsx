import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { uploadAvatar } from "../../services/uploadService";
import FormWizardModal from "../ui/FormWizardModal";
import AvatarUploader from "../ui/AvatarUploader";
import SearchableSelect from "../ui/SearchableSelect";
import { mapGenderToApi } from "../../utils/genderConverter";
import type { Nurse, Department } from "../../types";

interface NurseFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  editingNurse: Nurse | null;
  modalMode: "add" | "edit" | "view";
  departments: Department[];
  onSuccess: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const NurseFormWizard: React.FC<NurseFormWizardProps> = ({
  isOpen,
  onClose,
  editingNurse,
  modalMode,
  departments,
  onSuccess,
  showToast,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Form State - Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Nữ");
  const [dateOfBirth, setDateOfBirth] = useState("1990-01-01");
  const [status, setStatus] = useState("active");

  // Form State - Step 2
  const [departmentId, setDepartmentId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(3);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingNurse) {
      setName(editingNurse.name || "");
      setEmail(editingNurse.email || "");
      setPhone(editingNurse.phone || "");
      setGender(editingNurse.gender || "Nữ");
      setDateOfBirth(editingNurse.dateOfBirth || "1990-01-01");
      setStatus(editingNurse.status || "active");

      setDepartmentId((editingNurse as any).departmentId || "");
      setLicenseNumber(editingNurse.licenseNumber || "");
      setWorkplace(editingNurse.workplace || "");
      setYearsOfExperience(editingNurse.yearsOfExperience || 3);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setGender("Nữ");
      setDateOfBirth("1990-01-01");
      setStatus("active");

      setDepartmentId("");
      setLicenseNumber("");
      setWorkplace("");
      setYearsOfExperience(0);
    }
    setCurrentStep(1);
    setErrors({});
    setAvatarFile(null);
  }, [editingNurse, isOpen, departments]);

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
    console.log("[NurseFormWizard] handleNext called, currentStep:", currentStep);
    if (currentStep === 1) {
      const isValid = validateStep1();
      console.log("[NurseFormWizard] validateStep1 result:", isValid);
      return isValid;
    }
    return true;
  };

  const handleBack = () => {
    console.log("[NurseFormWizard] handleBack called, currentStep:", currentStep);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[NurseFormWizard] handleSubmit called! currentStep:", currentStep, "modalMode:", modalMode);
    if (!validateStep1()) {
      console.log("[NurseFormWizard] handleSubmit -> validateStep1 failed, staying on step 1");
      setCurrentStep(1);
      return;
    }

    if (currentStep < 2 && modalMode !== "view") {
      console.log("[NurseFormWizard] handleSubmit -> currentStep < 2, setting step 2 and returning WITHOUT API call");
      setCurrentStep(2);
      return;
    }

    console.log("[NurseFormWizard] handleSubmit -> PROCEEDING TO API CALL!", {
      name,
      email,
      phone,
      gender,
      dateOfBirth,
      status,
      departmentId,
      licenseNumber,
      workplace,
      yearsOfExperience,
    });

    setIsSubmitting(true);
    const apiGender = mapGenderToApi(gender);

    try {
      if (editingNurse?.id) {
        // Edit Nurse -> PATCH /users/nurses/{id}
        await api.patch(`/users/nurses/${editingNurse.id}`, {
          name,
          email,
          phone,
          gender: apiGender,
          departmentId,
          licenseNumber,
          workplace,
          yearsOfExperience: Number(yearsOfExperience),
        });
        await api.patch(`/users/${editingNurse.id}/status`, { status });
        if (avatarFile) {
          await uploadAvatar(editingNurse.id, avatarFile);
        }
        showToast("Cập nhật thông tin điều dưỡng thành công!");
      } else {
        // Admin Create Nurse -> Single POST /users/nurses request
        console.log("[NurseFormWizard] CALLING POST /users/nurses API NOW...");
        const res = await api.post("/users/nurses", {
          name,
          email,
          phone,
          gender: apiGender,
          dob: dateOfBirth,
          status,
          departmentId,
          licenseNumber,
          workplace,
          yearsOfExperience: Number(yearsOfExperience),
        });

        const createdNurse = res.data?.data;
        if (avatarFile && createdNurse?.id) {
          await uploadAvatar(createdNurse.id, avatarFile);
        }

        showToast("Đã tạo tài khoản điều dưỡng thành công!");
      }

      onClose();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || "Lỗi khi lưu thông tin điều dưỡng";
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    if (modalMode === "view") return "Chi tiết hồ sơ điều dưỡng";
    if (modalMode === "edit") return "Chỉnh sửa hồ sơ điều dưỡng";
    return "Tạo mới điều dưỡng";
  };

  return (
    <FormWizardModal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      subtitle="Quản lý thông tin tài khoản và phân công công tác điều dưỡng"
      currentStep={currentStep}
      totalSteps={2}
      stepTitles={["Thông tin cá nhân", "Thông tin công tác"]}
      onNext={async () => {
        const ok = await handleNext();
        if (ok) setCurrentStep(2);
        return ok;
      }}
      onBack={handleBack}
      onSubmit={handleSubmit}
      onStepClick={(step) => setCurrentStep(step)}
      isSubmitting={isSubmitting}
      submitText={editingNurse ? "Lưu thay đổi" : "Tạo điều dưỡng"}
      isViewOnly={modalMode === "view"}
    >
      {currentStep === 1 && (
        <div className="space-y-4">
          <AvatarUploader
            currentUrl={editingNurse?.profileImageUrl}
            onFileSelect={(file) => setAvatarFile(file)}
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
                placeholder="ĐĐ. Trần Thị B"
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
                placeholder="nurse@hospital.vn"
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
                <option value="Nữ">Nữ</option>
                <option value="Nam">Nam</option>
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

            {modalMode !== "add" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trạng thái tài khoản</label>
                <select
                  disabled={modalMode === "view"}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                >
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tạm khóa</option>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Khoa / Phòng ban</label>
              <SearchableSelect
                options={departments.map((dept) => ({ value: dept.id, label: dept.name }))}
                value={departmentId}
                onChange={(val) => setDepartmentId(val)}
                placeholder="-- Chọn Khoa / Phòng --"
                searchPlaceholder="Tìm kiếm khoa / phòng ban..."
                disabled={modalMode === "view"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số giấy phép hành nghề</label>
              <input
                type="text"
                disabled={modalMode === "view"}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                placeholder="CCHN-56789/BYT"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nơi công tác</label>
              <input
                type="text"
                disabled={modalMode === "view"}
                value={workplace}
                onChange={(e) => setWorkplace(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                placeholder="Bệnh viện Chợ Rẫy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số năm kinh nghiệm</label>
              <input
                type="number"
                min={0}
                disabled={modalMode === "view"}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
              />
            </div>
          </div>
        </div>
      )}
    </FormWizardModal>
  );
};

export default NurseFormWizard;

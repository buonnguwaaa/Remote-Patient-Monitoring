import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { uploadAvatar } from "../../services/uploadService";
import FormWizardModal from "../ui/FormWizardModal";
import AvatarUploader from "../ui/AvatarUploader";
import SearchableSelect from "../ui/SearchableSelect";
import { mapGenderToApi } from "../../utils/genderConverter";
import type { doctor, Department } from "../../types";

interface DoctorFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  editingDoctor: doctor | null;
  modalMode: "add" | "edit" | "view";
  departments: Department[];
  onSuccess: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export const DoctorFormWizard: React.FC<DoctorFormWizardProps> = ({
  isOpen,
  onClose,
  editingDoctor,
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
  const [gender, setGender] = useState("Nam");
  const [dateOfBirth, setDateOfBirth] = useState("1980-01-01");
  const [status, setStatus] = useState("active");

  // Form State - Step 2
  const [specialization, setSpecialization] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(5);
  const [academicDegree, setAcademicDegree] = useState("bachelor");
  const [professionalQualification, setProfessionalQualification] = useState("cki");
  const [academicTitle, setAcademicTitle] = useState("");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (editingDoctor) {
      setName(editingDoctor.name || "");
      setEmail(editingDoctor.email || "");
      setPhone(editingDoctor.phone || "");
      setGender(editingDoctor.gender || "Nam");
      setDateOfBirth(editingDoctor.dateOfBirth || "1980-01-01");
      setStatus(editingDoctor.status || "active");

      setSpecialization(editingDoctor.specialization || "");
      setDepartmentId((editingDoctor as any).departmentId || "");
      setLicenseNumber(editingDoctor.licenseNumber || "");
      setWorkplace(editingDoctor.workplace || "");
      setYearsOfExperience(editingDoctor.yearsOfExperience || 5);
      setAcademicDegree(editingDoctor.academicDegree || "bachelor");
      setProfessionalQualification(editingDoctor.professionalQualification || "cki");
      setAcademicTitle(editingDoctor.academicTitle || "");
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setGender("Nam");
      setDateOfBirth("1980-01-01");
      setStatus("active");

      setSpecialization("");
      setDepartmentId("");
      setLicenseNumber("");
      setWorkplace("");
      setYearsOfExperience(0);
      setAcademicDegree("bachelor");
      setProfessionalQualification("cki");
      setAcademicTitle("");
    }
    setCurrentStep(1);
    setErrors({});
    setAvatarFile(null);
  }, [editingDoctor, isOpen, departments]);

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

    // Backend rule: GS/PGS requires PhD degree
    if ((academicTitle === "professor" || academicTitle === "associate_professor") && academicDegree !== "phd") {
      showToast("Chức danh Giáo sư / Phó Giáo sư yêu cầu bằng cấp Tiến sĩ (PhD).", "error");
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    const apiGender = mapGenderToApi(gender);

    try {
      if (editingDoctor?.id) {
        // Edit Doctor -> PATCH /users/doctors/{id}
        await api.patch(`/users/doctors/${editingDoctor.id}`, {
          name,
          email,
          phone,
          gender: apiGender,
          specialization,
          departmentId,
          licenseNumber,
          workplace,
          yearsOfExperience: Number(yearsOfExperience),
          academicDegree,
          professionalQualification,
          academicTitle,
        });
        await api.patch(`/users/${editingDoctor.id}/status`, { status });
        if (avatarFile) {
          await uploadAvatar(editingDoctor.id, avatarFile);
        }
        showToast("Cập nhật thông tin bác sĩ thành công!");
      } else {
        // Admin Create Doctor -> Single POST /users/doctors request
        const res = await api.post("/users/doctors", {
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
          specialization,
          academicDegree,
          professionalQualification,
          academicTitle,
        });

        const createdDoctor = res.data?.data;
        if (avatarFile && createdDoctor?.id) {
          await uploadAvatar(createdDoctor.id, avatarFile);
        }

        showToast("Đã tạo tài khoản bác sĩ thành công!");
      }

      onClose();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || "Lỗi khi lưu thông tin bác sĩ";
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    if (modalMode === "view") return "Chi tiết hồ sơ bác sĩ";
    if (modalMode === "edit") return "Chỉnh sửa hồ sơ bác sĩ";
    return "Tạo mới bác sĩ";
  };

  return (
    <FormWizardModal
      isOpen={isOpen}
      onClose={onClose}
      title={getTitle()}
      subtitle="Quản lý thông tin tài khoản và trình độ chuyên môn của bác sĩ"
      currentStep={currentStep}
      totalSteps={2}
      stepTitles={["Thông tin cá nhân", "Thông tin công tác & Chuyên môn"]}
      onNext={async () => {
        const ok = await handleNext();
        if (ok) setCurrentStep(2);
        return ok;
      }}
      onBack={handleBack}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitText={editingDoctor ? "Lưu thay đổi" : "Tạo bác sĩ"}
    >
      {currentStep === 1 && (
        <div className="space-y-4">
          <AvatarUploader
            currentUrl={editingDoctor?.profileImageUrl}
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
                placeholder="BS. Nguyễn Văn A"
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
                placeholder="doctor@hospital.vn"
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

            {modalMode !== "add" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trạng thái tài khoản</label>
                <select
                  disabled={modalMode === "view"}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                >
                  <option value="active">Hoạt động (Active)</option>
                  <option value="inactive">Tạm khóa (Inactive)</option>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chuyên khoa</label>
              <input
                type="text"
                disabled={modalMode === "view"}
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                placeholder="Tim mạch, Nội khoa..."
              />
            </div>

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
                placeholder="CCHN-12345/BYT"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Học vị (Academic Degree)</label>
              <select
                disabled={modalMode === "view"}
                value={academicDegree}
                onChange={(e) => setAcademicDegree(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
              >
                <option value="bachelor">Cử nhân (BS)</option>
                <option value="master">Thạc sĩ (ThS)</option>
                <option value="phd">Tiến sĩ (TS)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trình độ chuyên môn (Qualification)</label>
              <select
                disabled={modalMode === "view"}
                value={professionalQualification}
                onChange={(e) => setProfessionalQualification(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
              >
                <option value="resident">Bác sĩ Nội trú</option>
                <option value="cki">Chuyên khoa I (CKI)</option>
                <option value="ckii">Chuyên khoa II (CKII)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chức danh Giáo sư (Academic Title)
              </label>
              <select
                disabled={modalMode === "view"}
                value={academicTitle}
                onChange={(e) => setAcademicTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
              >
                <option value="">Không có</option>
                <option value="associate_professor">Phó Giáo sư (PGS)</option>
                <option value="professor">Giáo sư (GS)</option>
              </select>
              {(academicTitle === "professor" || academicTitle === "associate_professor") && academicDegree !== "phd" && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Lưu ý: Chức danh GS/PGS yêu cầu bằng cấp Tiến sĩ (phd).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </FormWizardModal>
  );
};

export default DoctorFormWizard;

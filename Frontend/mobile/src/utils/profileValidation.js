const PHONE_PATTERN = /^\+?\d{9,15}$/;
const CCCD_PATTERN = /^\d{12}$/;
const INSURANCE_PATTERN = /^[A-Z0-9]{10,15}$/;

function normalizePhone(value = "") {
  return value.trim().replace(/[\s().-]/g, "");
}

function normalizeInsuranceNumber(value = "") {
  return value.trim().toUpperCase();
}

export function validatePatientProfileForm({ userForm, patientForm }) {
  const payload = {
    name: userForm.name.trim(),
    phone: normalizePhone(userForm.phone),
    insuranceNumber: normalizeInsuranceNumber(patientForm.insuranceNumber),
    cccd: patientForm.cccd.trim(),
    emergencyContactName: patientForm.emergencyContactName.trim(),
    emergencyContactPhone: normalizePhone(patientForm.emergencyContactPhone),
    medicalHistory: patientForm.medicalHistory.trim(),
  };

  const errors = {};

  if (!payload.name) {
    errors.name = "Vui lòng nhập họ tên bệnh nhân.";
  } else if (payload.name.length < 2 || payload.name.length > 120) {
    errors.name = "Họ tên phải từ 2 đến 120 ký tự.";
  }

  if (payload.phone && !PHONE_PATTERN.test(payload.phone)) {
    errors.phone = "Số điện thoại phải gồm 9 đến 15 chữ số.";
  }

  if (payload.insuranceNumber && !INSURANCE_PATTERN.test(payload.insuranceNumber)) {
    errors.insuranceNumber =
      "Số BHYT chỉ gồm chữ in hoa và số, dài 10 đến 15 ký tự.";
  }

  if (payload.cccd && !CCCD_PATTERN.test(payload.cccd)) {
    errors.cccd = "CCCD phải gồm đúng 12 chữ số.";
  }

  const hasEmergencyName = Boolean(payload.emergencyContactName);
  const hasEmergencyPhone = Boolean(payload.emergencyContactPhone);

  if (hasEmergencyName !== hasEmergencyPhone) {
    if (!hasEmergencyName) {
      errors.emergencyContactName = "Vui lòng nhập tên người liên hệ khẩn cấp.";
    }
    if (!hasEmergencyPhone) {
      errors.emergencyContactPhone =
        "Vui lòng nhập số điện thoại người liên hệ khẩn cấp.";
    }
  }

  if (payload.emergencyContactName) {
    if (
      payload.emergencyContactName.length < 2 ||
      payload.emergencyContactName.length > 120
    ) {
      errors.emergencyContactName =
        "Tên người liên hệ khẩn cấp phải từ 2 đến 120 ký tự.";
    }
  }

  if (payload.emergencyContactPhone && !PHONE_PATTERN.test(payload.emergencyContactPhone)) {
    errors.emergencyContactPhone =
      "Số điện thoại khẩn cấp phải gồm 9 đến 15 chữ số.";
  }

  if (payload.medicalHistory.length > 2000) {
    errors.medicalHistory = "Tiền sử bệnh án không được vượt quá 2000 ký tự.";
  }

  return {
    payload,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export function getFirstValidationMessage(errors = {}) {
  const firstKey = Object.keys(errors)[0];
  return firstKey ? errors[firstKey] : "Thông tin hồ sơ chưa hợp lệ.";
}

function normalizePatientCode(patientCode = "") {
  return String(patientCode || "").trim();
}

export function buildPatientQrValue(patientCode) {
  const normalizedCode = normalizePatientCode(patientCode);
  if (!normalizedCode) {
    return "";
  }

  return normalizedCode;
}

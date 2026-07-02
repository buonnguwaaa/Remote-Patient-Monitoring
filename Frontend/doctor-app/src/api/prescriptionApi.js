import request from "./httpClient";

// ─── helper ──────────────────────────────────────────────────────────────────

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

// ─── patient-facing ───────────────────────────────────────────────────────────

/**
 * Get prescriptions for the current patient (patient role)
 */
export async function getMyPrescriptions(status = "") {
  let url = "/prescriptions/me";
  if (status) url += `?status=${status}`;
  const response = await request(url, { method: "GET" });
  if (!response.ok) throw new Error(response.body?.error || "Lỗi tải đơn thuốc");
  return response.body?.data ?? response.body ?? [];
}

/**
 * Get medication adherence for current patient
 */
export async function getMedicationAdherence(days = 7) {
  const response = await request(`/medication-intakes/adherence?days=${days}`, { method: "GET" });
  if (!response.ok) {
    const errorBody =
      typeof response.body === "string" ? response.body : JSON.stringify(response.body);
    throw new Error(
      `[${response.status}] ` + (response.body?.error || errorBody || "Lỗi tải lịch sử uống thuốc")
    );
  }
  return response.body?.data ?? response.body;
}

// ─── staff-facing (doctor / nurse) ────────────────────────────────────────────

/**
 * Get prescriptions for staff – supports patientId / status / latest filters
 * @param {{ patientId?: string, status?: string, latest?: boolean }} params
 */
export async function getPrescriptions(params = {}) {
  const response = await request(`/prescriptions${buildQuery(params)}`, { method: "GET" });
  if (!response.ok) throw new Error(response.body?.error || "Lỗi tải đơn thuốc");
  return response.body?.data ?? response.body ?? [];
}

/**
 * Get a single prescription by id
 */
export async function getPrescriptionById(id) {
  const response = await request(`/prescriptions/${encodeURIComponent(id)}`, { method: "GET" });
  if (!response.ok) throw new Error(response.body?.error || "Lỗi tải đơn thuốc");
  return response.body?.data ?? response.body;
}

/**
 * Create a new prescription
 * @param {{
 *   patientId: string,
 *   medications: Array,
 *   timezone: string,
 *   daysOfWeek: number[],
 *   startDate: string,
 *   endDate?: string | null
 * }} payload
 */
export async function createPrescription(payload) {
  return request("/prescriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing prescription
 */
export async function updatePrescription(id, payload) {
  return request(`/prescriptions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * Update only the status of a prescription
 * @param {string} id
 * @param {'active'|'completed'|'discontinued'|'expired'} status
 */
export async function updatePrescriptionStatus(id, status) {
  return request(`/prescriptions/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/**
 * Get medication adherence for a patient (staff view)
 * @param {{ patientId: string, days?: number, from?: string, to?: string }} params
 */
export async function getPatientMedicationAdherence(params = {}) {
  const response = await request(
    `/medication-intakes/adherence${buildQuery(params)}`,
    { method: "GET" }
  );
  if (!response.ok) throw new Error(response.body?.error || "Lỗi tải tuân thủ thuốc");
  return response.body?.data ?? response.body;
}

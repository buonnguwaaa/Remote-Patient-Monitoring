import { request } from "./httpClient";

/**
 * Get prescriptions for the current patient
 * @param {string} status - Filter by status (active, completed, discontinued, expired)
 */
export async function getMyPrescriptions(status = "") {
  let url = "/prescriptions/me";
  if (status) {
    url += `?status=${status}`;
  }
  const response = await request(url, {
    method: "GET",
  });
  
  if (!response.ok) {
    throw new Error(response.body?.error || "Lỗi tải đơn thuốc");
  }
  // Extract response.body.data
  return response.body.data;
}

/**
 * Get prescriptions for a specific patient (Doctor/Nurse)
 * @param {string} status - Filter by status
 */
export async function getPrescriptions(status = "") {
  let url = "/prescriptions";
  if (status) {
    url += `?status=${status}`;
  }
  const response = await request(url, {
    method: "GET",
  });
  
  if (!response.ok) {
    throw new Error(response.body?.error || "Lỗi tải đơn thuốc");
  }
  // Extract response.body.data
  return response.body.data;
}

/**
 * Get medication adherence for the current patient
 * @param {number} days - Number of days to fetch adherence for
 */
export async function getMedicationAdherence(days = 7) {
  const response = await request(`/medication-intakes/adherence?days=${days}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorBody = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
    throw new Error(`[${response.status}] ` + (response.body?.error || errorBody || "Lỗi tải lịch sử uống thuốc"));
  }
  // Extract response.body.data
  return response.body.data;
}

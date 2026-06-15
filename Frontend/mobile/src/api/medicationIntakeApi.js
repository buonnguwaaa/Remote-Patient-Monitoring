import { request } from "./httpClient";

/**
 * Record a medication intake.
 * @param {Object} payload 
 * @param {string} payload.prescriptionId
 * @param {string} payload.drugName
 * @param {Object} payload.dose - Must contain timeOfDay, pillCount, and optionally hour, minute, mealTiming from the slot
 * @param {string} payload.takenAt - ISO timestamp
 */
export async function recordMedicationIntake(payload) {
  const response = await request("/medication-intakes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(response.body?.error || "Lỗi ghi nhận uống thuốc");
  }

  return response.body.data;
}

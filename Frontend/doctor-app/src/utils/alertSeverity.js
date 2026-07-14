/**
 * alertSeverity.js
 * Utility normalize alert severity cho Frontend/doctor-app.
 * Dữ liệu cũ MongoDB có thể còn: low | medium | high.
 * Normalize: high → high, mọi giá trị khác → info.
 */

/**
 * Normalize bất kỳ giá trị severity nào về "info" | "high".
 */
export function normalizeAlertSeverity(value) {
  return value === "high" ? "high" : "info";
}

/**
 * Normalize severity trong một alert object (bao gồm cả violations[].severity).
 * Gọi ngay tại API boundary.
 */
export function normalizeAlert(alert) {
  if (!alert) return alert;
  return {
    ...alert,
    severity: normalizeAlertSeverity(alert.severity),
    violations: Array.isArray(alert.violations)
      ? alert.violations.map((v) => ({
          ...v,
          severity: normalizeAlertSeverity(v.severity),
        }))
      : [],
  };
}

/**
 * Normalize danh sách alert.
 */
export function normalizeAlerts(alerts) {
  if (!Array.isArray(alerts)) return [];
  return alerts.map(normalizeAlert);
}

/**
 * Metadata hiển thị.
 */
export function getAlertSeverityMeta(value) {
  const severity = normalizeAlertSeverity(value);

  if (severity === "high") {
    return {
      severity,
      label: "Ưu tiên cao",
      description: "Chỉ số vượt ngưỡng ở mức ưu tiên cao",
      rank: 2,
      isHighPriority: true,
    };
  }

  return {
    severity,
    label: "Cần theo dõi",
    description: "Chỉ số vượt ngưỡng cá nhân",
    rank: 1,
    isHighPriority: false,
  };
}

/**
 * Trả về severity cao nhất trong danh sách alert đang open.
 * null nếu không có alert open nào.
 */
export function getHighestOpenSeverity(alerts) {
  if (!Array.isArray(alerts)) return null;
  const openAlerts = alerts.filter((a) => a?.status === "open");

  if (openAlerts.some((a) => normalizeAlertSeverity(a?.severity) === "high")) {
    return "high";
  }

  return openAlerts.length > 0 ? "info" : null;
}

/**
 * Trạng thái bệnh nhân dựa trên toàn bộ alert.
 */
export function getPatientAlertStatus(alerts) {
  const highest = getHighestOpenSeverity(alerts);
  if (highest === "high") return "highPriority";
  if (highest === "info") return "needsMonitoring";
  return "stable";
}

export const SEVERITY_LABELS = {
  high: "Ưu tiên cao",
  info: "Cần theo dõi",
};

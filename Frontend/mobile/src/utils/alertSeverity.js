/**
 * alertSeverity.js
 * Utility normalize alert severity cho Frontend/mobile (patient app).
 * Dữ liệu cũ MongoDB có thể còn: low | medium | high.
 * Normalize: high → high, mọi giá trị khác → info.
 */

/**
 * Normalize bất kỳ giá trị severity về "info" | "high".
 */
export function normalizeAlertSeverity(value) {
  return value === "high" ? "high" : "info";
}

/**
 * Normalize một alert object (bao gồm violations[].severity).
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
 * Metadata đầy đủ cho severity - dùng thống nhất trong toàn app.
 * Trả về { severityKey, severityText, isHighPriority, description }
 */
export function getAlertSeverityMeta(value) {
  const severity = normalizeAlertSeverity(value);

  if (severity === "high") {
    return {
      severityKey: "high",
      severityText: "Ưu tiên cao",
      isHighPriority: true,
      description:
        "Kết quả này đang được hệ thống đặt ở mức ưu tiên cao. Vui lòng kiểm tra lại thông tin đo và làm theo hướng dẫn của nhân viên y tế.",
    };
  }

  return {
    severityKey: "info",
    severityText: "Cần theo dõi",
    isHighPriority: false,
    description:
      "Kết quả đã vượt ngưỡng theo dõi được cấu hình cho bạn. Hãy tiếp tục theo dõi và trao đổi với nhân viên y tế khi cần.",
  };
}

/**
 * Severity cao nhất trong danh sách alert open.
 */
export function getHighestOpenSeverity(alerts) {
  if (!Array.isArray(alerts)) return null;
  const openAlerts = alerts.filter((a) => a?.status === "open");

  if (openAlerts.some((a) => normalizeAlertSeverity(a?.severity) === "high")) {
    return "high";
  }

  return openAlerts.length > 0 ? "info" : null;
}

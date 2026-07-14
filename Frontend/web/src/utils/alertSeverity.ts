/**
 * alertSeverity.ts
 * Utility duy nhất để normalize và hiển thị alert severity trên toàn bộ Frontend/web.
 * Dữ liệu cũ trong MongoDB có thể còn: low | medium | high.
 * Normalize rule: high → high, tất cả còn lại (info, medium, low, null, unknown) → info.
 */

export type AlertSeverity = "info" | "high";

/**
 * Normalize bất kỳ giá trị severity nào về "info" | "high".
 * Áp dụng tại API boundary, không để mỗi component tự xử lý.
 */
export function normalizeAlertSeverity(value: unknown): AlertSeverity {
  return value === "high" ? "high" : "info";
}

/**
 * Metadata hiển thị cho severity.
 * high → "Ưu tiên cao" (đỏ)
 * info → "Cần theo dõi" (xanh dương)
 */
export function getAlertSeverityMeta(value: unknown) {
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
 * Dùng để xác định trạng thái bệnh nhân từ toàn bộ alert open, không chỉ alert mới nhất.
 */
export function getHighestOpenSeverity(
  alerts: Array<{
    severity?: unknown;
    status?: string;
  }>
): AlertSeverity | null {
  const openAlerts = alerts.filter((alert) => alert.status === "open");

  if (
    openAlerts.some(
      (alert) => normalizeAlertSeverity(alert.severity) === "high"
    )
  ) {
    return "high";
  }

  return openAlerts.length > 0 ? "info" : null;
}

/**
 * Lấy trạng thái bệnh nhân từ danh sách alert của bệnh nhân đó.
 * Quy tắc:
 *   - Có ít nhất 1 alert open + high  → "Ưu tiên cao"
 *   - Không có high nhưng có info open → "Cần theo dõi"
 *   - Không có alert open              → "Ổn định"
 */
export function getPatientAlertStatus(
  alerts: Array<{ severity?: unknown; status?: string }>
): "highPriority" | "needsMonitoring" | "stable" {
  const highestSeverity = getHighestOpenSeverity(alerts);
  if (highestSeverity === "high") return "highPriority";
  if (highestSeverity === "info") return "needsMonitoring";
  return "stable";
}

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  high: "Ưu tiên cao",
  info: "Cần theo dõi",
};

/**
 * CSS class Tailwind cho badge severity (web).
 */
export function getSeverityBadgeClass(value: unknown): string {
  const severity = normalizeAlertSeverity(value);
  if (severity === "high") {
    return "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:ring-1 dark:ring-red-500/25";
  }
  return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-1 dark:ring-blue-500/25";
}

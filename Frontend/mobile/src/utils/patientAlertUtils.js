import { normalizeAlertSeverity } from "./alertSeverity";

function toTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function extractData(response) {
  if (!response?.ok) return null;
  return response.body?.data || response.body || null;
}

export function extractList(response) {
  const data = extractData(response);
  return Array.isArray(data) ? data : [];
}

export function sortAlertsByCreatedAt(alerts) {
  return [...(Array.isArray(alerts) ? alerts : [])].sort(
    (left, right) => toTimestamp(right?.createdAt) - toTimestamp(left?.createdAt)
  );
}

function formatNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(1);
}

function getViolationUnit(type) {
  const clean = type?.replace(/_(max|min|high|low)$/, "");
  switch (clean || type) {
    case "temperature":
      return "°C";
    case "heart_rate":
    case "heartRate":
      return "bpm";
    case "respiratory_rate":
    case "respiratoryRate":
      return "lần/phút";
    case "spo2":
    case "spO2":
      return "%";
    case "blood_pressure_systolic":
    case "bloodPressureSystolic":
    case "blood_pressure_diastolic":
    case "bloodPressureDiastolic":
      return "mmHg";
    case "glucose":
      return "mg/dL";
    default:
      return "";
  }
}

export function getViolationLabel(type) {
  if (!type) return "Chỉ số";
  const cleanType = type.replace(/_(max|min|high|low)$/, "");
  const labels = {
    temperature: "Nhiệt độ",
    heart_rate: "Nhịp tim",
    heartRate: "Nhịp tim",
    respiratory_rate: "Nhịp thở",
    respiratoryRate: "Nhịp thở",
    spo2: "SpO2",
    spO2: "SpO2",
    blood_pressure_systolic: "Huyết áp tâm thu",
    bloodPressureSystolic: "Huyết áp tâm thu",
    blood_pressure_diastolic: "Huyết áp tâm trương",
    bloodPressureDiastolic: "Huyết áp tâm trương",
    glucose: "Đường huyết",
    sys: "Huyết áp tâm thu",
    bp_diastolic: "Huyết áp tâm trương"
  };
  return labels[cleanType] || labels[type] || type;
}

export function getViolationIcon(type) {
  switch (type) {
    case "temperature":
      return "thermometer-outline";
    case "heart_rate":
      return "heart-outline";
    case "respiratory_rate":
      return "pulse-outline";
    case "spo2":
      return "water-outline";
    case "blood_pressure_systolic":
    case "blood_pressure_diastolic":
      return "fitness-outline";
    case "glucose":
      return "flask-outline";
    default:
      return "alert-circle-outline";
  }
}

export function getPrimaryViolation(alert) {
  const violations = Array.isArray(alert?.violations) ? alert.violations : [];
  return violations[0] || null;
}

export function buildAlertSummary(alert) {
  const violations = Array.isArray(alert?.violations) ? alert.violations : [];
  const primaryViolation = violations[0] || null;

  if (!primaryViolation) {
    return {
      title: "Cảnh báo sinh hiệu",
      iconName: "alert-circle-outline",
      summary: "Không có chi tiết vi phạm.",
    };
  }

  const extraCount = Math.max(0, violations.length - 1);
  return {
    title: getViolationLabel(primaryViolation.type),
    iconName: getViolationIcon(primaryViolation.type),
    summary:
      extraCount > 0
        ? `Và ${extraCount} chỉ số khác vượt ngưỡng`
        : primaryViolation.rule || "Vượt ngưỡng đã cấu hình",
  };
}

export function buildAdditionalViolationSummary(alert) {
  const violations = Array.isArray(alert?.violations) ? alert.violations : [];
  const extraCount = Math.max(0, violations.length - 1);

  if (extraCount === 0) return "";
  return `Còn ${extraCount} chỉ số vi phạm khác`;
}

export function formatAlertObservedValue(violation) {
  if (!violation) return "--";

  const unit = getViolationUnit(violation.type);
  const value = formatNumber(violation.observed);
  return unit ? `${value} ${unit}` : value;
}

export function buildAlertPreviewItems(alerts, limit = 3) {
  return sortAlertsByCreatedAt(alerts)
    .slice(0, limit)
    .map((alert) => {
      const primaryViolation = getPrimaryViolation(alert);
      const summary = buildAlertSummary(alert);
      const additionalSummary = buildAdditionalViolationSummary(alert);
      // Normalize severity trước khi sử dụng
      const severityKey = normalizeAlertSeverity(alert?.severity);
      const isHighPriority = severityKey === "high";

      return {
        id: alert?.id || `${summary.title}-${alert?.createdAt || "preview"}`,
        alertId: alert?.id || null,
        title: summary.title,
        iconName: summary.iconName,
        observedText: formatAlertObservedValue(primaryViolation),
        // Label chỉ rõ mức ưu tiên, không dùng từ có thể gây hiểu lầm lâm sàng
        severityText: isHighPriority ? "Ưu tiên cao" : "Cần theo dõi",
        statusText: alert?.status === "open" ? "Chờ xác nhận" : "Đã xác nhận",
        isAcknowledged: alert?.status === "ack",
        ruleText: primaryViolation?.rule || summary.summary,
        additionalSummary,
        createdAt: alert?.createdAt,
        isHigh: isHighPriority,
        isHighPriority,
        severityKey,
      };
    });
}

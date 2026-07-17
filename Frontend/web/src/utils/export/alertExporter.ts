import type { AlertResponse, AssignmentResponse } from '../../types/patient';
import i18n from "../../i18n/config";
const t = i18n.t;
import { normalizeAlertSeverity } from '../alertSeverity';
import {
  createWorkbook,
  addWorksheet,
  addTitleRow,
  applyTableBorder,
  downloadExcelFile,
  generateFilename,
  formatDateTimeVN,
} from './excelExporter';

const violationLabel: Record<string, string> = {
  systolic: "HA tâm thu",
  diastolic: "HA tâm trương",
  pulse: t("patientDetail.heartRate"),
  glucose: t("patientDetail.glucose"),
  temperature: t("patientDetail.temperature"),
  spo2: "SpO2",
  respiratoryRate: t("patientDetail.respiratoryRate"),
  heart_rate: t("patientDetail.heartRate"),
  heartRate: t("patientDetail.heartRate"),
  respiratory_rate: t("patientDetail.respiratoryRate"),
  blood_pressure_systolic: t("patientDetail.systolic"),
  bloodPressureSystolic: t("patientDetail.systolic"),
  blood_pressure_diastolic: t("patientDetail.diastolic"),
  bloodPressureDiastolic: t("patientDetail.diastolic"),
};

interface AlertExportData {
  allAlerts: AlertResponse[];
  assignments: AssignmentResponse[];
  dashboardStats: {
    total: number | null | undefined;
    stable: number | null | undefined;
    attention: number | null | undefined;
  };
  dateRange: string;
}

export const exportAlertsToExcel = async (data: AlertExportData) => {
  const { allAlerts, assignments, dashboardStats, dateRange } = data;

  const patientNameById = new Map(
    assignments.map((a) => [a.patientId, a.patientName || 'Không rõ']),
  );
  const patientCodeById = new Map(
    assignments.map((a) => [a.patientId, a.patientCode || a.patientPublicId || '-']),
  );

  const sortedAlerts = [...allAlerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const alertData = sortedAlerts.map((alert) => ({
    [t("chat.patient")]: patientNameById.get(alert.patientId) ?? 'Không rõ',
    'Mã BN': patientCodeById.get(alert.patientId) ?? '-',
    // Xuất severity thành label rõ ràng, không gây hiểu nhầm lâm sàng
    [t("alerts.severity")]: normalizeAlertSeverity(alert.severity) === 'high' ? 'Ưu tiên cao' : 'Cần theo dõi',
    [t("patients.status")]: alert.status === 'ack' ? t("dashboard.alertStatusAck") : t("dashboard.alertStatusPending"),
    'Chỉ số vi phạm': alert.violations
      .map((v) => {
        const val = typeof v.observed === 'number' ? Number(v.observed.toFixed(1)) : v.observed;
        return `${violationLabel[v.type] ?? v.type}: ${val}`;
      })
      .join('; '),
    [t("patientDetail.time")]: formatDateTimeVN(alert.createdAt),
  }));

  const workbook = createWorkbook();
  const alertSheet = workbook.addWorksheet(t("patients.warning"));

  addTitleRow(alertSheet, `Danh sách cảnh báo sức khỏe bệnh nhân`, `Khoảng thời gian: ${dateRange} · Xuất lúc: ${formatDateTimeVN(new Date())}`, 6);

  if (alertData.length > 0) {
    const headers = Object.keys(alertData[0]);
    const headerRow = alertSheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    headerRow.height = 20;
    alertData.forEach((row) => alertSheet.addRow(Object.values(row)));
    [25, 15, 12, 18, 55, 20].forEach((w, i) => {
      alertSheet.getColumn(i + 1).width = w;
    });
    applyTableBorder(alertSheet, 4, alertSheet.rowCount, 1, 6);
  }

  const summaryData = [
    { 'Chỉ số': t("dashboard.totalPatients"), 'Giá trị': dashboardStats.total || 0 },
    { 'Chỉ số': t("dashboard.stablePatients"), 'Giá trị': dashboardStats.stable || 0 },
    { 'Chỉ số': t("dashboard.needAttention"), 'Giá trị': dashboardStats.attention || 0 },
    { 'Chỉ số': t("dashboard.totalExportedAlerts"), 'Giá trị': allAlerts.length },
    { 'Chỉ số': '', 'Giá trị': '' },
    { 'Chỉ số': t("dashboard.dateRange"), 'Giá trị': dateRange },
    { 'Chỉ số': 'Ngày xuất', 'Giá trị': formatDateTimeVN(new Date()) },
  ];

  const summarySheet = addWorksheet(workbook, summaryData, t("dashboard.title"), [20, 30]);
  applyTableBorder(summarySheet, 1, summarySheet.rowCount, 1, 2);

  const filename = generateFilename('canh_bao');
  await downloadExcelFile(workbook, filename);
};

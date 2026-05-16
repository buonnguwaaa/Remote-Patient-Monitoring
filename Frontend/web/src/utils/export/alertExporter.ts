/**
 * Alert Exporter
 * Export alert data to Excel
 */

import type { AlertResponse, AssignmentResponse } from '../../types/patient';
import i18n from "../../i18n/config";
const t = i18n.t;
import {
  createWorkbook,
  addWorksheet,
  styleHeaderRow,
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
  respiratory_rate: t("patientDetail.respiratoryRate"),
  blood_pressure_systolic: t("patientDetail.systolic"),
  blood_pressure_diastolic: t("patientDetail.diastolic"),
};

interface AlertExportData {
  assignments: AssignmentResponse[];
  latestAlertsByPatient: Map<string, AlertResponse>;
  dashboardStats: {
    total: number | null | undefined;
    stable: number | null | undefined;
    attention: number | null | undefined;
  };
  dateRange: string;
}

const isAttentionAlert = (alert: AlertResponse) => {
  return alert.severity === "high" && alert.status === "open";
};

/**
 * Export alerts to Excel
 */
export const exportAlertsToExcel = async (data: AlertExportData) => {
  const { assignments, latestAlertsByPatient, dashboardStats, dateRange } = data;

  // Prepare alert data
  const alertData = assignments.map((assignment) => {
    const latestAlert = latestAlertsByPatient.get(assignment.patientId);
    const status = latestAlert && isAttentionAlert(latestAlert) ? t("dashboard.needAttention") : 'Ổn định';
    const alertInfo = latestAlert 
      ? latestAlert.violations.map(v => `${violationLabel[v.type] ?? v.type}: ${v.observed}`).join('; ')
      : 'Không có';
    const severity = latestAlert ? (latestAlert.severity === 'high' ? 'Cao' : t("dashboard.filterMedium")) : '-';
    const time = latestAlert ? formatDateTimeVN(latestAlert.createdAt) : '-';
    
    return {
      [t("chat.patient")]: assignment.patientName || 'Không rõ',
      'Mã BN': assignment.patientCode || assignment.patientPublicId || '-',
      [t("patients.status")]: status,
      'Cảnh báo gần nhất': alertInfo,
      [t("alerts.severity")]: severity,
      [t("patientDetail.time")]: time,
    };
  });

  // Create workbook
  const workbook = createWorkbook();

  // Add alerts worksheet
  const alertSheet = addWorksheet(
    workbook,
    alertData,
    t("patients.warning"),
    [25, 15, 15, 50, 12, 20]
  );
  styleHeaderRow(alertSheet);

  // Add summary worksheet
  const summaryData = [
    { 'Chỉ số': t("dashboard.totalPatients"), 'Giá trị': dashboardStats.total || 0 },
    { 'Chỉ số': t("dashboard.stablePatients"), 'Giá trị': dashboardStats.stable || 0 },
    { 'Chỉ số': t("dashboard.needAttention"), 'Giá trị': dashboardStats.attention || 0 },
    { 'Chỉ số': '', 'Giá trị': '' },
    { 'Chỉ số': t("dashboard.dateRange"), 'Giá trị': dateRange },
    { 'Chỉ số': 'Ngày xuất', 'Giá trị': formatDateTimeVN(new Date()) },
  ];
  
  addWorksheet(workbook, summaryData, t("dashboard.title"), [20, 30]);

  // Download file
  const filename = generateFilename('canh_bao');
  await downloadExcelFile(workbook, filename);
};

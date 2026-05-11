/**
 * Alert Exporter
 * Export alert data to Excel
 */

import type { AlertResponse, AssignmentResponse } from '../../types/patient';
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
  pulse: "Nhịp tim",
  glucose: "Đường huyết",
  temperature: "Nhiệt độ",
  spo2: "SpO2",
  respiratoryRate: "Nhịp thở",
  heart_rate: "Nhịp tim",
  respiratory_rate: "Nhịp thở",
  blood_pressure_systolic: "Huyết áp tâm thu",
  blood_pressure_diastolic: "Huyết áp tâm trương",
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
    const status = latestAlert && isAttentionAlert(latestAlert) ? 'Cần chú ý' : 'Ổn định';
    const alertInfo = latestAlert 
      ? latestAlert.violations.map(v => `${violationLabel[v.type] ?? v.type}: ${v.observed}`).join('; ')
      : 'Không có';
    const severity = latestAlert ? (latestAlert.severity === 'high' ? 'Cao' : 'Trung bình') : '-';
    const time = latestAlert ? formatDateTimeVN(latestAlert.createdAt) : '-';
    
    return {
      'Bệnh nhân': assignment.patientName || 'Không rõ',
      'Mã BN': assignment.patientCode || assignment.patientPublicId || '-',
      'Trạng thái': status,
      'Cảnh báo gần nhất': alertInfo,
      'Mức độ': severity,
      'Thời gian': time,
    };
  });

  // Create workbook
  const workbook = createWorkbook();

  // Add alerts worksheet
  const alertSheet = addWorksheet(
    workbook,
    alertData,
    'Cảnh báo',
    [25, 15, 15, 50, 12, 20]
  );
  styleHeaderRow(alertSheet);

  // Add summary worksheet
  const summaryData = [
    { 'Chỉ số': 'Tổng bệnh nhân', 'Giá trị': dashboardStats.total || 0 },
    { 'Chỉ số': 'Đang ổn định', 'Giá trị': dashboardStats.stable || 0 },
    { 'Chỉ số': 'Cần chú ý', 'Giá trị': dashboardStats.attention || 0 },
    { 'Chỉ số': '', 'Giá trị': '' },
    { 'Chỉ số': 'Khoảng thời gian', 'Giá trị': dateRange },
    { 'Chỉ số': 'Ngày xuất', 'Giá trị': formatDateTimeVN(new Date()) },
  ];
  
  addWorksheet(workbook, summaryData, 'Tổng quan', [20, 30]);

  // Download file
  const filename = generateFilename('canh_bao');
  await downloadExcelFile(workbook, filename);
};

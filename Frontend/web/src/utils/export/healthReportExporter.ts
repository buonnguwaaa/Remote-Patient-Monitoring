import type { AssignmentResponse } from '../../types/patient';
import i18n from '../../i18n/config';
const t = i18n.t;
import ExcelJS from 'exceljs';
import {
  createWorkbook,
  addTitleRow,
  applyTableBorder,
  downloadExcelFile,
  generateFilename,
  formatDateVN,
  formatDateTimeVN,
} from './excelExporter';

export interface HealthStatistics {
  totalMeasurements: number;
  bloodPressure: { systolic: MetricStats; diastolic: MetricStats };
  heartRate: MetricStats;
  temperature: MetricStats;
  spo2: MetricStats;
  respiratoryRate: MetricStats;
  glucose: MetricStats;
  totalViolations: number;
}

export interface MetricStats {
  min: number;
  max: number;
  avg: number;
  violations: number;
}

export interface PatientReportData {
  assignment: AssignmentResponse;
  measurements: any[];
  threshold: any;
  stats: HealthStatistics;
}

const createEmptyStats = (): MetricStats => ({ min: 0, max: 0, avg: 0, violations: 0 });

const calculateMetricStats = (values: number[], min?: number, max?: number): MetricStats => {
  if (values.length === 0) return createEmptyStats();
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const avgVal = values.reduce((a, b) => a + b, 0) / values.length;
  const violations =
    min !== undefined && max !== undefined
      ? values.filter((v) => v < min || v > max).length
      : 0;
  return {
    min: Math.round(minVal * 10) / 10,
    max: Math.round(maxVal * 10) / 10,
    avg: Math.round(avgVal * 10) / 10,
    violations,
  };
};

export const calculateHealthStatistics = (measurements: any[], threshold: any): HealthStatistics => {
  if (measurements.length === 0) {
    return {
      totalMeasurements: 0,
      bloodPressure: { systolic: createEmptyStats(), diastolic: createEmptyStats() },
      heartRate: createEmptyStats(),
      temperature: createEmptyStats(),
      spo2: createEmptyStats(),
      respiratoryRate: createEmptyStats(),
      glucose: createEmptyStats(),
      totalViolations: 0,
    };
  }

  const sys = measurements.map((m) => m.bloodPressure?.systolic || m.systolic || 0).filter((v) => v > 0);
  const dia = measurements.map((m) => m.bloodPressure?.diastolic || m.diastolic || 0).filter((v) => v > 0);
  const hr = measurements.map((m) => m.heartRate || 0).filter((v) => v > 0);
  const temp = measurements.map((m) => m.temperature || 0).filter((v) => v > 0);
  const spo2 = measurements.map((m) => m.spo2 || 0).filter((v) => v > 0);
  const rr = measurements.map((m) => m.respiratoryRate || 0).filter((v) => v > 0);
  const gluc = measurements
    .map((m) => {
      const g = m.glucose;
      if (!g) return 0;
      return typeof g === 'object' ? g.bloodGlucose || 0 : g;
    })
    .filter((v) => v > 0);

  const stats: HealthStatistics = {
    totalMeasurements: measurements.length,
    bloodPressure: {
      systolic: calculateMetricStats(sys, threshold?.sysMin, threshold?.sysMax),
      diastolic: calculateMetricStats(dia, threshold?.diaMin, threshold?.diaMax),
    },
    heartRate: calculateMetricStats(hr, threshold?.heartRateMin, threshold?.heartRateMax),
    temperature: calculateMetricStats(temp, threshold?.temperatureMin, threshold?.temperatureMax),
    spo2: calculateMetricStats(spo2, threshold?.spo2Min, 100),
    respiratoryRate: calculateMetricStats(rr, threshold?.respiratoryRateMin, threshold?.respiratoryRateMax),
    glucose: calculateMetricStats(gluc, threshold?.glucoseMin, threshold?.glucoseMax),
    totalViolations: 0,
  };

  stats.totalViolations =
    stats.bloodPressure.systolic.violations +
    stats.bloodPressure.diastolic.violations +
    stats.heartRate.violations +
    stats.temperature.violations +
    stats.spo2.violations +
    stats.respiratoryRate.violations +
    stats.glucose.violations;

  return stats;
};

const HEADER_COLOR = '1E40AF';
const TITLE_BG = 'DBEAFE';
const TITLE_FG = '1E3A8A';

function addSheetTitle(ws: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  addTitleRow(ws, title, subtitle, cols);
}

function addHeaderRow(ws: ExcelJS.Worksheet, headers: string[], colWidths: number[]) {
  const row = ws.addRow(headers);
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${HEADER_COLOR}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF93C5FD' } } };
  });
  row.height = 22;
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

function addDataRows(ws: ExcelJS.Worksheet, rows: any[][]) {
  rows.forEach((values) => {
    const row = ws.addRow(values);
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle' };
    });
  });
}

export const exportHealthReportToExcel = async (
  reportData: PatientReportData[],
  startDate: string,
  endDate: string,
) => {
  const workbook = createWorkbook();
  const reportTitle = 'Báo cáo chỉ số sức khỏe bệnh nhân';
  const reportSubtitle = `Khoảng thời gian: ${formatDateVN(startDate)} — ${formatDateVN(endDate)}  ·  Xuất lúc: ${formatDateTimeVN(new Date())}`;

  const statsHeaders = [
    t('chat.patient'), 'Mã BN', 'Chỉ số',
    'Min', 'Max', 'Trung bình', 'Ngưỡng an toàn', 'Vượt ngưỡng',
  ];
  const statsWidths = [25, 16, 24, 10, 10, 14, 22, 13];

  const ws1 = workbook.addWorksheet('Thống kê chi tiết');
  addSheetTitle(ws1, reportTitle, reportSubtitle, statsHeaders.length);
  addHeaderRow(ws1, statsHeaders, statsWidths);

  for (const d of reportData) {
    const name = d.assignment.patientName || 'Không rõ';
    const code = d.assignment.patientCode || d.assignment.patientPublicId || '-';
    const th = d.threshold;

    const metricRows: [string, MetricStats, string][] = [
      ['HA tâm thu (mmHg)',    d.stats.bloodPressure.systolic,  th ? `${th.sysMin} – ${th.sysMax}` : '-'],
      ['HA tâm trương (mmHg)', d.stats.bloodPressure.diastolic, th ? `${th.diaMin} – ${th.diaMax}` : '-'],
      ['Nhịp tim (bpm)',        d.stats.heartRate,               th ? `${th.heartRateMin} – ${th.heartRateMax}` : '-'],
      ['Nhiệt độ (°C)',         d.stats.temperature,             th ? `${th.temperatureMin} – ${th.temperatureMax}` : '-'],
      ['SpO2 (%)',              d.stats.spo2,                    th ? `${th.spo2Min} – 100` : '-'],
      ['Nhịp thở (lần/ph)',     d.stats.respiratoryRate,         th ? `${th.respiratoryRateMin ?? 0} – ${th.respiratoryRateMax ?? 0}` : '-'],
      ['Đường huyết (mg/dL)',   d.stats.glucose,                 th ? `${th.glucoseMin ?? 0} – ${th.glucoseMax ?? 0}` : '-'],
    ];

    const startRow = ws1.rowCount + 1;

    metricRows.forEach(([label, stat], idx) => {
      const row = ws1.addRow([
        idx === 0 ? name : '',
        idx === 0 ? code : '',
        label,
        stat.min > 0 ? stat.min : '-',
        stat.max > 0 ? stat.max : '-',
        stat.avg > 0 ? stat.avg : '-',
        metricRows[idx][2],
        stat.violations,
      ]);
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle' };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
      });
    });

    const endRow = ws1.rowCount;
    if (endRow >= startRow) {
      ws1.mergeCells(startRow, 1, endRow, 1);
      ws1.mergeCells(startRow, 2, endRow, 2);

      const nameCell = ws1.getCell(startRow, 1);
      nameCell.value = name;
      nameCell.font = { bold: true, color: { argb: 'FF1E3A8A' } };
      nameCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      const codeCell = ws1.getCell(startRow, 2);
      codeCell.value = code;
      codeCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    const sepRow = ws1.addRow(['', '', '', '', '', '', '', '']);
    sepRow.height = 6;
    sepRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    });
  }

  if (ws1.rowCount > 4) {
    applyTableBorder(ws1, 4, ws1.rowCount, 1, statsHeaders.length);
  }

  const detailHeaders = [
    'STT', t('chat.patient'), 'Mã BN',
    'HA tâm thu (mmHg)', 'HA tâm trương (mmHg)',
    'Nhịp tim (bpm)', 'Nhiệt độ (°C)', 'SpO2 (%)', 'Nhịp thở (lần/ph)', 'Đường huyết (mg/dL)',
    'Thời gian đo',
  ];
  const detailWidths = [5, 25, 14, 18, 20, 14, 14, 10, 16, 20, 22];

  const ws2 = workbook.addWorksheet('Chi tiết lần đo');
  addSheetTitle(ws2, reportTitle, reportSubtitle, detailHeaders.length);
  addHeaderRow(ws2, detailHeaders, detailWidths);

  let stt = 1;
  const detailRows: any[][] = [];
  for (const d of reportData) {
    const name = d.assignment.patientName || 'Không rõ';
    const code = d.assignment.patientCode || d.assignment.patientPublicId || '-';
    const sorted = [...d.measurements].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    for (const m of sorted) {
      detailRows.push([
        stt++,
        name,
        code,
        m.bloodPressure?.systolic || m.systolic || '-',
        m.bloodPressure?.diastolic || m.diastolic || '-',
        m.heartRate || '-',
        m.temperature || '-',
        m.spo2 || '-',
        m.respiratoryRate || '-',
        m.glucose ? (typeof m.glucose === 'object' ? m.glucose.bloodGlucose || '-' : m.glucose) : '-',
        formatDateTimeVN(m.createdAt),
      ]);
    }
  }
  addDataRows(ws2, detailRows);

  if (ws2.rowCount > 4) {
    applyTableBorder(ws2, 4, ws2.rowCount, 1, detailHeaders.length);
  }

  const infoSheet = workbook.addWorksheet('Thông tin');
  infoSheet.getColumn(1).width = 28;
  infoSheet.getColumn(2).width = 40;
  const infoRows: [string, any][] = [
    ['BÁO CÁO CHỈ SỐ SỨC KHỎE BỆNH NHÂN', ''],
    ['', ''],
    ['Khoảng thời gian', `${formatDateVN(startDate)} – ${formatDateVN(endDate)}`],
    ['Ngày xuất', formatDateTimeVN(new Date())],
    ['Số bệnh nhân', reportData.length],
    ['Tổng số lần đo', reportData.reduce((s, d) => s + d.stats.totalMeasurements, 0)],
    ['Số BN ổn định', reportData.filter((d) => d.stats.totalViolations === 0).length],
    ['Số BN cần chú ý', reportData.filter((d) => d.stats.totalViolations > 0).length],
  ];
  infoRows.forEach(([k, v], idx) => {
    const row = infoSheet.addRow([k, v]);
    if (idx === 0) {
      row.getCell(1).font = { bold: true, size: 13, color: { argb: `FF${TITLE_FG}` } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${TITLE_BG}` } };
      infoSheet.mergeCells(row.number, 1, row.number, 2);
      row.getCell(1).alignment = { horizontal: 'center' };
    } else {
      row.getCell(1).font = { bold: true, color: { argb: 'FF374151' } };
    }
  });

  applyTableBorder(infoSheet, 1, infoSheet.rowCount, 1, 2);

  const filename = generateFilename('bao_cao_chi_so');
  await downloadExcelFile(workbook, filename);
};

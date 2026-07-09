import ExcelJS from 'exceljs';
import type { AdherenceResponse } from '../../services/patientService';
import {
  createWorkbook,
  addTitleRow,
  applyTableBorder,
  downloadExcelFile,
  generateFilename,
  formatDateVN,
  formatDateTimeVN,
} from './excelExporter';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR = {
  HEADER_BG:  '1E40AF',   // blue-800
  TAKEN_BG:   'D1FAE5',   // emerald-100
  TAKEN_FG:   '065F46',   // emerald-900
  MISSED_BG:  'FEE2E2',   // red-100
  MISSED_FG:  '991B1B',   // red-900
  PENDING_BG: 'F3F4F6',   // gray-100
  PENDING_FG: '6B7280',   // gray-500
  SEP_BG:     'E2E8F0',   // slate-200
  TITLE_FG:   '1E3A8A',   // blue-900
  TITLE_BG:   'DBEAFE',   // blue-100
  RATE_HIGH:  '059669',   // emerald-600  (≥80%)
  RATE_MID:   'D97706',   // amber-600    (50–79%)
  RATE_LOW:   'DC2626',   // red-600      (<50%)
} as const;

function rateColor(rate: number) {
  if (rate >= 80) return COLOR.RATE_HIGH;
  if (rate >= 50) return COLOR.RATE_MID;
  return COLOR.RATE_LOW;
}

function statusLabel(status: string) {
  if (status === 'taken')   return 'Đã uống';
  if (status === 'missed')  return 'Bỏ lỡ';
  return 'Chờ uống';
}

function mealTimingLabel(timing: string) {
  if (timing === 'pre_meal')  return 'Trước ăn';
  if (timing === 'post_meal') return 'Sau ăn';
  if (timing === 'with_meal') return 'Trong bữa ăn';
  return 'Không chỉ định';
}

function todLabel(tod: string) {
  if (tod === 'morning') return 'Sáng';
  if (tod === 'noon')    return 'Trưa';
  if (tod === 'evening') return 'Tối';
  return tod;
}

function formatDate(dateStr: string) {
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

/** Safely format slot time — use hour/minute if available, fallback to slot.time string */
function slotTimeStr(slot: { hour?: number; minute?: number; time?: string }): string {
  if (slot.hour != null && slot.minute != null) {
    return `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
  }
  if (slot.time) return slot.time;
  return '';
}

function styleStatusCell(cell: ExcelJS.Cell, status: string) {
  if (status === 'taken') {
    cell.font = { bold: true, color: { argb: `FF${COLOR.TAKEN_FG}` } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.TAKEN_BG}` } };
  } else if (status === 'missed') {
    cell.font = { bold: true, color: { argb: `FF${COLOR.MISSED_FG}` } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.MISSED_BG}` } };
  } else {
    cell.font = { color: { argb: `FF${COLOR.PENDING_FG}` } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.PENDING_BG}` } };
  }
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function styleRateCell(cell: ExcelJS.Cell, rate: number) {
  cell.value = `${Math.round(rate)}%`;
  cell.font = { bold: true, color: { argb: `FF${rateColor(rate)}` } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

// ─── Sheet 1 — Tổng quan ──────────────────────────────────────────────────────

function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  adherence: AdherenceResponse,
  patientName: string,
  patientCode: string,
  reportTitle: string,
  reportSubtitle: string,
) {
  const ws = workbook.addWorksheet('Tổng quan');

  const headers = ['Ngày', 'Dự kiến', 'Đã uống', 'Bỏ lỡ', 'Tỷ lệ tuân thủ'];
  const colWidths = [16, 12, 12, 12, 18];

  addTitleRow(ws, reportTitle, reportSubtitle, headers.length);

  // Patient info row
  const infoRow = ws.addRow([`Bệnh nhân: ${patientName}  |  Mã HS: ${patientCode}`, '', '', '', '']);
  ws.mergeCells(infoRow.number, 1, infoRow.number, headers.length);
  infoRow.getCell(1).font = { bold: true, color: { argb: `FF${COLOR.TITLE_FG}` }, size: 11 };
  infoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.TITLE_BG}` } };
  infoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  infoRow.height = 20;

  ws.addRow([]);

  // Header row
  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.HEADER_BG}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 22;

  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Data rows
  adherence.days.forEach((day) => {
    const rate = day.expected > 0 ? (day.taken / day.expected) * 100 : 0;
    const row = ws.addRow([
      formatDate(day.date),
      day.expected,
      day.taken,
      day.missed,
      '',  // rate cell styled separately
    ]);
    row.eachCell((cell) => { cell.alignment = { horizontal: 'center', vertical: 'middle' }; });
    styleRateCell(row.getCell(5), rate);
  });

  // Total row
  ws.addRow([]);
  const totalRow = ws.addRow([
    'TỔNG CỘNG',
    adherence.summary.expected,
    adherence.summary.taken,
    adherence.summary.missed,
    '',
  ]);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  styleRateCell(totalRow.getCell(5), adherence.summary.adherenceRate * 100);
  totalRow.getCell(1).font = { bold: true, color: { argb: `FF${COLOR.TITLE_FG}` } };

  const dataStart = 6; // after title(1), subtitle(2), empty(3), info(4), empty(5), header(6)
  const dataEnd = ws.rowCount;
  if (dataEnd >= dataStart) {
    applyTableBorder(ws, dataStart, dataEnd, 1, headers.length);
  }

  // ── Report metadata section (replaces separate "Thông tin" sheet) ──
  ws.addRow([]);
  ws.addRow([]);
  const metaTitle = ws.addRow(['THÔNG TIN BÁO CÁO', '', '', '', '']);
  ws.mergeCells(metaTitle.number, 1, metaTitle.number, headers.length);
  metaTitle.getCell(1).font = { bold: true, size: 11, color: { argb: `FF${COLOR.TITLE_FG}` } };
  metaTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.TITLE_BG}` } };
  metaTitle.getCell(1).alignment = { horizontal: 'center' };
  metaTitle.height = 22;

  const metaData: [string, string][] = [
    ['Khoảng thời gian', `${formatDateVN(adherence.from)} – ${formatDateVN(adherence.to)}`],
    ['Số ngày theo dõi', `${adherence.days.length} ngày`],
    ['Ngày xuất báo cáo', formatDateTimeVN(new Date())],
  ];
  metaData.forEach(([label, value]) => {
    const r = ws.addRow([label, value, '', '', '']);
    ws.mergeCells(r.number, 2, r.number, headers.length);
    r.getCell(1).font = { bold: true, color: { argb: 'FF374151' } };
    r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
  });

  applyTableBorder(ws, metaTitle.number, ws.rowCount, 1, headers.length);

  return ws;
}

// ─── Sheet 2 — Chi tiết từng ngày ─────────────────────────────────────────────

function buildDailyDetailSheet(
  workbook: ExcelJS.Workbook,
  adherence: AdherenceResponse,
  patientName: string,
  patientCode: string,
  reportTitle: string,
  reportSubtitle: string,
) {
  const ws = workbook.addWorksheet('Chi tiết hàng ngày');

  const headers = [
    'Ngày', 'Tên thuốc', 'Liều lượng',
    'Buổi', 'Giờ uống', 'Bữa ăn', 'Số viên',
    'Trạng thái', 'Uống lúc',
  ];
  const colWidths = [14, 24, 14, 10, 12, 16, 10, 14, 20];

  addTitleRow(ws, reportTitle, reportSubtitle, headers.length);

  const infoRow = ws.addRow([`Bệnh nhân: ${patientName}  |  Mã HS: ${patientCode}`, ...Array(headers.length - 1).fill('')]);
  ws.mergeCells(infoRow.number, 1, infoRow.number, headers.length);
  infoRow.getCell(1).font = { bold: true, color: { argb: `FF${COLOR.TITLE_FG}` }, size: 11 };
  infoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.TITLE_BG}` } };
  infoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  infoRow.height = 20;

  ws.addRow([]);

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.HEADER_BG}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  headerRow.height = 22;
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  adherence.days.forEach((day) => {
    if (day.medications.length === 0) return;

    // Count total slots for this day (for merging date column)
    const daySlotCount = day.medications.reduce((sum, med) => sum + med.slots.length, 0);
    if (daySlotCount === 0) return;

    const dayStartRow = ws.rowCount + 1;

    day.medications.forEach((med) => {
      if (med.slots.length === 0) return;
      const medStartRow = ws.rowCount + 1;

      med.slots.forEach((slot, slotIdx) => {
          const timeStr = slotTimeStr(slot);
        const takenAtStr = slot.takenAt ? formatDateTimeVN(slot.takenAt) : '';

        const row = ws.addRow([
          slotIdx === 0 ? formatDate(day.date) : '',   // Date: only first row per day
          slotIdx === 0 ? med.drugName : '',            // Drug: only first row per med
          slotIdx === 0 ? med.dosage : '',              // Dosage: only first row per med
          todLabel(slot.timeOfDay),
          timeStr,
          mealTimingLabel(slot.mealTiming),
          slot.pillCount,
          statusLabel(slot.status),
          takenAtStr,
        ]);

        row.eachCell((cell) => { cell.alignment = { vertical: 'middle' }; });
        styleStatusCell(row.getCell(8), slot.status);
      });

      // Merge Drug Name + Dosage columns if medication has multiple slots
      const medEndRow = ws.rowCount;
      if (med.slots.length > 1) {
        ws.mergeCells(medStartRow, 2, medEndRow, 2); // Tên thuốc
        ws.mergeCells(medStartRow, 3, medEndRow, 3); // Liều lượng
        ws.getCell(medStartRow, 2).alignment = { vertical: 'middle', horizontal: 'left' };
        ws.getCell(medStartRow, 3).alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    // Merge Date column across all slots of this day
    const dayEndRow = ws.rowCount;
    if (daySlotCount > 1) {
      ws.mergeCells(dayStartRow, 1, dayEndRow, 1);
      ws.getCell(dayStartRow, 1).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Thin separator between days
    const sepRow = ws.addRow(Array(headers.length).fill(''));
    sepRow.height = 4;
    sepRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.SEP_BG}` } };
    });
  });

  const dataStart = 6;
  const dataEnd = ws.rowCount;
  if (dataEnd >= dataStart) {
    applyTableBorder(ws, dataStart, dataEnd, 1, headers.length);
  }

  return ws;
}

// ─── Sheet 3 — Thống kê theo thuốc ───────────────────────────────────────────

function buildMedicationSummarySheet(
  workbook: ExcelJS.Workbook,
  adherence: AdherenceResponse,
  patientName: string,
  patientCode: string,
  reportTitle: string,
  reportSubtitle: string,
) {
  const ws = workbook.addWorksheet('Thống kê theo thuốc');

  const headers = ['Tên thuốc', 'Liều lượng', 'Dự kiến', 'Đã uống', 'Bỏ lỡ', 'Tỷ lệ tuân thủ'];
  const colWidths = [28, 16, 12, 12, 12, 18];

  addTitleRow(ws, reportTitle, reportSubtitle, headers.length);

  const infoRow = ws.addRow([`Bệnh nhân: ${patientName}  |  Mã HS: ${patientCode}`, '', '', '', '', '']);
  ws.mergeCells(infoRow.number, 1, infoRow.number, headers.length);
  infoRow.getCell(1).font = { bold: true, color: { argb: `FF${COLOR.TITLE_FG}` }, size: 11 };
  infoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.TITLE_BG}` } };
  infoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  infoRow.height = 20;

  ws.addRow([]);

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.HEADER_BG}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 22;
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Aggregate across all days per drug
  const drugMap = new Map<string, { dosage: string; expected: number; taken: number; missed: number }>();

  adherence.days.forEach((day) => {
    day.medications.forEach((med) => {
      const key = `${med.prescriptionId}::${med.drugName}`;
      const existing = drugMap.get(key);
      if (existing) {
        existing.expected += med.expected;
        existing.taken    += med.taken;
        existing.missed   += med.missed;
      } else {
        drugMap.set(key, {
          dosage:   med.dosage,
          expected: med.expected,
          taken:    med.taken,
          missed:   med.missed,
        });
      }
    });
  });

  drugMap.forEach((stats, key) => {
    const drugName = key.split('::')[1];
    const rate = stats.expected > 0 ? (stats.taken / stats.expected) * 100 : 0;
    const row = ws.addRow([
      drugName,
      stats.dosage,
      stats.expected,
      stats.taken,
      stats.missed,
      '',
    ]);
    row.eachCell((cell) => { cell.alignment = { horizontal: 'center', vertical: 'middle' }; });
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    styleRateCell(row.getCell(6), rate);
  });

  const dataStart = 6;
  const dataEnd = ws.rowCount;
  if (dataEnd >= dataStart) {
    applyTableBorder(ws, dataStart, dataEnd, 1, headers.length);
  }

  return ws;
}



// ─── Public export function ───────────────────────────────────────────────────

export interface ComplianceExportOptions {
  adherence: AdherenceResponse;
  patientName: string;
  patientCode: string;
  daysCount: number;
}

export async function exportComplianceToExcel(options: ComplianceExportOptions): Promise<void> {
  const { adherence, patientName, patientCode } = options;

  const reportTitle = 'Báo cáo tuân thủ dùng thuốc';
  const reportSubtitle = `Bệnh nhân: ${patientName}  ·  ${formatDateVN(adherence.from)} — ${formatDateVN(adherence.to)}  ·  Xuất lúc: ${formatDateTimeVN(new Date())}`;

  const workbook = createWorkbook();
  workbook.creator = 'RPM Doctor';
  workbook.created = new Date();

  buildSummarySheet(workbook, adherence, patientName, patientCode, reportTitle, reportSubtitle);
  buildDailyDetailSheet(workbook, adherence, patientName, patientCode, reportTitle, reportSubtitle);
  buildMedicationSummarySheet(workbook, adherence, patientName, patientCode, reportTitle, reportSubtitle);

  const safeName = patientName.replace(/\s+/g, '_').toLowerCase();
  const filename = generateFilename(`compliance_${safeName}`);
  await downloadExcelFile(workbook, filename);
}

// ─── Multi-patient compliance export ──────────────────────────────────────────

export interface MultiCompliancePatientData {
  adherence: AdherenceResponse;
  patientName: string;
  patientCode: string;
  daysCount: number;
}

export interface MultiComplianceExportOptions {
  patients: MultiCompliancePatientData[];
  onProgress?: (current: number, total: number) => void;
}

/**
 * Build a combined "Tổng hợp" sheet that shows the summary for all patients
 */
function buildCombinedSummarySheet(
  workbook: ExcelJS.Workbook,
  patients: MultiCompliancePatientData[],
) {
  const ws = workbook.addWorksheet('Tổng hợp tất cả BN');

  const headers = ['STT', 'Bệnh nhân', 'Mã HS', 'Khoảng TG', 'Dự kiến', 'Đã uống', 'Bỏ lỡ', 'Tỷ lệ tuân thủ'];
  const colWidths = [6, 24, 14, 22, 12, 12, 12, 18];

  const reportTitle = 'Báo cáo tuân thủ dùng thuốc — Tổng hợp';
  const reportSubtitle = `${patients.length} bệnh nhân  ·  Xuất lúc: ${formatDateTimeVN(new Date())}`;

  addTitleRow(ws, reportTitle, reportSubtitle, headers.length);
  ws.addRow([]);

  const headerRow = ws.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.HEADER_BG}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 22;
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  patients.forEach((p, idx) => {
    const rate = p.adherence.summary.adherenceRate * 100;
    const dateRange = `${formatDateVN(p.adherence.from)} – ${formatDateVN(p.adherence.to)}`;
    const row = ws.addRow([
      idx + 1,
      p.patientName,
      p.patientCode,
      dateRange,
      p.adherence.summary.expected,
      p.adherence.summary.taken,
      p.adherence.summary.missed,
      '',
    ]);
    row.eachCell((cell) => { cell.alignment = { horizontal: 'center', vertical: 'middle' }; });
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    styleRateCell(row.getCell(8), rate);
  });

  // Totals
  ws.addRow([]);
  const totals = patients.reduce(
    (acc, p) => ({
      expected: acc.expected + p.adherence.summary.expected,
      taken: acc.taken + p.adherence.summary.taken,
      missed: acc.missed + p.adherence.summary.missed,
    }),
    { expected: 0, taken: 0, missed: 0 },
  );
  const totalRate = totals.expected > 0 ? (totals.taken / totals.expected) * 100 : 0;
  const totalRow = ws.addRow([
    '', 'TỔNG CỘNG', '', '', totals.expected, totals.taken, totals.missed, '',
  ]);
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  totalRow.getCell(2).font = { bold: true, color: { argb: `FF${COLOR.TITLE_FG}` } };
  totalRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
  styleRateCell(totalRow.getCell(8), totalRate);

  const dataStart = 5;
  const dataEnd = ws.rowCount;
  if (dataEnd >= dataStart) {
    applyTableBorder(ws, dataStart, dataEnd, 1, headers.length);
  }

  return ws;
}

/**
 * Truncate a sheet name to fit ExcelJS 31-character limit, avoiding duplicates.
 */
function safeSheetName(name: string, suffix: string, usedNames: Set<string>): string {
  const maxLen = 31;
  let base = name.replace(/[\\/*?[\]:]/g, '').trim();
  if (base.length + suffix.length + 1 > maxLen) {
    base = base.substring(0, maxLen - suffix.length - 1);
  }
  let candidate = `${base}_${suffix}`;
  let counter = 2;
  while (usedNames.has(candidate)) {
    const numbered = `${base}${counter}_${suffix}`;
    candidate = numbered.length > maxLen ? numbered.substring(0, maxLen) : numbered;
    counter++;
  }
  usedNames.add(candidate);
  return candidate;
}

/**
 * Export compliance reports for multiple patients into a single Excel file.
 * - Sheet 1: Combined summary for all patients
 * - Per patient: 1 detail sheet with daily breakdown
 */
export async function exportMultiComplianceToExcel(options: MultiComplianceExportOptions): Promise<void> {
  const { patients, onProgress } = options;

  const workbook = createWorkbook();
  workbook.creator = 'RPM Doctor';
  workbook.created = new Date();

  // Sheet 1: Combined summary
  buildCombinedSummarySheet(workbook, patients);

  const usedNames = new Set<string>();
  usedNames.add('Tổng hợp tất cả BN');

  // Per-patient detail sheets
  patients.forEach((p, idx) => {
    const reportTitle = 'Báo cáo tuân thủ dùng thuốc';
    const reportSubtitle = `Bệnh nhân: ${p.patientName}  ·  ${formatDateVN(p.adherence.from)} — ${formatDateVN(p.adherence.to)}`;

    const sheetName = safeSheetName(p.patientName, 'CT', usedNames);

    const ws = workbook.addWorksheet(sheetName);
    const headers = [
      'Ngày', 'Tên thuốc', 'Liều lượng',
      'Buổi', 'Giờ uống', 'Bữa ăn', 'Số viên',
      'Trạng thái', 'Uống lúc',
    ];
    const colWidths = [14, 24, 14, 10, 12, 16, 10, 14, 20];

    addTitleRow(ws, reportTitle, reportSubtitle, headers.length);

    const infoRow = ws.addRow([
      `Bệnh nhân: ${p.patientName}  |  Mã HS: ${p.patientCode}  |  Tỷ lệ tuân thủ: ${Math.round(p.adherence.summary.adherenceRate * 100)}%`,
      ...Array(headers.length - 1).fill(''),
    ]);
    ws.mergeCells(infoRow.number, 1, infoRow.number, headers.length);
    infoRow.getCell(1).font = { bold: true, color: { argb: `FF${COLOR.TITLE_FG}` }, size: 11 };
    infoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.TITLE_BG}` } };
    infoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    infoRow.height = 20;

    ws.addRow([]);

    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.HEADER_BG}` } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    headerRow.height = 22;
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    p.adherence.days.forEach((day) => {
      if (day.medications.length === 0) return;
      const daySlotCount = day.medications.reduce((sum, med) => sum + med.slots.length, 0);
      if (daySlotCount === 0) return;

      const dayStartRow = ws.rowCount + 1;

      day.medications.forEach((med) => {
        if (med.slots.length === 0) return;
        const medStartRow = ws.rowCount + 1;

        med.slots.forEach((slot, slotIdx) => {
          const timeStr = slotTimeStr(slot);
          const takenAtStr = slot.takenAt ? formatDateTimeVN(slot.takenAt) : '';
          const row = ws.addRow([
            slotIdx === 0 ? formatDate(day.date) : '',
            slotIdx === 0 ? med.drugName : '',
            slotIdx === 0 ? med.dosage : '',
            todLabel(slot.timeOfDay),
            timeStr,
            mealTimingLabel(slot.mealTiming),
            slot.pillCount,
            statusLabel(slot.status),
            takenAtStr,
          ]);
          row.eachCell((cell) => { cell.alignment = { vertical: 'middle' }; });
          styleStatusCell(row.getCell(8), slot.status);
        });

        const medEndRow = ws.rowCount;
        if (med.slots.length > 1) {
          ws.mergeCells(medStartRow, 2, medEndRow, 2);
          ws.mergeCells(medStartRow, 3, medEndRow, 3);
          ws.getCell(medStartRow, 2).alignment = { vertical: 'middle', horizontal: 'left' };
          ws.getCell(medStartRow, 3).alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });

      const dayEndRow = ws.rowCount;
      if (daySlotCount > 1) {
        ws.mergeCells(dayStartRow, 1, dayEndRow, 1);
        ws.getCell(dayStartRow, 1).alignment = { vertical: 'middle', horizontal: 'center' };
      }

      const sepRow = ws.addRow(Array(headers.length).fill(''));
      sepRow.height = 4;
      sepRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.SEP_BG}` } };
      });
    });

    const dataStart = 6;
    const dataEnd = ws.rowCount;
    if (dataEnd >= dataStart) {
      applyTableBorder(ws, dataStart, dataEnd, 1, headers.length);
    }

    onProgress?.(idx + 1, patients.length);
  });

  const filename = generateFilename(`compliance_${patients.length}bn`);
  await downloadExcelFile(workbook, filename);
}

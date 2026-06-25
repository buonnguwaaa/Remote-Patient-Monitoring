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
  styleRateCell(totalRow.getCell(5), adherence.summary.adherenceRate);
  totalRow.getCell(1).font = { bold: true, color: { argb: `FF${COLOR.TITLE_FG}` } };

  const dataStart = 6; // after title(1), subtitle(2), empty(3), info(4), empty(5), header(6)
  const dataEnd = ws.rowCount;
  if (dataEnd >= dataStart) {
    applyTableBorder(ws, dataStart, dataEnd, 1, headers.length);
  }

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
    'STT', 'Ngày', 'Tên thuốc', 'Liều lượng',
    'Buổi', 'Giờ uống', 'Bữa ăn', 'Số viên',
    'Trạng thái', 'Uống lúc',
  ];
  const colWidths = [5, 14, 24, 14, 10, 12, 16, 10, 14, 20];

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

  let stt = 1;

  adherence.days.forEach((day) => {
    day.medications.forEach((med) => {
      med.slots.forEach((slot) => {
        const timeStr = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
        const takenAtStr = slot.takenAt
          ? formatDateTimeVN(slot.takenAt)
          : '';

        const row = ws.addRow([
          stt++,
          formatDate(day.date),
          med.drugName,
          med.dosage,
          todLabel(slot.timeOfDay),
          timeStr,
          mealTimingLabel(slot.mealTiming),
          slot.pillCount,
          statusLabel(slot.status),
          takenAtStr,
        ]);

        row.eachCell((cell) => { cell.alignment = { vertical: 'middle' }; });

        // Style status cell (column 9)
        styleStatusCell(row.getCell(9), slot.status);
      });
    });

    // Separator between days
    if (day.medications.length > 0) {
      const sepRow = ws.addRow(Array(headers.length).fill(''));
      sepRow.height = 4;
      sepRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.SEP_BG}` } };
      });
    }
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

// ─── Sheet 4 — Thông tin báo cáo ─────────────────────────────────────────────

function buildInfoSheet(
  workbook: ExcelJS.Workbook,
  adherence: AdherenceResponse,
  patientName: string,
  patientCode: string,
  daysCount: number,
) {
  const ws = workbook.addWorksheet('Thông tin');
  ws.getColumn(1).width = 32;
  ws.getColumn(2).width = 42;

  const infoRows: [string, string | number][] = [
    ['BÁO CÁO TUÂN THỦ DÙNG THUỐC', ''],
    ['', ''],
    ['Bệnh nhân',         patientName],
    ['Mã hồ sơ',          patientCode],
    ['Khoảng thời gian',  `${formatDateVN(adherence.from)} – ${formatDateVN(adherence.to)}`],
    ['Số ngày theo dõi',  daysCount],
    ['Ngày xuất báo cáo', formatDateTimeVN(new Date())],
    ['', ''],
    ['KẾT QUẢ TỔNG HỢP', ''],
    ['Tổng liều dự kiến', adherence.summary.expected],
    ['Tổng liều đã uống', adherence.summary.taken],
    ['Tổng liều bỏ lỡ',   adherence.summary.missed],
    ['Tỷ lệ tuân thủ',    `${Math.round(adherence.summary.adherenceRate)}%`],
  ];

  infoRows.forEach(([k, v], idx) => {
    const row = ws.addRow([k, v]);
    if (idx === 0 || idx === 8) {
      row.getCell(1).font = { bold: true, size: 12, color: { argb: `FF${COLOR.TITLE_FG}` } };
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR.TITLE_BG}` } };
      ws.mergeCells(row.number, 1, row.number, 2);
      row.getCell(1).alignment = { horizontal: 'center' };
    } else {
      row.getCell(1).font = { bold: true, color: { argb: 'FF374151' } };
    }
    // Color rate value
    if (k === 'Tỷ lệ tuân thủ') {
      row.getCell(2).font = { bold: true, color: { argb: `FF${rateColor(adherence.summary.adherenceRate)}` } };
    }
  });

  applyTableBorder(ws, 1, ws.rowCount, 1, 2);
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
  const { adherence, patientName, patientCode, daysCount } = options;

  const reportTitle = 'Báo cáo tuân thủ dùng thuốc';
  const reportSubtitle = `Bệnh nhân: ${patientName}  ·  ${formatDateVN(adherence.from)} — ${formatDateVN(adherence.to)}  ·  Xuất lúc: ${formatDateTimeVN(new Date())}`;

  const workbook = createWorkbook();
  workbook.creator = 'RPM Doctor';
  workbook.created = new Date();

  buildSummarySheet(workbook, adherence, patientName, patientCode, reportTitle, reportSubtitle);
  buildDailyDetailSheet(workbook, adherence, patientName, patientCode, reportTitle, reportSubtitle);
  buildMedicationSummarySheet(workbook, adherence, patientName, patientCode, reportTitle, reportSubtitle);
  buildInfoSheet(workbook, adherence, patientName, patientCode, daysCount);

  const safeName = patientName.replace(/\s+/g, '_').toLowerCase();
  const filename = generateFilename(`compliance_${safeName}`);
  await downloadExcelFile(workbook, filename);
}

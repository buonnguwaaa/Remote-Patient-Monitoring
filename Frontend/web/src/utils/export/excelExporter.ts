import ExcelJS from 'exceljs';

export const addTitleRow = (
  worksheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  totalColumns: number,
) => {
  const titleRow = worksheet.addRow([title]);
  worksheet.mergeCells(1, 1, 1, totalColumns);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 28;

  const subtitleRow = worksheet.addRow([subtitle]);
  worksheet.mergeCells(2, 1, 2, totalColumns);
  subtitleRow.getCell(1).font = { size: 10, color: { argb: 'FF6B7280' }, italic: true };
  subtitleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  subtitleRow.height = 18;

  worksheet.addRow([]);
};

const THIN_BLACK: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } };

export const applyTableBorder = (
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
) => {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = worksheet.getCell(r, c);
      cell.border = {
        top:    THIN_BLACK,
        bottom: THIN_BLACK,
        left:   THIN_BLACK,
        right:  THIN_BLACK,
      };
    }
  }
};

export const styleHeaderRow = (worksheet: ExcelJS.Worksheet, headerColor: string = '4F46E5') => {
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${headerColor}` },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 20;
};

export const setColumnWidths = (worksheet: ExcelJS.Worksheet, widths: number[]) => {
  worksheet.columns = worksheet.columns.map((col, index) => ({
    ...col,
    width: widths[index] || 15,
  }));
};

export const downloadExcelFile = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const createWorkbook = (): ExcelJS.Workbook => {
  return new ExcelJS.Workbook();
};

export const addWorksheet = (
  workbook: ExcelJS.Workbook,
  data: any[],
  sheetName: string,
  columnWidths?: number[],
  titleOffset: number = 0,
): ExcelJS.Worksheet => {
  const worksheet = workbook.addWorksheet(sheetName);
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    headerRow.height = 20;
    data.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });
    if (columnWidths) {
      setColumnWidths(worksheet, columnWidths);
    }
  }
  return worksheet;
};

export const formatDateVN = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTimeVN = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('vi-VN');
};

export const generateFilename = (prefix: string, extension: string = 'xlsx'): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${prefix}_${timestamp}.${extension}`;
};

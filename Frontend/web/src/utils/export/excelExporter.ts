/**
 * Excel Exporter Utilities
 * Common utilities for exporting data to Excel files
 */

import * as XLSX from 'xlsx';

/**
 * Apply styling to header row
 */
export const styleHeaderRow = (worksheet: XLSX.WorkSheet, headerColor: string = '4F46E5') => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: headerColor } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
};

/**
 * Set column widths for worksheet
 */
export const setColumnWidths = (worksheet: XLSX.WorkSheet, widths: number[]) => {
  worksheet['!cols'] = widths.map(wch => ({ wch }));
};

/**
 * Create and download Excel file
 */
export const downloadExcelFile = (workbook: XLSX.WorkBook, filename: string) => {
  XLSX.writeFile(workbook, filename);
};

/**
 * Create a new workbook
 */
export const createWorkbook = (): XLSX.WorkBook => {
  return XLSX.utils.book_new();
};

/**
 * Add worksheet to workbook
 */
export const addWorksheet = (
  workbook: XLSX.WorkBook,
  data: any[],
  sheetName: string,
  columnWidths?: number[]
): XLSX.WorkSheet => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  if (columnWidths) {
    setColumnWidths(worksheet, columnWidths);
  }
  
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  return worksheet;
};

/**
 * Format date to Vietnamese locale
 */
export const formatDateVN = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format datetime to Vietnamese locale
 */
export const formatDateTimeVN = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('vi-VN');
};

/**
 * Generate filename with timestamp
 */
export const generateFilename = (prefix: string, extension: string = 'xlsx'): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${prefix}_${timestamp}.${extension}`;
};

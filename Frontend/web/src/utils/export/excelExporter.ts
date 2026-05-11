/**
 * Excel Exporter Utilities
 * Common utilities for exporting data to Excel files
 */

import ExcelJS from 'exceljs';

/**
 * Apply styling to header row
 */
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

/**
 * Set column widths for worksheet
 */
export const setColumnWidths = (worksheet: ExcelJS.Worksheet, widths: number[]) => {
  worksheet.columns = worksheet.columns.map((col, index) => ({
    ...col,
    width: widths[index] || 15,
  }));
};

/**
 * Create and download Excel file
 */
export const downloadExcelFile = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Create a new workbook
 */
export const createWorkbook = (): ExcelJS.Workbook => {
  return new ExcelJS.Workbook();
};

/**
 * Add worksheet to workbook
 */
export const addWorksheet = (
  workbook: ExcelJS.Workbook,
  data: any[],
  sheetName: string,
  columnWidths?: number[]
): ExcelJS.Worksheet => {
  const worksheet = workbook.addWorksheet(sheetName);
  
  if (data.length > 0) {
    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    
    // Add data rows
    data.forEach(row => {
      worksheet.addRow(Object.values(row));
    });
    
    // Apply column widths
    if (columnWidths) {
      setColumnWidths(worksheet, columnWidths);
    }
  }
  
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

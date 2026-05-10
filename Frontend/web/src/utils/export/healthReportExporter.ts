/**
 * Health Report Exporter
 * Export patient health metrics to Excel
 */

import type { AssignmentResponse } from '../../types/patient';
import {
  createWorkbook,
  addWorksheet,
  downloadExcelFile,
  generateFilename,
  formatDateVN,
  formatDateTimeVN,
} from './excelExporter';

export interface HealthStatistics {
  totalMeasurements: number;
  bloodPressure: {
    systolic: MetricStats;
    diastolic: MetricStats;
  };
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

/**
 * Calculate health statistics from measurements
 */
export const calculateHealthStatistics = (
  measurements: any[],
  threshold: any
): HealthStatistics => {
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

  const systolicValues = measurements
    .map(m => m.bloodPressure?.systolic || m.systolic || 0)
    .filter(v => v > 0);
  const diastolicValues = measurements
    .map(m => m.bloodPressure?.diastolic || m.diastolic || 0)
    .filter(v => v > 0);
  const heartRateValues = measurements.map(m => m.heartRate || 0).filter(v => v > 0);
  const temperatureValues = measurements.map(m => m.temperature || 0).filter(v => v > 0);
  const spo2Values = measurements.map(m => m.spo2 || 0).filter(v => v > 0);
  const respiratoryRateValues = measurements.map(m => m.respiratoryRate || 0).filter(v => v > 0);
  const glucoseValues = measurements.map(m => m.glucose || 0).filter(v => v > 0);

  const stats: HealthStatistics = {
    totalMeasurements: measurements.length,
    bloodPressure: {
      systolic: calculateMetricStats(systolicValues, threshold?.sysMin, threshold?.sysMax),
      diastolic: calculateMetricStats(diastolicValues, threshold?.diaMin, threshold?.diaMax),
    },
    heartRate: calculateMetricStats(heartRateValues, threshold?.heartRateMin, threshold?.heartRateMax),
    temperature: calculateMetricStats(temperatureValues, threshold?.temperatureMin, threshold?.temperatureMax),
    spo2: calculateMetricStats(spo2Values, threshold?.spo2Min, 100),
    respiratoryRate: calculateMetricStats(respiratoryRateValues, threshold?.respiratoryRateMin, threshold?.respiratoryRateMax),
    glucose: calculateMetricStats(glucoseValues, threshold?.glucoseMin, threshold?.glucoseMax),
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

/**
 * Calculate statistics for a single metric
 */
const calculateMetricStats = (
  values: number[],
  min?: number,
  max?: number
): MetricStats => {
  if (values.length === 0) return createEmptyStats();

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const avgVal = values.reduce((a, b) => a + b, 0) / values.length;

  let violations = 0;
  if (min !== undefined && max !== undefined) {
    violations = values.filter(v => v < min || v > max).length;
  }

  return {
    min: Math.round(minVal * 10) / 10,
    max: Math.round(maxVal * 10) / 10,
    avg: Math.round(avgVal * 10) / 10,
    violations,
  };
};

/**
 * Create empty stats object
 */
const createEmptyStats = (): MetricStats => ({
  min: 0,
  max: 0,
  avg: 0,
  violations: 0,
});

/**
 * Export health report to Excel
 */
export const exportHealthReportToExcel = async (
  reportData: PatientReportData[],
  startDate: string,
  endDate: string
) => {
  const workbook = createWorkbook();

  // Sheet 1: Overview of all patients
  const overviewData = reportData.map((data, index) => ({
    'STT': index + 1,
    'Bệnh nhân': data.assignment.patientName || 'Không rõ',
    'Mã BN': data.assignment.patientCode || data.assignment.patientPublicId || '-',
    'Số lần đo': data.stats.totalMeasurements,
    'HA TB (mmHg)': data.stats.bloodPressure.systolic.avg > 0
      ? `${data.stats.bloodPressure.systolic.avg}/${data.stats.bloodPressure.diastolic.avg}`
      : '-',
    'Nhịp tim TB (bpm)': data.stats.heartRate.avg || '-',
    'Nhiệt độ TB (°C)': data.stats.temperature.avg || '-',
    'SpO2 TB (%)': data.stats.spo2.avg || '-',
    'Nhịp thở TB (bpm)': data.stats.respiratoryRate.avg || '-',
    'Đường huyết TB (mg/dL)': data.stats.glucose.avg || '-',
    'Số lần vượt ngưỡng': data.stats.totalViolations,
    'Trạng thái': data.stats.totalViolations > 0 ? 'Cần chú ý' : 'Ổn định',
  }));

  addWorksheet(
    workbook,
    overviewData,
    'Tổng quan',
    [5, 25, 12, 10, 15, 15, 15, 12, 15, 18, 18, 15]
  );

  // Sheet 2: Detailed statistics for each patient
  const detailedData: any[] = [];
  reportData.forEach((data) => {
    const patientName = data.assignment.patientName || 'Không rõ';
    const patientCode = data.assignment.patientCode || data.assignment.patientPublicId || '-';

    detailedData.push({
      'Bệnh nhân': `${patientName} (${patientCode})`,
      'Chỉ số': '',
      'Min': '',
      'Max': '',
      'Trung bình': '',
      'Ngưỡng an toàn': '',
      'Vượt ngưỡng': '',
    });

    const addStatRow = (label: string, stat: MetricStats, threshold: string) => {
      detailedData.push({
        'Bệnh nhân': '',
        'Chỉ số': label,
        'Min': stat.min || '-',
        'Max': stat.max || '-',
        'Trung bình': stat.avg || '-',
        'Ngưỡng an toàn': threshold,
        'Vượt ngưỡng': stat.violations || 0,
      });
    };

    const t = data.threshold;
    addStatRow(
      'HA Tâm thu (mmHg)',
      data.stats.bloodPressure.systolic,
      t ? `${t.sysMin} - ${t.sysMax}` : '-'
    );
    addStatRow(
      'HA Tâm trương (mmHg)',
      data.stats.bloodPressure.diastolic,
      t ? `${t.diaMin} - ${t.diaMax}` : '-'
    );
    addStatRow(
      'Nhịp tim (bpm)',
      data.stats.heartRate,
      t ? `${t.heartRateMin} - ${t.heartRateMax}` : '-'
    );
    addStatRow(
      'Nhiệt độ (°C)',
      data.stats.temperature,
      t ? `${t.temperatureMin} - ${t.temperatureMax}` : '-'
    );
    addStatRow(
      'SpO2 (%)',
      data.stats.spo2,
      t ? `${t.spo2Min} - 100` : '-'
    );
    addStatRow(
      'Nhịp thở (bpm)',
      data.stats.respiratoryRate,
      t ? `${t.respiratoryRateMin || 0} - ${t.respiratoryRateMax || 0}` : '-'
    );
    addStatRow(
      'Đường huyết (mg/dL)',
      data.stats.glucose,
      t ? `${t.glucoseMin || 0} - ${t.glucoseMax || 0}` : '-'
    );

    detailedData.push({
      'Bệnh nhân': '',
      'Chỉ số': '',
      'Min': '',
      'Max': '',
      'Trung bình': '',
      'Ngưỡng an toàn': '',
      'Vượt ngưỡng': '',
    });
  });

  addWorksheet(
    workbook,
    detailedData,
    'Thống kê chi tiết',
    [30, 25, 10, 10, 15, 20, 15]
  );

  // Sheet 3: Report information
  const infoData = [
    { 'Thông tin': 'THÔNG TIN BÁO CÁO', 'Giá trị': '' },
    { 'Thông tin': '', 'Giá trị': '' },
    { 'Thông tin': 'Số bệnh nhân', 'Giá trị': reportData.length },
    {
      'Thông tin': 'Khoảng thời gian',
      'Giá trị': `${formatDateVN(startDate)} - ${formatDateVN(endDate)}`,
    },
    { 'Thông tin': 'Ngày xuất', 'Giá trị': formatDateTimeVN(new Date()) },
    {
      'Thông tin': 'Tổng số lần đo',
      'Giá trị': reportData.reduce((sum, d) => sum + d.stats.totalMeasurements, 0),
    },
    {
      'Thông tin': 'Số BN ổn định',
      'Giá trị': reportData.filter(d => d.stats.totalViolations === 0).length,
    },
    {
      'Thông tin': 'Số BN cần chú ý',
      'Giá trị': reportData.filter(d => d.stats.totalViolations > 0).length,
    },
  ];

  addWorksheet(workbook, infoData, 'Thông tin báo cáo', [25, 40]);

  // Download file
  const filename = generateFilename('bao_cao_chi_so');
  await downloadExcelFile(workbook, filename);
};

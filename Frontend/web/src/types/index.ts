export interface NavigationItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

export interface WarnItem {
  name: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  bloodSugar?: number;

  message?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface StatItem {
  id: string;
  label: string;
  value: number;
  type: "primary" | "warning" | "neutral";
}

export interface Patient {
  id: string;
  name: string;
  img: string;

  status: "normal" | "warning";

  // Patient stat
  systolic: number;
  diastolic: number;
  heartRate: number;
  bloodSugar: number;
}

// Alert & Threshold types
export interface ThresholdViolation {
  type: "temperature" | "systolic" | "diastolic" | "pulse" | "glucose" | "spo2";
  rule: string;
  observed: number;
  threshold: number;
  severity: "info" | "high";
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  violations: ThresholdViolation[];
  status: "open" | "ack";
  severity: "info" | "high";
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  doctorNote?: string;
  createdAt: string;
}

export interface Threshold {
  id: string;
  patientId: string;
  patientName?: string;
  temperatureMin?: number;
  temperatureMax?: number;
  systolicMin?: number;
  systolicMax?: number;
  diastolicMin?: number;
  diastolicMax?: number;
  pulseMin?: number;
  pulseMax?: number;
  glucoseMin?: number;
  glucoseMax?: number;
  spo2Min?: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

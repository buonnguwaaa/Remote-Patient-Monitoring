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
  respiratoryRate?: number;

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
  profileImageUrl?: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address?: string;
  status: "active" | "inactive";
}

// Alert & Threshold types
export interface ThresholdViolation {
  type: "temperature" | "systolic" | "diastolic" | "pulse" | "glucose" | "spo2" | "respiratoryRate";
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

export interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  measurementId?: string; // SPO2, Heart Rate, etc.
  timestamp: Date;
}

export interface doctor {
  id: string;
  name: string;
  specialization: string;
  licenseNumber: string;
  workplace: string;
  yearsOfExperience: number;
  status?: string;
  profileImageUrl: string;
  gender: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
}

export interface Nurse {
  id: string;
  name: string;
  licenseNumber: string;
  department: string;
  yearsOfExperience: number;
  status?: "active" | "inactive";
  email?: string;
  phone?: string;
  profileImageUrl?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface SystemSettings {
  id: string;
  systemStatus: "online" | "offline" | "maintenance";
  maintenanceMessage?: string;
  allowNewRegistrations: boolean;
  maxPatientsPerDoctor: number;
  alertThresholdGlobal: {
    temperatureMin: number;
    temperatureMax: number;
    systolicMin: number;
    systolicMax: number;
    diastolicMin: number;
    diastolicMax: number;
    pulseMin: number;
    pulseMax: number;
    glucoseMin: number;
    glucoseMax: number;
    spo2Min: number;
  };
}

export interface Department {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId?: string;
  doctorName?: string;
  nurseId?: string;
  nurseName?: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

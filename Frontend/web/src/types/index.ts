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

// Import từ utils/alertSeverity để tránh khai báo trùng lặp
export type AlertSeverity = "info" | "high";

export interface ThresholdViolation {
  type: "temperature" | "systolic" | "diastolic" | "pulse" | "glucose" | "spo2" | "respiratoryRate";
  rule: string;
  observed: number;
  threshold: number;
  severity: AlertSeverity;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  violations: ThresholdViolation[];
  status: "open" | "ack";
  severity: AlertSeverity;
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
  measurementId?: string;
  timestamp: Date;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  provider: string;
  role: string;
  gender: string;
  dob: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  departmentId?: string;
  workplace?: string;
  licenseNumber?: string;
  specialization?: string;
  yearsOfExperience?: number;
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

// ---- Prescription / Medication types ----

export type PrescriptionStatus = "active" | "completed" | "discontinued" | "expired";
export type TimeOfDay = "morning" | "noon" | "evening";
export type MealTiming = "pre_meal" | "post_meal";

export interface MedicationDose {
  timeOfDay: TimeOfDay;
  hour?: number;
  minute?: number;
  time?: string; // "HH:MM" rendered by backend
  mealTiming?: MealTiming;
  pillCount: number;
}

export interface PrescriptionMedication {
  drugName: string;
  dosage: string;
  route?: string;
  instructions?: string;
  schedule: MedicationDose[];
}

export interface Prescription {
  id: string;
  patientId: string;
  prescribedBy: string;
  medications: PrescriptionMedication[];
  timezone: string;
  daysOfWeek: number[];
  startDate: string;
  endDate?: string;
  status: PrescriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TodayMedicationSlot extends MedicationDose {
  taken: boolean;
  intakeId?: string;
}

export interface TodayMedication {
  prescriptionId: string;
  drugName: string;
  dosage: string;
  expectedToday: number;
  takenToday: number;
  slots: TodayMedicationSlot[];
}

export type AdherenceSlotStatus = "taken" | "missed" | "pending";

export interface MedicationAdherenceSlot extends MedicationDose {
  status: AdherenceSlotStatus;
  intakeId?: string;
  takenAt?: string;
}

export interface MedicationAdherenceMedication {
  prescriptionId: string;
  drugName: string;
  dosage: string;
  expected: number;
  taken: number;
  missed: number;
  slots: MedicationAdherenceSlot[];
}

export interface MedicationAdherenceDay {
  date: string;
  expected: number;
  taken: number;
  missed: number;
  medications: MedicationAdherenceMedication[];
}

export interface MedicationAdherenceSummary {
  expected: number;
  taken: number;
  missed: number;
  adherenceRate: number; // 0–1 from backend, multiply by 100 for display
}

export interface MedicationAdherence {
  from: string;
  to: string;
  summary: MedicationAdherenceSummary;
  days: MedicationAdherenceDay[];
}

// Payload types for API calls
export interface CreatePrescriptionPayload {
  patientId: string;
  medications: Array<{
    drugName: string;
    dosage: string;
    route?: string;
    instructions?: string;
    schedule: Array<{
      timeOfDay: TimeOfDay;
      hour?: number;
      minute?: number;
      mealTiming?: MealTiming;
      pillCount: number;
    }>;
  }>;
  timezone: string;
  daysOfWeek: number[];
  startDate: string; // ISO string
  endDate?: string;  // ISO string
}

export interface UpdatePrescriptionPayload extends CreatePrescriptionPayload {
  status: PrescriptionStatus;
}
